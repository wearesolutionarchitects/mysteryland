import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { findDuplicateCover } from '../../src/scripts/event/album-cover.mjs';

test('detects identical album covers assigned to different ASINs', (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mysteryland-cover-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'AAAAAAAAAA.jpg'), Buffer.from('same-cover'));
  fs.writeFileSync(path.join(directory, 'BBBBBBBBBB.jpg'), Buffer.from('different-cover'));

  assert.equal(findDuplicateCover(directory, 'CCCCCCCCCC', Buffer.from('same-cover')), 'AAAAAAAAAA.jpg');
  assert.equal(findDuplicateCover(directory, 'CCCCCCCCCC', Buffer.from('new-cover')), '');
  assert.equal(findDuplicateCover(directory, 'AAAAAAAAAA', Buffer.from('same-cover')), '');
});
