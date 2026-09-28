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

export function readEvent(eventDate, eventsRoot = EVENTS_ROOT) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) throw new Error('Invalid event date');
  const filePath = path.join(eventsRoot, eventDate.slice(0, 4), `${eventDate}.mdx`);
  if (!fs.existsSync(filePath)) throw new Error(`Event not found: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const raw = content.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!raw) throw new Error(`Frontmatter missing: ${filePath}`);
  return { filePath, data: parseYaml(raw) || {} };
}

function cleanHashtag(value) {
  return String(value).replace(/^#/, '').replace(/[^\p{L}\p{N}_]/gu, '');
}

function hashtagText(values) {
  return (Array.isArray(values) ? values : [])
    .map(cleanHashtag)
    .filter(Boolean)
    .map((tag) => `#${tag}`)
    .join(' ');
}

function platformSocial(social, platform) {
  return {
    lead: social?.[platform]?.lead ?? social?.lead,
    hashtags: social?.[platform]?.hashtags ?? social?.hashtags ?? [],
    images: social?.[platform]?.images ?? social?.images ?? [],
  };
}

export function validateInstagramConfig(config) {
  if (!config.lead || !Array.isArray(config.images) || config.images.length === 0) {
    throw new Error('social.instagram.lead and social.instagram.images are required');
  }
  if (config.images.length > 10) {
    throw new Error('social.instagram.images supports at most 10 images');
  }
  if (!Array.isArray(config.hashtags)) {
    throw new Error('social.instagram.hashtags must be an array');
  }
  if (config.hashtags.length > 5) {
    throw new Error('social.instagram.hashtags supports at most 5 hashtags');
  }
}

function eventUrl(data) {
  const canonical = data.canonicalUrl || `/events/${String(data.pubDate).slice(0, 4)}/${String(data.pubDate).slice(0, 10)}/`;
  return new URL(canonical, `${SITE_URL}/`).href;
}

function galleryDirectory(eventDate, galleryRoot = GALLERY_ROOT) {
  const [year, month, day] = eventDate.split('-');
  return path.join(galleryRoot, year, month, day);
}

function findSourceImage(eventDate, imageId, galleryRoot) {
  const directory = galleryDirectory(eventDate, galleryRoot);
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

export function copyText(data, url, phase) {
  const social = data.social ?? {};
  const facebook = platformSocial(social, 'facebook');
  const instagram = platformSocial(social, 'instagram');
  const artist = Array.isArray(data.artist) ? data.artist.join(', ') : data.artist;
  const facebookHashtags = hashtagText(facebook.hashtags);
  const instagramHashtags = hashtagText(instagram.hashtags);
  const heading = `${artist} – ${data.tour || data.displayTitle || data.title}`;
  const announcement = phase ? phase === 'before' : data.status === 'scheduled';
  const facebookCta = announcement
    ? 'Alle Infos zum kommenden Konzert auf Mysteryland:'
    : 'Den vollständigen Konzertbericht mit Galerie, Videos und Setlist gibt es auf Mysteryland:';
  const instagramCta = announcement
    ? 'Alle Infos zum kommenden Konzert findet ihr auf mysteryland.biz.'
    : 'Den vollständigen Konzertbericht mit Galerie, Videos und Setlist findet ihr auf mysteryland.biz.';
  const messageCta = announcement ? 'Alle Konzertinfos:' : 'Konzertbericht, Bilder, Videos und Setlist:';
  return {
    facebook: `${heading}\n\n${facebook.lead}\n\n${facebookCta}\n${url}\n\n${facebookHashtags}`,
    instagram: `${heading} 🤘\n\n${instagram.lead}\n\n${instagramCta}\n\n${instagramHashtags}`,
    whatsappStatus: `${heading}\n\n${social.lead}\n\n${url}`,
    whatsappMessage: `${heading}\n\n${social.lead}\n\n${messageCta}\n${url}`,
  };
}

export async function createSocialPack(eventDate, options = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) throw new Error('eventDate must use YYYY-MM-DD');
  const event = readEvent(eventDate, options.eventsRoot);
  const filePath = event.filePath;
  const data = options.data ?? event.data;
  if (!data.social || data.social.enabled === false) throw new Error(`Social publishing is not enabled in ${filePath}`);
  if (!data.social.lead || !Array.isArray(data.social.images) || data.social.images.length === 0) throw new Error(`social.lead and social.images are required in ${filePath}`);
  const instagram = platformSocial(data.social, 'instagram');
  validateInstagramConfig(instagram);

  const targetRoot = path.join(options.outboxRoot ?? OUTBOX_ROOT, eventDate);
  fs.rmSync(targetRoot, { recursive: true, force: true });
  fs.mkdirSync(targetRoot, { recursive: true });
  const outputs = [];

  for (const [platform, preset] of Object.entries(presets)) {
    const directory = path.join(targetRoot, platform);
    fs.mkdirSync(directory, { recursive: true });
    const platformImages = platformSocial(data.social, platform).images;
    for (const [index, imageId] of platformImages.entries()) {
      const source = findSourceImage(eventDate, imageId, options.galleryRoot);
      const target = path.join(directory, `${String(index + 1).padStart(2, '0')}.jpg`);
      await renderImage(source, target, preset);
      outputs.push({ platform, source, target, ...preset });
    }
  }

  const url = eventUrl(data);
  const text = copyText(data, url, options.phase);
  fs.writeFileSync(path.join(targetRoot, 'facebook', 'post.txt'), `${text.facebook}\n`);
  fs.writeFileSync(path.join(targetRoot, 'instagram', 'caption.txt'), `${text.instagram}\n`);
  fs.writeFileSync(path.join(targetRoot, 'whatsapp', 'status.txt'), `${text.whatsappStatus}\n`);
  fs.writeFileSync(path.join(targetRoot, 'whatsapp', 'message.txt'), `${text.whatsappMessage}\n`);
  fs.writeFileSync(path.join(targetRoot, 'manifest.json'), `${JSON.stringify({ eventDate, source: filePath, url, generatedAt: new Date().toISOString(), outputs }, null, 2)}\n`);
  return { targetRoot, outputs, text, url };
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
