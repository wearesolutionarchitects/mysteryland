// src/scripts/event/media.mjs
// Moves images from the gallery inbox into YYYY/MM/DD directories.
// Target filenames are generated as YYYY-MM-DD_HH-MM-SS.ext.
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, runCapture } from '../lib/core.mjs';

loadEnv();

const galleryRoot = process.env.GALLERY_ROOT || './src/content/gallery';
const inboxDir = process.env.GALLERY_INBOX || path.join(galleryRoot, 'inbox');
const exiftool =
  process.env.EXIFTOOL_PATH
  || ['/opt/homebrew/bin/exiftool', '/usr/local/bin/exiftool'].find((candidate) =>
    fs.existsSync(candidate)
  )
  || 'exiftool';

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

function timestamp(raw) {
  const match = String(raw || '').match(
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  );
  return match
    ? `${match[1]}-${match[2]}-${match[3]}_${match[4]}-${match[5]}-${match[6]}`
    : '';
}

function timestampFromFilename(file) {
  const match = path.basename(file).match(
    /^(\d{4}-\d{2}-\d{2})[ _](\d{2}-\d{2}-\d{2})/,
  );
  return match ? `${match[1]}_${match[2]}` : '';
}

function timestampFromTitle(meta) {
  const title = [meta.ObjectName, meta.Title, meta.Headline]
    .flat()
    .find((value) => String(value || '').trim());
  const match = String(title || '').match(/^(\d{2})\.(\d{2})\.(\d{4})\s*[-–—]/);
  return match ? `${match[3]}-${match[2]}-${match[1]}_00-00-00` : '';
}

function mediaTimestamp(meta) {
  const fromFilename = timestampFromFilename(meta.SourceFile);
  if (fromFilename) return { value: fromFilename, source: 'filename' };

  const candidates = [
    ['DateTimeOriginal', meta.DateTimeOriginal],
    ['SubSecDateTimeOriginal', meta.SubSecDateTimeOriginal],
    ['ContentCreateDate', meta.ContentCreateDate],
    ['CreationDate', meta.CreationDate],
  ];

  for (const [source, value] of candidates) {
    const result = timestamp(value);
    if (result) return { value: result, source };
  }

  const fromTitle = timestampFromTitle(meta);
  return fromTitle ? { value: fromTitle, source: 'title' } : null;
}

function normalizedExtension(meta) {
  const extension = String(
    meta.FileTypeExtension || path.extname(meta.SourceFile).slice(1),
  ).toLocaleLowerCase('en-US');
  return extension === 'jpeg' ? 'jpg' : extension;
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
  ...imageFiles,
]));

const imports = [];
const reservedTargets = new Set();
let skipped = 0;

for (const meta of metadata) {
  const date = mediaTimestamp(meta);
  const extension = normalizedExtension(meta);

  if (!date) {
    console.error(`Cannot determine date and time: ${meta.SourceFile}`);
    skipped += 1;
    continue;
  }

  if (!['jpg', 'png', 'webp'].includes(extension)) {
    console.error(`Unsupported image type: ${meta.SourceFile} (${extension || 'unknown'})`);
    skipped += 1;
    continue;
  }

  const [eventDate] = date.value.split('_');
  const [year, month, day] = eventDate.split('-');
  const targetFile = path.join(
    galleryRoot,
    year,
    month,
    day,
    `${date.value}.${extension}`,
  );

  if (fs.existsSync(targetFile) || reservedTargets.has(targetFile)) {
    console.error(`Target already exists: ${targetFile}`);
    skipped += 1;
    continue;
  }

  reservedTargets.add(targetFile);
  imports.push({ sourceFile: meta.SourceFile, targetFile, dateSource: date.source });
}

for (const { sourceFile, targetFile, dateSource } of imports) {
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.renameSync(sourceFile, targetFile);
  console.log(
    `${path.basename(sourceFile)} -> ${path.relative(galleryRoot, targetFile)} (${dateSource})`,
  );
}

if (skipped) {
  console.error(`Imported ${imports.length} image(s); ${skipped} file(s) remain in the inbox`);
  process.exit(1);
}

console.log(`Imported ${imports.length} image(s) from ${inboxDir}`);
