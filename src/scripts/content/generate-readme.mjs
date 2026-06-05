import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, parseCaption, runCapture, walkDirs } from '../lib/core.mjs';

loadEnv();

const galleryRoot = process.env.GALLERY_ROOT || './src/content/gallery';
const logFile = './README.md';

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

for (const imgDir of allDirs) {
  const rel = imgDir.replace(`${galleryRoot}/`, '');
  const parts = rel.split('/');
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
  const externalSlug = meta.slugUrl || `${d || '01'}-${m || '01'}-${y || year}`;

  if (year !== lastYear) {
    lines.push(`## ${year}`);
    lines.push('');
    lastYear = year;
  }

  lines.push(`### 🎸 [${caption}](./src/content/docs/events/${year}/${year}-${date}.mdx)`);
  lines.push('');
  lines.push(`[Externer Link 🔗](https://fanieng.com/${year}/${date}/${externalSlug})`);
  lines.push('');
  lines.push('---');
  lines.push('');
}

fs.writeFileSync(logFile, `${lines.join('\n')}\n`, 'utf8');
console.log('README.md updated');
