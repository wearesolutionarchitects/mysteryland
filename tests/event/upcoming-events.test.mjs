import test from 'node:test';
import assert from 'node:assert/strict';
import { isFutureEvent, upcomingEvents } from '../../src/scripts/lib/upcoming-events.mjs';

test('upcoming events exclude past, today, cancelled and undated events and sort chronologically', () => {
  const event = (id, date, status = 'scheduled') => ({ id, data: { pubDate: date ? new Date(date) : undefined, status } });
  const events = [event('later', '2027-04-14'), event('past', '2026-09-01'),
    event('today', '2026-09-28'), event('next', '2027-02-21'),
    event('cancelled', '2027-01-01', 'cancelled'), event('undated'),
    event('completed', '2027-01-01', 'completed'), event('postponed', '2027-01-01', 'postponed')];
  assert.deepEqual(upcomingEvents(events, new Date('2026-09-28T10:00:00Z')).map(e => e.id), ['next', 'later']);
  assert.equal(events[0].id, 'later');
});

test('future-event boundary uses the Berlin calendar date', () => {
  const midnightInBerlin = new Date('2026-09-28T22:30:00Z');
  assert.equal(isFutureEvent(new Date('2026-09-29'), midnightInBerlin), false);
  assert.equal(isFutureEvent(new Date('2026-09-30'), midnightInBerlin), true);
  assert.equal(isFutureEvent(undefined, midnightInBerlin), false);
  assert.equal(isFutureEvent('invalid', midnightInBerlin), false);
});
