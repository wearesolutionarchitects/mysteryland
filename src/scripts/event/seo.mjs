// src/scripts/event/seo.mjs
// Audits and updates event SEO metadata: descriptions and OG images.
import fs from 'node:fs';
import path from 'node:path';
import { createEventOgImage, eventOgFilePath, eventOgPublicPath, firstEventImage } from './og.mjs';
import { stringList, yamlString } from './render.mjs';

const eventsRoot = './src/content/docs/events';

function eventFiles(dir = eventsRoot) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) return eventFiles(filePath);
      return entry.isFile() && entry.name.endsWith('.mdx') ? [filePath] : [];
    })
    .sort();
}

function splitFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;

  return {
    raw: match[1],
    body: content.slice(match[0].length),
    fullMatch: match[0],
  };
}

function parseScalar(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed.replace(/^['"]|['"]$/g, '');
  }
}

function parseArray(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    return trimmed
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((item) => parseScalar(item))
      .filter(Boolean);
  }
}

function parseFrontmatter(raw) {
  const data = {};

  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!match) continue;

    const [, key, value] = match;
    data[key] = value.trim().startsWith('[') ? parseArray(value) : parseScalar(value);
  }

  return data;
}

function replaceFrontmatterField(raw, key, value) {
  const line = `${key}: ${yamlString(value)}`;
  const pattern = new RegExp(`^${key}:.*$`, 'm');

  if (pattern.test(raw)) return raw.replace(pattern, line);

  const lines = raw.split('\n');
  const insertAfter = key === 'ogImage'
    ? Math.max(lines.findIndex((item) => item.startsWith('asin:')), lines.findIndex((item) => item.startsWith('price:')))
    : lines.findIndex((item) => item.startsWith('title:'));
  const index = insertAfter >= 0 ? insertAfter + 1 : lines.length;
  lines.splice(index, 0, line);
  return lines.join('\n');
}

function eventDateFromFile(filePath, data) {
  const fromPubDate = String(data.pubDate || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromPubDate)) return fromPubDate;

  const basename = path.basename(filePath, '.mdx');
  return /^\d{4}-\d{2}-\d{2}$/.test(basename) ? basename : '';
}

function germanDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';

  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00Z`));
}

function venuePhrase(data) {
  const venue = knownText(data.venue);
  const city = knownText(data.city);

  if (venue && city) return ` in ${venue} in ${city}`;
  if (venue) return ` in ${venue}`;
  if (city) return ` in ${city}`;
  return '';
}

function knownText(value) {
  const text = String(value || '').trim();
  return text && !['TBA', '-'].includes(text) ? text : '';
}

function listText(value) {
  return stringList(value).filter((item) => !['TBA', '-'].includes(item));
}

function joinGermanList(items) {
  const values = listText(items);
  if (values.length <= 1) return values[0] || '';
  if (values.length === 2) return `${values[0]} und ${values[1]}`;
  return `${values.slice(0, -1).join(', ')} und ${values.at(-1)}`;
}

function titleOrArtist(data) {
  return knownText(data.title) || listText(data.artist)[0] || '';
}

function generatedDescription(data, eventDate) {
  const category = knownText(data.category) || 'Konzert';
  const title = titleOrArtist(data);
  const tour = knownText(data.tour);
  const date = germanDate(eventDate);
  const location = venuePhrase(data);
  const support = joinGermanList(data.support);
  const guests = joinGermanList(data.guest);
  const artists = joinGermanList(data.artist);

  if (category === 'Festival') {
    return [
      `Eventbericht über ${title}`,
      location,
      date ? ` am ${date}` : '',
      artists ? ` mit ${artists}` : '',
      '.',
    ].join('');
  }

  if (category === 'Lesung') {
    return [
      `Eventbericht über die Lesung von ${title}`,
      tour ? ` auf der ${tour}` : '',
      location,
      date ? ` am ${date}` : '',
      guests ? ` mit ${guests}` : '',
      '.',
    ].join('');
  }

  return [
    `Eventbericht über das Konzert von ${title}`,
    tour ? ` auf der ${tour}` : '',
    location,
    date ? ` am ${date}` : '',
    support ? ` mit ${support}` : '',
    guests ? ` mit ${guests} als Gast` : '',
    '.',
  ].join('');
}

function isWeakDescription(value) {
  const description = String(value || '').trim();
  if (!description || ['TBA', 'TODO'].includes(description)) return true;
  if (/ am \d{4}-\d{2}-\d{2} in /.test(description)) return true;
  return /^[^.]+ am \d{4}-\d{2}-\d{2} in [^.]+\.$/.test(description);
}

async function updateEvent(filePath, { write }) {
  const content = fs.readFileSync(filePath, 'utf8');
  const frontmatter = splitFrontmatter(content);
  if (!frontmatter) return { filePath, skipped: 'missing frontmatter' };

  const data = parseFrontmatter(frontmatter.raw);
  const eventDate = eventDateFromFile(filePath, data);
  if (!eventDate) return { filePath, skipped: 'missing event date' };

  let nextRaw = frontmatter.raw;
  const changes = [];
  const expectedOgImage = eventOgPublicPath(eventDate);
  const currentOgImage = knownText(data.ogImage);
  const sourceImage = firstEventImage(eventDate);
  const targetOgImage = eventOgFilePath(eventDate);

  if ((!currentOgImage || currentOgImage === '/apple-touch-icon.png') && sourceImage) {
    if (write && !fs.existsSync(targetOgImage)) {
      await createEventOgImage({ eventDate, sourceImage });
    }
    nextRaw = replaceFrontmatterField(nextRaw, 'ogImage', expectedOgImage);
    changes.push(fs.existsSync(targetOgImage) || write ? 'ogImage' : 'ogImage target missing');
  } else if (!currentOgImage) {
    nextRaw = replaceFrontmatterField(nextRaw, 'ogImage', '/apple-touch-icon.png');
    changes.push('ogImage fallback');
  }

  if (isWeakDescription(data.description)) {
    nextRaw = replaceFrontmatterField(nextRaw, 'description', generatedDescription(data, eventDate));
    changes.push('description');
  }

  if (write && nextRaw !== frontmatter.raw) {
    fs.writeFileSync(filePath, `---\n${nextRaw}\n---\n${frontmatter.body}`, 'utf8');
  }

  return { filePath, changes, sourceImage };
}

const write = process.argv.includes('--write');
const results = [];

for (const filePath of eventFiles()) {
  results.push(await updateEvent(filePath, { write }));
}

const changed = results.filter((result) => result.changes?.length);
const skipped = results.filter((result) => result.skipped);
const missingGallerySource = results.filter((result) => !result.sourceImage);

for (const result of changed) {
  console.log(`${write ? 'Updated' : 'Would update'} ${result.filePath}: ${result.changes.join(', ')}`);
}

for (const result of skipped) {
  console.log(`Skipped ${result.filePath}: ${result.skipped}`);
}

console.log(`${write ? 'SEO update' : 'SEO audit'} complete. Changed: ${changed.length}. Events without gallery source: ${missingGallerySource.length}.`);

if (!write) {
  console.log('Run npm run event:seo -- --write to apply changes.');
}
