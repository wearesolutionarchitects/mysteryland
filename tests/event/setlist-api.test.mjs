import assert from 'node:assert/strict';
import test from 'node:test';
import { artistKey, createSetlistClient, directSetlistArtist, orderArtists, retryDelay, sameArtist, setlistIdFromUrl, sortSetlistCards } from '../../src/scripts/event/setlist-api.mjs';

test('resolves a direct setlist URL and the OMD alias despite a different city label', () => {
  assert.equal(setlistIdFromUrl('https://www.setlist.fm/setlist/orchestral-manoeuvres-in-the-dark/2026/kemnader-see-bochum-germany-4b4a13b6.html'), '4b4a13b6');
  const setlist = {
    eventDate: '01-09-2026',
    artist: { name: 'Orchestral Manoeuvres in the Dark' },
    venue: { city: { name: 'Bochum' } },
  };
  assert.equal(directSetlistArtist(setlist, '2026-09-01', ['OMD']), 'OMD');
  assert.equal(sameArtist('OMD', setlist.artist.name), true);
  assert.equal(sameArtist(setlist.artist.name, 'OMD'), true);
  assert.throws(() => directSetlistArtist(setlist, '2026-09-02', ['OMD']), /date does not match/);
  assert.throws(() => directSetlistArtist(setlist, '2026-09-01', ['Broilers']), /artist does not match/);
});

test('rejects foreign URLs and non-setlist pages', () => {
  for (const url of ['https://example.com/setlist/artist/2026/show-4b4a13b6.html', 'https://www.setlist.fm/', 'http://www.setlist.fm/setlist/artist/2026/show-4b4a13b6.html']) {
    assert.throws(() => setlistIdFromUrl(url), /setlist.fm setlist URL/);
  }
});

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
