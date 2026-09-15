import { test, expect, type Locator } from '@playwright/test';
// @ts-expect-error pngjs has no bundled TypeScript declarations.
import { PNG } from 'pngjs';
import { createDemoUrl } from '../../scripts/product-demo/fixtures.mjs';

test.use({ channel: 'chromium', launchOptions: { args: ['--enable-unsafe-webgpu'] } });

async function visibleFrame(canvas: Locator) {
  expect(await canvas.evaluate((element: HTMLCanvasElement) => element.getContext('webgpu') !== null)).toBe(true);
  await expect.poll(async () => {
    const frame = PNG.sync.read(await canvas.screenshot());
    let bright = 0; let sampled = 0;
    for (let y = Math.floor(frame.height * 0.15); y < frame.height - 10; y += 3) for (let x = 10; x < frame.width - 10; x += 3) {
      const i = (y * frame.width + x) * 4; sampled++;
      if (Math.max(frame.data[i], frame.data[i + 1], frame.data[i + 2]) > 45) bright++;
    }
    return bright / sampled;
  }).toBeGreaterThan(0.05);
}

test('Phoenix tunes, renders materials, reloads and compares on WebGPU', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (/invalid|validation|bindgroup|commandbuffer/i.test(message.text())) errors.push(message.text()); });
  await page.goto(createDemoUrl('/'));
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await page.locator('select').filter({ has: page.locator('option[value="phoenix"]') }).first().selectOption('phoenix');
  await expect(page.getByLabel('Orbit memory', { exact: true })).toHaveValue('-0.5');
  await expect(page.getByText('WebGPU', { exact: true }).first()).toBeVisible();
  const canvas = page.getByTestId('main-canvas');
  await visibleFrame(canvas);
  await canvas.screenshot({ path: testInfo.outputPath('phoenix-classic.png') });
  await page.getByLabel('Orbit memory', { exact: true }).fill('-0.47');
  await page.getByText('Phoenix shape', { exact: true }).click();
  await page.getByLabel('Phoenix real', { exact: true }).fill('0.545');
  await page.getByRole('button', { name: 'Palette', exact: true }).click();
  await page.getByRole('slider', { name: /^Offset/ }).fill('0.37');
  await visibleFrame(canvas);
  await page.getByRole('button', { name: 'Visual Lab', exact: true }).click();
  for (const name of ['Filament', 'Topographic Atlas', 'Molten Metal']) {
    await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
    await visibleFrame(canvas);
  }
  await canvas.screenshot({ path: testInfo.outputPath('phoenix-surface.png') });
  await page.reload();
  await expect(page.getByLabel('Orbit memory', { exact: true })).toHaveValue('-0.47');
  await page.getByRole('button', { name: 'Palette', exact: true }).click();
  await expect(page.getByRole('slider', { name: /^Offset/ })).toHaveValue('0.37');
  await visibleFrame(canvas);
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  const sides = page.locator('.comparison-panel__side-card');
  for (const side of await sides.all()) await side.getByLabel('Formula', { exact: true }).selectOption('phoenix');
  await sides.nth(1).getByLabel('Orbit memory', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Open comparison', exact: true }).click();
  for (const surface of await page.locator('canvas').all()) if (await surface.isVisible()) await visibleFrame(surface);
  expect(errors).toEqual([]);
});

test('curated Phoenix Waypoints all render visible GPU frames', async ({ page }, testInfo) => {
  await page.goto(createDemoUrl('/'));
  const urls = await page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { getCuratedWaypoints } = await load('/src/navigation/curatedWaypoints.ts');
    const { encodeRenderConfigToUrlParam } = await load('/src/persistence/urlState.ts');
    return getCuratedWaypoints().filter((w: { renderConfig: { fractal: { formulaId: string } } }) => w.renderConfig.fractal.formulaId === 'phoenix')
      .map((w: { name: string; renderConfig: unknown }) => ({ name: w.name, url: `/?view=${encodeRenderConfigToUrlParam(w.renderConfig)}` }));
  });
  expect(urls).toHaveLength(3);
  for (const waypoint of urls) {
    await page.goto(waypoint.url);
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await visibleFrame(page.getByTestId('main-canvas'));
    await page.getByTestId('main-canvas').screenshot({ path: testInfo.outputPath(`${waypoint.name}.png`) });
  }
});
