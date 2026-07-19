import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import YAML from 'yaml';

import { organizersFromTags } from '../../src/data/organizers.mjs';
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

test('every current or future event has an organizer for Google event markup', async () => {
  const eventsRoot = path.resolve('src/content/docs/events');
  const yearDirectories = await readdir(eventsRoot, { withFileTypes: true });
  const missingOrganizers = [];

  for (const yearDirectory of yearDirectories.filter((entry) => entry.isDirectory())) {
    const yearRoot = path.join(eventsRoot, yearDirectory.name);
    const eventFiles = (await readdir(yearRoot)).filter((file) => file.endsWith('.mdx'));

    for (const eventFile of eventFiles) {
      const source = await readFile(path.join(yearRoot, eventFile), 'utf8');
      const frontmatter = source.match(/^---\s*\n([\s\S]*?)\n---/);
      assert.ok(frontmatter, `Missing frontmatter in ${yearDirectory.name}/${eventFile}`);

      const data = YAML.parse(frontmatter[1]);
      if (!isCurrentOrFutureEvent(data.endDate ?? data.pubDate)) continue;

      const explicitOrganizers = values(data.organizer);
      const inferredOrganizers = organizersFromTags(data.tags ?? []);
      if (explicitOrganizers.length === 0 && inferredOrganizers.length === 0) {
        missingOrganizers.push(`${yearDirectory.name}/${eventFile}`);
      }
    }
  }

  assert.deepEqual(missingOrganizers, []);
});

function values(value) {
  return (Array.isArray(value) ? value : [value])
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}
