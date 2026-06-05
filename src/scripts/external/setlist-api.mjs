import { loadEnv } from '../lib/core.mjs';

loadEnv();

const setlistId = process.argv[2];
const apiKey = process.env.SETLIST_API_KEY || '';
const userAgent = process.env.ICLOUD_USERNAME || 'heiko@fanieng.com';

if (!setlistId) {
  console.error('Usage: npm run script:external:setlist -- <setlist-id>');
  process.exit(1);
}

if (!apiKey) {
  console.error('Missing SETLIST_API_KEY');
  process.exit(1);
}

console.log(`Fetch setlist ${setlistId}`);
const response = await fetch(`https://api.setlist.fm/rest/1.0/setlist/${encodeURIComponent(setlistId)}`, {
  headers: {
    Accept: 'application/json',
    'x-api-key': apiKey,
    'User-Agent': userAgent,
  },
});

if (!response.ok) {
  console.error(`Request failed: ${response.status}`);
  process.exit(1);
}

const data = await response.json();
const sets = Array.isArray(data?.sets?.set) ? data.sets.set : [];
const songs = sets.flatMap((set) => (Array.isArray(set?.song) ? set.song : [])).map((song) => song?.name).filter(Boolean);

if (!songs.length) {
  console.log('No songs found in setlist response.');
  process.exit(0);
}

console.log('## Setlist\n');
songs.forEach((song, index) => {
  const num = String(index + 1).padStart(2, '0');
  console.log(`${num}. ${song}`);
});
