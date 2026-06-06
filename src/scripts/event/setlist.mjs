// src/scripts/event/setlist.mjs
// Finds the setlist.fm entry for an existing event MDX by event date.
// Prints a Markdown setlist for manual insertion without changing the event file.
import fs from 'node:fs';
import path from 'node:path';
import { ensureDateArg, loadEnv } from '../lib/core.mjs';

loadEnv();

const eventDate = process.argv[2];
const apiKey = process.env.SETLIST_API_KEY || '';
const userAgent = process.env.SETLIST_USER_AGENT || 'heiko@fanieng.com';

ensureDateArg(eventDate, 'Usage: npm run event:setlist -- <YYYY-MM-DD>');

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

const year = eventDate.slice(0, 4);
const eventFile = path.join('src/content/docs/events', year, `${eventDate}.mdx`);

if (!fs.existsSync(eventFile)) {
  console.error(`Event not found: ${eventFile}`);
  process.exit(1);
}

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

console.log('## Setlist\n');
songs.forEach((song, index) => {
  const note = song.info ? ` (${song.info})` : '';
  console.log(`${index + 1}. ${song.name}${note}`);
});
console.log(`\n[Setlist auf setlist.fm](${selected.url})`);
