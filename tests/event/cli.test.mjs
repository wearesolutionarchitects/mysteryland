import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { buildArgs, commands, validateInput } from '../../src/scripts/event/cli.mjs';

test('defines every event workflow command exactly once', () => {
  const scripts = commands.map((command) => command.script);
  assert.equal(new Set(scripts).size, scripts.length);
  assert.deepEqual(scripts.filter((script) => script.startsWith('event:')).sort(), [
    'event:album',
    'event:covers',
    'event:gallery',
    'event:media',
    'event:og',
    'event:outbox',
    'event:seo',
    'event:setlist',
    'event:social',
  ]);
});

test('validates and normalizes command arguments', () => {
  const album = commands.find((command) => command.id === 'album');
  assert.deepEqual(buildArgs(album, { date: '2026-07-25', asin: 'b07wgjjggg' }), ['2026-07-25', 'B07WGJJGGG']);
  assert.throws(() => buildArgs(album, { date: '25.07.2026', asin: 'invalid' }), /Ungültiger Wert/);
  assert.deepEqual(validateInput({ required: false, pattern: /^ok$/ }, ''), { value: '' });
});

test('adds optional flags only after confirmation', () => {
  const gallery = commands.find((command) => command.id === 'gallery');
  assert.deepEqual(buildArgs(gallery, { date: '2026-07-25' }, true), ['2026-07-25', '--dry-run']);
  assert.deepEqual(buildArgs(gallery, { date: '2026-07-25' }, false), ['2026-07-25']);
});

test('prints help without requiring an interactive terminal', () => {
  const result = spawnSync(process.execPath, ['src/scripts/event/cli.mjs', '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /npm run event/);
});
