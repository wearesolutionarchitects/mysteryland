// src/scripts/event/album.mjs
// Adds one Amazon album card to an existing event MDX.
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from '../lib/core.mjs';

loadEnv();

const eventDate = process.argv[2] || '';
const asin = String(process.argv[3] || '').toUpperCase();
const eventsRoot = process.env.EVENTS_ROOT || './src/content/docs/events';
const coversRoot = process.env.COVERS_ROOT || './src/content/gallery/cover';
const amazonHost = process.env.AMAZON_HOST || 'www.amazon.de';
const affiliateTag = process.env.AMAZON_AFFILIATE_TAG || 'mysteryland-21';

if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !/^[A-Z0-9]{10}$/.test(asin)) {
  console.error('Usage: npm run event:album -- YYYY-MM-DD ASIN');
  process.exit(1);
}

function decodeHtml(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function productData(html) {
  const title = decodeHtml(
    html.match(/<span[^>]+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]
      ?.replace(/<[^>]+>/g, '')
    || html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1]
    || '',
  );
  const image = decodeHtml(
    html.match(/"hiRes"\s*:\s*"([^"]+)"/)?.[1]
    || html.match(/"large"\s*:\s*"([^"]+)"/)?.[1]
    || html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1]
    || '',
  ).replace(/\\u0026/g, '&').replace(/\\\//g, '/');

  return { title, image };
}

function existingAsins(frontmatter) {
  const line = frontmatter.match(/^asin:\s*(.+)$/m)?.[1] || '';
  return [...line.matchAll(/[A-Z0-9]{10}/g)].map((match) => match[0]);
}

function updateAsin(frontmatter, values) {
  const unique = [...new Set(values)];
  const value = unique.length === 1
    ? JSON.stringify(unique[0])
    : `[${unique.map((item) => JSON.stringify(item)).join(', ')}]`;

  if (/^asin:\s*.+$/m.test(frontmatter)) {
    return frontmatter.replace(/^asin:\s*.+$/m, `asin: ${value}`);
  }

  if (/^tags:/m.test(frontmatter)) {
    return frontmatter.replace(/^tags:/m, `asin: ${value}\ntags:`);
  }

  return `${frontmatter}\nasin: ${value}`;
}

function albumCard(product, variable) {
  const productUrl = `https://${amazonHost}/dp/${asin}?tag=${affiliateTag}`;
  return [
    `<Card title=${JSON.stringify(product.title)} icon="seti:audio">`,
    `    <a href=${JSON.stringify(productUrl)} target="_blank" rel="noopener noreferrer">`,
    `        <Image src={${variable}} alt=${JSON.stringify(product.title)} width={300} height={300} />`,
    '    </a>',
    '</Card>',
  ].join('\n');
}

function coverExtension(imageUrl) {
  const extension = new URL(imageUrl).pathname.match(/\.(jpe?g|png|webp)$/i)?.[1]?.toLowerCase() || 'jpg';
  return extension === 'jpeg' ? 'jpg' : extension;
}

function existingCover() {
  if (!fs.existsSync(coversRoot)) return '';
  return fs.readdirSync(coversRoot).find((name) => new RegExp(`^${asin}\\.(?:jpe?g|png|webp)$`, 'i').test(name)) || '';
}

function ensureCoverImport(body, variable, fileName) {
  if (new RegExp(`^import\\s+${variable}\\s+from\\s+['"][^'"]+['"];?$`, 'm').test(body)) {
    return body;
  }

  const imports = [...body.matchAll(/^import .+;$/gm)];
  if (!imports.length) return `import ${variable} from '../../../gallery/cover/${fileName}';\n${body}`;

  const lastImport = imports.at(-1);
  const insertAt = lastImport.index + lastImport[0].length;
  return `${body.slice(0, insertAt)}\nimport ${variable} from '../../../gallery/cover/${fileName}';${body.slice(insertAt)}`;
}

function ensureImageImport(body) {
  if (/^import\s+\{[^}]*\bImage\b[^}]*\}\s+from\s+['"]astro:assets['"];?$/m.test(body)) {
    return body;
  }

  const imports = [...body.matchAll(/^import .+;$/gm)];
  if (!imports.length) return `import { Image } from 'astro:assets';\n${body}`;

  const lastImport = imports.at(-1);
  const insertAt = lastImport.index + lastImport[0].length;
  return `${body.slice(0, insertAt)}\nimport { Image } from 'astro:assets';${body.slice(insertAt)}`;
}

function updateAlbumSection(body, card) {
  const albumHeading = /^## Album[ \t]*$/m;
  const match = albumHeading.exec(body);
  if (!match) return `${body.trimEnd()}\n\n## Album\n\n${card}\n`;

  const contentStart = match.index + match[0].length;
  const nextHeading = /^##\s+/gm;
  nextHeading.lastIndex = contentStart;
  const next = nextHeading.exec(body);
  const contentEnd = next?.index ?? body.length;
  const current = body.slice(contentStart, contentEnd).trim();
  const placeholderCard = /^<Card title=["']Album["'] icon=["']seti:audio["']>\s*(?:TBA|TODO)\s*<\/Card>$/s;
  const replacement = !current || current === 'TBA' || current === 'TODO' || placeholderCard.test(current)
    ? `\n\n${card}\n\n`
    : `\n\n${current}\n\n${card}\n\n`;

  return `${body.slice(0, contentStart)}${replacement}${body.slice(contentEnd)}`;
}

const year = eventDate.slice(0, 4);
const eventFile = path.join(eventsRoot, year, `${eventDate}.mdx`);

if (!fs.existsSync(eventFile)) {
  console.error(`Event MDX not found: ${eventFile}`);
  process.exit(1);
}

const original = fs.readFileSync(eventFile, 'utf8');
const frontmatterMatch = original.match(/^---\n([\s\S]*?)\n---\n?/);
if (!frontmatterMatch) {
  console.error(`Invalid MDX frontmatter: ${eventFile}`);
  process.exit(1);
}

const asins = existingAsins(frontmatterMatch[1]);
if (original.includes(`/dp/${asin}`)) {
  console.error(`ASIN already exists in ${eventFile}: ${asin}`);
  process.exit(1);
}

const productUrl = `https://${amazonHost}/dp/${asin}`;
const response = await fetch(productUrl, {
  headers: {
    'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36',
  },
});

if (!response.ok) {
  console.error(`Amazon request failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const product = productData(await response.text());
if (!product.title || !product.image) {
  console.error(`Could not read album title and cover for ASIN ${asin}`);
  process.exit(1);
}

const coverName = existingCover() || `${asin}.${coverExtension(product.image)}`;
const coverPath = path.join(coversRoot, coverName);
if (!fs.existsSync(coverPath)) {
  const coverResponse = await fetch(product.image);
  if (!coverResponse.ok) {
    console.error(`Album cover request failed: ${coverResponse.status} ${coverResponse.statusText}`);
    process.exit(1);
  }
  fs.mkdirSync(coversRoot, { recursive: true });
  fs.writeFileSync(coverPath, Buffer.from(await coverResponse.arrayBuffer()));
}

const frontmatter = updateAsin(frontmatterMatch[1], [...asins, asin]);
const variable = `album${asin}`;
const body = ensureCoverImport(
  ensureImageImport(original.slice(frontmatterMatch[0].length)),
  variable,
  coverName,
);
const updatedBody = updateAlbumSection(body, albumCard(product, variable));
const updated = `---\n${frontmatter}\n---\n${updatedBody}`;
const temporaryFile = `${eventFile}.tmp`;

fs.writeFileSync(temporaryFile, updated, 'utf8');
fs.renameSync(temporaryFile, eventFile);
console.log(`Added ${product.title} (${asin}) to ${eventFile}`);
