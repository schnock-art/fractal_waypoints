import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { chromium } from '@playwright/test';

import { captureGifFrame, writeGif } from './product-demo/gif.mjs';
import { createDemoUrl } from './product-demo/fixtures.mjs';

const appUrl = process.env.FRACTAL_DEMO_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = resolve('docs/demo');
const gifOutputPath = resolve(outputDirectory, 'explore-navigation.gif');
const videoOutputPath = resolve(outputDirectory, 'explore-navigation.webm');
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
  const canvas = page.getByTestId('main-canvas');
  await canvas.waitFor();
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await captureGifFrame(page, gifFrames);

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Explore canvas is not visible for product demo capture.');
  }

  const start = { x: box.x + (box.width * 0.62), y: box.y + (box.height * 0.54) };
  const finish = { x: start.x + 120, y: start.y - 62 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(finish.x, finish.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await captureGifFrame(page, gifFrames);

  await page.mouse.move(box.x + (box.width * 0.5), box.y + (box.height * 0.5));
  await page.mouse.wheel(0, -700);
  await page.waitForTimeout(700);
  await captureGifFrame(page, gifFrames);

  await page.mouse.wheel(0, -700);
  await page.waitForTimeout(700);
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

await writeGif(gifFrames, gifOutputPath, 650);
