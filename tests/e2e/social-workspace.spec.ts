import { test, expect } from '@playwright/test';

test('local social workspace offers separate announcements and retrospectives without public navigation', async ({ page }) => {
  await page.goto('/__social/');
  await expect(page.getByRole('heading', { name: 'Social-Werkstatt', exact: true })).toBeVisible();
  await expect(page.locator('#event')).toBeEnabled();
  await page.locator('#event').selectOption('2027-02-21');
  await expect(page.locator('#event')).toBeEnabled();
  await expect(page.locator('#images')).toContainText('2027-02-21_00-00-00.jpg');
  await page.locator('#phase').selectOption('after');
  await expect(page.locator('#phase')).toBeEnabled();
  await expect(page.locator('#lead')).toHaveValue('');
  await expect(page.locator('#images input:checked')).toHaveCount(0);
  await page.goto('/events/2027/2027-02-21/');
  await expect(page.locator('a[href*="/__social"]')).toHaveCount(0);
  await expect(page.getByText('Social-Werkstatt', { exact: true })).toHaveCount(0);
});
