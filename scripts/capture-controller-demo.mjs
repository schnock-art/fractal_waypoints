import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { chromium } from '@playwright/test';
import { createDemoUrl } from './product-demo/fixtures.mjs';

const appUrl = process.env.FRACTAL_DEMO_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = resolve('docs/demo');
const outputPath = resolve(outputDirectory, 'controller-workspace.png');

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
const page = await context.newPage();

await page.addInitScript(() => {
  const input = { id: 'explorer-demo', name: 'Hydrasynth Explorer · Demo MIDI', state: 'connected', onmidimessage: null };
  Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: async () => ({ inputs: new Map([['explorer-demo', input]]), onstatechange: null }) });
});

try {
  await page.goto(createDemoUrl(appUrl), { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  await page.getByRole('button', { name: 'Open controller' }).click();
  const dialog = page.getByRole('dialog', { name: 'Hydrasynth Explorer' });
  await dialog.getByRole('button', { name: 'Connect' }).click();

  await dialog.getByRole('tab', { name: 'Layouts' }).click();
  await dialog.getByLabel('New controller layout name').fill('Fractal Ways 1');
  await dialog.getByLabel('Expected hardware patch name').fill('Fractal Ways 1');
  await dialog.getByRole('button', { name: 'Create named layout' }).click();
  await dialog.getByRole('button', { name: '+ Add lane' }).first().click();
  await dialog.getByLabel('Controller layout lane label').fill('Colour LFO');
  await dialog.getByRole('button', { name: 'Enter endpoint manually' }).click();
  await dialog.getByLabel('Layout MIDI CC number').fill('26');
  await dialog.getByRole('button', { name: 'Add CC 26 lane' }).click();

  await dialog.getByRole('tab', { name: 'Mappings' }).click();
  await dialog.getByRole('button', { name: '+ Add mapping' }).click();
  await dialog.getByText('Browse Hydrasynth controls', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Macro 1, MIDI CC 16' }).click();
  await dialog.getByRole('button', { name: 'Use Macro 1' }).click();
  await dialog.getByRole('button', { name: 'Save mapping' }).click();
  await dialog.getByRole('button', { name: 'Arm zoom' }).click();

  await dialog.getByRole('button', { name: '+ Add mapping' }).click();
  await dialog.getByText('Enter MIDI address manually', { exact: true }).click();
  await dialog.getByLabel('Direct MIDI CC number').fill('26');
  await dialog.getByRole('button', { name: 'Use CC 26' }).click();
  await dialog.getByRole('combobox', { name: 'Controller target' }).selectOption('palette.offset');
  await dialog.getByRole('spinbutton', { name: 'Palette offset minimum' }).fill('-0.4');
  await dialog.getByRole('spinbutton', { name: 'Palette offset maximum' }).fill('0.4');
  await dialog.getByLabel('Palette response curve').fill('1.8');
  await dialog.getByRole('button', { name: 'Save mapping' }).click();
  await dialog.getByRole('button', { name: 'Arm Palette offset' }).click();

  await dialog.getByRole('tab', { name: 'Live' }).click();
  await page.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() === 'Live');
  await page.waitForTimeout(500);
  await dialog.screenshot({ path: outputPath });
} finally {
  await page.close();
  await context.close();
  await browser.close();
}
