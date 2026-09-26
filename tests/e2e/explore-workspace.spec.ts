import { expect, test } from '@playwright/test';

test('Explore tools stay balanced, semantic, and horizontally contained', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  const tools = ['Visual Lab', 'Palette', 'Waypoints', 'Discover', 'Compare', 'Journey'];
  for (const name of tools) {
    const tool = page.getByRole('button', { name, exact: true });
    await tool.click();
    await expect(tool).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.locator('.control-panel').evaluate((panel) => panel.scrollWidth <= panel.clientWidth + 1)).resolves.toBe(true);
  await expect(page.locator('.control-panel__workspace-scroll')).toBeVisible();
});

test('Palette fine controls and detailed Waypoint save remain progressively available', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await page.getByRole('button', { name: 'Palette', exact: true }).click();
  await page.getByText('Fine colour controls', { exact: true }).click();
  await expect(page.getByText('Red', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Waypoints', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Quick save', exact: true })).toBeVisible();
  await page.getByText('Save with details', { exact: true }).click();
  await expect(page.getByPlaceholder('Crystal inlet')).toBeVisible();
});

test('Compare edits one side at a time without changing the other', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  const editor = page.locator('.comparison-panel__side-card');
  await editor.getByLabel('Formula', { exact: true }).selectOption('newton');
  await page.getByRole('button', { name: 'Edit Right', exact: true }).click();
  await expect(editor.getByLabel('Formula', { exact: true })).not.toHaveValue('newton');
  await page.getByRole('button', { name: 'Edit Left', exact: true }).click();
  await expect(editor.getByLabel('Formula', { exact: true })).toHaveValue('newton');
});
