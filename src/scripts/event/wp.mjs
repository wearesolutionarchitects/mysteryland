import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, stripHtml } from '../lib/core.mjs';

loadEnv();

const postId = process.argv[2];
const wpBaseUrl = process.env.WP_BASE_URL || 'https://fanieng.com';

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

function yamlString(value) {
  return JSON.stringify(value || '');
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

const terms = (post._embedded?.['wp:term'] || []).flat();
const tagNames = unique(terms.filter((term) => term.taxonomy === 'post_tag').map((term) => term.name));
const categories = unique(terms.filter((term) => term.taxonomy === 'category').map((term) => term.name));

if (!categories.some((category) => category.toLocaleLowerCase('de-DE') === 'konzert')) {
  console.error(`WordPress post ${postId} is not in category "Konzert"`);
  process.exit(1);
}

const artistRaw = parsedTitle.artist || parsedCaption.artist;
const artist = tagNames.find((tag) => tag.toLocaleLowerCase('de-DE') === artistRaw.toLocaleLowerCase('de-DE')) || artistRaw;
const tour = parsedTitle.tour || parsedCaption.tour;
const city = parsedTitle.city || parsedCaption.city;
const venue = parsedTitle.venue || parsedCaption.venue;
const country = tagNames.includes('Deutschland') ? 'Deutschland' : '';
const priceTag = tagNames.find((tag) => /^€\d/.test(tag));
const price = priceTag ? Number(priceTag.slice(1).replace(',', '.')) : null;
const asin = post.content?.rendered?.match(/amazon\.[^"' ]+\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)?.[1] || '';
const tags = unique([...tagNames.filter((tag) => tag !== priceTag), tour, 'Konzert']);
const targetFile = path.join('src/content/docs/events', year, `${eventDate}.mdx`);

if (fs.existsSync(targetFile)) {
  console.error(`Event already exists: ${targetFile}`);
  process.exit(1);
}

const description = `${artist}${tour ? ` mit ${tour}` : ''} am ${eventDate}${city ? ` in ${city}` : ''}${venue ? `, ${venue}` : ''}.`;
const frontmatter = [
  '---',
  `title: ${yamlString(artist)}`,
  `description: ${yamlString(description)}`,
  `pubDate: ${eventDate}`,
  `country: ${yamlString(country)}`,
  `city: ${yamlString(city)}`,
  `venue: ${yamlString(venue)}`,
  `artist: [${yamlString(artist)}]`,
  ...(tour ? [`tour: ${yamlString(tour)}`] : []),
  ...(price !== null ? [`price: ${price.toFixed(2)}`] : []),
  ...(asin ? [`asin: ${yamlString(asin)}`] : []),
  'tags:',
  ...tags.map((tag) => `  - ${yamlString(tag)}`),
  '---',
];

const excerpt = decodeHtml(stripHtml(post.excerpt?.rendered || ''));
const body = [
  '',
  `## ${tour || artist}`,
  '',
  excerpt || `${artist}${venue ? ` im ${venue}` : ''}${city ? ` in ${city}` : ''}.`,
  '',
  '## Eventdaten',
  '',
  `- Datum: ${eventDate}`,
  `- Künstler: ${artist}`,
  ...(tour ? [`- Tour: ${tour}`] : []),
  ...(city ? [`- Ort: ${city}`] : []),
  ...(venue ? [`- Venue: ${venue}`] : []),
  ...(price !== null ? [`- Preis: ${price.toFixed(2).replace('.', ',')} €`] : []),
  '',
  `[Originalbeitrag auf fanieng.com](${post.link})`,
  '',
];

fs.mkdirSync(path.dirname(targetFile), { recursive: true });
fs.writeFileSync(targetFile, `${frontmatter.join('\n')}${body.join('\n')}`, 'utf8');
console.log(`Created ${targetFile}`);
