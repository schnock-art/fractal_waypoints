import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { chromium } from '@playwright/test';

import { createDemoUrl, demoCanvasPoints } from './product-demo/fixtures.mjs';

const appUrl = process.env.FRACTAL_DEMO_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = resolve('docs/demo');

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
const page = await context.newPage();

try {
  await page.goto(createDemoUrl(appUrl), { waitUntil: 'networkidle' });
  await page.getByTestId('main-canvas').click({ position: demoCanvasPoints.juliaSeed });
  await page.getByText('Latest Julia seed').waitFor();
  await waitForCanvasPaint(page, 'main-canvas');
  await waitForCanvasPaint(page, 'julia-canvas');
  await page.screenshot({ path: resolve(outputDirectory, 'explore-julia.png') });

  await page.goto(createDemoUrl(appUrl), { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Compare' }).click();
  await page.getByRole('button', { name: 'Open comparison' }).click();
  await page.getByRole('button', { name: 'Wipe' }).click();
  await page.locator('.comparison-panel__side-card').nth(1).getByLabel('Formula').selectOption('burningShip');
  await page.getByText('Comparison mode is active').waitFor();
  await waitForCanvasPaint(page, 'comparison-left-canvas');
  await waitForCanvasPaint(page, 'comparison-right-canvas');
  await page.screenshot({ path: resolve(outputDirectory, 'compare.png') });
} finally {
  await page.close();
  await context.close();
  await browser.close();
}

async function waitForCanvasPaint(page, testId) {
  await page.waitForFunction((targetTestId) => {
    const canvas = document.querySelector(`[data-testid="${targetTestId}"]`);
    if (!(canvas instanceof HTMLCanvasElement)) {
      return false;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return true;
    }

    const sampleWidth = Math.max(1, Math.min(canvas.width, 16));
    const sampleHeight = Math.max(1, Math.min(canvas.height, 16));
    const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
    return pixels.some((_, index) => index % 4 === 3 && pixels[index] === 255);
  }, testId, { timeout: 10_000 });
}
