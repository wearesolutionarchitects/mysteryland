import path from 'node:path';
import { test, expect, type Page, type Route } from '@playwright/test';

const first = '2026-07-17';
const second = '2026-07-25';
const info = { lead: '', hashtags: [], images: [], selected: [], draft: null };

async function openEditor(page: Page, handleDraft: (route: Route) => Promise<void>) {
  // Exercise the shipped console without touching the user's drafts or media.
  await page.route('**/__social/**', async route => {
    const name = new URL(route.request().url()).pathname.slice('/__social/'.length);
    if (name === 'draft') return handleDraft(route);
    if (name === 'events') {
      return route.fulfill({ json: [first, second].map(date => ({ date, title: date })) });
    }
    return route.fulfill({ path: path.resolve('scripts/social', name || 'console.html') });
  });
  await page.goto('/__social/');
}

test('saving one channel preserves the other editor and advances its revision', async ({ page }) => {
  const post = { text: 'Original', account: '', visibility: '', media: [], approval: null, publication: null };
  const draft = { url: '/events/', revision: '1', posts: { facebook: { ...post }, instagram: { ...post } } };
  const writes: object[] = [];
  await openEditor(page, async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { ...info, draft } });
    const body = route.request().postDataJSON();
    writes.push(body);
    draft.posts[body.platform as keyof typeof draft.posts].text = body.text;
    draft.revision = String(writes.length + 1);
    await route.fulfill({ json: draft });
  });
  const facebook = page.getByRole('region', { name: 'Facebook' });
  const instagram = page.getByRole('region', { name: 'Instagram' });
  const text = instagram.getByLabel('Beitrag inklusive Hashtags und Links');
  const receipt = instagram.getByLabel('Nach Veröffentlichung', { exact: false });
  await text.fill('Instagram in Arbeit');
  await receipt.fill('Beleg in Arbeit');
  await facebook.getByLabel('Beitrag inklusive Hashtags und Links').fill('Facebook fertig');
  await facebook.getByRole('button', { name: 'Änderungen speichern' }).click();
  await expect(page.locator('#load')).toBeEnabled();
  await expect(text).toHaveValue('Instagram in Arbeit');
  await expect(receipt).toHaveValue('Beleg in Arbeit');
  await instagram.getByRole('button', { name: 'Änderungen speichern' }).click();
  await expect(page.locator('#load')).toBeEnabled();
  expect(writes).toEqual([
    expect.objectContaining({ platform: 'facebook', revision: '1', text: 'Facebook fertig' }),
    expect.objectContaining({ platform: 'instagram', revision: '2', text: 'Instagram in Arbeit' }),
  ]);
});

test('a failed switch blocks generation until the selected event loads successfully', async ({ page }) => {
  let fail = true;
  const writes: object[] = [];
  await openEditor(page, async route => {
    const date = new URL(route.request().url()).searchParams.get('date');
    if (route.request().method() === 'POST') {
      writes.push({ date, lead: route.request().postDataJSON().lead });
      return route.fulfill({ json: { url: '/events/', revision: '1', posts: {} } });
    }
    if (date === second && fail) return route.fulfill({ status: 500, json: { error: 'Ladefehler' } });
    await route.fulfill({ json: { ...info, lead: date } });
  });
  await expect(page.locator('#lead')).toHaveValue(first);
  await page.locator('#event').selectOption(second);
  await expect(page.getByRole('status')).toHaveText('Ladefehler');
  await expect(page.locator('#generator')).toBeHidden();
  await expect(page.locator('#generate')).toBeDisabled();
  expect(writes).toEqual([]);
  fail = false;
  await page.locator('#load').click();
  await expect(page.locator('#lead')).toHaveValue(second);
  await page.locator('#generate').click();
  await expect(page.locator('#generator')).toBeHidden();
  expect(writes).toEqual([{ date: second, lead: second }]);
});
