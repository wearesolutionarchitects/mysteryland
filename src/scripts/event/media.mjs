// src/scripts/event/media.mjs
// Renames exported event images from EXIF dates and checks their metadata.
// Creates the gallery Markdown sidecars without modifying the event MDX.
import fs from 'node:fs';
import path from 'node:path';
import { ensureDateArg, loadEnv, runCapture } from '../lib/core.mjs';

loadEnv();

const eventDate = process.argv[2];
const galleryRoot = process.env.GALLERY_ROOT || './src/content/gallery';
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

ensureDateArg(eventDate, 'Usage: npm run event:media -- <YYYY-MM-DD>');

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

function readFrontmatter(file) {
  const content = fs.readFileSync(file, 'utf8');
  const block = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
  const value = (key) => block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
  const unquote = (input) => input.replace(/^["']|["']$/g, '');
  const artists = value('artist').match(/"([^"]+)"/g)?.map(unquote) || [];
  const tagsBlock = block.match(/^tags:\s*\n((?: {2}- .+\n?)*)/m)?.[1] || '';
  const blockTags = tagsBlock.split('\n').map((line) => unquote(line.replace(/^ {2}-\s*/, '').trim())).filter(Boolean);
  const inlineTags = value('tags').match(/"([^"]+)"/g)?.map(unquote) || [];

  return {
    title: unquote(value('title')),
    city: unquote(value('city')),
    country: unquote(value('country')),
    venue: unquote(value('venue')),
    tour: unquote(value('tour')),
    artist: artists[0] || unquote(value('title')),
    tags: blockTags.length ? blockTags : inlineTags,
  };
}

function yamlString(value) {
  return JSON.stringify(String(value || ''));
}

function stringList(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(values
    .map((item) => String(item || '').trim())
    .filter(Boolean))];
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

function timestamp(meta) {
  const raw = meta.DateTimeOriginal || meta.CreateDate || '';
  const match = String(raw).match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}_${match[4]}-${match[5]}-${match[6]}` : '';
}

function uniqueName(dir, stem, currentFile) {
  let counter = 0;
  while (true) {
    const suffix = counter ? `-${counter}` : '';
    const candidate = path.join(dir, `${stem}${suffix}.jpg`);
    if (candidate === currentFile || !fs.existsSync(candidate)) return candidate;
    counter += 1;
  }
}

const [year, month, day] = eventDate.split('-');
const eventFile = path.join('src/content/docs/events', year, `${eventDate}.mdx`);
const galleryDir = path.join(galleryRoot, year, month, day);

if (!fs.existsSync(eventFile)) {
  console.error(`Event not found: ${eventFile}`);
  process.exit(1);
}

if (!fs.existsSync(galleryDir)) {
  console.error(`Gallery directory not found: ${galleryDir}`);
  process.exit(1);
}

const event = readFrontmatter(eventFile);
const category = eventCategory(event.tags);
const headline = eventHeadline(eventDate, event);
const imageFiles = fs.readdirSync(galleryDir)
  .filter((name) => /\.(jpe?g)$/i.test(name))
  .sort()
  .map((name) => path.join(galleryDir, name));

if (!imageFiles.length) {
  console.error(`No JPG images found in ${galleryDir}`);
  process.exit(1);
}

ensureExiftool();

const metadata = JSON.parse(runCapture(exiftool, [
  '-j',
  '-DateTimeOriginal',
  '-CreateDate',
  '-IPTC:Keywords',
  '-XMP-dc:Subject',
  '-IPTC:Caption-Abstract',
  '-XMP-dc:Description',
  ...imageFiles,
]));

let problems = 0;

for (const meta of metadata) {
  const originalFile = meta.SourceFile;
  const stem = timestamp(meta);

  if (!stem) {
    console.error(`Missing EXIF date: ${originalFile}`);
    problems += 1;
    continue;
  }

  if (!stem.startsWith(eventDate)) {
    console.error(`Wrong event date in EXIF: ${originalFile} -> ${stem.slice(0, 10)}`);
    problems += 1;
    continue;
  }

  const targetFile = uniqueName(galleryDir, stem, originalFile);
  if (targetFile !== originalFile) {
    fs.renameSync(originalFile, targetFile);
    console.log(`${path.basename(originalFile)} -> ${path.basename(targetFile)}`);
  }

  const iptcKeywords = stringList(meta.Keywords);
  const xmpKeywords = stringList(meta.Subject);
  const keywords = iptcKeywords.length ? iptcKeywords : xmpKeywords;
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
    problems += 1;
  }

  const expected = [year, event.artist, event.city, event.venue, event.country].filter(Boolean);
  const normalizedKeywords = new Set(keywords.map((keyword) => keyword.toLocaleLowerCase('de-DE')));
  const missing = expected.filter((keyword) => !normalizedKeywords.has(keyword.toLocaleLowerCase('de-DE')));
  if (missing.length) {
    console.warn(`Keyword check ${path.basename(targetFile)}: missing ${missing.join(', ')}`);
  }

  const dateTime = stem.replace(
    /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/,
    '$1:$2:$3 $4:$5:$6'
  );
  const sidecar = targetFile.replace(/\.jpg$/i, '.md');
  const tags = [...new Set([...event.tags, ...keywords])];
  const frontmatter = [
    '---',
    `title: ${yamlString(dateTime)}`,
    `datetime: ${yamlString(dateTime)}`,
    `filename: ${yamlString(path.basename(targetFile))}`,
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

if (problems) {
  console.error(`Media check finished with ${problems} problem(s)`);
  process.exit(1);
}

console.log(`Prepared ${metadata.length} image(s) in ${galleryDir}`);
