import fs from 'node:fs';
import path from 'node:path';
import { ensureDateArg, loadEnv, parseCaption, runCapture } from '../lib/core.mjs';

loadEnv();

const filterDate = process.argv[2];
ensureDateArg(filterDate, 'Please provide date as YYYY-MM-DD, e.g. 1979-09-29');

const [year, month, day] = filterDate.split('-');
const galleryRoot = process.env.GALLERY_ROOT || './src/content/gallery';
const imgDir = path.join(galleryRoot, year, `${month}-${day}`);
const contentRoot = './src/content/docs/events';

if (!fs.existsSync(imgDir)) {
  console.error(`Directory not found: ${imgDir}`);
  process.exit(1);
}

const mdxYearPath = path.join(contentRoot, year);
const mdxFile = path.join(mdxYearPath, `${filterDate}.mdx`);
fs.mkdirSync(mdxYearPath, { recursive: true });

const jpgFiles = fs.readdirSync(imgDir)
  .filter((name) => /\.jpg$/i.test(name))
  .sort()
  .map((name) => path.join(imgDir, name));

if (!jpgFiles.length) {
  console.error(`No JPG files found in ${imgDir}`);
  process.exit(1);
}

const featured = jpgFiles[0];
const caption = runCapture('exiftool', ['-s', '-s', '-s', '-IPTC:Caption-Abstract', featured]) || 'Untitled Event';
const image = jpgFiles[0];
const fileName = path.basename(image);

const parsed = parseCaption(caption);
const eventDate = parsed.eventDate || filterDate;
const keywordsRaw = runCapture('exiftool', ['-s', '-s', '-s', '-IPTC:Keywords', image]);
const tags = keywordsRaw
  ? keywordsRaw.split(',').map((k) => k.trim()).filter(Boolean).map((k) => `"${k}"`).join(',')
  : '';

const slugUrl = parsed.slugUrl || `${year}-${month}-${day}`;

const mdx = [
  '---',
  `title: "${caption}"`,
  '',
  'description: "Eventbericht"',
  '',
  `pubDate: "${eventDate}"`,
  '',
  `featuredImage: "/src/content/gallery/${year}/${month}-${day}/${fileName}"`,
  '',
  `slug: "${year}/${month}-${day}"`,
  '',
  'gallery:',
  `  - title: "${parsed.event || ''}"`,
  `    venue: "${parsed.venue || ''}"`,
  `    city: "${parsed.city || ''}"`,
  `    artist: "${parsed.artist || ''}"`,
  '',
  `tags: [${tags}]`,
  '---',
  '',
  `![Featured Image](/src/content/gallery/${year}/${month}-${day}/${fileName})`,
  '',
  '## Eventbericht',
  '',
  `➡️ [Originalbericht auf fanieng.com](https://fanieng.com/${year}/${month}-${day}/${slugUrl})`,
  '',
].join('\n');

fs.writeFileSync(mdxFile, mdx, 'utf8');
console.log(`Created ${mdxFile}`);
