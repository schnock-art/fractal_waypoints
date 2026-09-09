import { getColouringCode, getOrbitTrapScale } from '../../colouring/runtime';
import { buildPaletteLut } from '../../palettes/sampler';
import type { RenderConfig } from '../../types/config';
import type { RenderCoordinator, RenderSurface } from '../types';
import { getFormulaCode } from '../../fractals/runtime';
import { mandelbrotShader } from './mandelbrotShader';

const UNIFORM_BUFFER_SIZE = 6 * 16;
const PALETTE_TEXTURE_SIZE = 256;

export async function createWebGpuRenderCoordinator(adapter: GPUAdapter): Promise<RenderCoordinator> {
  const device = await adapter.requestDevice();
  const format = navigator.gpu.getPreferredCanvasFormat();

  return {
    backendLabel: 'WebGPU',
    interactive: true,
    async createSurface(canvas: HTMLCanvasElement): Promise<RenderSurface> {
      const context = canvas.getContext('webgpu') as GPUCanvasContext | null;

      if (!context) {
        throw new Error('Unable to create a WebGPU canvas context.');
      }

      return WebGpuSurface.create(device, format, canvas, context);
    },
  };
}

class WebGpuSurface implements RenderSurface {
  private readonly device: GPUDevice;
  private readonly format: GPUTextureFormat;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: GPUCanvasContext;
  private readonly pipeline: GPURenderPipeline;
  private readonly uniformBuffer: GPUBuffer;
  private readonly paletteTexture: GPUTexture;
  private readonly paletteSampler: GPUSampler;
  private readonly bindGroup: GPUBindGroup;

  private constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    canvas: HTMLCanvasElement,
    context: GPUCanvasContext,
    pipeline: GPURenderPipeline,
  ) {
    this.device = device;
    this.format = format;
    this.canvas = canvas;
    this.context = context;

    this.pipeline = pipeline;

    this.uniformBuffer = device.createBuffer({
      size: UNIFORM_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.paletteTexture = device.createTexture({
      size: [PALETTE_TEXTURE_SIZE, 1, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    this.paletteSampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'repeat',
      addressModeV: 'clamp-to-edge',
    });

    this.bindGroup = device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.paletteSampler },
        { binding: 2, resource: this.paletteTexture.createView() },
      ],
    });

    this.configureContext();
  }

  static async create(
    device: GPUDevice,
    format: GPUTextureFormat,
    canvas: HTMLCanvasElement,
    context: GPUCanvasContext,
  ): Promise<WebGpuSurface> {
    const shaderModule = device.createShaderModule({
      code: mandelbrotShader,
    });
    await assertShaderCompiles(shaderModule);

    const pipeline = await device.createRenderPipelineAsync({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    return new WebGpuSurface(device, format, canvas, context, pipeline);
  }

  resize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.floor(width));
    const nextHeight = Math.max(1, Math.floor(height));

    if (this.canvas.width === nextWidth && this.canvas.height === nextHeight) {
      return;
    }

    this.canvas.width = nextWidth;
    this.canvas.height = nextHeight;
    this.configureContext();
  }

  async render(config: RenderConfig): Promise<void> {
    const uniformData = new Float32Array([
      config.viewport.centre.re.hi,
      config.viewport.centre.re.lo,
      config.viewport.centre.im.hi,
      config.viewport.centre.im.lo,
      config.viewport.scale.hi,
      config.viewport.scale.lo,
      Math.cos(config.viewport.rotation),
      Math.sin(config.viewport.rotation),
      config.fractal.parameters.cReal ?? 0,
      0,
      config.fractal.parameters.cImag ?? 0,
      0,
      config.fractal.bailout,
      config.fractal.maxIterations,
      this.canvas.width,
      this.canvas.height,
      config.colouring.parameters.density ?? 0.03,
      getColouringCode(config.colouring.algorithmId),
      config.viewport.aspectRatio,
      getFormulaCode(config.fractal.formulaId),
      getOrbitTrapScale(config),
      0,
      0,
      0,
    ]);

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    const paletteData = buildPaletteLut(config.palette, PALETTE_TEXTURE_SIZE);
    this.device.queue.writeTexture(
      { texture: this.paletteTexture },
      paletteData,
      { bytesPerRow: PALETTE_TEXTURE_SIZE * 4 },
      { width: PALETTE_TEXTURE_SIZE, height: 1, depthOrArrayLayers: 1 },
    );

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0.02, g: 0.03, b: 0.05, a: 1 },
        },
      ],
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  destroy(): void {}

  private configureContext(): void {
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'opaque',
    });
  }
}

async function assertShaderCompiles(shaderModule: GPUShaderModule): Promise<void> {
  const compilationInfo = await shaderModule.getCompilationInfo();
  const errors = compilationInfo.messages.filter((message) => message.type === 'error');

  if (errors.length === 0) {
    return;
  }

  const formatted = errors
    .map((message) => `Line ${message.lineNum}:${message.linePos} ${message.message}`)
    .join('\n');

  throw new Error(`WGSL compilation failed.\n${formatted}`);
}
