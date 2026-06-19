// src/scripts/event/outbox.mjs
// Generates social-media export images for upcoming events.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { firstEventImage } from './og.mjs';

const DEFAULT_GALLERY_ROOT = './src/content/gallery';
const DEFAULT_OUTBOX_ROOT = './src/content/gallery/outbox';

const presets = [
  {
    name: 'facebook',
    width: 1200,
    height: 630,
    fileName: 'facebook.jpg',
  },
  {
    name: 'instagram',
    width: 1080,
    height: 1080,
    fileName: 'instagram.jpg',
  },
  {
    name: 'whatsapp-status',
    width: 1080,
    height: 1920,
    fileName: 'whatsapp-status.jpg',
  },
];

function eventOutboxDir(eventDate, outboxRoot = DEFAULT_OUTBOX_ROOT) {
  return path.join(outboxRoot, eventDate);
}

async function renderSocialImage({ source, target, width, height }) {
  const resized = await sharp(source)
    .rotate()
    .resize({
      width,
      height,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#000000',
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .jpeg({ quality: 86 })
    .toFile(target);
}

export async function createEventOutboxImages({
  eventDate,
  sourceImage,
  galleryRoot = DEFAULT_GALLERY_ROOT,
  outboxRoot = DEFAULT_OUTBOX_ROOT,
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

  const targetDir = eventOutboxDir(eventDate, outboxRoot);
  fs.mkdirSync(targetDir, { recursive: true });

  const results = [];
  for (const preset of presets) {
    const target = path.join(targetDir, preset.fileName);
    await renderSocialImage({
      source,
      target,
      width: preset.width,
      height: preset.height,
    });
    results.push({
      name: preset.name,
      filePath: target,
      width: preset.width,
      height: preset.height,
    });
  }

  return {
    sourceImage: source,
    targetDir,
    images: results,
  };
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  const eventDate = process.argv[2] || '';
  const sourceImage = process.argv[3] || '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    console.error('Usage: npm run event:outbox -- YYYY-MM-DD [source-image]');
    process.exit(1);
  }

  try {
    const result = await createEventOutboxImages({ eventDate, sourceImage });
    console.log(`Created social outbox in ${result.targetDir} from ${result.sourceImage}`);
    for (const image of result.images) {
      console.log(`${image.name}: ${image.filePath} (${image.width}x${image.height})`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
