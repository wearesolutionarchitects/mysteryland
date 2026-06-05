import fs from 'node:fs';
import path from 'node:path';
import { ensureDateArg, loadEnv, runCapture, runOrThrow, walkFiles } from '../lib/core.mjs';

loadEnv();

const date = process.argv[2];
const artist = process.argv[3] || '';
const title = process.argv[4] || '';

ensureDateArg(date, 'Please provide date as YYYY-MM-DD, e.g. 2023-06-24');

const [year, month, day] = date.split('-');
const galleryRoot = process.env.GALLERY_ROOT || './src/content/gallery';
const targetDir = path.join(galleryRoot, year, month, day);

if (!fs.existsSync(targetDir)) {
  console.error(`Directory not found: ${targetDir}`);
  process.exit(1);
}

const allImagesRecursive = walkFiles(targetDir).filter((f) => /\.jpg$/i.test(f));
const firstImg = allImagesRecursive[0];
if (!firstImg) {
  console.error('No JPG image found in target directory');
  process.exit(1);
}

const lat = runCapture('exiftool', ['-s3', '-n', '-GPSLatitude', firstImg]);
const lon = runCapture('exiftool', ['-s3', '-n', '-GPSLongitude', firstImg]);

const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
const response = await fetch(reverseUrl, { headers: { 'User-Agent': process.env.ICLOUD_USERNAME || 'mysteryland-script' } });
const json = await response.json();

const address = json.address || {};
const city = address.city || address.town || address.village || '';
const state = address.state || '';
const country = address.country || '';
const countryCode = (address.country_code || '').toUpperCase() || country;

const topLevelJpgs = fs.readdirSync(targetDir)
  .filter((name) => /\.jpg$/i.test(name))
  .map((name) => path.join(targetDir, name));

for (const file of topLevelJpgs) {
  const base = path.basename(file);
  const stem = base.replace(/\.[^.]+$/, '');
  const dateTime = runCapture('exiftool', ['-s3', '-DateTimeOriginal', file]);

  const frontmatter = [
    '---',
    `title: "${dateTime}"`,
    `datetime: "${dateTime}"`,
    `filename: "${base}"`,
    `city: "${city}"`,
    `state: "${state}"`,
    `country: "${country}"`,
    `countryCode: "${countryCode}"`,
    `artist: "${artist}"`,
    `event: "${title}"`,
    `tags: ["${year}", "${city}", "${artist}", "${title}", "Konzert", "Deutschland"]`,
    '---',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(targetDir, `${stem}.md`), frontmatter, 'utf8');

  runOrThrow('exiftool', [
    '-overwrite_original',
    `-XMP:Subject=${artist}`,
    `-XMP:Event=${title}`,
    `-IPTC:City=${city}`,
    `-IPTC:Province-State=${state}`,
    `-IPTC:Country-PrimaryLocationName=${country}`,
    '-IPTC:Country-PrimaryLocationCode=Deutschland',
    `-IPTC:Keywords=${artist},${year},${city},Konzert`,
    file,
  ]);
}

console.log(`Generated markdown and metadata in ${targetDir}`);
