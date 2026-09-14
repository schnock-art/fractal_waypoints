import { getMaterialCode, getMaterialDensity, getOrbitTrapAppearance, getOrbitTrapScale, getOrbitTrapSet } from '../../colouring/runtime';
import { getOrbitTrapCompositionCode, getOrbitTrapShapeCode } from '../../colouring/orbitTraps';
import { getOrbitTrapMetricCode, getOrbitTrapPaletteMappingCode } from '../../colouring/orbitMaterial';
import { getLensEffectAmount } from '../../visuals/lenses/model';
import { buildPaletteLut } from '../../palettes/sampler';
import type { RenderConfig } from '../../types/config';
import type { RenderCoordinator, RenderSurface } from '../types';
import { getFormulaCode } from '../../fractals/runtime';
import { mandelbrotShader } from './mandelbrotShader';

const UNIFORM_BUFFER_SIZE = 12 * 16;
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
  private readonly directPipeline: GPURenderPipeline;
  private readonly metricPipeline: GPURenderPipeline;
  private readonly fieldMaterialPipeline: GPURenderPipeline;
  private readonly uniformBuffer: GPUBuffer;
  private readonly paletteTexture: GPUTexture;
  private readonly paletteSampler: GPUSampler;
  private readonly directBindGroup: GPUBindGroup;
  private readonly metricBindGroup: GPUBindGroup;
  private fieldMaterialBindGroup: GPUBindGroup;
  private fieldTexture: GPUTexture;

  private constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    canvas: HTMLCanvasElement,
    context: GPUCanvasContext,
    directPipeline: GPURenderPipeline,
    metricPipeline: GPURenderPipeline,
    fieldMaterialPipeline: GPURenderPipeline,
  ) {
    this.device = device;
    this.format = format;
    this.canvas = canvas;
    this.context = context;

    this.directPipeline = directPipeline;
    this.metricPipeline = metricPipeline;
    this.fieldMaterialPipeline = fieldMaterialPipeline;

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

    this.fieldTexture = this.createFieldTexture(1, 1);
    this.fieldMaterialBindGroup = this.createFieldMaterialBindGroup();

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
        targets: [{ format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    const metricPipeline = await device.createRenderPipelineAsync({
      layout: 'auto', vertex: { module: shaderModule, entryPoint: 'vs_main' },
      fragment: { module: shaderModule, entryPoint: 'metric_field_fs', targets: [{ format: 'rgba8unorm' }] },
      primitive: { topology: 'triangle-list' },
    });
    const fieldMaterialPipeline = await device.createRenderPipelineAsync({
      layout: 'auto', vertex: { module: shaderModule, entryPoint: 'vs_main' },
      fragment: { module: shaderModule, entryPoint: 'field_material_fs', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });

    return new WebGpuSurface(device, format, canvas, context, directPipeline, metricPipeline, fieldMaterialPipeline);
  }

  resize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.floor(width));
    const nextHeight = Math.max(1, Math.floor(height));

    if (this.canvas.width === nextWidth && this.canvas.height === nextHeight) {
      return;
    }

    this.canvas.width = nextWidth;
    this.canvas.height = nextHeight;
    this.fieldTexture.destroy();
    this.fieldTexture = this.createFieldTexture(nextWidth, nextHeight);
    this.fieldMaterialBindGroup = this.createFieldMaterialBindGroup();
    this.configureContext();
  }

  async render(config: RenderConfig): Promise<void> {
    const trapSet = getOrbitTrapSet(config);
    const appearance = getOrbitTrapAppearance(config);
    const firstTrap = trapSet.traps[0];
    const secondTrap = trapSet.traps[1] ?? firstTrap;
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
      getMaterialDensity(config),
      getMaterialCode(config.material.id),
      config.viewport.aspectRatio,
      getFormulaCode(config.fractal.formulaId),
      getOrbitTrapScale(config),
      getLensEffectAmount(config.lens, 'exposure'),
      getLensEffectAmount(config.lens, 'vignette'),
      appearance.emission,
      firstTrap.x,
      firstTrap.y,
      firstTrap.rotation,
      firstTrap.scale,
      secondTrap.x,
      secondTrap.y,
      secondTrap.rotation,
      secondTrap.scale,
      getOrbitTrapShapeCode(firstTrap.shape),
      getOrbitTrapShapeCode(secondTrap.shape),
      getOrbitTrapCompositionCode(trapSet.composition),
      trapSet.traps.length,
      getOrbitTrapMetricCode(appearance.metric),
      getOrbitTrapPaletteMappingCode(appearance.paletteMapping),
      appearance.exteriorMix,
      appearance.interiorMix,
      config.material.parameters.contourLevels ?? config.material.parameters.phaseScale ?? 18,
      config.material.parameters.contourWidth ?? config.material.parameters.magnitudeScale ?? 0.13,
      config.material.parameters.relief ?? 0.72,
      config.material.parameters.height ?? 3.4,
      config.material.parameters.lightAngle ?? 0.7,
      config.material.parameters.specular ?? 0.32,
      config.material.parameters.ambient ?? 0.28,
      config.material.parameters.roughness ?? 0.55,
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
    const needsMetricField = config.material.id === 'topographic' || config.material.id === 'surface';

    if (needsMetricField) {
      const metricPass = encoder.beginRenderPass({
        colorAttachments: [{ view: this.fieldTexture.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }],
      });
      metricPass.setPipeline(this.metricPipeline);
      metricPass.setBindGroup(0, this.metricBindGroup);
      metricPass.draw(3);
      metricPass.end();
    }
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

    pass.setPipeline(needsMetricField ? this.fieldMaterialPipeline : this.directPipeline);
    pass.setBindGroup(0, needsMetricField ? this.fieldMaterialBindGroup : this.directBindGroup);
    pass.draw(3);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  destroy(): void { this.fieldTexture.destroy(); }

  private createFieldTexture(width: number, height: number): GPUTexture {
    return this.device.createTexture({
      size: [width, height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
  }

  private createFieldMaterialBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.fieldMaterialPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.paletteSampler },
        { binding: 2, resource: this.paletteTexture.createView() },
        { binding: 3, resource: this.fieldTexture.createView() },
      ],
    });
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
