import { expect, test } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { upcomingEvents } from '../../src/scripts/lib/upcoming-events.mjs';

test('Startseiten-Slider entspricht automatisch den geplanten zukünftigen Events', async ({ page }) => {
  const root = new URL('../../src/content/docs/events/', import.meta.url);
  const files = (await readdir(root, { recursive: true })).filter(name => name.endsWith('.mdx'));
  const events = await Promise.all(files.map(async file => {
    const content = await readFile(new URL(file, root), 'utf8');
    const data = parse(content.split('---')[1]);
    return { id: `events/${file.replaceAll('\\', '/').replace(/\.mdx$/, '')}`, data: { ...data, pubDate: data.pubDate ? new Date(data.pubDate) : undefined } };
  }));
  const expected = upcomingEvents(events).map(event => `/${event.id}/`);
  await page.goto('/');
  const slides = page.locator('.ticket-slider__slide');
  await expect(slides).toHaveCount(expected.length);
  expect(await slides.evaluateAll(items => items.map(item => item.getAttribute('href')))).toEqual(expected);
  for (const image of await slides.locator('img').all()) {
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
});
