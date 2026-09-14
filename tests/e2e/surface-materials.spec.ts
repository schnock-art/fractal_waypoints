import { expect, test, type Locator } from '@playwright/test';
// @ts-expect-error pngjs has no bundled TypeScript declarations.
import { PNG } from 'pngjs';
import { createDemoUrl } from '../../scripts/product-demo/fixtures.mjs';

// Full Chromium exposes the GPU adapter; the headless shell can silently use CPU.
test.use({ channel: 'chromium', launchOptions: { args: ['--enable-unsafe-webgpu'] } });

for (const preset of ['Topographic Atlas', 'Engraved Obsidian', 'Molten Metal', 'Bioluminescent Coral']) {
  test(`${preset} renders through WebGPU after selection, resize and reload`, async ({ page }, testInfo) => {
    const graphicsErrors: string[] = [];
    page.on('console', (message) => {
      if (/invalid|validation|bindgroup|commandbuffer/i.test(message.text())) graphicsErrors.push(message.text());
    });
    page.on('pageerror', (error) => graphicsErrors.push(error.message));
    await page.goto(createDemoUrl('/'));
    await expect(page.getByText('WebGPU', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Visual Lab' }).click();
    await page.getByRole('button', { name: new RegExp(`^${preset}`) }).click();
    const canvas = page.getByTestId('main-canvas');
    await assertVisibleGpuFrame(canvas);
    expect(graphicsErrors).toEqual([]);
    await page.setViewportSize({ width: 1280, height: 900 });
    await assertVisibleGpuFrame(canvas);
    await page.getByRole('button', { name: /^Classic Escape/ }).click();
    await page.getByRole('button', { name: new RegExp(`^${preset}`) }).click();
    await assertVisibleGpuFrame(canvas);
    // Restore the selected material into a newly created GPU surface.
    await page.reload();
    await expect(page.getByText('WebGPU', { exact: true }).first()).toBeVisible();
    await assertVisibleGpuFrame(canvas);
    expect(graphicsErrors, 'GPU resource creation and submission must remain valid').toEqual([]);
    await canvas.screenshot({ path: testInfo.outputPath('webgpu-material.png') });
  });
}

async function assertVisibleGpuFrame(canvas: Locator): Promise<void> {
  // Never accept CPU rendering as evidence that the GPU path works.
  expect(await canvas.evaluate((element: HTMLCanvasElement) => element.getContext('webgpu') !== null)).toBe(true);
  await expect.poll(async () => {
    const image = PNG.sync.read(await canvas.screenshot()) as { width: number; height: number; data: Uint8Array };
    let visiblePixels = 0;
    let inspectedPixels = 0;
    // Exclude the keyboard button and rounded border from image measurements.
    for (let y = Math.floor(image.height * 0.15); y < image.height - 8; y += 1) {
      for (let x = 8; x < image.width - 8; x += 1) {
        const index = (y * image.width + x) * 4;
        inspectedPixels += 1;
        if (Math.max(image.data[index], image.data[index + 1], image.data[index + 2]) > 40) visiblePixels += 1;
      }
    }
    return visiblePixels / inspectedPixels;
  }, { message: 'The GPU frame must contain visible fractal detail' }).toBeGreaterThan(0.02);
}
