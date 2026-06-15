// src/scripts/event/mdx.mjs
// Generates an event MDX skeleton from images already stored in the gallery.
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, runCapture } from '../lib/core.mjs';

loadEnv();

const eventDate = process.argv[2] || '';
const galleryRoot = process.env.GALLERY_ROOT || './src/content/gallery';
const eventsRoot = process.env.EVENTS_ROOT || './src/content/docs/events';
const exiftool =
  process.env.EXIFTOOL_PATH
  || ['/opt/homebrew/bin/exiftool', '/usr/local/bin/exiftool'].find((candidate) =>
    fs.existsSync(candidate)
  )
  || 'exiftool';

if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
  console.error('Usage: npm run event:mdx -- YYYY-MM-DD');
  process.exit(1);
}

function ensureExiftool() {
  try {
    runCapture(exiftool, ['-ver']);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    console.error('ExifTool wurde nicht gefunden. Installiere es mit: brew install exiftool');
    process.exit(1);
  }
}

function firstString(...values) {
  for (const value of values.flat()) {
    if (String(value || '').trim()) return String(value).normalize('NFC').trim();
  }
  return '';
}

function stringList(...values) {
  return [...new Set(values
    .flat(2)
    .flatMap((value) => Array.isArray(value) ? value : String(value || '').split(','))
    .map((value) => String(value || '').normalize('NFC').trim())
    .filter(Boolean))];
}

function yamlString(value) {
  return JSON.stringify(String(value || ''));
}

function titleData(meta) {
  const candidates = [
    meta.ObjectName,
    meta.Title,
    meta.Headline,
    meta['Caption-Abstract'],
    meta.Description,
  ].flat();

  for (const candidate of candidates) {
    const match = String(candidate || '').normalize('NFC').trim().match(
      /^(\d{2})\.(\d{2})\.(\d{4})\s*[-–—]\s*(.+?)@([^/]+)\/(.+)$/,
    );
    if (!match) continue;

    return {
      date: `${match[3]}-${match[2]}-${match[1]}`,
      artist: match[4].trim(),
      city: match[5].trim(),
      venue: match[6].trim(),
    };
  }

  return null;
}

function countryFromMetadata(metadata, tags) {
  const direct = metadata
    .map((meta) => firstString(meta.Country, meta.CountryPrimaryLocationName))
    .find(Boolean);
  if (direct) return direct;

  const countries = new Map([
    ['deutschland', 'Deutschland'],
    ['germany', 'Deutschland'],
    ['österreich', 'Österreich'],
    ['austria', 'Österreich'],
    ['schweiz', 'Schweiz'],
    ['switzerland', 'Schweiz'],
    ['niederlande', 'Niederlande'],
    ['netherlands', 'Niederlande'],
    ['belgien', 'Belgien'],
    ['belgium', 'Belgien'],
  ]);

  for (const tag of tags) {
    const country = countries.get(tag.toLocaleLowerCase('de-DE'));
    if (country) return country;
  }
  return 'TBA';
}

function priceFromTags(tags) {
  for (const tag of tags) {
    const match = tag.match(/€\s*(\d+)[,.](\d{2})/);
    if (match) return Number(`${match[1]}.${match[2]}`);
  }
  return null;
}

function tourFromTags(tags, event, country, category) {
  const excluded = new Set([
    event.artist,
    event.city,
    event.venue,
    country,
    category,
    'Ticket',
    'Foto',
    'Photo',
    'Plakat',
    'Poster',
  ].map((value) => value.toLocaleLowerCase('de-DE')));

  return tags.find((tag) => {
    const normalized = tag.toLocaleLowerCase('de-DE');
    return !excluded.has(normalized)
      && !/^\d{4}$/.test(tag)
      && !/^€/.test(tag);
  }) || 'TBA';
}

function imageTime(filename) {
  const match = filename.match(/_(\d{2})-(\d{2})-(\d{2})\.[^.]+$/);
  return match ? `${match[1]}:${match[2]}` : '';
}

function importName(filename, usedNames) {
  const match = filename.match(/_(\d{2})-(\d{2})-(\d{2})\.[^.]+$/);
  const base = match ? `img${match[1]}${match[2]}${match[3]}` : 'img';
  let name = base;
  let counter = 2;
  while (usedNames.has(name)) {
    name = `${base}_${counter}`;
    counter += 1;
  }
  usedNames.add(name);
  return name;
}

function galleryLabel(meta, filename) {
  const text = firstString(meta['Caption-Abstract'], meta.Description);
  const keywords = stringList(meta.Keywords, meta.Subject);
  const normalized = `${text} ${keywords.join(' ')}`.toLocaleLowerCase('de-DE');

  if (normalized.includes('plakat') || normalized.includes('poster')) {
    return { alt: 'Plakat', title: 'Plakat' };
  }
  if (normalized.includes('ticket') || normalized.includes('eintrittskarte')) {
    return { alt: 'Ticket', title: 'Ticket' };
  }
  if (normalized.includes('album') || normalized.includes('cover')) {
    return { alt: 'Albumcover', title: 'Albumcover' };
  }

  const time = imageTime(filename);
  return { alt: 'Bühne', title: time || 'Konzertfoto' };
}

const [year, month, day] = eventDate.split('-');
const galleryDir = path.join(galleryRoot, year, month, day);
const targetFile = path.join(eventsRoot, year, `${eventDate}.mdx`);

if (!fs.existsSync(galleryDir)) {
  console.error(`Gallery directory not found: ${galleryDir}`);
  process.exit(1);
}

if (fs.existsSync(targetFile)) {
  console.error(`Event MDX already exists: ${targetFile}`);
  process.exit(1);
}

const imageFiles = fs.readdirSync(galleryDir)
  .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
  .sort();

if (!imageFiles.length) {
  console.error(`No images found in ${galleryDir}`);
  process.exit(1);
}

ensureExiftool();

const metadata = JSON.parse(runCapture(exiftool, [
  '-j',
  '-IPTC:ObjectName',
  '-XMP-dc:Title',
  '-IPTC:Headline',
  '-IPTC:City',
  '-XMP-photoshop:City',
  '-IPTC:Sub-location',
  '-XMP-iptcExt:LocationShownSublocation',
  '-IPTC:Country-PrimaryLocationName',
  '-XMP-photoshop:Country',
  '-IPTC:Keywords',
  '-XMP-dc:Subject',
  '-IPTC:Caption-Abstract',
  '-XMP-dc:Description',
  ...imageFiles.map((name) => path.join(galleryDir, name)),
]));

const parsedEvent = metadata.map(titleData).find((value) => value?.date === eventDate);
if (!parsedEvent) {
  console.error([
    `No matching Photos title found for ${eventDate}.`,
    'Expected: DD.MM.YYYY - Artist@City/Venue',
  ].join('\n'));
  process.exit(1);
}

const tags = stringList(...metadata.map((meta) => [meta.Keywords, meta.Subject]));
const country = countryFromMetadata(metadata, tags);
const price = priceFromTags(tags);
const category = tags.some((tag) => tag.toLocaleLowerCase('de-DE') === 'festival')
  ? 'Festival'
  : 'Konzert';
const event = {
  ...parsedEvent,
  city: metadata
    .map((meta) => firstString(meta.City))
    .find(Boolean) || parsedEvent.city,
  venue: metadata
    .map((meta) => firstString(meta['Sub-location'], meta.LocationShownSublocation))
    .find(Boolean) || parsedEvent.venue,
};
const tour = tourFromTags(tags, event, country, category);
const dateGerman = `${day}.${month}.${year}`;
const priceGerman = price === null
  ? 'TBA'
  : `${price.toFixed(2).replace('.', ',')} €`;
const description = `Eventbericht über das ${category} von ${event.artist} in ${event.venue} in ${event.city} am ${dateGerman}.`;
const outputTags = stringList(
  tags,
  year,
  country,
  event.city,
  event.venue,
  event.artist,
  category,
);

const usedNames = new Set();
const images = imageFiles.map((filename, index) => {
  const variable = importName(filename, usedNames);
  return {
    filename,
    variable,
    ...galleryLabel(metadata[index] || {}, filename),
  };
});

const imports = images
  .map(({ variable, filename }) =>
    `import ${variable} from '../../../gallery/${year}/${month}/${day}/${filename}';`
  )
  .join('\n');
const galleryEntries = images
  .map(({ variable, alt, title }) =>
    `        { src: ${variable}, alt: ${yamlString(alt)}, title: ${yamlString(title)} },`
  )
  .join('\n');

const frontmatter = [
  '---',
  `title: ${yamlString(event.artist)}`,
  `description: ${yamlString(description)}`,
  `tour: ${yamlString(tour)}`,
  `artist: [${yamlString(event.artist)}]`,
  `pubDate: ${eventDate}`,
  `country: ${yamlString(country)}`,
  `city: ${yamlString(event.city)}`,
  `venue: ${yamlString(event.venue)}`,
  ...(price === null ? [] : [`price: ${price.toFixed(2)}`]),
  `tags: [${outputTags.map(yamlString).join(', ')}]`,
  '---',
].join('\n');

const content = `${frontmatter}
import { Card } from '@astrojs/starlight/components';
import EventFacts from '@components/EventFacts.astro';
import Gallery from '@components/Gallery.astro';
${imports}

<EventFacts
    facts={[
        { icon: 'lucide:calendar-days', label: 'Datum', value: ${yamlString(dateGerman)} },
        { icon: 'lucide:route', label: 'Tour', value: ${yamlString(tour)} },
        { icon: 'lucide:mic-vocal', label: 'Support', value: 'TBA' },
        { icon: 'lucide:globe', label: 'Land', value: ${yamlString(country)} },
        { icon: 'lucide:map-pin', label: 'Stadt', value: ${yamlString(event.city)} },
        { icon: 'lucide:landmark', label: 'Venue', value: ${yamlString(event.venue)} },
        { icon: 'lucide:badge-euro', label: 'Preis', value: ${yamlString(priceGerman)} },
        { icon: 'lucide:ticket-check', label: 'Kategorie', value: 'TBA' },
    ]}
/>

TODO: Eventbericht ergänzen.

## Galerie

<Gallery
    images={[
${galleryEntries}
    ]}
/>

## Videos

TODO

## Setlist

<Card title="Songs" icon="list-format">
    TODO
</Card>

## Album

TODO
`;

fs.mkdirSync(path.dirname(targetFile), { recursive: true });
fs.writeFileSync(targetFile, content, 'utf8');
console.log(`Created ${targetFile} from ${imageFiles.length} image(s)`);
