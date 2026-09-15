import { test, expect } from '@playwright/test';
import { createDefaultRenderConfig } from '../../src/app/defaultConfig';
import { encodeRenderConfigToUrlParam, decodeRenderConfigFromUrlParam } from '../../src/persistence/urlState';
// @ts-expect-error pngjs has no bundled TypeScript declarations.
import { PNG } from 'pngjs';

test.use({ channel: 'chromium', launchOptions: { args: ['--enable-unsafe-webgpu'] } });

for (const representation of ['legacy', 'program'] as const) {
  test(`${representation}: preview leaves authored URL intact, snapshots once, and Stop restores base`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const base = createDefaultRenderConfig('phoenix');
    base.palette.offset = 0.125;
    if (representation === 'legacy') base.modulations = [{ id: 'legacy', target: 'palette.offset', waveform: 'constant',
      amplitude: 0.25, offset: 0, frequencyHz: 1, phase: 0, enabled: true }];
    else base.modulationProgram = { schemaVersion: 1,
      sources: [{ id: 'internal', waveform: 'constant', frequencyHz: 1, phase: 0, amplitude: 0.25, offset: 0 }],
      mappings: [{ id: 'colour', sourceId: 'internal', target: 'palette.offset', mode: 'add', enabled: true, transforms: [] }],
    };
    await page.goto(`/?view=${encodeRenderConfigToUrlParam(base)}`);
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    const canvas = page.getByTestId('main-canvas');
    await expect(page.getByText('WebGPU', { exact: true }).first()).toBeVisible();
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(1);
    await page.getByRole('button', { name: 'Journey', exact: true }).click();
    const authoredUrl = page.url();
    await page.getByRole('button', { name: 'Play journey', exact: true }).click();
    const visibleFrame = async () => {
      await expect.poll(async () => {
        const frame = PNG.sync.read(await canvas.screenshot());
        let bright = 0;
        for (let i = 0; i < frame.data.length; i += 16) if (Math.max(frame.data[i], frame.data[i + 1], frame.data[i + 2]) > 60) bright++;
        return bright / (frame.data.length / 16);
      }).toBeGreaterThan(0.05);
    };
    await visibleFrame();
    await expect(page.getByRole('button', { name: 'Pause Journey', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Pause Journey', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Resume Journey', exact: true })).toBeEnabled();
    expect(page.url()).toBe(authoredUrl);
    await page.getByRole('button', { name: 'Palette', exact: true }).click();
    await expect(page.getByRole('slider', { name: /^Offset/ })).toBeDisabled();
    await page.setViewportSize({ width: 1280, height: 900 });
    await visibleFrame();
    await page.screenshot({ path: testInfo.outputPath(`${representation}-preview.png`) });
    expect(page.url()).toBe(authoredUrl);
    await page.getByRole('button', { name: 'Waypoints', exact: true }).click();
    await page.getByRole('button', { name: 'Quick save', exact: true }).click();
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('fractal-explorer:waypoints:v1') ?? '[]').length)).toBe(1);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fractal-explorer:waypoints:v1')!)[0].renderConfig);
    expect(saved.palette.offset).toBe(0.375);
    expect(saved.modulations).toEqual([]); expect(saved.modulationProgram).toBeUndefined();
    expect(page.url()).toBe(authoredUrl);
    await page.getByRole('button', { name: 'Resume Journey', exact: true }).click();
    await page.getByRole('button', { name: 'Stop and edit base', exact: true }).click();
    await page.getByRole('button', { name: 'Palette', exact: true }).click();
    await expect(page.getByRole('slider', { name: /^Offset/ })).toBeEnabled();
    const authored = decodeRenderConfigFromUrlParam(new URL(page.url()).searchParams.get('view')!)!;
    expect(authored.palette.offset).toBe(0.125);
    expect(authored.modulations).toEqual(base.modulations);
    expect(authored.modulationProgram).toEqual(base.modulationProgram);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Stop and edit base', exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
