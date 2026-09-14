import { buildPaletteLut } from '../../palettes/sampler';
import type { RenderConfig } from '../../types/config';
import type { RenderCoordinator, RenderSurface } from '../types';
import { mandelbrotShader } from './mandelbrotShader';
import { METRIC_FIELD_FORMAT, requiresMetricField, shouldAllocateMetricField, shouldResizeMetricField } from './metricField';
import { buildRenderUniformData, RENDER_UNIFORM_BUFFER_SIZE } from './uniforms';

const PALETTE_TEXTURE_SIZE = 256;
const HDR_TEXTURE_FORMAT: GPUTextureFormat = 'rgba16float';

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
  private readonly directPipeline: GPURenderPipeline;
  private readonly metricPipeline: GPURenderPipeline;
  private readonly fieldMaterialPipeline: GPURenderPipeline;
  private readonly bloomPipeline: GPURenderPipeline;
  private readonly postPipeline: GPURenderPipeline;
  private readonly uniformBuffer: GPUBuffer;
  private readonly paletteTexture: GPUTexture;
  private readonly paletteSampler: GPUSampler;
  private readonly sceneSampler: GPUSampler;
  private readonly directBindGroup: GPUBindGroup;
  private readonly metricBindGroup: GPUBindGroup;
  private fieldMaterialBindGroup?: GPUBindGroup;
  private fieldTexture?: GPUTexture;
  private sceneTexture: GPUTexture;
  private bloomTexture: GPUTexture;
  private bloomBindGroup: GPUBindGroup;
  private postBindGroup: GPUBindGroup;

  private constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    canvas: HTMLCanvasElement,
    context: GPUCanvasContext,
    directPipeline: GPURenderPipeline,
    metricPipeline: GPURenderPipeline,
    fieldMaterialPipeline: GPURenderPipeline,
    bloomPipeline: GPURenderPipeline,
    postPipeline: GPURenderPipeline,
  ) {
    this.device = device;
    this.format = format;
    this.canvas = canvas;
    this.context = context;

    this.directPipeline = directPipeline;
    this.metricPipeline = metricPipeline;
    this.fieldMaterialPipeline = fieldMaterialPipeline;
    this.bloomPipeline = bloomPipeline;
    this.postPipeline = postPipeline;

    this.uniformBuffer = device.createBuffer({
      size: RENDER_UNIFORM_BUFFER_SIZE,
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
    this.sceneSampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });

    this.directBindGroup = device.createBindGroup({
      layout: this.directPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.paletteSampler },
        { binding: 2, resource: this.paletteTexture.createView() },
      ],
    });

    this.metricBindGroup = device.createBindGroup({
      layout: this.metricPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.paletteSampler },
        { binding: 2, resource: this.paletteTexture.createView() },
      ],
    });

    this.sceneTexture = this.createPostTexture(1, 1);
    this.bloomTexture = this.createPostTexture(1, 1);
    this.bloomBindGroup = this.createBloomBindGroup();
    this.postBindGroup = this.createPostBindGroup();

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

    const directPipeline = await device.createRenderPipelineAsync({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: HDR_TEXTURE_FORMAT }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    const metricPipeline = await device.createRenderPipelineAsync({
      layout: 'auto', vertex: { module: shaderModule, entryPoint: 'vs_main' },
      fragment: { module: shaderModule, entryPoint: 'metric_field_fs', targets: [{ format: METRIC_FIELD_FORMAT }] },
      primitive: { topology: 'triangle-list' },
    });
    const fieldMaterialPipeline = await device.createRenderPipelineAsync({
      layout: 'auto', vertex: { module: shaderModule, entryPoint: 'vs_main' },
      fragment: { module: shaderModule, entryPoint: 'field_material_fs', targets: [{ format: HDR_TEXTURE_FORMAT }] },
      primitive: { topology: 'triangle-list' },
    });

    const bloomPipeline = await device.createRenderPipelineAsync({ layout: 'auto', vertex: { module: shaderModule, entryPoint: 'vs_main' }, fragment: { module: shaderModule, entryPoint: 'bloom_downsample_fs', targets: [{ format: HDR_TEXTURE_FORMAT }] }, primitive: { topology: 'triangle-list' } });
    const postPipeline = await device.createRenderPipelineAsync({ layout: 'auto', vertex: { module: shaderModule, entryPoint: 'vs_main' }, fragment: { module: shaderModule, entryPoint: 'post_process_fs', targets: [{ format }] }, primitive: { topology: 'triangle-list' } });

    return new WebGpuSurface(device, format, canvas, context, directPipeline, metricPipeline, fieldMaterialPipeline, bloomPipeline, postPipeline);
  }

  resize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.floor(width));
    const nextHeight = Math.max(1, Math.floor(height));

    if (this.canvas.width === nextWidth && this.canvas.height === nextHeight) {
      return;
    }

    this.canvas.width = nextWidth;
    this.canvas.height = nextHeight;
    this.replacePostTextures(nextWidth, nextHeight);
    if (shouldResizeMetricField(this.fieldTexture !== undefined, true)) {
      this.replaceFieldTexture(nextWidth, nextHeight);
    }
    this.configureContext();
  }

  async render(config: RenderConfig): Promise<void> {
    const uniformData = buildRenderUniformData(config, this.canvas.width, this.canvas.height);

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    const paletteData = buildPaletteLut(config.palette, PALETTE_TEXTURE_SIZE);
    this.device.queue.writeTexture(
      { texture: this.paletteTexture },
      paletteData,
      { bytesPerRow: PALETTE_TEXTURE_SIZE * 4 },
      { width: PALETTE_TEXTURE_SIZE, height: 1, depthOrArrayLayers: 1 },
    );

    const encoder = this.device.createCommandEncoder();
    const needsMetricField = requiresMetricField(config);

    if (shouldAllocateMetricField(this.fieldTexture !== undefined, config)) {
      this.replaceFieldTexture(this.canvas.width, this.canvas.height);
    }

    if (needsMetricField) {
      const metricPass = encoder.beginRenderPass({
        colorAttachments: [{ view: this.fieldTexture!.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }],
      });
      metricPass.setPipeline(this.metricPipeline);
      metricPass.setBindGroup(0, this.metricBindGroup);
      metricPass.draw(3);
      metricPass.end();
    }
    const materialPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.sceneTexture.createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0.02, g: 0.03, b: 0.05, a: 1 },
        },
      ],
    });

    materialPass.setPipeline(needsMetricField ? this.fieldMaterialPipeline : this.directPipeline);
    materialPass.setBindGroup(0, needsMetricField ? this.fieldMaterialBindGroup! : this.directBindGroup);
    materialPass.draw(3);
    materialPass.end();

    const bloomPass = encoder.beginRenderPass({ colorAttachments: [{ view: this.bloomTexture.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
    bloomPass.setPipeline(this.bloomPipeline);
    bloomPass.setBindGroup(0, this.bloomBindGroup);
    bloomPass.draw(3);
    bloomPass.end();

    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: this.context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0.02, g: 0.03, b: 0.05, a: 1 } }] });
    pass.setPipeline(this.postPipeline);
    pass.setBindGroup(0, this.postBindGroup);
    pass.draw(3);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  destroy(): void { this.fieldTexture?.destroy(); this.sceneTexture.destroy(); this.bloomTexture.destroy(); }

  private createFieldTexture(width: number, height: number): GPUTexture {
    return this.device.createTexture({
      size: [width, height, 1],
      format: METRIC_FIELD_FORMAT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
  }

  private createPostTexture(width: number, height: number): GPUTexture {
    return this.device.createTexture({ size: [width, height, 1], format: HDR_TEXTURE_FORMAT, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
  }

  private createPostBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({ layout: this.postPipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }, { binding: 4, resource: this.sceneSampler }, { binding: 5, resource: this.sceneTexture.createView() }, { binding: 6, resource: this.bloomTexture.createView() }] });
  }

  private createBloomBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({ layout: this.bloomPipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }, { binding: 4, resource: this.sceneSampler }, { binding: 5, resource: this.sceneTexture.createView() }] });
  }

  private replacePostTextures(width: number, height: number): void {
    this.sceneTexture.destroy(); this.bloomTexture.destroy();
    this.sceneTexture = this.createPostTexture(width, height);
    this.bloomTexture = this.createPostTexture(Math.max(1, Math.floor(width / 2)), Math.max(1, Math.floor(height / 2)));
    this.bloomBindGroup = this.createBloomBindGroup();
    this.postBindGroup = this.createPostBindGroup();
  }

  private createFieldMaterialBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.fieldMaterialPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.paletteSampler },
        { binding: 2, resource: this.paletteTexture.createView() },
        { binding: 3, resource: this.fieldTexture!.createView() },
      ],
    });
  }

  private replaceFieldTexture(width: number, height: number): void {
    this.fieldTexture?.destroy();
    this.fieldTexture = this.createFieldTexture(width, height);
    this.fieldMaterialBindGroup = this.createFieldMaterialBindGroup();
  }

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
