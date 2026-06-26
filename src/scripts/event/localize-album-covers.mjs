import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const eventsDir = path.join(root, 'src/content/docs/events');
const galleryDir = path.join(root, 'src/content/gallery');

const remoteImagePattern = /<(?<tag>Image|img)\s+src=(?<quote>["'])https:\/\/m\.media-amazon\.com\/images\/I\/(?<remote>[^"']+)\k<quote>(?<attrs>[^>]*)\/?>/g;
const amazonHrefPattern = /https:\/\/www\.amazon\.de\/dp\/(?<asin>[A-Z0-9]{10})/;

const imageExtensions = new Map([
  ['jpg', 'jpg'],
  ['jpeg', 'jpg'],
  ['png', 'png'],
  ['webp', 'webp'],
]);

function eventDateFromFile(file) {
  return path.basename(file, '.mdx');
}

function importPathFor(eventDate, fileName) {
  const [year, month, day] = eventDate.split('-');
  return `../../../gallery/${year}/${month}/${day}/${fileName}`;
}

function variableName(asin, index) {
  return `album${asin}${index > 1 ? `_${index}` : ''}`;
}

function extensionFromRemote(remote) {
  const clean = remote.split('?')[0];
  const match = clean.match(/\.([a-z0-9]+)$/i);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  return imageExtensions.get(ext) || 'jpg';
}

function attrsWithoutRemoteNoise(attrs) {
  return attrs
    .replace(/\/\s*$/g, '')
    .replace(/\swidth=\{?["']?300["']?\}?/g, '')
    .replace(/\sheight=\{?["']?300["']?\}?/g, '')
    .replace(/\sloading=["']lazy["']/g, '')
    .replace(/\sdecoding=["']async["']/g, '')
    .trim();
}

function hasAstroImageImport(content) {
  return /import\s+\{\s*Image\s*\}\s+from\s+['"]astro:assets['"];/.test(content);
}

async function listMdxFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listMdxFiles(fullPath);
    if (entry.isFile() && entry.name.endsWith('.mdx')) return [fullPath];
    return [];
  }));
  return files.flat();
}

async function download(url, target) {
  try {
    await fs.access(target);
    return false;
  } catch {
    // continue
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed ${response.status}: ${url}`);
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
  return true;
}

function findNearestAsin(content, index) {
  const before = content.slice(0, index);
  const lastOpenAnchor = before.lastIndexOf('<a ');
  const lastCloseAnchor = before.lastIndexOf('</a>');
  if (lastOpenAnchor > lastCloseAnchor) {
    const anchor = before.slice(lastOpenAnchor);
    const anchorMatch = anchor.match(amazonHrefPattern);
    if (anchorMatch?.groups?.asin) return anchorMatch.groups.asin;
  }

  const nearbyBefore = content.slice(Math.max(0, index - 700), index);
  const after = content.slice(index, Math.min(content.length, index + 700));
  const near = `${nearbyBefore}${after}`;
  const match = near.match(amazonHrefPattern);
  return match?.groups?.asin || '';
}

function insertImports(content, imports) {
  let updated = content;
  if (!hasAstroImageImport(updated)) {
    const importMatch = updated.match(/^import .+;$/m);
    if (!importMatch) throw new Error('No import block found');
    updated = `${updated.slice(0, importMatch.index)}import { Image } from 'astro:assets';\n${updated.slice(importMatch.index)}`;
  }

  const existingImports = new Set([...updated.matchAll(/^import\s+(\w+)\s+from\s+['"][^'"]+['"];$/gm)].map((match) => match[1]));
  const newImports = imports.filter((item) => !existingImports.has(item.name));
  if (!newImports.length) return updated;

  const lines = newImports
    .map((item) => `import ${item.name} from '${item.path}';`)
    .join('\n');
  const lastImport = [...updated.matchAll(/^import .+;$/gm)].at(-1);
  if (!lastImport) throw new Error('No import insertion point found');
  const insertAt = lastImport.index + lastImport[0].length;
  return `${updated.slice(0, insertAt)}\n${lines}${updated.slice(insertAt)}`;
}

async function processFile(file) {
  const original = await fs.readFile(file, 'utf8');
  const matches = [...original.matchAll(remoteImagePattern)];
  if (!matches.length) return { changed: false, downloaded: 0 };

  const eventDate = eventDateFromFile(file);
  const [year, month, day] = eventDate.split('-');
  const counts = new Map();
  const imports = [];
  let downloaded = 0;
  let updated = original;

  for (const match of matches) {
    const full = match[0];
    const remote = match.groups.remote;
    const asin = findNearestAsin(original, match.index);
    if (!asin) {
      throw new Error(`No ASIN found near remote image in ${file}`);
    }

    const count = (counts.get(asin) || 0) + 1;
    counts.set(asin, count);
    const ext = extensionFromRemote(remote);
    const suffix = count > 1 ? `_${String(count).padStart(2, '0')}` : '';
    const fileName = `${eventDate}_00-00-00_05_${asin}${suffix}.${ext}`;
    const target = path.join(galleryDir, year, month, day, fileName);
    const url = `https://m.media-amazon.com/images/I/${remote}`;
    if (await download(url, target)) downloaded += 1;

    const name = variableName(asin, count);
    const cleanAttrs = attrsWithoutRemoteNoise(match.groups.attrs || '');
    const replacement = `<Image src={${name}} ${cleanAttrs ? `${cleanAttrs} ` : ''}width={300} height={300} />`;
    updated = updated.replace(full, replacement);
    imports.push({ name, path: importPathFor(eventDate, fileName) });
  }

  updated = insertImports(updated, imports);
  if (updated !== original) {
    await fs.writeFile(file, updated);
    return { changed: true, downloaded };
  }
  return { changed: false, downloaded };
}

const files = await listMdxFiles(eventsDir);
let changed = 0;
let downloaded = 0;

for (const file of files) {
  const result = await processFile(file);
  if (result.changed) {
    changed += 1;
    downloaded += result.downloaded;
    console.log(`localized ${path.relative(root, file)} (${result.downloaded} downloaded)`);
  }
}

console.log(`Done. Changed files: ${changed}. Downloaded covers: ${downloaded}.`);
