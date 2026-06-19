// src/scripts/artist/sync.mjs
// Creates missing artist profile pages from event frontmatter.
import fs from 'node:fs';
import path from 'node:path';

const eventsRoot = process.env.EVENTS_ROOT || './src/content/docs/events';
const artistsRoot = process.env.ARTISTS_ROOT || './src/content/docs/artists';

const ignoredValues = new Set(['', '-', 'TBA', 'keine Vorband']);

function walkMdxFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkMdxFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.mdx') ? [fullPath] : [];
  });
}

function frontmatter(content) {
  return content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
}

function frontmatterValue(frontmatterContent, key) {
  return frontmatterContent.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
}

function stringList(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  if (raw.startsWith('[')) {
    return [...raw.matchAll(/"([^"]+)"|'([^']+)'/g)]
      .map((match) => match[1] || match[2])
      .map((item) => item.normalize('NFC').trim())
      .filter((item) => !ignoredValues.has(item));
  }

  return raw
    .replace(/^["']|["']$/g, '')
    .split(',')
    .map((item) => item.normalize('NFC').trim())
    .filter((item) => !ignoredValues.has(item));
}

function slugify(value) {
  return String(value || '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'ae')
    .replace(/Ö/g, 'oe')
    .replace(/Ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLocaleLowerCase('de-DE');
}

function legacySlugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'ae')
    .replace(/Ö/g, 'oe')
    .replace(/Ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLocaleLowerCase('de-DE');
}

function yamlString(value) {
  return JSON.stringify(String(value || ''));
}

function eventUrl(filePath) {
  return `/${filePath
    .replace(/^src\/content\/docs\//, '')
    .replace(/\.mdx$/, '/')
    .replace(/\\/g, '/')}`;
}

function addArtist(map, name, role, eventPath) {
  const slug = slugify(name);
  if (!slug) return;

  if (!map.has(slug)) {
    map.set(slug, {
      name,
      slug,
      roles: {
        headliner: new Set(),
        support: new Set(),
        guest: new Set(),
      },
    });
  }

  const artist = map.get(slug);
  artist.roles[role].add(eventUrl(eventPath));
}

function renderArtist({ name, slug, roles }) {
  const headlinerCount = roles.headliner.size;
  const supportCount = roles.support.size;
  const guestCount = roles.guest.size;

  return `---
title: ${yamlString(name)}
description: ${yamlString(`Artist-Profil zu ${name} im Mysteryland Konzertarchiv.`)}
artistName: ${yamlString(name)}
artistPage: ${yamlString(`/artists/${slug}/`)}
artistType: "TBA"
aliases: []
origin: "TBA"
country: "TBA"
artistStatus: "TBA"
website: "TBA"
musicbrainzId: "TBA"
wikidataId: "TBA"
canonicalUrl: ${yamlString(`/artists/${slug}/`)}
tags: ["Artist", "TBA"]
---

## Überblick

TBA

## Archiv

- Headliner: ${headlinerCount}
- Support: ${supportCount}
- Gast: ${guestCount}
`;
}

function archiveBlock({ roles }) {
  return `## Archiv

- Headliner: ${roles.headliner.size}
- Support: ${roles.support.size}
- Gast: ${roles.guest.size}`;
}

function updateArchiveCounts(content, artist) {
  const nextBlock = archiveBlock(artist);

  if (/## Archiv\n\n- Headliner: \d+\n- Support: \d+\n- Gast: \d+/.test(content)) {
    return content.replace(
      /## Archiv\n\n- Headliner: \d+\n- Support: \d+\n- Gast: \d+/,
      nextBlock,
    );
  }

  return `${content.trimEnd()}\n\n${nextBlock}\n`;
}

const artists = new Map();

for (const filePath of walkMdxFiles(eventsRoot)) {
  const data = frontmatter(fs.readFileSync(filePath, 'utf8'));

  for (const name of stringList(frontmatterValue(data, 'artist'))) {
    addArtist(artists, name, 'headliner', filePath);
  }
  for (const name of stringList(frontmatterValue(data, 'support'))) {
    addArtist(artists, name, 'support', filePath);
  }
  for (const name of stringList(frontmatterValue(data, 'guest'))) {
    addArtist(artists, name, 'guest', filePath);
  }
}

fs.mkdirSync(artistsRoot, { recursive: true });

let created = 0;
let skipped = 0;
let repaired = 0;

for (const artist of [...artists.values()].sort((a, b) => a.slug.localeCompare(b.slug, 'de-DE'))) {
  const target = path.join(artistsRoot, `${artist.slug}.mdx`);
  const legacyTarget = path.join(artistsRoot, `${legacySlugify(artist.name)}.mdx`);

  if (legacyTarget !== target && fs.existsSync(legacyTarget) && !fs.existsSync(target)) {
    fs.renameSync(legacyTarget, target);
    fs.writeFileSync(target, renderArtist(artist), 'utf8');
    console.log(`Renamed ${legacyTarget} -> ${target}`);
  }

  if (fs.existsSync(target)) {
    let content = fs.readFileSync(target, 'utf8');
    const expectedCanonical = `canonicalUrl: ${yamlString(`/artists/${artist.slug}/`)}`;
    const expectedArtistPage = `artistPage: ${yamlString(`/artists/${artist.slug}/`)}`;
    if (
      content.includes('## Überblick\n\nTBA\n\n## Archiv')
      && (!content.includes(expectedCanonical) || !content.includes(expectedArtistPage))
    ) {
      content = renderArtist(artist);
      repaired += 1;
      console.log(`Repaired ${target}`);
    }
    const updatedContent = updateArchiveCounts(content, artist);
    if (updatedContent !== content) {
      content = updatedContent;
      repaired += 1;
      console.log(`Updated archive counts in ${target}`);
    }
    fs.writeFileSync(target, content, 'utf8');
    skipped += 1;
    continue;
  }

  fs.writeFileSync(target, renderArtist(artist), 'utf8');
  created += 1;
  console.log(`Created ${target}`);
}

console.log(`Artist sync complete. Created: ${created}. Existing: ${skipped}. Repaired: ${repaired}.`);
