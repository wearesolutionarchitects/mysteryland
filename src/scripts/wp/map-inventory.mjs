import fs from 'node:fs';
import path from 'node:path';
import { sanitizeSlug, stripHtml } from '../lib/core.mjs';

const inventoryPath = process.env.WP_INVENTORY_FILE || './data/wp/posts.json';
const outPath = process.env.WP_EVENTS_FILE || './data/wp/events.json';

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

function parseTitle(title) {
  const match = title.match(/^(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(.+)$/);
  if (!match) {
    return {
      eventDate: '',
      artist: title,
      city: '',
      venue: '',
      tour: '',
    };
  }

  const [, day, month, year, rest] = match;
  const [artistAndTour, location = ''] = rest.split('@');
  const [city = '', venue = ''] = location.split('/');
  const [artist, ...tourParts] = artistAndTour.split(/\s+-\s+/);

  return {
    eventDate: `${year}-${month}-${day}`,
    artist: artist.trim(),
    city: city.trim(),
    venue: venue.trim(),
    tour: tourParts.join(' - ').trim(),
  };
}

function getPrice(tags) {
  const priceTag = tags.find((tag) => /^€\d/.test(tag));
  if (!priceTag) return null;
  return Number(priceTag.replace('€', '').replace(',', '.'));
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => decodeHtml(String(value || '')).trim()).filter(Boolean))];
}

function comparable(value) {
  return String(value || '').toLocaleLowerCase('de-DE').trim();
}

const genericMediaKeywords = new Set(['konzert', 'ticket', 'live nation']);

function getMediaKeywords(media) {
  return uniqueValues(media?.media_details?.image_meta?.keywords || []);
}

function getAdditionalArtists(mediaKeywords, eventValues) {
  const ignoredKeywords = new Set([
    ...eventValues.flatMap((value) => (Array.isArray(value) ? value : [value])).map(comparable),
    ...[...genericMediaKeywords],
  ]);

  return mediaKeywords.filter((keyword) => !ignoredKeywords.has(comparable(keyword)) && !/^€\d/.test(keyword));
}

function withoutEmpty(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value || undefined;
}

const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const tagMap = inventory.taxonomies?.tags || {};
const categoryMap = inventory.taxonomies?.categories || {};
const mediaMap = inventory.media || {};

const events = inventory.posts.map((post) => {
  const title = decodeHtml(post.title?.rendered || '');
  const parsed = parseTitle(title);
  const eventDate = parsed.eventDate || (post.date || '').slice(0, 10);
  const year = eventDate.slice(0, 4);
  const tagNames = (post.tags || []).map((id) => tagMap[String(id)]?.name).filter(Boolean);
  const categoryNames = (post.categories || []).map((id) => categoryMap[String(id)]?.name).filter(Boolean);
  const media = mediaMap[String(post.featured_media)] || null;
  const repoPath = year ? `src/content/docs/events/${year}/${eventDate}.mdx` : '';
  const mediaKeywords = getMediaKeywords(media);
  const additionalArtists = getAdditionalArtists(mediaKeywords, [
    parsed.artist,
    parsed.tour,
    parsed.city,
    parsed.venue,
    year,
    'Deutschland',
    tagNames,
    categoryNames,
  ]);
  const artist = uniqueValues([parsed.artist, ...additionalArtists]);
  const featuredMediaKeywords = mediaKeywords.filter((keyword) => !additionalArtists.includes(keyword));

  return {
    wp: {
      id: post.id,
      date: post.date,
      modified: post.modified,
      slug: post.slug,
      link: post.link,
    },
    eventDate,
    title,
    artist: withoutEmpty(artist),
    tour: withoutEmpty(parsed.tour),
    city: withoutEmpty(parsed.city),
    venue: withoutEmpty(parsed.venue),
    country: tagNames.includes('Deutschland') ? 'Deutschland' : undefined,
    price: getPrice(tagNames),
    tags: tagNames,
    categories: categoryNames,
    excerpt: stripHtml(decodeHtml(post.excerpt?.rendered || '')).trim(),
    contentHtml: post.content?.rendered || '',
    featuredMedia: media
      ? {
          id: media.id,
          sourceUrl: media.source_url,
          altText: decodeHtml(media.alt_text || ''),
          caption: decodeHtml(media.caption?.rendered || ''),
          width: media.media_details?.width,
          height: media.media_details?.height,
          file: media.media_details?.file,
          keywords: featuredMediaKeywords,
        }
      : null,
    repo: {
      path: repoPath,
      exists: repoPath ? fs.existsSync(repoPath) : false,
      slug: sanitizeSlug(title),
    },
  };
});

const mapped = {
  source: inventory.source,
  generatedAt: new Date().toISOString(),
  count: events.length,
  events,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(mapped, null, 2)}\n`, 'utf8');

const existing = events.filter((event) => event.repo.exists).length;
console.log(`Mapped ${events.length} WordPress posts to ${outPath}`);
console.log(`Repo matches: ${existing}; missing: ${events.length - existing}`);
