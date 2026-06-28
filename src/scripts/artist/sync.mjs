// src/scripts/artist/sync.mjs
// Creates missing artist profile pages from event frontmatter.
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { canonicalVenue } from '../../data/venues.mjs';

const eventsRoot = process.env.EVENTS_ROOT || './src/content/docs/events';
const artistsRoot = process.env.ARTISTS_ROOT || './src/content/docs/artists';
const topArtistsFile = process.env.TOP_ARTISTS_FILE || './src/data/top-artists.json';
const topVenuesFile = process.env.TOP_VENUES_FILE || './src/data/top-venues.json';

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

function scalarValue(value) {
  return String(value || '')
    .normalize('NFC')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
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
        member: new Set(),
      },
    });
  }

  const artist = map.get(slug);
  artist.roles[role].add(eventUrl(eventPath));
}

function renderArtist({ name, slug, roles }) {
  return `---
title: ${yamlString(name)}
description: ${yamlString(`Artist-Profil zu ${name} im Mysteryland Konzertarchiv.`)}
artistName: ${yamlString(name)}
artistPage: ${yamlString(`/artists/${slug}/`)}
artistType: "TBA"
aliases: []
members: []
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

${archiveBlock({ roles })}
`;
}

function archiveBlock({ roles }) {
  const lines = [
    '## Archiv',
    '',
    `- Headliner: ${roles.headliner.size}`,
    `- Support: ${roles.support.size}`,
    `- Gast: ${roles.guest.size}`,
  ];

  if (roles.member.size > 0) {
    lines.push(`- Mitglied: ${roles.member.size}`);
  }

  return lines.join('\n');
}

function artistTotal({ roles }) {
  return roles.headliner.size + roles.support.size + roles.guest.size + roles.member.size;
}

function topArtistsData(artists) {
  return [...artists.values()]
    .map((artist) => ({
      name: artist.name,
      slug: artist.slug,
      href: `/artists/${artist.slug}/`,
      total: artistTotal(artist),
    }))
    .filter((artist) => artist.total > 0)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'de-DE'))
    .slice(0, 10);
}

function addVenue(map, data, eventPath) {
  const venue = scalarValue(frontmatterValue(data, 'venue'));
  if (!venue || ignoredValues.has(venue)) return;

  const city = scalarValue(frontmatterValue(data, 'city'));
  const country = scalarValue(frontmatterValue(data, 'country'));
  const canonical = canonicalVenue({ name: venue, city, country });
  const key = [canonical.name, canonical.city, canonical.country].join('|');

  if (!map.has(key)) {
    map.set(key, {
      name: canonical.name,
      city: canonical.city,
      country: canonical.country,
      events: new Set(),
    });
  }

  map.get(key).events.add(eventUrl(eventPath));
}

function topVenuesData(venues) {
  return [...venues.values()]
    .map((venue) => ({
      name: venue.name,
      city: venue.city,
      country: venue.country,
      total: venue.events.size,
    }))
    .filter((venue) => venue.total > 0)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'de-DE'))
    .slice(0, 5);
}

function updateArchiveCounts(content, artist) {
  const nextBlock = archiveBlock(artist);

  if (/## Archiv\n\n- Headliner: \d+\n- Support: \d+\n- Gast: \d+(?:\n- Mitglied: \d+)?/.test(content)) {
    return content.replace(
      /## Archiv\n\n- Headliner: \d+\n- Support: \d+\n- Gast: \d+(?:\n- Mitglied: \d+)?/,
      nextBlock,
    );
  }

  return `${content.trimEnd()}\n\n${nextBlock}\n`;
}

const artists = new Map();
const venues = new Map();

for (const filePath of walkMdxFiles(eventsRoot)) {
  const data = frontmatter(fs.readFileSync(filePath, 'utf8'));

  addVenue(venues, data, filePath);

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

for (const filePath of walkMdxFiles(artistsRoot)) {
  const data = frontmatter(fs.readFileSync(filePath, 'utf8'));
  const artistData = parseYaml(data) || {};
  const groupName = artistData.artistName || artistData.title;
  const members = Array.isArray(artistData.members) ? artistData.members : [];
  const group = artists.get(slugify(groupName));
  if (!group || members.length === 0) continue;

  for (const memberName of members) {
    const memberSlug = slugify(memberName);
    if (!memberSlug || ignoredValues.has(memberName)) continue;
    if (!artists.has(memberSlug)) {
      artists.set(memberSlug, {
        name: memberName,
        slug: memberSlug,
        roles: {
          headliner: new Set(),
          support: new Set(),
          guest: new Set(),
          member: new Set(),
        },
      });
    }
    const member = artists.get(memberSlug);
    for (const event of group.roles.headliner) {
      member.roles.member.add(event);
    }
    for (const event of group.roles.support) {
      member.roles.member.add(event);
    }
    for (const event of group.roles.guest) {
      member.roles.member.add(event);
    }
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

fs.mkdirSync(path.dirname(topArtistsFile), { recursive: true });
fs.writeFileSync(`${topArtistsFile}`, `${JSON.stringify(topArtistsData(artists), null, 2)}\n`, 'utf8');
console.log(`Updated ${topArtistsFile}`);
fs.mkdirSync(path.dirname(topVenuesFile), { recursive: true });
fs.writeFileSync(`${topVenuesFile}`, `${JSON.stringify(topVenuesData(venues), null, 2)}\n`, 'utf8');
console.log(`Updated ${topVenuesFile}`);
console.log(`Artist sync complete. Created: ${created}. Existing: ${skipped}. Repaired: ${repaired}.`);
