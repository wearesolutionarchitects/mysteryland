// src/scripts/event/outbox.ts
// Generates social-media export images for upcoming events.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { replaceExportDirectory } from '../lib/export-directory.ts';
import sharp from 'sharp';
import { parse as parseYaml } from 'yaml';

const DEFAULT_EVENTS_ROOT = './src/content/docs/events';
const DEFAULT_GALLERY_ROOT = './src/content/gallery';
const DEFAULT_OUTBOX_ROOT = './src/content/gallery/outbox';

const eventsRoot = process.env.EVENTS_ROOT || DEFAULT_EVENTS_ROOT;
const galleryRoot = process.env.GALLERY_ROOT || DEFAULT_GALLERY_ROOT;
const outboxRoot = process.env.GALLERY_OUTBOX || DEFAULT_OUTBOX_ROOT;

const presets = [
  {
    name: 'facebook',
    width: 1200,
    height: 630,
  },
  {
    name: 'instagram',
    width: 1080,
    height: 1350,
  },
  {
    name: 'whatsapp-status',
    width: 1080,
    height: 1920,
  },
];

function walkMdxFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkMdxFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.mdx') ? [fullPath] : [];
  });
}

function frontmatter(content: string) {
  return content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
}

function eventDateFromFile(filePath: string) {
  return path.basename(filePath, '.mdx');
}

function localToday() {
  return process.env.TODAY || new Date().toISOString().slice(0, 10);
}

function dateString(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || '').slice(0, 10);
}

function isUpcomingEvent(event: { pubDate: string; status?: string }, today = localToday()) {
  const eventDate = dateString(event.pubDate);
  const status = String(event.status || '').toLowerCase();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return false;
  if (['completed', 'cancelled'].includes(status)) return false;

  return eventDate >= today;
}

function eventGalleryDir(eventDate: string) {
  const [year, month, day] = eventDate.split('-');
  return path.join(galleryRoot, year, month, day);
}

function eventImages(eventDate: string) {
  const directory = eventGalleryDir(eventDate);
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory)
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .sort()
    .map((name) => path.join(directory, name));
}

function outputName(eventDate: string, sourceImage: string) {
  const baseName = path.basename(sourceImage, path.extname(sourceImage));
  return `${baseName.startsWith(eventDate) ? baseName : `${eventDate}_${baseName}`}.jpg`;
}

function keepOtherDates(staged: string, onlyDate: string) {
  if (!fs.existsSync(outboxRoot)) return;
  fs.cpSync(outboxRoot, staged, {
    recursive: true,
    verbatimSymlinks: true,
    mode: fs.constants.COPYFILE_FICLONE,
    filter(source) {
      const relative = path.relative(outboxRoot, source);
      if (relative === onlyDate) return false;
      const [channel, filename] = relative.split(path.sep);
      return !(presets.some(preset => preset.name === channel) && filename?.startsWith(onlyDate));
    },
  });
}

async function renderSocialImage({ source, target, width, height }: { source: string; target: string; width: number; height: number }) {
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

function readEvents({ onlyDate }: { onlyDate?: string } = {}) {
  return walkMdxFiles(eventsRoot)
    .map((filePath) => {
      const data = parseYaml(frontmatter(fs.readFileSync(filePath, 'utf8'))) || {};
      const eventDate = dateString(data.pubDate) || eventDateFromFile(filePath);
      return {
        filePath,
        eventDate,
        status: data.status,
        pubDate: data.pubDate || eventDate,
        title: data.title || eventDate,
      };
    })
    .filter((event) => !onlyDate || event.eventDate === onlyDate);
}

export async function createEventOutboxImages({
  onlyDate = '',
  today = localToday(),
} = {}) {
  if (onlyDate && !/^\d{4}-\d{2}-\d{2}$/.test(onlyDate)) {
    throw new Error('eventDate must use YYYY-MM-DD');
  }

  const events = readEvents({ onlyDate })
    .filter((event) => onlyDate || isUpcomingEvent(event, today))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  return replaceExportDirectory(outboxRoot, async staged => {
    const results = [];
    const skipped = [];

    if (onlyDate) keepOtherDates(staged, onlyDate);
    fs.writeFileSync(path.join(staged, '.gitkeep'), '');

    for (const event of events) {
      const images = eventImages(event.eventDate);
      if (!images.length) {
        skipped.push({ eventDate: event.eventDate, reason: 'no gallery images' });
        continue;
      }

      for (const source of images) {
        for (const preset of presets) {
          const presetDir = path.join(staged, preset.name);
          fs.mkdirSync(presetDir, { recursive: true });
          const target = path.join(presetDir, outputName(event.eventDate, source));
          await renderSocialImage({
            source,
            target,
            width: preset.width,
            height: preset.height,
          });
          results.push({
            eventDate: event.eventDate,
            preset: preset.name,
            source,
            filePath: path.join(outboxRoot, preset.name, path.basename(target)),
            width: preset.width,
            height: preset.height,
          });
        }
      }
    }

    return {
      events,
      images: results,
      skipped,
    };
  });
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  const onlyDate = process.argv[2] || '';

  if (onlyDate && !/^\d{4}-\d{2}-\d{2}$/.test(onlyDate)) {
    console.error('Usage: npm run event:outbox -- [YYYY-MM-DD]');
    process.exit(1);
  }

  try {
    const result = await createEventOutboxImages({ onlyDate });
    const eventCount = new Set(result.images.map((image) => image.eventDate)).size;
    console.log(`Created ${result.images.length} social image(s) for ${eventCount} event(s) in ${outboxRoot}`);
    for (const skipped of result.skipped) {
      console.log(`Skipped ${skipped.eventDate}: ${skipped.reason}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
