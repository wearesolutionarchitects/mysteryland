// src/scripts/event/wp.mjs
// Imports one WordPress concert post and creates its MDX event scaffold.
// Existing MDX files are only replaced with --force after creating a local backup.
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from '../lib/core.mjs';
import { renderEventMdx } from './render.mjs';

loadEnv();

const postId = process.argv[2];
const forceWrite = process.argv.includes('--force');
const wpBaseUrl = process.env.WP_BASE_URL || 'https://fanieng.com';
const eventsRoot = process.env.EVENTS_ROOT || './src/content/docs/events';

if (!postId || !/^\d+$/.test(postId)) {
  console.error('Usage: npm run event:wp -- <post-id>');
  process.exit(1);
}

function decodeHtml(input = '') {
  return input
    .replace(/&#8211;|&ndash;/g, '-')
    .replace(/&#8212;|&mdash;/g, '-')
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&#8222;|&bdquo;/g, '"')
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#8216;|&#8217;|&lsquo;|&rsquo;/g, "'")
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/<[^>]*>/g, '')
    .trim();
}

function parseEventText(value) {
  const clean = decodeHtml(value);
  const dateMatch = clean.match(/^(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(.+)$/);
  const eventDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : '';
  const eventText = dateMatch ? dateMatch[4] : clean;
  const [artistAndTour = '', location = ''] = eventText.split('@');
  const [artist = '', ...tourParts] = artistAndTour.split(/\s+-\s+/);
  const [city = '', venue = ''] = location.split('/');

  return {
    eventDate,
    artist: artist.trim(),
    tour: tourParts.join(' - ').trim(),
    city: city.trim(),
    venue: venue.trim(),
  };
}

function unique(values) {
  return [...new Set(values.map((value) => decodeHtml(String(value || '')).trim()).filter(Boolean))];
}

const url = new URL(`/wp-json/wp/v2/posts/${postId}`, wpBaseUrl);
url.searchParams.set('_embed', '1');
const response = await fetch(url);

if (!response.ok) {
  console.error(`WordPress request failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const post = await response.json();
const title = decodeHtml(post.title?.rendered || '');
const parsedTitle = parseEventText(title);
const featuredCaption = decodeHtml(post._embedded?.['wp:featuredmedia']?.[0]?.caption?.rendered || '');
const parsedCaption = parseEventText(featuredCaption);
const eventDate = parsedTitle.eventDate || parsedCaption.eventDate || String(post.date || '').slice(0, 10);
const year = eventDate.slice(0, 4);

if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
  console.error(`Could not determine event date from WordPress post ${postId}`);
  process.exit(1);
}

const [eventYear, eventMonth, eventDay] = eventDate.split('-');
const displayDate = `${eventDay}.${eventMonth}.${eventYear}`;
const terms = (post._embedded?.['wp:term'] || []).flat();
const tagNames = unique(terms.filter((term) => term.taxonomy === 'post_tag').map((term) => term.name));
const categories = unique(terms.filter((term) => term.taxonomy === 'category').map((term) => term.name));

const category = categories.some((item) => item.toLocaleLowerCase('de-DE') === 'festival')
  ? 'Festival'
  : 'Konzert';

if (!categories.some((item) => ['konzert', 'festival'].includes(item.toLocaleLowerCase('de-DE')))) {
  console.error(`WordPress post ${postId} is not in category "Konzert" or "Festival"`);
  process.exit(1);
}

const artistRaw = parsedTitle.artist || parsedCaption.artist || title || 'TBA';
const artist = tagNames.find((tag) => tag.toLocaleLowerCase('de-DE') === artistRaw.toLocaleLowerCase('de-DE')) || artistRaw;
const tour = parsedTitle.tour || parsedCaption.tour;
const city = parsedTitle.city || parsedCaption.city;
const venue = parsedTitle.venue || parsedCaption.venue;
const country = tagNames.includes('Deutschland') ? 'Deutschland' : 'TBA';
const priceTag = tagNames.find((tag) => /^€\d/.test(tag));
const price = priceTag ? Number(priceTag.slice(1).replace(',', '.')) : null;
const asin = post.content?.rendered?.match(/amazon\.[^"' ]+\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)?.[1] || '';
const tags = unique([...tagNames, tour, category]);
const targetFile = path.join(eventsRoot, year, `${eventDate}.mdx`);

if (fs.existsSync(targetFile)) {
  if (!forceWrite) {
    console.error(`Event already exists: ${targetFile}. Use --force to overwrite.`);
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join('.backups/events', year, `${eventDate}-${timestamp}.mdx.bak`);
  fs.mkdirSync(path.dirname(backupFile), { recursive: true });
  fs.copyFileSync(targetFile, backupFile);
  console.log(`Backup created: ${backupFile}`);
}

const description = `Eventbericht über das ${category} von ${artist}${tour ? ` auf der ${tour}` : ''}${venue ? ` in ${venue}` : ''}${city ? ` in ${city}` : ''} am ${displayDate}.`;
const content = renderEventMdx({
  title: artist,
  description,
  tour: tour || 'TBA',
  artists: [artist],
  category,
  ticketCategory: 'TBA',
  pubDate: eventDate,
  displayDate,
  country,
  city: city || 'TBA',
  venue: venue || 'TBA',
  price,
  asin,
  tags,
  scaffoldEmptySections: true,
});

fs.mkdirSync(path.dirname(targetFile), { recursive: true });
fs.writeFileSync(targetFile, content, 'utf8');
console.log(`Created ${targetFile}`);
