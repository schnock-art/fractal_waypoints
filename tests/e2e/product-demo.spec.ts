import { expect, test } from '@playwright/test';
import { createDemoUrl, demoCanvasPoints } from '../../scripts/product-demo/fixtures.mjs';

test.describe('product demo workflow regression', () => {
  test('keeps the linked Julia flow available from the shared demo fixture', async ({ page }) => {
    await page.goto(createDemoUrl('/'));

    await expect(page.getByTestId('main-canvas')).toBeVisible();
    await page.getByTestId('main-canvas').click({ position: demoCanvasPoints.juliaSeed });
    await expect(page.getByTestId('julia-view')).toHaveAttribute('data-rendering-state', 'active');
    await expect(page.getByText('Latest Julia seed')).toBeVisible();
    await waitForCanvasPaint(page, 'main-canvas');
    await waitForCanvasPaint(page, 'julia-canvas');
  });

  test('keeps the comparison workflow available from the shared demo fixture', async ({ page }) => {
    await page.goto(createDemoUrl('/'));

    await page.getByRole('button', { name: 'Compare' }).click();
    await page.getByRole('button', { name: 'Open comparison' }).click();
    await page.getByRole('button', { name: 'Wipe' }).click();

    const formulaSelects = page.locator('.comparison-panel__side-card select').filter({ has: page.locator('option[value="burningShip"]') });
    await formulaSelects.nth(1).selectOption('burningShip');
    await expect(page.getByText('Comparison mode is active')).toBeVisible();
    await waitForCanvasPaint(page, 'comparison-left-canvas');
    await waitForCanvasPaint(page, 'comparison-right-canvas');
  });

  test('switches materials from the focused Visual Lab without leaving Explore', async ({ page }) => {
    await page.goto(createDemoUrl('/'));

    await page.getByRole('button', { name: 'Visual Lab' }).click();
    const material = page.getByLabel('Material');
    await material.selectOption('orbitTrap');

    await expect(material).toHaveValue('orbitTrap');
    await expect(page.getByLabel('Trap response')).toBeVisible();
    await expect(page.getByLabel('Trap 1 shape')).toBeVisible();
    await expect(page.getByLabel('Orbit metric')).toBeVisible();
    await expect(page.getByLabel('Palette mapping')).toBeVisible();
    await expect(page.getByLabel('Exterior trap mix')).toBeVisible();
    await expect(page.getByLabel('Interior trap mix')).toBeVisible();
    await expect(page.getByLabel('Emissive accent')).toBeVisible();
    await expect(page.getByLabel('Exposure')).toBeVisible();
    await expect(page.getByText('Material → Lens')).toBeVisible();

    await page.getByRole('button', { name: /^Signal Fire/ }).click();
    await expect(page.getByLabel('Trap 1 shape')).toHaveValue('spiral');
    await expect(page.getByLabel('Trap 2 shape')).toHaveValue('circle');
    await expect(page.getByLabel('Orbit metric')).toHaveValue('final');
    await expect(page.getByLabel('Palette mapping')).toHaveValue('distanceBands');

    await page.getByRole('button', { name: /^Questionable Radioactive Glass/ }).click();
    await expect(page.getByLabel('Material')).toHaveValue('orbitTrap');
    await expect(page.getByLabel('Emissive accent')).toHaveValue('0.35');

    await material.selectOption('topographic');
    await expect(page.getByLabel('Contour levels')).toBeVisible();
    await expect(page.getByLabel('Contour width')).toBeVisible();
    await page.getByRole('button', { name: /^Topographic Atlas/ }).click();
    await expect(material).toHaveValue('topographic');

    await material.selectOption('domainColouring');
    await expect(page.getByLabel('Phase rotation')).toBeVisible();
    await expect(page.getByLabel('Magnitude ripples')).toBeVisible();

    await material.selectOption('surface');
    await expect(page.getByLabel('Height relief')).toBeVisible();
    await expect(page.getByLabel('Light direction')).toBeVisible();
    await page.getByRole('button', { name: /^Molten Metal/ }).click();
    await expect(material).toHaveValue('surface');
  });
});

async function waitForCanvasPaint(page: import('@playwright/test').Page, testId: string): Promise<void> {
  await expect.poll(async () => page.getByTestId(testId).evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d');

    // WebGPU canvases cannot be read through a 2D context; their readiness is covered by the visual render itself.
    if (!context) {
      return true;
    }

    const sampleWidth = Math.max(1, Math.min(canvas.width, 16));
    const sampleHeight = Math.max(1, Math.min(canvas.height, 16));
    const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
    return pixels.some((_, index) => index % 4 === 3 && pixels[index] === 255);
  }), { timeout: 10_000 }).toBe(true);
}
