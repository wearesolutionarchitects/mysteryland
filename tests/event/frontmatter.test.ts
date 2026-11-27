import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createSocialPack, readEvent } from '../../src/scripts/event/social.ts';

const scripts = fileURLToPath(new URL('../../src/scripts/', import.meta.url));
for (const [format, artist] of [
  ['inline', 'artist: [Airbourne, Nestor] # Line-up'],
  ['multiline', 'artist:\r\n  - Airbourne\r\n  - Nestor # Line-up'],
]) {
  test(`social, artist sync and SEO agree on ${format} YAML lists`, async context => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdx-frontmatter-'));
    context.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const events = path.join(root, 'src/content/docs/events');
    fs.mkdirSync(path.join(events, '2026'), { recursive: true });
    const date = '2026-07-25';
    const eventFile = path.join(events, '2026', date + '.mdx');
    const source = ['---', 'title: BOB!Fest', 'category: Festival', artist, 'description: >',
      '  TODO', 'social:', '  lead: Vorfreude', '  images: [stage]', '---', '# Original', '', '---', ''].join('\r\n');
    fs.writeFileSync(eventFile, source);

    const { data } = readEvent(date, events);
    assert.deepEqual(data.artist, ['Airbourne', 'Nestor']);
    assert.deepEqual(data.social.images, ['stage']);
    const galleryRoot = path.join(root, 'gallery');
    const photos = path.join(galleryRoot, '2026/07/25');
    fs.mkdirSync(photos, { recursive: true });
    await sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } })
      .jpeg().toFile(path.join(photos, 'stage.jpg'));
    const pack = await createSocialPack(date, { eventsRoot: events, galleryRoot, outboxRoot: path.join(root, 'out') });
    assert.match(fs.readFileSync(path.join(pack.targetRoot, 'facebook/post.txt'), 'utf8'), /^Airbourne, Nestor – BOB!Fest/);
    const run = (script: string, ...args: string[]) => execFileSync(process.execPath, [path.join(scripts, script), ...args], {
      cwd: root,
      env: { ...process.env, EVENTS_ROOT: events, ARTISTS_ROOT: path.join(root, 'artists'),
        TOP_ARTISTS_FILE: path.join(root, 'artists.json'), TOP_VENUES_FILE: path.join(root, 'venues.json') },
    });
    run('artist/sync.ts');
    const counts: { name: string; total: number }[] = JSON.parse(fs.readFileSync(path.join(root, 'artists.json'), 'utf8'));
    assert.deepEqual(counts.map(({ name, total }) => [name, total]), [['Airbourne', 1], ['Nestor', 1]]);

    run('event/seo.ts', '--write');
    const description = 'Eventbericht über BOB!Fest am 25. Juli 2026 mit Airbourne und Nestor.';
    assert.equal(readEvent(date, events).data.description, description);
    const updated = source.replace('>\r\n  TODO', JSON.stringify(description))
      .replace('---\r\n# Original', 'ogImage: "/apple-touch-icon.png"\r\n---\r\n# Original');
    assert.equal(fs.readFileSync(eventFile, 'utf8'), updated);
    run('event/seo.ts', '--write');
    assert.equal(fs.readFileSync(eventFile, 'utf8'), updated);
  });
}
