import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { syncEventGallery } from '../../src/scripts/event/gallery.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mysteryland-gallery-'));
  const galleryRoot = path.join(root, 'gallery');
  const eventsRoot = path.join(root, 'events');
  const galleryDir = path.join(galleryRoot, '2026', '07', '17');
  const eventDir = path.join(eventsRoot, '2026');
  fs.mkdirSync(galleryDir, { recursive: true });
  fs.mkdirSync(eventDir, { recursive: true });
  fs.writeFileSync(path.join(galleryDir, '2026-07-17_17-30-00.jpg'), 'ticket');
  fs.writeFileSync(path.join(galleryDir, '2026-07-17_20-07-11.jpg'), 'photo');

  const eventFile = path.join(eventDir, '2026-07-17.mdx');
  fs.writeFileSync(eventFile, `---
title: "Die Toten Hosen live"
displayTitle: "Die Toten Hosen"
---
import Gallery from '@components/Gallery.astro';
import img1730 from '../../../gallery/2026/07/17/2026-07-17_17-30-00.jpg';
import album from '../../../gallery/cover/album.jpg';

Redaktioneller Bericht.

## Galerie

<Gallery
    images={[
        { src: img1730, alt: 'Ticket', title: 'Ticket' },
    ]}
/>

## Videos

Bleibt erhalten.
`);
  return { eventFile, eventsRoot, galleryRoot };
}

test('adds missing event images while preserving editorial content and existing labels', () => {
  const paths = fixture();
  const result = syncEventGallery('2026-07-17', { ...paths, write: true });
  const content = fs.readFileSync(paths.eventFile, 'utf8');

  assert.equal(result.changed, true);
  assert.deepEqual(result.additions, ['2026-07-17_20-07-11.jpg']);
  assert.match(content, /import img200711 from '.+2026-07-17_20-07-11\.jpg';/);
  assert.match(content, /\{ src: img1730, alt: 'Ticket', title: 'Ticket' \}/);
  assert.match(content, /\{ src: img200711, alt: 'Die Toten Hosen live um 20:07 Uhr', title: '20:07' \}/);
  assert.match(content, /Redaktioneller Bericht\./);
  assert.match(content, /Bleibt erhalten\./);
  assert.match(content, /import album from/);
});

test('is idempotent after all gallery images are synchronized', () => {
  const paths = fixture();
  syncEventGallery('2026-07-17', { ...paths, write: true });
  const result = syncEventGallery('2026-07-17', { ...paths, write: true });

  assert.equal(result.changed, false);
  assert.deepEqual(result.additions, []);
});
