// src/scripts/event/media.mjs
// Imports exported event images from the gallery inbox.
// Renames them, writes IPTC/XMP data and creates gallery Markdown sidecars.
// Event MDX generation is intentionally handled by a later script.
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, runCapture } from '../lib/core.mjs';

loadEnv();

const galleryRoot = process.env.GALLERY_ROOT || './src/content/gallery';
const inboxDir = process.env.GALLERY_INBOX || path.join(galleryRoot, 'inbox');
const exiftool =
  process.env.EXIFTOOL_PATH ||
  ['/opt/homebrew/bin/exiftool', '/usr/local/bin/exiftool'].find((candidate) =>
    fs.existsSync(candidate),
  ) ||
  'exiftool';
const creator = 'Heiko Fanieng';
const creatorJobTitle = 'Fachinformatiker:in Anwendungsentwicklung | Regulatory Affairs Manager | SAP Consultant';
const creatorJobTitleIptc = 'Developer & Regulatory Affairs';
const creatorContact = 'heiko@fanieng.com';

function ensureExiftool() {
  try {
    runCapture(exiftool, ['-ver']);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;

    console.error([
      'ExifTool wurde nicht gefunden.',
      'Installiere es unter macOS mit: brew install exiftool',
      'Alternativ kannst du EXIFTOOL_PATH in deiner .env-Datei setzen.',
    ].join('\n'));
    process.exit(1);
  }
}

function firstString(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const item = value.find((entry) => String(entry || '').trim());
      if (item) return String(item).trim();
    } else if (String(value || '').trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function yamlString(value) {
  return JSON.stringify(String(value || ''));
}

function stringList(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(values
    .map((item) => String(item || '').normalize('NFC').trim())
    .filter(Boolean))];
}

function normalizedText(...values) {
  return stringList(values.flat())
    .join(' ')
    .toLocaleLowerCase('de-DE');
}

function priceFromMetadata(meta) {
  const values = stringList([meta.Keywords, meta.Subject].flat());
  for (const value of values) {
    const match = value.match(/€\s*(\d+)[,.](\d{2})/);
    if (match) {
      return {
        value: `${match[1]}.${match[2]}`,
        suffix: `${match[1]}-${match[2]}`,
      };
    }
  }
  return null;
}

function asinFromMetadata(meta) {
  const values = stringList([meta.Keywords, meta.Subject].flat());
  for (const value of values) {
    const match = value.toUpperCase().match(/\b(B[0-9A-Z]{9})\b/);
    if (match) return match[1];
  }
  return '';
}

function explicitMediaRole(meta) {
  const text = normalizedText(
    meta.Keywords,
    meta.Subject,
    meta['Caption-Abstract'],
    meta.Description,
  );

  if (/\b(plakat|poster)\b/.test(text)) return 'poster';
  if (/\b(ticket|eintrittskarte)\s*(vorderseite|front)\b/.test(text)) return 'ticket-front';
  if (/\b(ticket|eintrittskarte)\s*(rückseite|rueckseite|back)\b/.test(text)) {
    return 'ticket-back';
  }
  if (/\b(album|albumcover|album cover|cover front|front cover|front-side-cover)\b/.test(text)) {
    return 'album';
  }
  if (/\b(foto|photo|konzertfoto)\b/.test(text)) return 'photo';
  if (/\b(ticket|eintrittskarte)\b/.test(text)) return 'ticket';
  return '';
}

function mediaDefinition(role) {
  return {
    poster: { code: '01', type: 'poster' },
    'ticket-front': { code: '02', type: 'ticket-front' },
    'ticket-back': { code: '03', type: 'ticket-back' },
    photo: { code: '04', type: 'photo' },
    album: { code: '05', type: 'album-cover' },
  }[role];
}

function eventCategory(tags) {
  const normalizedTags = new Set(tags.map((tag) => tag.toLocaleLowerCase('de-DE')));
  if (normalizedTags.has('festival')) return { code: 'FES', label: 'Festival' };
  return { code: 'KON', label: 'Konzert' };
}

function eventHeadline(date, event) {
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year} - ${event.artist}@${event.city}/${event.venue}`;
}

function eventFromMedia(meta, eventDate) {
  const title = firstString(meta.ObjectName, meta.Title, meta.Headline);
  const match = title.match(
    /^(\d{2})\.(\d{2})\.(\d{4})\s*[-–—]\s*(.+?)@([^/]+)\/(.+)$/,
  );
  if (!match) return null;

  const [, day, month, year, artist, city, venue] = match;
  if (`${year}-${month}-${day}` !== eventDate) return null;

  const tags = stringList([meta.Keywords, meta.Subject].flat());
  const country = firstString(meta.Country, meta.CountryPrimaryLocationName)
    || tags.find((tag) =>
      [
        'deutschland',
        'germany',
        'österreich',
        'austria',
        'schweiz',
        'switzerland',
        'niederlande',
        'netherlands',
        'belgien',
        'belgium',
      ].includes(tag.toLocaleLowerCase('de-DE'))
    )
    || '';

  return {
    title: artist.trim(),
    artist: artist.trim(),
    city: city.trim(),
    country,
    venue: venue.trim(),
    tour: '',
    tags,
  };
}

function writeIptcMetadata(file, metadata) {
  if (metadata.keywords.length) {
    runCapture(exiftool, [
      '-overwrite_original',
      '-IPTC:Keywords=',
      file,
    ]);
  }

  const args = [
    '-overwrite_original',
    '-charset',
    'IPTC=UTF8',
    '-IPTC:CodedCharacterSet=UTF8',
  ];

  if (metadata.keywords.length) {
    args.push(...metadata.keywords.map((keyword) => `-IPTC:Keywords+=${keyword}`));
  }

  if (metadata.caption) args.push(`-IPTC:Caption-Abstract=${metadata.caption}`);

  args.push(`-IPTC:ObjectName=${metadata.headline}`);
  args.push(`-XMP-dc:Title=${metadata.headline}`);
  args.push(`-IPTC:Headline=${metadata.headline}`);
  args.push(`-XMP-photoshop:Headline=${metadata.headline}`);
  args.push(`-IPTC:Category=${metadata.category.code}`);
  args.push(`-XMP-photoshop:Category=${metadata.category.code}`);
  args.push(`-IPTC:SupplementalCategories=${metadata.category.label}`);
  args.push(`-XMP-photoshop:SupplementalCategories=${metadata.category.label}`);
  args.push(`-IPTC:City=${metadata.city}`);
  args.push(`-IPTC:Sub-location=${metadata.venue}`);
  args.push(`-IPTC:Country-PrimaryLocationName=${metadata.country}`);
  args.push(`-XMP-iptcExt:LocationShownCity=${metadata.city}`);
  args.push(`-XMP-iptcExt:LocationShownSublocation=${metadata.venue}`);
  args.push(`-XMP-iptcExt:LocationShownCountryName=${metadata.country}`);

  if (metadata.isOwnPhoto) {
    const copyright = `(C) ${metadata.year} | mysteryland.biz | fanieng.com`;
    args.push(`-IPTC:By-line=${creator}`);
    args.push(`-XMP-dc:Creator=${creator}`);
    args.push(`-IPTC:By-lineTitle=${creatorJobTitleIptc}`);
    args.push(`-XMP-photoshop:AuthorsPosition=${creatorJobTitle}`);
    args.push(`-IPTC:CopyrightNotice=${copyright}`);
    args.push(`-XMP-dc:Rights=${copyright}`);
    args.push(`-IPTC:Contact=${creatorContact}`);
    args.push(`-XMP-iptcCore:CreatorWorkEmail=${creatorContact}`);
    args.push(`-IPTC:Writer-Editor=${creator}`);
    args.push(`-XMP-photoshop:CaptionWriter=${creator}`);
  }

  runCapture(exiftool, [...args, file]);
}

function timestampValue(raw) {
  const match = String(raw).match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}_${match[4]}-${match[5]}-${match[6]}` : '';
}

function filenameTimestamp(file) {
  return path.basename(file).match(/^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/)?.[1] || '';
}

function titleEventDate(meta) {
  const title = firstString(meta.ObjectName, meta.Title, meta.Headline);
  const match = title.match(/^(\d{2})\.(\d{2})\.(\d{4})\s*[-–—]/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

function metadataDate(meta) {
  const fromTitle = titleEventDate(meta);
  const fromFilename = filenameTimestamp(meta.SourceFile);

  // Photos may display a library-adjusted date without writing it back to EXIF.
  // A normalized export filename is therefore more reliable than stale embedded dates.
  if (fromFilename && (!fromTitle || fromFilename.startsWith(fromTitle))) {
    return {
      eventDate: fromFilename.slice(0, 10),
      stem: fromFilename,
      source: 'filename',
    };
  }

  const candidates = [
    ['DateTimeOriginal', meta.DateTimeOriginal],
    ['SubSecDateTimeOriginal', meta.SubSecDateTimeOriginal],
    ['ContentCreateDate', meta.ContentCreateDate],
    ['CreationDate', meta.CreationDate],
  ];

  for (const [source, value] of candidates) {
    const stem = timestampValue(value);
    if (!stem) continue;
    if (!fromTitle || stem.startsWith(fromTitle)) {
      return { eventDate: stem.slice(0, 10), stem, source };
    }
  }

  if (fromTitle) {
    return {
      eventDate: fromTitle,
      stem: `${fromTitle}_00-00-00`,
      source: 'title',
    };
  }

  return null;
}

function normalizedExtension(meta) {
  const extension = String(meta.FileTypeExtension || path.extname(meta.SourceFile).slice(1))
    .toLocaleLowerCase('en-US');
  return extension === 'jpeg' ? 'jpg' : extension;
}

function uniqueName(dir, stem, extension, reservedNames = new Set()) {
  let counter = 0;
  while (true) {
    const suffix = counter ? `-${counter}` : '';
    const candidate = path.join(dir, `${stem}${suffix}.${extension}`);
    if (!fs.existsSync(candidate) && !reservedNames.has(candidate)) return candidate;
    counter += 1;
  }
}

function classifiedStem(date, media, price, asin) {
  const timestamp = media.type === 'album-cover'
    ? `${date.eventDate}_00-00-00`
    : date.stem;
  const suffix = [timestamp, media.code];
  if (media.type === 'ticket-front' && price) suffix.push(price.suffix);
  if (media.type === 'album-cover' && asin) suffix.push(asin);
  return suffix.join('_');
}

if (!fs.existsSync(inboxDir)) {
  console.error(`Gallery inbox not found: ${inboxDir}`);
  process.exit(1);
}

const imageFiles = fs.readdirSync(inboxDir)
  .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
  .sort()
  .map((name) => path.join(inboxDir, name));

if (!imageFiles.length) {
  console.log(`No supported images found in ${inboxDir}`);
  process.exit(0);
}

ensureExiftool();

const metadata = JSON.parse(runCapture(exiftool, [
  '-j',
  '-FileTypeExtension',
  '-DateTimeOriginal',
  '-SubSecDateTimeOriginal',
  '-ContentCreateDate',
  '-CreationDate',
  '-IPTC:ObjectName',
  '-XMP-dc:Title',
  '-IPTC:Headline',
  '-IPTC:Country-PrimaryLocationName',
  '-XMP-photoshop:Country',
  '-IPTC:Keywords',
  '-XMP-dc:Subject',
  '-IPTC:Caption-Abstract',
  '-XMP-dc:Description',
  ...imageFiles,
]));

const reservedNames = new Set();
const imports = [];
let skipped = 0;
let metadataProblems = 0;
const datedMedia = metadata.map((meta) => ({ meta, date: metadataDate(meta) }));
const eventsByDate = new Map();
const ticketRoles = new Map();

for (const { meta, date } of datedMedia) {
  if (!date || eventsByDate.has(date.eventDate)) continue;
  const event = eventFromMedia(meta, date.eventDate);
  if (event) eventsByDate.set(date.eventDate, event);
}

for (const eventDate of new Set(datedMedia.map(({ date }) => date?.eventDate).filter(Boolean))) {
  const genericTickets = datedMedia
    .filter(({ meta, date }) =>
      date?.eventDate === eventDate && explicitMediaRole(meta) === 'ticket'
    )
    .sort((left, right) => left.date.stem.localeCompare(right.date.stem));

  if (genericTickets[0]) ticketRoles.set(genericTickets[0].meta.SourceFile, 'ticket-front');
  if (genericTickets[1]) ticketRoles.set(genericTickets[1].meta.SourceFile, 'ticket-back');
}

for (const { meta, date } of datedMedia) {
  if (!date) {
    console.error(`Cannot determine event date: ${meta.SourceFile}`);
    skipped += 1;
    continue;
  }

  const extension = normalizedExtension(meta);
  if (!['jpg', 'png', 'webp'].includes(extension)) {
    console.error(`Unsupported image type: ${meta.SourceFile} (${extension || 'unknown'})`);
    skipped += 1;
    continue;
  }

  const [year, month, day] = date.eventDate.split('-');
  const event = eventsByDate.get(date.eventDate);
  const role = ticketRoles.get(meta.SourceFile) || explicitMediaRole(meta);
  const media = mediaDefinition(role);

  if (!event) {
    console.error([
      `Cannot determine event metadata for ${meta.SourceFile}`,
      `At least one file for ${date.eventDate} needs the Photos title:`,
      'DD.MM.YYYY - Artist@City/Venue',
    ].join('\n'));
    skipped += 1;
    continue;
  }

  if (!media) {
    console.error(`Cannot determine media type: ${meta.SourceFile}`);
    skipped += 1;
    continue;
  }

  const price = priceFromMetadata(meta);
  const asin = asinFromMetadata(meta);

  if (media.type === 'ticket-front' && !price) {
    console.error(`Ticket front is missing a price keyword: ${meta.SourceFile}`);
    skipped += 1;
    continue;
  }

  if (media.type === 'album-cover' && !asin) {
    console.error(`Album cover is missing an ASIN keyword: ${meta.SourceFile}`);
    skipped += 1;
    continue;
  }

  const galleryDir = path.join(galleryRoot, year, month, day);
  const stem = classifiedStem(date, media, price, asin);
  const targetFile = uniqueName(galleryDir, stem, extension, reservedNames);
  reservedNames.add(targetFile);
  imports.push({
    meta,
    targetFile,
    date,
    event,
    category: eventCategory(event.tags),
    headline: eventHeadline(date.eventDate, event),
    year,
    media,
    price: media.type === 'ticket-front' ? price : null,
    asin: media.type === 'album-cover' ? asin : '',
    outputTimestamp: stem.slice(0, 19),
  });
}

for (const {
  meta,
  targetFile,
  date,
  event,
  category,
  headline,
  year,
  media,
  price,
  asin,
  outputTimestamp,
} of imports) {
  const originalFile = meta.SourceFile;
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.renameSync(originalFile, targetFile);
  console.log(
    `${path.basename(originalFile)} -> ${path.relative(galleryRoot, targetFile)} (${date.source})`,
  );

  const keywords = stringList([meta.Keywords, meta.Subject].flat());
  const iptcCaption = String(meta['Caption-Abstract'] || '').trim();
  const xmpCaption = String(meta.Description || '').trim();
  const isOwnPhoto = keywords.some((keyword) => keyword.toLocaleLowerCase('de-DE') === 'foto');

  writeIptcMetadata(targetFile, {
    keywords,
    caption: iptcCaption || xmpCaption,
    headline,
    category,
    isOwnPhoto,
    year,
    city: event.city,
    venue: event.venue,
    country: event.country,
  });
  console.log(`IPTC updated: ${path.basename(targetFile)}`);

  if (!keywords.length) {
    console.error(`Missing keywords: ${targetFile}`);
    metadataProblems += 1;
  }

  const expected = [year, event.artist, event.city, event.venue, event.country].filter(Boolean);
  const normalizedKeywords = new Set(keywords.map((keyword) => keyword.toLocaleLowerCase('de-DE')));
  const missing = expected.filter((keyword) => !normalizedKeywords.has(keyword.toLocaleLowerCase('de-DE')));
  if (missing.length) {
    console.warn(`Keyword check ${path.basename(targetFile)}: missing ${missing.join(', ')}`);
  }

  const dateTime = outputTimestamp.replace(
    /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/,
    '$1:$2:$3 $4:$5:$6'
  );
  const sidecar = targetFile.replace(/\.[^.]+$/i, '.md');
  const tags = [...new Set([...event.tags, ...keywords])];
  const frontmatter = [
    '---',
    `title: ${yamlString(dateTime)}`,
    `datetime: ${yamlString(dateTime)}`,
    `filename: ${yamlString(path.basename(targetFile))}`,
    `mediaType: ${yamlString(media.type)}`,
    `mediaCode: ${yamlString(media.code)}`,
    ...(price ? [`price: ${yamlString(price.value)}`] : []),
    ...(asin ? [`asin: ${yamlString(asin)}`] : []),
    ...(event.city ? [`city: ${yamlString(event.city)}`] : []),
    ...(event.country ? [`country: ${yamlString(event.country)}`] : []),
    `artist: ${yamlString(event.artist)}`,
    `event: ${yamlString(event.tour || event.title)}`,
    `tags: [${tags.map(yamlString).join(', ')}]`,
    '---',
    '',
  ].join('\n');

  fs.writeFileSync(sidecar, frontmatter, 'utf8');
}

if (skipped || metadataProblems) {
  const details = [
    `Imported ${imports.length} image(s)`,
    skipped ? `${skipped} file(s) remain in the inbox` : '',
    metadataProblems ? `${metadataProblems} imported file(s) have metadata problems` : '',
  ].filter(Boolean);
  console.error(details.join('; '));
  process.exit(1);
}

console.log(`Imported ${imports.length} image(s) from ${inboxDir}`);
