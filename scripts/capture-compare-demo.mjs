import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { chromium } from '@playwright/test';

import { captureGifFrame, writeGif } from './product-demo/gif.mjs';
import { createDemoUrl } from './product-demo/fixtures.mjs';

const appUrl = process.env.FRACTAL_DEMO_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = resolve('docs/demo');
const gifOutputPath = resolve(outputDirectory, 'compare-workflow.gif');
const videoOutputPath = resolve(outputDirectory, 'compare-workflow.webm');
const temporaryVideoDirectory = resolve('test-results/product-demo-video');

await mkdir(outputDirectory, { recursive: true });
await mkdir(temporaryVideoDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 960, height: 653 },
  recordVideo: {
    dir: temporaryVideoDirectory,
    size: { width: 960, height: 653 },
  },
});
const page = await context.newPage();
const gifFrames = [];

try {
  await page.goto(createDemoUrl(appUrl), { waitUntil: 'networkidle' });
  await page.getByTestId('main-canvas').waitFor();
  await setCompactDemoQuality(page);

  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await page.getByText('Comparison stage', { exact: true }).waitFor();
  await captureGifFrame(page, gifFrames);

  await page.getByRole('button', { name: 'Open comparison', exact: true }).click();
  await page.getByText('Comparison mode is active').waitFor();
  await page.getByTestId('comparison-left-canvas').waitFor();
  await page.getByTestId('comparison-right-canvas').waitFor();
  await page.waitForTimeout(650);

  const comparisonSides = page.locator('.comparison-panel__side-card');
  await comparisonSides.nth(1).getByLabel('Formula').selectOption('burningShip');
  await page.getByRole('button', { name: 'Wipe' }).click();
  await page.waitForTimeout(650);
  await captureGifFrame(page, gifFrames);
  await writeGif(gifFrames, gifOutputPath, 900, 32);
} finally {
  const video = page.video();
  await page.close();
  if (video) {
    await video.saveAs(videoOutputPath);
  }
  await context.close();
  await browser.close();
}

async function setCompactDemoQuality(page) {
  await page.getByLabel('Iterations').press('Home');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Pixel density').press('Home');
  await page.getByText('0.75x', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.waitForFunction(() => new URLSearchParams(window.location.search).has('view'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('main-canvas').waitFor();
}
