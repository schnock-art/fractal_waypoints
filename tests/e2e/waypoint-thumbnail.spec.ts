import { expect, test } from '@playwright/test';

test('saves a Waypoint with a generated PNG thumbnail', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Waypoints' }).click();
  await page.getByRole('button', { name: 'Quick save' }).click();

  const thumbnail = page.locator('.waypoint-card__thumbnail').first();
  await expect.poll(async () => thumbnail.getAttribute('style'), { timeout: 10_000 })
    .toContain('data:image/png');
});
