import { expect, test } from '@playwright/test';

const eventPath = '/events/2027/2027-02-21/';

test('Eventdaten und gemeinsame UI werden angezeigt', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await test.step('Thundermother-Event öffnen', async () => {
    const response = await page.goto(eventPath);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Thundermother', exact: true })).toBeVisible();
  });
  await test.step('Eventdaten und Heiko-Komponenten prüfen', async () => {
    await expect(page.locator('.status-badge')).toHaveText('Geplant');
    await expect(page.locator('.event-facts')).toContainText('21. Februar 2027');
    await expect(page.locator('.event-facts')).toContainText('Bonafide');
    await expect(page.locator('.event-facts')).toContainText('Bochum');
    await expect(page.locator('.empty-state')).toContainText('Setlist noch nicht verfügbar');
    await expect(page.getByRole('link', { name: 'Konzertinformationen und Tickets' })).toHaveAttribute('href', 'https://concertteam.de/events/thundermother-2027-02-21');
    await expect(page.locator('.event-links .fanieng-button')).toHaveCount(2);
    expect(errors).toEqual([]);
  });
});

test('Helles und dunkles Design sowie Tastaturfokus', async ({ page }) => {
  await page.goto(eventPath);
  const theme = page.getByRole('combobox', { name: 'Farbschema wählen' });
  for (const [label, value] of [['Hell', 'light'], ['Dunkel', 'dark']]) {
    await test.step(`${label} auswählen`, async () => {
      await theme.selectOption({ label });
      await expect(page.locator('html')).toHaveAttribute('data-theme', value);
      await expect(page.getByRole('heading', { name: 'Thundermother', exact: true })).toBeVisible();
    });
  }
  const firstLink = page.getByRole('link', { name: 'Konzertinformationen und Tickets' });
  await firstLink.focus();
  await page.keyboard.press('Tab');
  const secondLink = page.getByRole('link', { name: 'Thundermother in der Zeche Bochum' });
  await expect(secondLink).toBeFocused();
  await expect(secondLink).toHaveCSS('outline-style', 'solid');
});

test('Mobile Eventseite und Navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(eventPath);
  await expect(page.getByRole('heading', { name: 'Thundermother', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const menu = page.getByRole('button', { name: 'Menü', exact: true });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('nav').getByRole('link', { name: 'Thundermother', exact: true })).toBeVisible();
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
});
