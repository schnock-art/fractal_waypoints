import { test, expect } from '@playwright/test';
// @ts-expect-error pngjs has no bundled TypeScript declarations.
import { PNG } from 'pngjs';
import { createDemoUrl } from '../../scripts/product-demo/fixtures.mjs';

test.use({ channel: 'chromium', launchOptions: { args: ['--enable-unsafe-webgpu'] } });

test('Newton and Nova CPU/WGSL convergence metrics agree', async ({ page }) => {
  await page.goto(createDemoUrl('/'));
  const differences = await page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { createDefaultRenderConfig } = await load('/src/app/defaultConfig.ts');
    const { iterateFormulaDetailed } = await load('/src/fractals/runtime.ts');
    const { mandelbrotShader } = await load('/src/rendering/webgpu/mandelbrotShader.ts');
    const { buildRenderUniformData, RENDER_UNIFORM_BUFFER_SIZE } = await load('/src/rendering/webgpu/uniforms.ts');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('GPU parity requires a WebGPU adapter');
    const device = await adapter.requestDevice();
    const module = device.createShaderModule({ code: mandelbrotShader + `
      @group(0) @binding(7) var<storage, read_write> result: array<vec4f>;
      @compute @workgroup_size(1) fn parity() {
        let m = iterate_formula(DsComplex(render.centre.xy, render.centre.zw), 1024.0, u32(render.control.y), render.material.w, false);
        result[0] = m.convergence;
        result[1] = vec4f(ds_to_f32(m.final_z.re), ds_to_f32(m.final_z.im), m.magnitude_squared, m.complex_phase);
      }` });
    const pipeline = await device.createComputePipelineAsync({ layout: 'auto', compute: { module, entryPoint: 'parity' } });
    const uniform = device.createBuffer({ size: RENDER_UNIFORM_BUFFER_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const output = device.createBuffer({ size: 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    const readback = device.createBuffer({ size: 32, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: uniform } }, { binding: 7, resource: { buffer: output } }] });
    const failures: string[] = [];
    for (const formula of ['newton', 'nova']) for (const parameters of [{ degree: 2 }, { degree: 3 }, { degree: 6 }, { degree: 3, rootRadius: 1.4, rootRotation: 0.3, relaxation: 0.8 }]) {
      const degree = parameters.degree;
      for (const [re, im] of [[0, 0], [1, 0], [0.1, 0.02], [-0.5, 0.8], [0.001, 0]]) {
        const config = createDefaultRenderConfig(formula);
        Object.assign(config.fractal.parameters, parameters);
        config.viewport.centre = { re: { hi: Math.fround(re), lo: re - Math.fround(re) }, im: { hi: Math.fround(im), lo: im - Math.fround(im) } };
        device.queue.writeBuffer(uniform, 0, buildRenderUniformData(config, 1, 1));
        const encoder = device.createCommandEncoder(); const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline); pass.setBindGroup(0, bind); pass.dispatchWorkgroups(1); pass.end();
        encoder.copyBufferToBuffer(output, 0, readback, 0, 32); device.queue.submit([encoder.finish()]);
        await readback.mapAsync(GPUMapMode.READ); const gpu = [...new Float32Array(readback.getMappedRange())]; readback.unmap();
        const cpu = iterateFormulaDetailed(config, re, im);
        const status = ['unresolved', 'converged', 'singular', 'diverged'].indexOf(cpu.convergence.status);
        const expected = [status, cpu.convergence.rootIdentity, cpu.convergence.residual, cpu.iteration, cpu.finalReal, cpu.finalImaginary, cpu.magnitudeSquared, cpu.complexPhase];
        expected.forEach((value, index) => {
          const tolerance = index === 0 || index === 1 || index === 3 ? 0 : 0.003 * Math.max(1, Math.abs(value));
          if (!Number.isFinite(gpu[index]) || Math.abs(gpu[index] - value) > tolerance) failures.push(`${formula}/${degree} at ${re},${im} metric ${index}: GPU ${gpu[index]}, CPU ${value}`);
        });
      }
    }
    uniform.destroy(); output.destroy(); readback.destroy(); device.destroy();
    return failures;
  });
  expect(differences).toEqual([]);
});

for (const formula of ['newton', 'nova']) {
  test(`${formula} renders, tunes, reloads and compares on WebGPU`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (/invalid|validation|bindgroup|commandbuffer/i.test(message.text())) errors.push(message.text()); });
    await page.goto(createDemoUrl('/'));
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await page.locator('select').filter({ has: page.locator(`option[value="${formula}"]`) }).first().selectOption(formula);
    await expect(page.getByText('WebGPU', { exact: true }).first()).toBeVisible();
    await page.getByLabel('Polynomial roots', { exact: true }).fill('4');
    await page.getByText('Polynomial & convergence', { exact: true }).click();
    await page.getByLabel('Relaxation', { exact: true }).fill('0.9');
    await page.getByRole('button', { name: 'Visual Lab', exact: true }).click();
    await page.getByRole('button', { name: formula === 'newton' ? /^Root Atlas/ : /^Nova Silk/ }).click();
    const canvas = page.getByTestId('main-canvas');
    expect(await canvas.evaluate((element: HTMLCanvasElement) => element.getContext('webgpu') !== null)).toBe(true);
    await expect.poll(async () => {
      const frame = PNG.sync.read(await canvas.screenshot());
      const colours = new Set<number>();
      let bright = 0;
      let sampled = 0;
      for (let y = Math.floor(frame.height * 0.15); y < frame.height - 10; y += 3) for (let x = 10; x < frame.width - 10; x += 3) {
        const i = (y * frame.width + x) * 4;
        colours.add((frame.data[i] << 16) + (frame.data[i + 1] << 8) + frame.data[i + 2]);
        sampled++;
        if (Math.max(frame.data[i], frame.data[i + 1], frame.data[i + 2]) > 45) bright++;
      }
      return bright / sampled > 0.05 ? colours.size : 0;
    }).toBeGreaterThan(50);
    await canvas.screenshot({ path: testInfo.outputPath(`${formula}.png`) });
    await page.reload();
    await expect(page.getByLabel('Polynomial roots', { exact: true })).toHaveValue('4');
    await page.getByText('Polynomial & convergence', { exact: true }).click();
    await expect(page.getByLabel('Relaxation', { exact: true })).toHaveValue('0.9');
    await page.getByRole('button', { name: 'Compare', exact: true }).click();
    const sides = page.locator('.comparison-panel__side-card');
    await sides.nth(0).getByLabel('Formula', { exact: true }).selectOption('newton');
    await sides.nth(1).getByLabel('Formula', { exact: true }).selectOption('nova');
    await expect(sides.nth(0).getByLabel('Polynomial roots', { exact: true })).toHaveValue('3');
    await page.getByRole('button', { name: 'Open comparison', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Exit comparison', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
