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
    artist: artists[0] || unquote(value('title')),
    city: unquote(value('city')),
    venue: unquote(value('venue')),
  };
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
const url = new URL('https://api.setlist.fm/rest/1.0/search/setlists');
url.searchParams.set('artistName', event.artist);
url.searchParams.set('date', `${day}-${month}-${yearPart}`);
if (event.city) url.searchParams.set('cityName', event.city);

const response = await fetch(url, {
  headers: {
    Accept: 'application/json',
    'x-api-key': apiKey,
    'User-Agent': userAgent,
  },
});

if (!response.ok) {
  console.error(`Setlist.fm request failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const data = await response.json();
const setlists = Array.isArray(data.setlist) ? data.setlist : [];
const selected = setlists.find((setlist) =>
  !event.venue || setlist.venue?.name?.toLocaleLowerCase('de-DE') === event.venue.toLocaleLowerCase('de-DE')
) || setlists[0];

if (!selected) {
  console.error(`No setlist found for ${event.artist} on ${eventDate}`);
  process.exit(1);
}

const sets = Array.isArray(selected.sets?.set) ? selected.sets.set : [];
const songs = sets.flatMap((set) => Array.isArray(set.song) ? set.song : []);

if (!songs.length) {
  console.error(`Setlist ${selected.id} does not contain songs`);
  process.exit(1);
}

const songList = songs.map((song) => {
  const note = song.info ? ` (${escapeHtml(song.info)})` : '';
  return `        <li>${escapeHtml(song.name)}${note}</li>`;
}).join('\n');
const replacement = [
  '<Card title="Songs" icon="list-format">',
  '    <ol>',
  songList,
  '    </ol>',
  '',
  `    <a href=${JSON.stringify(selected.url)} target="_blank" rel="noopener noreferrer">Setlist auf setlist.fm</a>`,
  '</Card>',
].join('\n');
const setlistCard = /<Card title="Songs" icon="list-format">\s*TODO\s*<\/Card>/;

if (!setlistCard.test(original)) {
  console.error(`Setlist TODO block not found in ${eventFile}`);
  process.exit(1);
}

const updated = original.replace(setlistCard, replacement);
const temporaryFile = `${eventFile}.tmp`;

fs.writeFileSync(temporaryFile, updated, 'utf8');
fs.renameSync(temporaryFile, eventFile);
console.log(
  `Added ${songs.length} songs from setlist.fm (${selected.id}) to ${eventFile}`,
);
