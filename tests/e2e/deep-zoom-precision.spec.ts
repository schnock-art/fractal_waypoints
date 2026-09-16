import { expect, test } from '@playwright/test';

test.use({ channel: 'chromium', launchOptions: { args: ['--enable-unsafe-webgpu'] } });

test('WebGPU preserves distinct deep-zoom viewport coordinates', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { createDefaultRenderConfig } = await load('/src/app/defaultConfig.ts');
    const { complexFromNumbers } = await load('/src/math/complex.ts');
    const { fromNumber } = await load('/src/math/doubleSingle.ts');
    const { mapPixelToComplex } = await load('/src/navigation/viewport.ts');
    const { buildRenderUniformData, RENDER_UNIFORM_BUFFER_SIZE } = await load('/src/rendering/webgpu/uniforms.ts');
    const { mandelbrotShader } = await load('/src/rendering/webgpu/mandelbrotShader.ts');

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('A WebGPU adapter is required for deep-zoom coordinate parity.');
    const device = await adapter.requestDevice();
    const shader = device.createShaderModule({ code: mandelbrotShader + `
      @group(0) @binding(7) var<storage, read_write> result: array<vec4f>;
      @compute @workgroup_size(1) fn deep_coordinate_parity() {
        let first = pixel_to_complex(vec4f(720.5, 480.5, 0.0, 1.0));
        let second = pixel_to_complex(vec4f(1120.5, 480.5, 0.0, 1.0));
        result[0] = vec4f(first.re.x, first.re.y, first.im.x, first.im.y);
        result[1] = vec4f(second.re.x, second.re.y, second.im.x, second.im.y);
      }` });
    const pipeline = await device.createComputePipelineAsync({ layout: 'auto', compute: { module: shader, entryPoint: 'deep_coordinate_parity' } });
    const uniform = device.createBuffer({ size: RENDER_UNIFORM_BUFFER_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const output = device.createBuffer({ size: 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    const readback = device.createBuffer({ size: 32, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: uniform } }, { binding: 7, resource: { buffer: output } }] });

    const config = createDefaultRenderConfig('mandelbrot');
    config.viewport.centre = complexFromNumbers(-0.743643887037151, 0.13182590420533);
    config.viewport.scale = fromNumber(1e-10);
    config.viewport.aspectRatio = 16 / 9;
    device.queue.writeBuffer(uniform, 0, buildRenderUniformData(config, 1920, 1080));
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup); pass.dispatchWorkgroups(1); pass.end();
    encoder.copyBufferToBuffer(output, 0, readback, 0, 32);
    device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const values = [...new Float32Array(readback.getMappedRange())];
    readback.unmap();
    uniform.destroy(); output.destroy(); readback.destroy(); device.destroy();

    const size = { width: 1920, height: 1080 };
    const first = mapPixelToComplex({ x: 720.5, y: 480.5 }, config.viewport, size);
    const second = mapPixelToComplex({ x: 1120.5, y: 480.5 }, config.viewport, size);
    return {
      gpu: {
        first: { re: values[0] + values[1], im: values[2] + values[3] },
        second: { re: values[4] + values[5], im: values[6] + values[7] },
      },
      cpu: {
        first: { re: first.re.hi + first.re.lo, im: first.im.hi + first.im.lo },
        second: { re: second.re.hi + second.re.lo, im: second.im.hi + second.im.lo },
      },
    };
  });

  expect(Math.abs(result.gpu.first.re - result.cpu.first.re)).toBeLessThan(2e-14);
  expect(Math.abs(result.gpu.first.im - result.cpu.first.im)).toBeLessThan(2e-14);
  expect(Math.abs(result.gpu.second.re - result.cpu.second.re)).toBeLessThan(2e-14);
  expect(Math.abs(result.gpu.second.im - result.cpu.second.im)).toBeLessThan(2e-14);
  expect(Math.abs(result.gpu.second.re - result.gpu.first.re)).toBeGreaterThan(1e-12);
});
