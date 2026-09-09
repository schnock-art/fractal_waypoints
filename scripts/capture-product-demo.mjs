import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { chromium } from '@playwright/test';
import { captureGifFrame, writeGif } from './product-demo/gif.mjs';
import { createDemoUrl, demoCanvasPoints } from './product-demo/fixtures.mjs';

const appUrl = process.env.FRACTAL_DEMO_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = resolve('docs/demo');
const outputPath = resolve(outputDirectory, 'julia-keyboard.webm');
const gifOutputPath = resolve(outputDirectory, 'julia-keyboard.gif');
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
  await page.getByTestId('main-canvas').click({ position: demoCanvasPoints.juliaSeed });
  await page.getByText('Secondary panel seeded from the main surface').waitFor();
  await page.getByText('Linked Julia parameters').click();
  await page.getByTestId('julia-canvas').click({ position: demoCanvasPoints.juliaFocus });

  await page.waitForTimeout(600);
  await captureGifFrame(page, gifFrames);
  await repeatKey(page, 'j', 4, () => captureGifFrame(page, gifFrames));
  await repeatKey(page, 'i', 4, () => captureGifFrame(page, gifFrames));

  await page.keyboard.down('Shift');
  await repeatKey(page, 'l', 2, () => captureGifFrame(page, gifFrames));
  await page.keyboard.up('Shift');
  await page.waitForTimeout(750);
  await captureGifFrame(page, gifFrames);
} finally {
  const video = page.video();
  await page.close();
  if (video) {
    await video.saveAs(outputPath);
  }
  await context.close();
  await browser.close();
}

await writeGif(gifFrames, gifOutputPath);

async function repeatKey(page, key, repeatCount, onStep) {
  await page.keyboard.down(key);
  await onStep();
  for (let index = 0; index < repeatCount; index += 1) {
    await page.waitForTimeout(180);
    await page.keyboard.down(key);
    await onStep();
  }
  await page.keyboard.up(key);
}
