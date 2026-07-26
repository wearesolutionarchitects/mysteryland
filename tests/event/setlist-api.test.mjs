import assert from 'node:assert/strict';
import test from 'node:test';
import { artistKey, createSetlistClient, orderArtists, retryDelay, sameArtist, sortSetlistCards } from '../../src/scripts/event/setlist-api.mjs';

test('matches festival artist spelling variants without extra API requests', () => {
  assert.equal(artistKey('Phil Campbell’s Bastard Sons'), 'philcampbellbastardsons');
  assert.equal(artistKey('Phil Campbell and the Bastard Sons'), 'philcampbellbastardsons');
  assert.equal(sameArtist('Phil Campbell’s Bastard Sons', 'Phil Campbell and the Bastard Sons'), true);
  assert.equal(sameArtist('The Gems', 'Beyond The Black'), false);
});

test('orders festival artists and existing cards by running order', () => {
  const artists = ['Airbourne', 'Judas Priest', 'The Gems'];
  assert.deepEqual(orderArtists(artists, [
    { artist: 'The Gems', start: '13:45' },
    { artist: 'Airbourne', start: '18:45' },
  ]), ['The Gems', 'Airbourne', 'Judas Priest']);

  const cards = [
    '<Card title="Airbourne" icon="list-format">A</Card>',
    '<Card title="The Gems" icon="list-format">G</Card>',
  ].join('\n\n');
  assert.equal(sortSetlistCards(cards, ['The Gems', 'Airbourne']), [
    '<Card title="The Gems" icon="list-format">G</Card>',
    '<Card title="Airbourne" icon="list-format">A</Card>',
  ].join('\n\n'));
});

test('uses Retry-After seconds before exponential fallback', () => {
  assert.equal(retryDelay({ headers: { get: () => '2' } }, 0, 1000), 2000);
  assert.equal(retryDelay({ headers: { get: () => null } }, 2, 1000), 4000);
});

test('throttles requests and retries a 429 response', async () => {
  const sleeps = [];
  const warnings = [];
  const responses = [
    { ok: false, status: 429, statusText: 'Too Many Requests', headers: { get: () => '2' } },
    { ok: true, json: async () => ({ setlist: [{ id: 'ok' }] }) },
  ];
  const client = createSetlistClient({
    apiKey: 'test',
    userAgent: 'test@example.com',
    requestDelayMs: 0,
    fetchImpl: async () => responses.shift(),
    sleep: async (milliseconds) => sleeps.push(milliseconds),
    onRetry: (message) => warnings.push(message),
  });

  const result = await client('https://example.test', 'Festivalband');
  assert.deepEqual(result, { setlist: [{ id: 'ok' }] });
  assert.deepEqual(sleeps, [2000]);
  assert.match(warnings[0], /Festivalband/);
});
