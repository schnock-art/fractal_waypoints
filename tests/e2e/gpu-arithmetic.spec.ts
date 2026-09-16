import { expect, test } from '@playwright/test';
// @ts-expect-error pngjs has no bundled TypeScript declarations.
import { PNG } from 'pngjs';

declare const process: { env: Record<string, string | undefined> };

// Opt in to native Vulkan on Linux: default headless Chromium uses SwiftShader.
// REQUIRE_GPU_VENDOR=nvidia prevents a software-adapter pass hiding regressions.
test.use({ channel: 'chromium', launchOptions: { args: process.env.NATIVE_WEBGPU
  ? ['--enable-unsafe-webgpu', '--use-angle=vulkan', '--enable-features=Vulkan', '--disable-vulkan-surface']
  : ['--enable-unsafe-webgpu'] } });

test('GPU arithmetic preserves residuals and Mandelbrot orbit precision', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('console', (message) => { if (/invalid|validation|error/i.test(message.text())) errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { mandelbrotShader } = await load('/src/rendering/webgpu/mandelbrotShader.ts');
    const { createDefaultRenderConfig } = await load('/src/app/defaultConfig.ts');
    const { buildRenderUniformData, RENDER_UNIFORM_BUFFER_SIZE } = await load('/src/rendering/webgpu/uniforms.ts');
    const { iterateFormulaDetailed } = await load('/src/fractals/runtime.ts');
    const { encodeRenderConfigToUrlParam } = await load('/src/persistence/urlState.ts');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('WebGPU adapter required');
    const device = await adapter.requestDevice();
    const module = device.createShaderModule({ code: mandelbrotShader + `
      @group(0) @binding(7) var<storage, read_write> results: array<vec4f>;
      @compute @workgroup_size(1) fn check_arithmetic() {
        let a = render.centre.x;
        let b = render.centre.z;
        results[0] = vec4f(two_sum(a, b), two_prod(a, b));
        var z = DsComplex(vec2f(0.0), vec2f(0.0));
        let c = DsComplex(render.centre.xy, render.centre.zw);
        for (var i = 0u; i < 64u; i++) {
          z = ds_complex_add(ds_complex_square(z), c);
          results[i + 1u] = vec4f(z.re, z.im);
        }
        // Neighbouring pixels at the reported scale, through the full orbit.
        for (var i = 0u; i < 256u; i++) {
          let pixel = vec4f(1000.5 + f32(i % 16u), 700.5 + f32(i / 16u), 0.0, 1.0);
          let point = pixel_to_complex(pixel);
          let orbit = iterate_formula(point, 1024.0, 512u, 0.0, false);
          results[65u + i] = vec4f(f32(orbit.iteration), select(0.0, 1.0, orbit.escaped), point.re.x, point.re.y);
          results[321u + i] = vec4f(point.re, point.im);
        }
      }` });
    const pipeline = await device.createComputePipelineAsync({ layout: 'auto', compute: { module, entryPoint: 'check_arithmetic' } });
    const config = createDefaultRenderConfig();
    config.viewport.centre = { re: { hi: -0.5442458244970588, lo: 1.4803581518593627e-17 }, im: { hi: 0.6175806704263324, lo: 1.1855741435240743e-17 } };
    config.viewport.scale = { hi: 9.441642655589697e-6, lo: -4.974332022437977e-22 };
    config.viewport.aspectRatio = 1.3722307486987855;
    config.fractal.maxIterations = 512;
    config.quality.pixelDensity = 2;
    const data: Float32Array = buildRenderUniformData(config, 2048, 1400);
    const uniform = device.createBuffer({ size: RENDER_UNIFORM_BUFFER_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const size = (65 + 512) * 16;
    const output = device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    const readback = device.createBuffer({ size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(uniform, 0, data);
    const group = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: uniform } }, { binding: 7, resource: { buffer: output } }] });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline); pass.setBindGroup(0, group); pass.dispatchWorkgroups(1); pass.end();
    encoder.copyBufferToBuffer(output, 0, readback, 0, size);
    device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const values = Array.from(new Float32Array(readback.getMappedRange()));
    readback.unmap();
    uniform.destroy(); output.destroy(); readback.destroy(); device.destroy();
    const reference = Array.from({ length: 256 }, (_, i) => {
      const offset = (321 + i) * 4;
      // Isolate iteration accuracy from f32 pixel-offset rounding by feeding
      // the CPU the exact coordinate pair returned by the GPU.
      const orbit = iterateFormulaDetailed(config, values[offset] + values[offset + 1], values[offset + 2] + values[offset + 3], false);
      return { iteration: orbit.iteration, escaped: orbit.escaped };
    });
    return { url: `/?view=${encodeRenderConfigToUrlParam(config)}`, values, reference, inputs: Array.from(data.slice(0, 4)), adapter: { vendor: adapter.info.vendor, architecture: adapter.info.architecture, device: adapter.info.device, description: adapter.info.description } };
  });
  console.log(JSON.stringify({ adapter: result.adapter, arithmetic: result.values.slice(0, 4) }));
  if (process.env.REQUIRE_GPU_VENDOR) expect(result.adapter.vendor).toBe(process.env.REQUIRE_GPU_VENDOR);
  const [ar, al, br, bl] = result.inputs;
  expect(result.values[0] + result.values[1]).toBe(ar + br);
  expect(Math.abs(result.values[2] + result.values[3] - ar * br)).toBeLessThan(1e-14);
  let re = 0, im = 0;
  let worstError = 0;
  for (let i = 0; i < 64; i++) {
    [re, im] = [re * re - im * im + ar + al, 2 * re * im + br + bl];
    const offset = (i + 1) * 4;
    worstError = Math.max(worstError, Math.abs(result.values[offset] + result.values[offset + 1] - re), Math.abs(result.values[offset + 2] + result.values[offset + 3] - im));
  }
  expect(worstError).toBeLessThan(1e-9);
  let matching = 0;
  for (let i = 0; i < result.reference.length; i++) {
    const offset = (65 + i) * 4;
    if (result.values[offset] === result.reference[i].iteration && Boolean(result.values[offset + 1]) === result.reference[i].escaped) matching++;
  }
  // Boundary pixels can diverge after hundreds of chaotic iterations; require
  // at least 95% agreement here, not bitwise equality at chaotic boundaries.
  console.log({ matching, total: result.reference.length, worstError });
  expect(matching / result.reference.length).toBeGreaterThan(0.95);
  // Linux headless compositing can capture a blank WebGPU canvas even when
  // compute readback succeeds. Exercise visible output with --headed.
  if (testInfo.project.use.headless !== false) return;
  await page.goto(result.url);
  await expect(page.getByText('WebGPU', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await expect.poll(async () => {
    expect(errors).toEqual([]);
    const frame = PNG.sync.read(await page.getByTestId('main-canvas').screenshot());
    let visible = 0;
    for (let y = 100; y < frame.height - 10; y += 4) for (let x = 10; x < frame.width - 10; x += 4) {
      const i = (y * frame.width + x) * 4;
      if (Math.max(frame.data[i], frame.data[i + 1], frame.data[i + 2]) > 50) visible++;
    }
    return visible;
  }, { timeout: 30_000 }).toBeGreaterThan(1000);
  await page.getByTestId('main-canvas').screenshot({ path: testInfo.outputPath('deep-mandelbrot.png') });
});
