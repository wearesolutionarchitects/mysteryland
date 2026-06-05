import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, parseCaption, runCapture, walkDirs } from '../lib/core.mjs';

loadEnv();

const galleryRoot = process.env.GALLERY_ROOT || './src/content/gallery';
const logFile = './README.md';
const contentRoot = './src/content/docs/events';

const allDirs = walkDirs(galleryRoot, 1)
  .filter((dir) => fs.readdirSync(dir).some((name) => /\.jpg$/i.test(name)))
  .sort()
  .reverse();

const lines = [];
lines.push('# Mysterland.biz Repository');
lines.push('');
lines.push('![Mysterland](/public/mysteryland.png)');
lines.push('');
lines.push(`📆 Event-Übersicht – ${new Date().toLocaleString('de-DE', { dateStyle: 'full', timeStyle: 'long' })}`);
lines.push('');

let lastYear = '';
let skipped = 0;

for (const imgDir of allDirs) {
  const rel = path.relative(galleryRoot, imgDir);
  const parts = rel.split(path.sep);
  if (parts.length < 2) continue;

  const year = parts[0];
  let date = '';
  if (parts.length >= 3) date = `${parts[1]}-${parts[2]}`;
  else if (/^\d{2}-\d{2}$/.test(parts[1])) date = parts[1];
  else continue;

  const featuredName = fs.readdirSync(imgDir).filter((name) => /\.jpg$/i.test(name)).sort()[0];
  if (!featuredName) continue;

  const featured = path.join(imgDir, featuredName);
  const captionRaw = runCapture('exiftool', ['-s', '-s', '-s', '-IPTC:Caption-Abstract', featured]);
  const caption = captionRaw || `${year}-${date}`;
  const meta = parseCaption(caption);

  const eventDate = meta.eventDate || `${year}-${date}`;
  const [y, m, d] = eventDate.split('-');
  const externalSlug = meta.eventDate && meta.slugUrl ? meta.slugUrl : `${year}-${date}`;
  const mdxFile = path.join(contentRoot, year, `${year}-${date}.mdx`);
  const mdxLink = `./${mdxFile}`;

  if (!fs.existsSync(mdxFile)) {
    skipped += 1;
    continue;
  }

  if (year !== lastYear) {
    lines.push(`## ${year}`);
    lines.push('');
    lastYear = year;
  }

  lines.push(`### 🎸 [${caption}](${mdxLink})`);
  lines.push('');
  lines.push(`[Externer Link 🔗](https://fanieng.com/${y || year}/${m || parts[1]}/${d || parts[2]}/${externalSlug})`);
  lines.push('');
  lines.push('---');
  lines.push('');
}

fs.writeFileSync(logFile, `${lines.join('\n')}\n`, 'utf8');
console.log(`README.md updated${skipped ? `, skipped ${skipped} gallery dirs without MDX` : ''}`);
