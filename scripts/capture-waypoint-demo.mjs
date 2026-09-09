import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { chromium } from '@playwright/test';

import { captureGifFrame, writeGif } from './product-demo/gif.mjs';
import { createDemoUrl } from './product-demo/fixtures.mjs';

const appUrl = process.env.FRACTAL_DEMO_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = resolve('docs/demo');
const gifOutputPath = resolve(outputDirectory, 'waypoint-capture.gif');
const videoOutputPath = resolve(outputDirectory, 'waypoint-capture.webm');
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
  const canvas = page.getByTestId('main-canvas');
  await canvas.waitFor();
  await page.waitForTimeout(650);

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Explore canvas is not visible for Waypoint demo capture.');
  }

  await page.mouse.move(box.x + (box.width * 0.56), box.y + (box.height * 0.48));
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(600);

  await page.getByRole('button', { name: 'Waypoints', exact: true }).click();
  await page.getByText('Current capture').waitFor();
  await captureGifFrame(page, gifFrames);

  await page.getByLabel('Name').fill('Moonlit portal');
  await page.getByLabel('Description').fill('A saved passage into the boundary.');
  await captureGifFrame(page, gifFrames);

  await page.getByRole('button', { name: 'Save Waypoint', exact: true }).click();
  const savedWaypoint = page.getByText('Moonlit portal', { exact: true });
  await savedWaypoint.waitFor();
  await savedWaypoint.scrollIntoViewIfNeeded();
  await page.waitForTimeout(650);
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

await writeGif(gifFrames, gifOutputPath, 1_000);
