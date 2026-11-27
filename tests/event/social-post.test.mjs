import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createPost, updatePost } from '../../scripts/social/post.mjs';

const draft = {
  ...createPost('Konzert', ['a.jpg', 'b.jpg']),
  account: 'Band',
  visibility: 'öffentlich',
};
const savedApproval = {
  fingerprint: '0046b670cb605b6f70f203e2cb11cb9723110af01c6ae2b0e3cc7c38219aa2cb',
  at: '2026-11-01T10:00:00.000Z',
};
const approved = Object.freeze({ ...draft, approval: savedApproval });
const save = { action: 'save', text: '  Neuer Text ', account: ' Profil ', visibility: ' ' };
const record = { action: 'record', receipt: ' Status online ' };

function mediaDigest(file) {
  const contents = { 'a.jpg': 'A', 'b.jpg': 'B' };
  return createHash('sha256').update(contents[file]).digest('hex');
}

test('save trims editable fields, retains media and revokes approval', () => {
  const next = updatePost(approved, save);
  assert.deepEqual(next, { ...draft, text: 'Neuer Text', account: 'Profil', visibility: '', approval: null });
  assert.throws(() => updatePost(approved, { ...save, visibility: 42 }), /Ungültige Eingabe/);
  assert.throws(() => updatePost(approved, { ...save, text: 'a'.repeat(20001) }), /Ungültige Eingabe/);
});

test('approve requires saved text and account and signs the existing fingerprint format', () => {
  for (const key of ['text', 'account']) {
    assert.throws(() => updatePost({ ...draft, [key]: '' }, { action: 'approve' }), /Text und Zielprofil/);
  }
  const next = updatePost(draft, { action: 'approve' }, mediaDigest);
  assert.equal(next.approval.fingerprint, savedApproval.fingerprint);
  assert.equal(new Date(next.approval.at).toISOString(), next.approval.at);
  assert.equal(next.publication, null);
});

test('record checks approval against content, audience, ordered media and current image bytes', () => {
  for (const changed of [
    draft, { ...approved, text: 'Nachtrag' }, { ...approved, account: 'Privat' },
    { ...approved, visibility: 'Freunde' }, { ...approved, media: ['b.jpg', 'a.jpg'] },
  ]) {
    assert.throws(() => updatePost(changed, record, mediaDigest), /Aktuelle Freigabe/);
  }
  assert.throws(() => updatePost(approved, record, () => 'changed'), /Aktuelle Freigabe/);
});

test('record accepts a previously saved approval, requires a receipt and freezes publication', () => {
  for (const receipt of [null, '  ', 'x'.repeat(2001)]) {
    assert.throws(() => updatePost(approved, { ...record, receipt }, mediaDigest), /Bestätigung/);
  }
  const next = updatePost(approved, record, mediaDigest);
  assert.equal(next.publication.receipt, 'Status online');
  assert.equal(new Date(next.publication.at).toISOString(), next.publication.at);
  assert.deepEqual(next.approval, savedApproval);
  for (const command of [save, { action: 'approve' }, record]) {
    assert.throws(() => updatePost(next, command, mediaDigest), /Veröffentlichter Stand/);
  }
});
