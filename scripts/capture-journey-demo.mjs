import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { chromium } from '@playwright/test';

import { captureGifFrame, writeGif } from './product-demo/gif.mjs';
import { createDemoUrl } from './product-demo/fixtures.mjs';

const appUrl = process.env.FRACTAL_DEMO_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = resolve('docs/demo');
const gifOutputPath = resolve(outputDirectory, 'journey-workflow.gif');
const videoOutputPath = resolve(outputDirectory, 'journey-workflow.webm');
const temporaryVideoDirectory = resolve('test-results/product-demo-video');

await mkdir(outputDirectory, { recursive: true });
await mkdir(temporaryVideoDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 980 },
  recordVideo: {
    dir: temporaryVideoDirectory,
    size: { width: 1440, height: 980 },
  },
});
const page = await context.newPage();
const gifFrames = [];

try {
  await page.goto(createDemoUrl(appUrl), { waitUntil: 'networkidle' });
  await page.getByTestId('main-canvas').waitFor();

  await page.getByRole('button', { name: 'Journey', exact: true }).click();
  await page.getByText('Build a portal-to-portal move').waitFor();
  await captureGifFrame(page, gifFrames);

  await page.getByLabel('Start waypoint').selectOption({ label: 'Seahorse Ridge' });
  await page.getByLabel('End waypoint').selectOption({ label: 'Julia Bloom' });
  await captureGifFrame(page, gifFrames);

  await page.getByRole('button', { name: 'Build from waypoints', exact: true }).click();
  await page.getByText('Journey created from Seahorse Ridge to Julia Bloom').waitFor();
  await page.waitForTimeout(650);
  await captureGifFrame(page, gifFrames);

  await page.getByRole('button', { name: 'Play journey', exact: true }).click();
  await page.waitForTimeout(2_500);
  await captureGifFrame(page, gifFrames);
  await page.getByText('Journey complete: Seahorse Ridge to Julia Bloom').waitFor();
  await captureGifFrame(page, gifFrames);
} finally {
  const video = page.video();
  await page.close();
  if (video) {
    await video.saveAs(videoOutputPath);
  }
  await context.close();
  await browser.close();
}

await writeGif(gifFrames, gifOutputPath, 900);
