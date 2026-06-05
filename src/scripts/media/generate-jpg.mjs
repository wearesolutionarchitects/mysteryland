import fs from 'node:fs';
import path from 'node:path';
import { ensureDateArg, loadEnv, runCapture, walkFiles } from '../lib/core.mjs';

loadEnv();

const eventDate = process.argv[2];
ensureDateArg(eventDate, 'Please provide date as YYYY-MM-DD, e.g. 2026-07-17');

const galleryDir = process.env.GALLERY_ROOT || './src/content/gallery';
const year = eventDate.slice(0, 4);
const monthDay = eventDate.slice(5);
const targetDir = path.join(galleryDir, year, monthDay);

if (fs.existsSync(targetDir)) {
  for (const entry of fs.readdirSync(targetDir)) {
    if (entry.toLowerCase().endsWith('.jpg')) {
      fs.unlinkSync(path.join(targetDir, entry));
    }
  }
}

const jpegFiles = walkFiles(galleryDir).filter((file) => /\.jpeg$/i.test(file));

for (const file of jpegFiles) {
  let dateTime = '';
  for (const tag of ['DateTimeOriginal', 'CreateDate', 'ModifyDate']) {
    try {
      dateTime = runCapture('exiftool', ['-d', '%Y-%m-%d_%H-%M-%S', `-${tag}`, '-s', '-s', '-s', file]);
      if (dateTime) break;
    } catch {
      // continue with next tag
    }
  }

  const dir = path.dirname(file);
  const target = dateTime ? path.join(dir, `${dateTime}.jpg`) : file.replace(/\.jpeg$/i, '.jpg');

  if (!fs.existsSync(target)) {
    console.log(`${file} -> ${target}`);
    fs.renameSync(file, target);
  } else {
    console.log(`Skip existing file: ${target}`);
  }
}

console.log('Done.');
