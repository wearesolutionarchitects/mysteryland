// src/scripts/event/setlist.mjs
// Adds the setlist.fm songs to an existing event MDX by event date.
import fs from 'node:fs';
import path from 'node:path';
import { ensureDateArg, loadEnv } from '../lib/core.mjs';

loadEnv();

const eventDate = process.argv[2];
const apiKey = process.env.SETLIST_API_KEY || '';
const userAgent = process.env.SETLIST_USER_AGENT || 'heiko@fanieng.com';
const eventsRoot = process.env.EVENTS_ROOT || './src/content/docs/events';

ensureDateArg(eventDate, 'Usage: npm run event:setlist -- YYYY-MM-DD');

if (!apiKey) {
  console.error('Missing SETLIST_API_KEY in .env');
  process.exit(1);
}

function readFrontmatter(file) {
  const content = fs.readFileSync(file, 'utf8');
  const block = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
  const value = (key) => block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
  const unquote = (input) => input.replace(/^["']|["']$/g, '');
  const artists = value('artist').match(/"([^"]+)"/g)?.map(unquote) || [];

  return {
    artists: artists.length ? artists : [unquote(value('title'))],
    city: unquote(value('city')),
    venue: unquote(value('venue')),
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
const existingTitles = new Set(
  [...sectionMatch[2].matchAll(/<Card title="([^"]+)" icon="list-format">/g)]
    .map((match) => normalize(match[1]))
    .filter(Boolean),
);
const pendingArtists = event.artists.filter((artist) => {
  const exists = event.artists.length === 1
    ? existingTitles.has('songs') && !placeholderCard.test(sectionMatch[2])
    : existingTitles.has(normalize(artist));
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

async function fetchSetlists(url, context = '') {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'x-api-key': apiKey,
      'User-Agent': userAgent,
    },
  });

  if (!response.ok) {
    const suffix = context ? ` for ${context}` : '';
    console.error(
      `Setlist.fm request failed${suffix}: ${response.status} ${response.statusText}`,
    );
    process.exit(1);
  }

  return response.json();
}

function songsFromSetlist(setlist) {
  const sets = Array.isArray(setlist?.sets?.set) ? setlist.sets.set : [];
  return sets.flatMap((set) => Array.isArray(set.song) ? set.song : []);
}

function selectSetlist(setlists, artist) {
  const matches = setlists.filter((setlist) =>
    normalize(setlist.artist?.name) === normalize(artist)
    && songsFromSetlist(setlist).length
  );

  return matches.find((setlist) =>
    !event.venue || normalize(setlist.venue?.name) === normalize(event.venue)
  ) || matches[0];
}

const found = new Map();
let page = 1;
let total = 0;
let itemsPerPage = 20;

do {
  const url = new URL(baseUrl);
  if (page > 1) url.searchParams.set('p', String(page));
  const data = await fetchSetlists(url);
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
  if (found.has(artist)) continue;

  const url = new URL('https://api.setlist.fm/rest/1.0/search/setlists');
  url.searchParams.set('artistName', artist);
  url.searchParams.set('date', `${day}-${month}-${yearPart}`);
  if (event.city) url.searchParams.set('cityName', event.city);

  const data = await fetchSetlists(url, artist);
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
  console.error(`No setlists with songs found for: ${missing.join(', ')}`);
  process.exit(1);
}

const existingContent = sectionMatch[2].replace(placeholderCard, '').trim();
const sectionContent = [existingContent, ...additions].filter(Boolean).join('\n\n');
const heading = event.artists.length > 1 ? '## Setlists\n' : sectionMatch[1];
const replacement = `${heading}\n${sectionContent}\n`;
const updated = original.replace(setlistSectionPattern, replacement);
const temporaryFile = `${eventFile}.tmp`;

fs.writeFileSync(temporaryFile, updated, 'utf8');
fs.renameSync(temporaryFile, eventFile);
console.log(`Added ${additions.length} setlist(s) to ${eventFile}`);
if (missing.length) console.warn(`No setlists with songs found for: ${missing.join(', ')}`);
