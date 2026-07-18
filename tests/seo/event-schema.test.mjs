import assert from 'node:assert/strict';
import test from 'node:test';

import {
  googleEventStatus,
  isCurrentOrFutureEvent,
} from '../../src/scripts/lib/event-schema.mjs';

test('past archive events are excluded from Google event rich results', () => {
  const today = new Date('2026-07-18T12:00:00Z');

  assert.equal(isCurrentOrFutureEvent('1992-09-21', today), false);
  assert.equal(isCurrentOrFutureEvent('2021-08-04', today), false);
  assert.equal(isCurrentOrFutureEvent('2026-07-17', today), false);
});

test('events today and in the future remain eligible', () => {
  const today = new Date('2026-07-18T12:00:00Z');

  assert.equal(isCurrentOrFutureEvent('2026-07-18', today), true);
  assert.equal(isCurrentOrFutureEvent('2027-04-12', today), true);
});

test('only Google-supported event status values are emitted', () => {
  assert.equal(googleEventStatus('cancelled'), 'https://schema.org/EventCancelled');
  assert.equal(googleEventStatus('postponed'), 'https://schema.org/EventPostponed');
  assert.equal(googleEventStatus('scheduled'), 'https://schema.org/EventScheduled');
  assert.equal(googleEventStatus('completed'), 'https://schema.org/EventScheduled');
});
