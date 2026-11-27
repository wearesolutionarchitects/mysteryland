import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const date = '2027-02-21';
const asin = 'B000000001';
const cases = [
  {
    command: 'album', args: [asin], expected: '/dp/' + asin,
    response: '<span id="productTitle">Testalbum</span> "hiRes":"https://example.invalid/cover.jpg"',
  },
  {
    command: 'setlist', args: [], expected: '<li>Testlied</li>',
    response: JSON.stringify({ setlist: [{
      artist: { name: 'Testband' }, url: 'https://example.invalid/setlist',
      sets: { set: [{ song: [{ name: 'Testlied' }] }] },
    }] }),
  },
];

for (const { command, args, response, expected } of cases) {
  test(`event:${command} preserves an edit made during fetch and succeeds on retry`, context => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'event-revision-'));
    context.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const directory = path.join(root, '2027');
    fs.mkdirSync(directory);
    const file = path.join(directory, date + '.mdx');
    const original = '---\ntitle: Testband\n---\n## Setlist\n\nTBA\n';
    const edit = '\n## Bericht\n\nRedaktionelle Korrektur.\n';
    fs.writeFileSync(file, original);
    fs.writeFileSync(path.join(root, asin + '.jpg'), 'existing cover');

    function run(editDuringFetch: boolean) {
      const preload = `
        import { appendFileSync } from 'node:fs';
        globalThis.fetch = async () => {
          ${editDuringFetch ? `appendFileSync(${JSON.stringify(file)}, ${JSON.stringify(edit)});` : ''}
          return new Response(${JSON.stringify(response)});
        };
      `;
      return spawnSync(process.execPath, [
        '--import', 'data:text/javascript,' + encodeURIComponent(preload),
        `src/scripts/event/${command}.ts`, date, ...args,
      ], {
        encoding: 'utf8',
        env: { ...process.env, EVENTS_ROOT: root, COVERS_ROOT: root, SETLIST_API_KEY: 'test' },
      });
    }

    const conflict = run(true);
    assert.equal(conflict.status, 1, conflict.stdout + conflict.stderr);
    assert.match(conflict.stderr, /Datei wurde inzwischen geändert/);
    assert.equal(fs.readFileSync(file, 'utf8'), original + edit);

    const retry = run(false);
    assert.equal(retry.status, 0, retry.stderr);
    const updated = fs.readFileSync(file, 'utf8');
    assert.ok(updated.includes(edit.trim()));
    assert.ok(updated.includes(expected));
    assert.deepEqual(fs.readdirSync(directory), [path.basename(file)]);
  });
}
