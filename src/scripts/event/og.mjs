// src/scripts/event/og.mjs
// Generates public Open Graph preview images for events from gallery images.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const DEFAULT_GALLERY_ROOT = './src/content/gallery';
const DEFAULT_OG_ROOT = './public/og/events';

export function eventOgPublicPath(eventDate) {
  const year = String(eventDate || '').slice(0, 4);
  return `/og/events/${year}/${eventDate}.jpg`;
}

export function eventOgFilePath(eventDate, ogRoot = DEFAULT_OG_ROOT) {
  const year = String(eventDate || '').slice(0, 4);
  return path.join(ogRoot, year, `${eventDate}.jpg`);
}

export function firstEventImage(eventDate, galleryRoot = DEFAULT_GALLERY_ROOT) {
  const [year, month, day] = String(eventDate || '').split('-');
  const galleryDir = path.join(galleryRoot, year, month, day);

  if (!fs.existsSync(galleryDir)) return '';

  const image = fs.readdirSync(galleryDir)
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .sort()
    .at(0);

  return image ? path.join(galleryDir, image) : '';
}

export async function createEventOgImage({
  eventDate,
  sourceImage,
  galleryRoot = DEFAULT_GALLERY_ROOT,
  ogRoot = DEFAULT_OG_ROOT,
} = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(eventDate || ''))) {
    throw new Error('eventDate must use YYYY-MM-DD');
  }

  const source = sourceImage || firstEventImage(eventDate, galleryRoot);
  if (!source) {
    throw new Error(`No source image found for ${eventDate}`);
  }
  if (!fs.existsSync(source)) {
    throw new Error(`Source image does not exist: ${source}`);
  }

  const target = eventOgFilePath(eventDate, ogRoot);
  fs.mkdirSync(path.dirname(target), { recursive: true });

  const resized = await sharp(source)
    .rotate()
    .resize({
      width: 1120,
      height: 550,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer();

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: '#000000',
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .jpeg({ quality: 82 })
    .toFile(target);

  return {
    filePath: target,
    publicPath: eventOgPublicPath(eventDate),
    sourceImage: source,
  };
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  const eventDate = process.argv[2] || '';
  const sourceImage = process.argv[3] || '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    console.error('Usage: npm run event:og -- YYYY-MM-DD [source-image]');
    process.exit(1);
  }

  try {
    const result = await createEventOgImage({ eventDate, sourceImage });
    console.log(`Created ${result.filePath} from ${result.sourceImage}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
