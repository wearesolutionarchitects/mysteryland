// src/scripts/event/setlist.mjs
// Adds the setlist.fm songs to an existing event MDX by event date.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { ensureDateArg, loadEnv } from '../lib/core.mjs';
import { createSetlistClient, orderArtists, sameArtist, sortSetlistCards } from './setlist-api.mjs';

loadEnv();

const eventDate = process.argv[2];
const apiKey = process.env.SETLIST_API_KEY || '';
const userAgent = process.env.SETLIST_USER_AGENT || 'heiko@fanieng.com';
const eventsRoot = process.env.EVENTS_ROOT || './src/content/docs/events';
const requestDelayMs = Number(process.env.SETLIST_REQUEST_DELAY_MS || 1000);
const maxRetries = Number(process.env.SETLIST_MAX_RETRIES || 3);

ensureDateArg(eventDate, 'Usage: npm run event:setlist -- YYYY-MM-DD');

if (!apiKey) {
  console.error('Missing SETLIST_API_KEY in .env');
  process.exit(1);
}

function readFrontmatter(file) {
  const content = fs.readFileSync(file, 'utf8');
  const block = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
  const data = YAML.parse(block) || {};
  const artists = Array.isArray(data.artist) ? data.artist.map(String) : [];

  return {
    artists: orderArtists(artists.length ? artists : [String(data.title || '')], data.runningOrder),
    city: String(data.city || ''),
    venue: String(data.venue || ''),
  };
}

function normalize(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '')
    .toLocaleLowerCase('de-DE');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const year = eventDate.slice(0, 4);
const eventFile = path.join(eventsRoot, year, `${eventDate}.mdx`);

if (!fs.existsSync(eventFile)) {
  console.error(`Event not found: ${eventFile}`);
  process.exit(1);
}

const original = fs.readFileSync(eventFile, 'utf8');
const event = readFrontmatter(eventFile);
const [yearPart, month, day] = eventDate.split('-');
const setlistSectionPattern = /(^## (?:Setlist|Setlists|Setlisten)[ \t]*\n)([\s\S]*?)(?=\n## |(?![\s\S]))/m;
const sectionMatch = original.match(setlistSectionPattern);

if (!sectionMatch) {
  console.error(`Setlist section not found in ${eventFile}`);
  process.exit(1);
}

const placeholderCard = /<Card title="Songs" icon="list-format">\s*(?:TBA|TODO)\s*<\/Card>/;
const existingTitles = [...sectionMatch[2].matchAll(/<Card title="([^"]+)" icon="list-format">/g)]
  .map((match) => match[1])
  .filter(Boolean);
const pendingArtists = event.artists.filter((artist) => {
  const exists = event.artists.length === 1
    ? existingTitles.some((title) => normalize(title) === 'songs') && !placeholderCard.test(sectionMatch[2])
    : existingTitles.some((title) => sameArtist(title, artist));
  if (exists) console.log(`Setlist already present for ${artist}`);
  return !exists;
});

if (!pendingArtists.length) {
  console.log(`All setlists are already present in ${eventFile}`);
  process.exit(0);
}

const baseUrl = new URL('https://api.setlist.fm/rest/1.0/search/setlists');
baseUrl.searchParams.set('date', `${day}-${month}-${yearPart}`);
if (event.city) baseUrl.searchParams.set('cityName', event.city);

const fetchSetlists = createSetlistClient({
  apiKey,
  userAgent,
  requestDelayMs: Number.isFinite(requestDelayMs) ? Math.max(0, requestDelayMs) : 1000,
  maxRetries: Number.isInteger(maxRetries) ? Math.max(0, maxRetries) : 3,
});

function songsFromSetlist(setlist) {
  const sets = Array.isArray(setlist?.sets?.set) ? setlist.sets.set : [];
  return sets.flatMap((set) => Array.isArray(set.song) ? set.song : []);
}

function selectSetlist(setlists, artist) {
  const matches = setlists.filter((setlist) =>
    sameArtist(setlist.artist?.name, artist)
    && songsFromSetlist(setlist).length
  );

  return matches.find((setlist) =>
    !event.venue || normalize(setlist.venue?.name) === normalize(event.venue)
  ) || matches[0];
}

const found = new Map();
let apiUnavailable = false;
let page = 1;
let total = 0;
let itemsPerPage = 20;

do {
  const url = new URL(baseUrl);
  if (page > 1) url.searchParams.set('p', String(page));
  let data;
  try {
    data = await fetchSetlists(url);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    apiUnavailable = true;
    break;
  }
  const setlists = Array.isArray(data.setlist) ? data.setlist : [];
  total = Number(data.total) || setlists.length;
  itemsPerPage = Number(data.itemsPerPage) || itemsPerPage;

  for (const artist of pendingArtists) {
    if (found.has(artist)) continue;
    const selected = selectSetlist(setlists, artist);
    if (selected) found.set(artist, selected);
  }

  page += 1;
} while (
  found.size < pendingArtists.length
  && (page - 1) * itemsPerPage < total
);

for (const artist of pendingArtists) {
  if (apiUnavailable) break;
  if (found.has(artist)) continue;

  const url = new URL('https://api.setlist.fm/rest/1.0/search/setlists');
  url.searchParams.set('artistName', artist);
  url.searchParams.set('date', `${day}-${month}-${yearPart}`);
  if (event.city) url.searchParams.set('cityName', event.city);

  let data;
  try {
    data = await fetchSetlists(url, artist);
  } catch (error) {
    console.warn(error instanceof Error ? error.message : String(error));
    apiUnavailable = true;
    break;
  }
  const selected = selectSetlist(
    Array.isArray(data.setlist) ? data.setlist : [],
    artist,
  );
  if (selected) found.set(artist, selected);
}

const additions = [];
const missing = [];

for (const artist of pendingArtists) {
  const selected = found.get(artist);
  const songs = songsFromSetlist(selected);

  if (!selected || !songs.length) {
    missing.push(artist);
    continue;
  }

  const title = event.artists.length > 1
    ? selected.artist?.name || artist
    : 'Songs';
  const songList = songs.map((song) => {
    const note = song.info ? ` (${escapeHtml(song.info)})` : '';
    return `        <li>${escapeHtml(song.name)}${note}</li>`;
  }).join('\n');

  additions.push([
    `<Card title=${JSON.stringify(title)} icon="list-format">`,
    '    <ol>',
    songList,
    '    </ol>',
    '',
    `    <a href=${JSON.stringify(selected.url)} target="_blank" rel="noopener noreferrer">Setlist auf setlist.fm</a>`,
    '</Card>',
  ].join('\n'));
}

if (!additions.length) {
  console.error(apiUnavailable
    ? 'Keine Setlists geschrieben; setlist.fm ist nach allen Wiederholungen weiterhin nicht verfügbar.'
    : `No setlists with songs found for: ${missing.join(', ')}`);
  process.exit(1);
}

const existingContent = sectionMatch[2].replace(placeholderCard, '').trim();
const sectionContent = sortSetlistCards(
  [existingContent, ...additions].filter(Boolean).join('\n\n'),
  event.artists,
);
const heading = event.artists.length > 1 ? '## Setlists\n' : sectionMatch[1];
const replacement = `${heading}\n${sectionContent}\n`;
const updated = original.replace(setlistSectionPattern, replacement);
const temporaryFile = `${eventFile}.tmp`;

fs.writeFileSync(temporaryFile, updated, 'utf8');
fs.renameSync(temporaryFile, eventFile);
console.log(`Added ${additions.length} setlist(s) to ${eventFile}`);
if (missing.length) console.warn(`No setlists with songs found for: ${missing.join(', ')}`);
