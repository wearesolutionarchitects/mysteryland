import fs from 'node:fs';
import path from 'node:path';
import { ensureDateArg, loadEnv, parseCaption, runCapture, runOrThrow, walkFiles } from '../lib/core.mjs';

loadEnv();

const albumDate = process.argv[2];
ensureDateArg(albumDate, 'Please provide date as YYYY-MM-DD, e.g. 1979-09-29');

const [year, month, day] = albumDate.split('-');
const galleryRoot = process.env.MEDIA_SOURCE_ROOT || '/Volumes/Sandisk/Fotos';
const dir = path.join(galleryRoot, year, month, day);
const logFile = path.resolve(process.cwd(), 'exif-debug.log');

if (!fs.existsSync(dir)) {
  console.error(`Directory not found: ${dir}`);
  process.exit(1);
}

const imageFiles = walkFiles(dir).filter((file) => {
  const base = path.basename(file);
  if (base === '.DS_Store' || base.startsWith('._')) return false;
  return /\.(jpg|jpeg|heic|png)$/i.test(file);
});

if (imageFiles.length) {
  runOrThrow('exiftool', ['-FileName<CreateDate', '-d', '%Y-%m-%d_%H-%M-%S%-c.%e', ...imageFiles]);
}

const renamedFiles = walkFiles(dir).filter((file) => /\.(jpg|jpeg|heic|png)$/i.test(file));
const lines = ['# Debug log for EXIF metadata'];

for (const img of renamedFiles) {
  const caption = runCapture('exiftool', ['-s', '-s', '-s', '-IPTC:Caption-Abstract', img]);
  const keywordsRaw = runCapture('exiftool', ['-s', '-s', '-s', '-IPTC:Keywords', img]);
  const meta = parseCaption(caption);
  const dateMatch = caption.match(/\d{2}\.\d{2}\.\d{4}/)?.[0] || 'unknown';

  const keywords = (keywordsRaw || '(none)').split(',').map((k) => k.trim()).filter(Boolean);
  const price = keywords.find((k) => /^€\d+(\.\d{2})?$/.test(k))?.replace('.', ',') || 'unknown';

  lines.push(`Image: ${img}`);
  lines.push(`Description: ${caption || ''}`);
  lines.push(`Date: ${dateMatch}`);
  lines.push(`Artist: ${meta.event || 'unknown'}`);
  lines.push(`City: ${meta.city || 'unknown'}`);
  lines.push(`Venue: ${meta.venue || 'unknown'}`);
  lines.push(`Keywords: ${keywords.length ? `|${keywords.join('|')}` : '(none)'}`);
  lines.push(`Price: ${price}`);
  lines.push('---');
}

fs.writeFileSync(logFile, `${lines.join('\n')}\n`, 'utf8');
console.log(`Done. Updated files in ${dir}`);
