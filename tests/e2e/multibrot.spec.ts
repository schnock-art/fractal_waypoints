import { test, expect } from '@playwright/test';
import { createDemoUrl } from '../../scripts/product-demo/fixtures.mjs';
// @ts-expect-error pngjs has no bundled TypeScript declarations.
import { PNG } from 'pngjs';

test.use({ channel: 'chromium', launchOptions: { args: ['--enable-unsafe-webgpu'] } });

test('CPU and WGSL agree on Multibrot and Phoenix orbit metrics', async ({ page }) => {
  await page.goto(createDemoUrl('/'));
  const differences = await page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { createDefaultRenderConfig } = await load('/src/app/defaultConfig.ts');
    const { iterateFormulaDetailed } = await load('/src/fractals/runtime.ts');
    const { mandelbrotShader } = await load('/src/rendering/webgpu/mandelbrotShader.ts');
    const { buildRenderUniformData, RENDER_UNIFORM_BUFFER_SIZE } = await load('/src/rendering/webgpu/uniforms.ts');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('A WebGPU adapter is required for metric parity');
    const device = await adapter.requestDevice();
    const shader = device.createShaderModule({ code: mandelbrotShader + `
      @group(0) @binding(7) var<storage, read_write> result: array<vec4f>;
      @compute @workgroup_size(1) fn parity() {
        let point = DsComplex(render.centre.xy, render.centre.zw);
        let metrics = iterate_formula(point, render.control.x * render.control.x, u32(render.control.y), render.material.w, true);
        result[0] = vec4f(select(0.0, 1.0, metrics.escaped), f32(metrics.iteration), ds_to_f32(metrics.final_z.re), ds_to_f32(metrics.final_z.im));
        result[1] = vec4f(metrics.magnitude_squared, metrics.complex_phase, metrics.trap_min, smooth_iteration_value(metrics.iteration, metrics.magnitude_squared));
      }` });
    const pipeline = await device.createComputePipelineAsync({ layout: 'auto', compute: { module: shader, entryPoint: 'parity' } });
    const uniform = device.createBuffer({ size: RENDER_UNIFORM_BUFFER_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const output = device.createBuffer({ size: 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    const readback = device.createBuffer({ size: 32, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: uniform } }, { binding: 7, resource: { buffer: output } }] });
    const failures: string[] = [];
    const cases = [
      ...[2, 3, 4.5, 8].map((power) => ({ formula: 'multibrot', parameters: { power } })),
      ...[-0.5, 0, 0.25].map((memory) => ({ formula: 'phoenix', parameters: { memory, cReal: 0.56667, cImag: 0.03 } })),
    ];
    for (const entry of cases) {
      for (const [re, im] of [[0, 0], [0.1, 0.1], [1.1, 0.2], [-0.6, 0.9]]) {
        const config = createDefaultRenderConfig(entry.formula);
        config.fractal.parameters = entry.parameters;
        config.viewport.centre = { re: { hi: Math.fround(re), lo: re - Math.fround(re) }, im: { hi: Math.fround(im), lo: im - Math.fround(im) } };
        device.queue.writeBuffer(uniform, 0, buildRenderUniformData(config, 1, 1));
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline); pass.setBindGroup(0, bind); pass.dispatchWorkgroups(1); pass.end();
        encoder.copyBufferToBuffer(output, 0, readback, 0, 32);
        device.queue.submit([encoder.finish()]);
        await readback.mapAsync(GPUMapMode.READ);
        const actual = [...new Float32Array(readback.getMappedRange())];
        readback.unmap();
        const cpu = iterateFormulaDetailed(config, re, im, true);
        const expected = [Number(cpu.escaped), cpu.iteration, cpu.finalReal, cpu.finalImaginary, cpu.magnitudeSquared, cpu.complexPhase, cpu.minTrapDistance];
        if (cpu.escaped) expected.push(cpu.smoothIteration);
        expected.forEach((value, index) => {
          const tolerance = index < 2 ? 0 : 0.005 * Math.max(1, Math.abs(value));
          if (!Number.isFinite(actual[index]) || Math.abs(actual[index] - value) > tolerance) failures.push(`${JSON.stringify(entry)} at ${re},${im}: metric ${index}: GPU ${actual[index]} CPU ${value}`);
        });
      }
    }
    uniform.destroy(); output.destroy(); readback.destroy(); device.destroy();
    return failures;
  });
  expect(differences).toEqual([]);
});

test('Multibrot exposes power and renders integer and fractional powers on the GPU', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (/invalid|validation|bindgroup|commandbuffer/i.test(message.text())) errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(createDemoUrl('/'));
  await page.locator('select').filter({ has: page.locator('option[value="multibrot"]') }).first().selectOption('multibrot');
  await expect(page.getByLabel('Power', { exact: true })).toHaveValue('3');
  await expect(page.getByText('WebGPU', { exact: true }).first()).toBeVisible();
  const canvas = page.getByTestId('main-canvas');
  const cubic = await canvas.screenshot();
  await page.getByLabel('Power', { exact: true }).fill('4.5');
  await expect.poll(async () => cubic.equals(await canvas.screenshot())).toBe(false);
  await page.getByRole('button', { name: 'Visual Lab' }).click();
  await page.getByRole('button', { name: /^Molten Metal/ }).click();
  await canvas.screenshot({ path: testInfo.outputPath('fractional-multibrot.png') });
  await page.reload();
  await expect(page.getByLabel('Power', { exact: true })).toHaveValue('4.5');
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  const sides = page.locator('.comparison-panel__side-card');
  await sides.nth(0).getByLabel('Formula', { exact: true }).selectOption('multibrot');
  await sides.nth(1).getByLabel('Formula', { exact: true }).selectOption('multibrot');
  await sides.nth(0).getByLabel('Power', { exact: true }).fill('3');
  await sides.nth(1).getByLabel('Power', { exact: true }).fill('6');
  await expect(sides.nth(0).getByLabel('Power', { exact: true })).toHaveValue('3');
  await expect(sides.nth(1).getByLabel('Power', { exact: true })).toHaveValue('6');
  await page.getByRole('button', { name: 'Open comparison', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Exit comparison', exact: true })).toBeVisible();
  for (const surface of await page.locator('canvas').all()) {
    if (!(await surface.isVisible())) continue;
    await expect.poll(async () => {
      const frame = PNG.sync.read(await surface.screenshot());
      let bright = 0;
      for (let i = 0; i < frame.data.length; i += 4) {
        if (Math.max(frame.data[i], frame.data[i + 1], frame.data[i + 2]) > 40) bright++;
      }
      return bright / (frame.width * frame.height);
    }).toBeGreaterThan(0.02);
  }
  await page.screenshot({ path: testInfo.outputPath('multibrot-compare.png') });
  expect(errors).toEqual([]);
});
