import fs from 'node:fs';
import path from 'node:path';

export function findDuplicateCover(coversRoot, asin, coverBuffer) {
  if (!fs.existsSync(coversRoot)) return '';

  return fs.readdirSync(coversRoot)
    .filter((name) => /\.(?:jpe?g|png|webp)$/i.test(name))
    .filter((name) => path.parse(name).name.toUpperCase() !== asin.toUpperCase())
    .find((name) => fs.readFileSync(path.join(coversRoot, name)).equals(coverBuffer)) || '';
}
