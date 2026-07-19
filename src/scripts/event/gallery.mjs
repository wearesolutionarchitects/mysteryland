// Synchronizes images already imported for an event into its existing MDX gallery.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDateArg, loadEnv } from '../lib/core.mjs';

loadEnv();

const IMAGE_PATTERN = /\.(?:jpe?g|png|webp)$/i;

function escapeSingleQuoted(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function imageTime(filename) {
  const match = filename.match(/_(\d{2})-(\d{2})-(\d{2})\.[^.]+$/);
  return match ? `${match[1]}:${match[2]}` : '';
}

function importBase(filename) {
  const match = filename.match(/_(\d{2})-(\d{2})-(\d{2})\.[^.]+$/);
  return match ? `img${match[1]}${match[2]}${match[3]}` : 'img';
}

function nextImportName(filename, usedNames) {
  const base = importBase(filename);
  let name = base;
  let counter = 2;
  while (usedNames.has(name)) {
    name = `${base}_${counter}`;
    counter += 1;
  }
  usedNames.add(name);
  return name;
}

function displayTitle(content) {
  return content.match(/^displayTitle:\s*["']?(.+?)["']?\s*$/m)?.[1]
    || content.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1]
    || 'Konzert';
}

function galleryItem(variable, filename, title) {
  const time = imageTime(filename);
  const label = time || 'Konzertfoto';
  const alt = time ? `${title} live um ${time} Uhr` : `${title} live`;
  return `        { src: ${variable}, alt: '${escapeSingleQuoted(alt)}', title: '${label}' },`;
}

function eventImportPattern(year, month, day) {
  const directory = `../../../gallery/${year}/${month}/${day}/`.replaceAll('/', '\\/');
  return new RegExp(
    `^import\\s+([A-Za-z_$][\\w$]*)\\s+from\\s+(['"])${directory}([^'"]+)\\2;\\s*$`,
    'gm',
  );
}

function findGalleryBlock(content) {
  const match = content.match(/<Gallery\s*\n\s*images=\{\[\n([\s\S]*?)\n\s*\]\}\s*\n\s*\/>/);
  if (!match || match.index === undefined) return null;
  return {
    body: match[1],
    start: match.index,
    end: match.index + match[0].length,
  };
}

export function syncEventGallery(eventDate, options = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    throw new Error('eventDate must use YYYY-MM-DD');
  }

  const galleryRoot = options.galleryRoot || process.env.GALLERY_ROOT || './src/content/gallery';
  const eventsRoot = options.eventsRoot || process.env.EVENTS_ROOT || './src/content/docs/events';
  const [year, month, day] = eventDate.split('-');
  const galleryDir = path.join(galleryRoot, year, month, day);
  const eventFile = path.join(eventsRoot, year, `${eventDate}.mdx`);

  if (!fs.existsSync(galleryDir)) throw new Error(`Gallery directory not found: ${galleryDir}`);
  if (!fs.existsSync(eventFile)) throw new Error(`Event MDX not found: ${eventFile}`);

  const imageFiles = fs.readdirSync(galleryDir).filter((name) => IMAGE_PATTERN.test(name)).sort();
  if (!imageFiles.length) throw new Error(`No images found in ${galleryDir}`);

  const original = fs.readFileSync(eventFile, 'utf8');
  const block = findGalleryBlock(original);
  if (!block) throw new Error(`Gallery block not found: ${eventFile}`);

  const importPattern = eventImportPattern(year, month, day);
  const existingImports = [...original.matchAll(importPattern)];
  const variableByFilename = new Map(existingImports.map((match) => [match[3], match[1]]));
  const usedNames = new Set(
    [...original.matchAll(/^import\s+([A-Za-z_$][\w$]*)\s+from\s+/gm)].map((match) => match[1]),
  );
  const existingItems = new Map(
    [...block.body.matchAll(/^\s*\{\s*src:\s*([A-Za-z_$][\w$]*)[^\n]*\},?\s*$/gm)]
      .map((match) => [match[1], match[0].trimEnd()]),
  );

  const additions = [];
  for (const filename of imageFiles) {
    if (variableByFilename.has(filename)) continue;
    const variable = nextImportName(filename, usedNames);
    variableByFilename.set(filename, variable);
    additions.push(filename);
  }

  const importLines = imageFiles.map((filename) => {
    const variable = variableByFilename.get(filename);
    return `import ${variable} from '../../../gallery/${year}/${month}/${day}/${filename}';`;
  });

  let updated = original;
  if (existingImports.length) {
    const first = existingImports[0];
    const last = existingImports.at(-1);
    updated = `${updated.slice(0, first.index)}${importLines.join('\n')}${updated.slice(last.index + last[0].length)}`;
  } else {
    const galleryImport = updated.match(/^import Gallery from ['"]@components\/Gallery\.astro['"];\s*$/m);
    if (!galleryImport || galleryImport.index === undefined) {
      throw new Error(`Gallery component import not found: ${eventFile}`);
    }
    const insertAt = galleryImport.index + galleryImport[0].length;
    updated = `${updated.slice(0, insertAt)}\n${importLines.join('\n')}${updated.slice(insertAt)}`;
  }

  const refreshedBlock = findGalleryBlock(updated);
  if (!refreshedBlock) throw new Error(`Gallery block not found after import update: ${eventFile}`);
  const title = displayTitle(updated);
  const itemLines = imageFiles.map((filename) => {
    const variable = variableByFilename.get(filename);
    return existingItems.get(variable) || galleryItem(variable, filename, title);
  });
  const replacement = `<Gallery\n    images={[\n${itemLines.join('\n')}\n    ]}\n/>`;
  updated = `${updated.slice(0, refreshedBlock.start)}${replacement}${updated.slice(refreshedBlock.end)}`;

  const changed = updated !== original;
  if (changed && options.write !== false) fs.writeFileSync(eventFile, updated, 'utf8');
  return { additions, changed, eventFile, imageCount: imageFiles.length };
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  const eventDate = process.argv[2] || '';
  ensureDateArg(eventDate, 'Usage: npm run event:gallery -- YYYY-MM-DD [--dry-run]');
  try {
    const dryRun = process.argv.includes('--dry-run');
    const result = syncEventGallery(eventDate, { write: !dryRun });
    console.log(`${dryRun ? 'Would synchronize' : 'Synchronized'} ${result.imageCount} image(s) in ${result.eventFile}`);
    console.log(result.additions.length
      ? `Added ${result.additions.length} image(s): ${result.additions.join(', ')}`
      : 'No missing gallery images found');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
