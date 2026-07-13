import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parse as parseYaml } from 'yaml';

const SITE_URL = (process.env.SITE_URL || 'https://mysteryland.biz').replace(/\/$/, '');
const EVENTS_ROOT = process.env.EVENTS_ROOT || './src/content/docs/events';
const GALLERY_ROOT = process.env.GALLERY_ROOT || './src/content/gallery';
const OUTBOX_ROOT = process.env.SOCIAL_OUTBOX || './social-outbox';

const presets = {
  facebook: { width: 1200, height: 630 },
  instagram: { width: 1080, height: 1350 },
  whatsapp: { width: 1080, height: 1920 },
};

function readEvent(eventDate) {
  const filePath = path.join(EVENTS_ROOT, eventDate.slice(0, 4), `${eventDate}.mdx`);
  if (!fs.existsSync(filePath)) throw new Error(`Event not found: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const raw = content.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!raw) throw new Error(`Frontmatter missing: ${filePath}`);
  return { filePath, data: parseYaml(raw) || {} };
}

function cleanHashtag(value) {
  return String(value).replace(/^#/, '').replace(/[^\p{L}\p{N}_]/gu, '');
}

function eventUrl(data) {
  const canonical = data.canonicalUrl || `/events/${String(data.pubDate).slice(0, 4)}/${String(data.pubDate).slice(0, 10)}/`;
  return new URL(canonical, `${SITE_URL}/`).href;
}

function galleryDirectory(eventDate) {
  const [year, month, day] = eventDate.split('-');
  return path.join(GALLERY_ROOT, year, month, day);
}

function findSourceImage(eventDate, imageId) {
  const directory = galleryDirectory(eventDate);
  const files = fs.existsSync(directory) ? fs.readdirSync(directory) : [];
  const match = files.find((name) => /\.(jpe?g|png|webp)$/i.test(name) && name.includes(imageId));
  if (!match) throw new Error(`Social image "${imageId}" not found in ${directory}`);
  return path.join(directory, match);
}

async function renderImage(source, target, { width, height }) {
  const background = await sharp(source)
    .rotate()
    .resize(width, height, { fit: 'cover' })
    .blur(24)
    .modulate({ brightness: 0.55 })
    .jpeg({ quality: 82 })
    .toBuffer();
  const foreground = await sharp(source)
    .rotate()
    .resize(width, height, { fit: 'inside', withoutEnlargement: false })
    .jpeg({ quality: 90 })
    .toBuffer();
  await sharp(background)
    .composite([{ input: foreground, gravity: 'center' }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(target);
}

function copyText(data, url) {
  const social = data.social;
  const artist = Array.isArray(data.artist) ? data.artist.join(', ') : data.artist;
  const hashtags = social.hashtags.map(cleanHashtag).filter(Boolean).map((tag) => `#${tag}`).join(' ');
  const heading = `${artist} – ${data.tour || data.displayTitle || data.title}`;
  return {
    facebook: `${heading}\n\n${social.lead}\n\nDen vollständigen Konzertbericht mit Galerie, Videos und Setlist gibt es auf Mysteryland:\n${url}\n\n${hashtags}`,
    instagram: `${heading} 🤘\n\n${social.lead}\n\nDen vollständigen Konzertbericht mit Galerie, Videos und Setlist findet ihr auf mysteryland.biz.\n\n${hashtags}`,
    whatsappStatus: `${heading}\n\n${social.lead}\n\nMehr auf mysteryland.biz`,
    whatsappMessage: `${heading}\n\n${social.lead}\n\nKonzertbericht, Bilder, Videos und Setlist:\n${url}`,
  };
}

export async function createSocialPack(eventDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) throw new Error('eventDate must use YYYY-MM-DD');
  const { filePath, data } = readEvent(eventDate);
  if (!data.social?.enabled) throw new Error(`Social publishing is not enabled in ${filePath}`);
  if (!data.social.lead || !data.social.images?.length) throw new Error(`social.lead and social.images are required in ${filePath}`);

  const targetRoot = path.join(OUTBOX_ROOT, eventDate);
  fs.rmSync(targetRoot, { recursive: true, force: true });
  fs.mkdirSync(targetRoot, { recursive: true });
  const outputs = [];

  for (const [platform, preset] of Object.entries(presets)) {
    const directory = path.join(targetRoot, platform);
    fs.mkdirSync(directory, { recursive: true });
    for (const [index, imageId] of data.social.images.entries()) {
      const source = findSourceImage(eventDate, imageId);
      const target = path.join(directory, `${String(index + 1).padStart(2, '0')}.jpg`);
      await renderImage(source, target, preset);
      outputs.push({ platform, source, target, ...preset });
    }
  }

  const url = eventUrl(data);
  const text = copyText(data, url);
  fs.writeFileSync(path.join(targetRoot, 'facebook', 'post.txt'), `${text.facebook}\n`);
  fs.writeFileSync(path.join(targetRoot, 'instagram', 'caption.txt'), `${text.instagram}\n`);
  fs.writeFileSync(path.join(targetRoot, 'whatsapp', 'status.txt'), `${text.whatsappStatus}\n`);
  fs.writeFileSync(path.join(targetRoot, 'whatsapp', 'message.txt'), `${text.whatsappMessage}\n`);
  fs.writeFileSync(path.join(targetRoot, 'manifest.json'), `${JSON.stringify({ eventDate, source: filePath, url, generatedAt: new Date().toISOString(), outputs }, null, 2)}\n`);
  return { targetRoot, outputs };
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  const eventDate = process.argv[2] || '';
  try {
    const result = await createSocialPack(eventDate);
    console.log(`Created ${result.outputs.length} social image(s) in ${result.targetRoot}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
