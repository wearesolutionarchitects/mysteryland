import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

function snapshot(root: string) {
  return Object.fromEntries(fs.readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter(name => fs.statSync(path.join(root, name)).isFile())
    .map(name => [name, fs.readFileSync(path.join(root, name))]));
}

for (const [script, args] of [
  ['social', ['2026-07-17']],
  ['outbox', ['2026-07-17']],
  ['outbox', []],
] as const) {
  test(`${script} ${args[0] || 'full export'} preserves the previous export on failure and supports retry`, async context => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'event-export-'));
    context.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const output = path.join(root, 'output');
    const events = path.join(root, 'events');
    const gallery = path.join(root, 'gallery');
    const photos = path.join(gallery, '2026/07/17');
    fs.mkdirSync(photos, { recursive: true });
    fs.mkdirSync(path.join(events, '2026'), { recursive: true });
    const eventFile = path.join(events, '2026/2026-07-17.mdx');
    const event = '---\ntitle: Test\npubDate: 2026-07-17\nsocial: {lead: Test, images: [a.jpg]}\n---\n';
    fs.writeFileSync(eventFile, event);
    await sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } })
      .jpeg().toFile(path.join(photos, 'a.jpg'));

    const run = () => spawnSync(process.execPath, [`src/scripts/event/${script}.ts`, ...args], {
      encoding: 'utf8',
      env: { ...process.env, TODAY: '2026-07-01', EVENTS_ROOT: events, GALLERY_ROOT: gallery, SOCIAL_OUTBOX: output, GALLERY_OUTBOX: output },
    });
    const initial = run();
    assert.equal(initial.status, 0, initial.stderr);
    if (script === 'outbox' && args.length) {
      fs.writeFileSync(path.join(output, 'facebook/2026-08-31_other.jpg'), 'another event');
    }
    const before = snapshot(output);
    assert.ok(Object.keys(before).some(name => name.endsWith('.jpg')));

    if (script === 'social') fs.writeFileSync(eventFile, event.replace('a.jpg]', 'a.jpg, missing.jpg]'));
    else fs.writeFileSync(path.join(photos, 'b.jpg'), 'corrupt image');
    const failed = run();
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, script === 'social' ? /missing.jpg/ : /unsupported image format/i);
    assert.deepEqual(snapshot(output), before);

    fs.writeFileSync(eventFile, event);
    if (script === 'outbox') fs.unlinkSync(path.join(photos, 'b.jpg'));
    await sharp({ create: { width: 8, height: 8, channels: 3, background: 'blue' } })
      .jpeg().toFile(path.join(photos, 'a.jpg'));
    const retry = run();
    assert.equal(retry.status, 0, retry.stderr);
    const after = snapshot(output);
    assert.deepEqual(Object.keys(after).sort(), Object.keys(before).sort());
    for (const name of Object.keys(after).filter(name => name.endsWith('.jpg'))) {
      if (name.endsWith('other.jpg')) assert.deepEqual(after[name], before[name]);
      else assert.notDeepEqual(after[name], before[name]);
    }
  });
}
