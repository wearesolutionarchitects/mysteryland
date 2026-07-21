import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import sharp from 'sharp';

test('creates platform-ready images and copy from event social frontmatter', async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mysteryland-social-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const eventsRoot = path.join(root, 'events');
  const galleryRoot = path.join(root, 'gallery');
  const outboxRoot = path.join(root, 'outbox');
  const eventDirectory = path.join(eventsRoot, '2026');
  const galleryDirectory = path.join(galleryRoot, '2026', '07', '17');
  fs.mkdirSync(eventDirectory, { recursive: true });
  fs.mkdirSync(galleryDirectory, { recursive: true });

  fs.writeFileSync(path.join(eventDirectory, '2026-07-17.mdx'), `---
title: "Die Toten Hosen live in Köln"
displayTitle: "Die Toten Hosen"
tour: "Trink aus! Wir müssen gehen Tour"
artist: ["Die Toten Hosen"]
pubDate: 2026-07-17
canonicalUrl: "/events/2026/2026-07-17/"
social:
  enabled: true
  lead: "Ein besonderer Abend in Köln."
  hashtags: ["DieTotenHosen", "Köln", "Live-Musik"]
---
`);

  await sharp({
    create: {
      width: 640,
      height: 480,
      channels: 3,
      background: '#ef2d21',
    },
  }).jpeg().toFile(path.join(galleryDirectory, '2026-07-17_21-44-15.jpg'));

  const previousEnvironment = {
    EVENTS_ROOT: process.env.EVENTS_ROOT,
    GALLERY_ROOT: process.env.GALLERY_ROOT,
    SOCIAL_OUTBOX: process.env.SOCIAL_OUTBOX,
    SITE_URL: process.env.SITE_URL,
  };
  Object.assign(process.env, {
    EVENTS_ROOT: eventsRoot,
    GALLERY_ROOT: galleryRoot,
    SOCIAL_OUTBOX: outboxRoot,
    SITE_URL: 'https://mysteryland.biz',
  });
  context.after(() => {
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const scriptUrl = new URL(`../../src/scripts/event/social.mjs?test=${Date.now()}`, import.meta.url);
  const { createSocialPack } = await import(scriptUrl.href);
  const result = await createSocialPack('2026-07-17');

  assert.equal(result.outputs.length, 3);
  for (const [platform, expected] of Object.entries({
    facebook: { width: 1200, height: 630 },
    instagram: { width: 1080, height: 1350 },
    whatsapp: { width: 1080, height: 1920 },
  })) {
    const metadata = await sharp(path.join(outboxRoot, '2026-07-17', platform, '01.jpg')).metadata();
    assert.equal(metadata.width, expected.width);
    assert.equal(metadata.height, expected.height);
  }

  const facebookPost = fs.readFileSync(path.join(outboxRoot, '2026-07-17', 'facebook', 'post.txt'), 'utf8');
  assert.match(facebookPost, /Die Toten Hosen – Trink aus! Wir müssen gehen Tour/);
  assert.match(facebookPost, /https:\/\/mysteryland\.biz\/events\/2026\/2026-07-17\//);
  assert.match(facebookPost, /#DieTotenHosen #Köln #LiveMusik/);

  const manifest = JSON.parse(fs.readFileSync(path.join(outboxRoot, '2026-07-17', 'manifest.json'), 'utf8'));
  assert.equal(manifest.eventDate, '2026-07-17');
  assert.equal(manifest.outputs.length, 3);
});
