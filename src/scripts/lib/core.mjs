import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function loadEnv(envPath = path.resolve(process.cwd(), '.env')) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function runOrThrow(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: options.capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }
  if ((result.status ?? 1) !== 0) {
    const msg = options.capture ? (result.stderr || '').trim() : `${cmd} failed`;
    throw new Error(msg || `${cmd} exited with code ${result.status}`);
  }
  return result;
}

export function runCapture(cmd, args) {
  return (runOrThrow(cmd, args, { capture: true }).stdout || '').trim();
}

export function ensureDateArg(value, helpText) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    console.error(helpText);
    process.exit(1);
  }
}

export function replaceUmlauts(input = '') {
  return input
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss');
}

export function stripHtml(input = '') {
  return input.replace(/<[^>]*>/g, '');
}

export function sanitizeSlug(input = '') {
  let value = input
    .replace(/–/g, '-')
    .replace(/&#8211;/g, '-')
    .replace(/@/g, '-')
    .replace(/\//g, '-');
  value = replaceUmlauts(value);
  value = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  value = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return value;
}

export function walkDirs(root, minDepth = 0, depth = 0) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (depth >= minDepth) out.push(full);
      out.push(...walkDirs(full, minDepth, depth + 1));
    }
  }
  return out;
}

export function parseCaption(captionRaw = '') {
  const caption = captionRaw.trim();
  const dateMatch = caption.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  const eventDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : '';

  const betweenDashAndAt = caption.split('-')[1]?.split('@')[0]?.trim() || '';
  const city = (caption.match(/@([^/]+)/)?.[1] || '').trim();
  const venue = (caption.match(/\/([^ ]*)/)?.[1] || '').trim();
  const artist = caption
    .split('-')
    .slice(2)
    .join('-')
    .replace(/-w\//gi, '')
    .replace(/-guest:/gi, '')
    .replace(/.* - /, '')
    .trim();

  const artistSlug = sanitizeSlug(betweenDashAndAt);
  const locationSlug = sanitizeSlug(city);
  const venueSlug = sanitizeSlug(venue);
  const slugUrl = [eventDate, artistSlug, locationSlug, venueSlug].filter(Boolean).join('-').replace(/-+/g, '-').replace(/-$/, '');

  return {
    caption,
    eventDate,
    event: betweenDashAndAt,
    city,
    venue,
    artist,
    artistSlug,
    locationSlug,
    venueSlug,
    slugUrl,
  };
}
