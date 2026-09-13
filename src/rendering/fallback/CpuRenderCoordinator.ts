import {
  applyLens,
  applyOrbitTrapEmission,
  blendColor,
  computeOrbitTrapExteriorMix,
  computeOrbitTrapInteriorMix,
  getMaterialDensity,
  getOrbitTrapAppearance,
  getOrbitTrapScale,
  sampleOrbitTrapPaletteT,
  sampleSmoothEscapePaletteT,
} from '../../colouring/runtime';
import { iterateFormulaDetailed } from '../../fractals/runtime';
import { samplePalette } from '../../palettes/sampler';
import type { RenderConfig, RgbaColor } from '../../types/config';
import type { RenderCoordinator, RenderSurface } from '../types';

const INTERIOR_COLOR: RgbaColor = { r: 0.02, g: 0.03, b: 0.06, a: 1 };
const MAX_CPU_RENDER_PIXELS = 240_000;
const ROWS_PER_YIELD = 12;

export function createCpuRenderCoordinator(): RenderCoordinator {
  return {
    backendLabel: 'CPU fallback',
    interactive: true,
    async createSurface(canvas: HTMLCanvasElement): Promise<RenderSurface> {
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Unable to create a 2D canvas context for the CPU fallback renderer.');
      }

      return new CpuRenderSurface(canvas, context);
    },
  };
}

class CpuRenderSurface implements RenderSurface {
  private renderGeneration = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
  ) {}

  resize(width: number, height: number): void {
    const size = getCpuRenderSize(width, height);

    // Keep the fallback interactive on high-DPI displays; CSS still scales the canvas to its visible size.
    this.canvas.width = size.width;
    this.canvas.height = size.height;
  }

  async render(config: RenderConfig): Promise<void> {
    const generation = ++this.renderGeneration;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const imageData = this.context.createImageData(width, height);
    const density = getMaterialDensity(config);
    const orbitTrapScale = getOrbitTrapScale(config);
    const scale = config.viewport.scale.hi + config.viewport.scale.lo;
    const centreRe = config.viewport.centre.re.hi + config.viewport.centre.re.lo;
    const centreIm = config.viewport.centre.im.hi + config.viewport.centre.im.lo;
    const cosine = Math.cos(config.viewport.rotation);
    const sine = Math.sin(config.viewport.rotation);
    const horizontalStep = config.viewport.aspectRatio / Math.max(width, 1);
    const horizontalStart = -0.5 * config.viewport.aspectRatio;

    for (let y = 0; y < height; y += 1) {
      if (generation !== this.renderGeneration) {
        return;
      }

      const normalizedY = 0.5 - (y / Math.max(height, 1));
      for (let x = 0; x < width; x += 1) {
        const normalizedX = horizontalStart + (x * horizontalStep);
        const real = centreRe + (scale * ((normalizedX * cosine) - (normalizedY * sine)));
        const imaginary = centreIm + (scale * ((normalizedX * sine) + (normalizedY * cosine)));
        const color = sampleCpuPixelColor(config, real, imaginary, density, orbitTrapScale, x / Math.max(width - 1, 1), y / Math.max(height - 1, 1));
        const offset = (y * width * 4) + (x * 4);

        imageData.data[offset] = toByte(color.r);
        imageData.data[offset + 1] = toByte(color.g);
        imageData.data[offset + 2] = toByte(color.b);
        imageData.data[offset + 3] = 255;
      }

      if (y % ROWS_PER_YIELD === ROWS_PER_YIELD - 1) {
        await yieldToBrowser();
      }
    }

    if (generation === this.renderGeneration) {
      this.context.putImageData(imageData, 0, 0);
    }
  }

  destroy(): void {
    this.renderGeneration += 1;
  }
}

export function sampleCpuPixelColor(
  config: RenderConfig,
  real: number,
  imaginary: number,
  density = getMaterialDensity(config),
  orbitTrapScale = getOrbitTrapScale(config),
  x = 0.5,
  y = 0.5,
): RgbaColor {
  const isOrbitTrap = config.material.id === 'orbitTrap';
  const sample = iterateFormulaDetailed(config, real, imaginary, isOrbitTrap);

  const materialColor = !sample.escaped && !isOrbitTrap
    ? INTERIOR_COLOR
    : resolveMaterialColor(config, sample, density, orbitTrapScale);
  return applyLens(materialColor, config.lens, x, y);
}

export function getCpuRenderSize(width: number, height: number): { width: number; height: number } {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const renderScale = Math.min(1, Math.sqrt(MAX_CPU_RENDER_PIXELS / (safeWidth * safeHeight)));

  return {
    width: Math.max(1, Math.floor(safeWidth * renderScale)),
    height: Math.max(1, Math.floor(safeHeight * renderScale)),
  };
}

function resolveMaterialColor(
  config: RenderConfig,
  sample: ReturnType<typeof iterateFormulaDetailed>,
  density: number,
  orbitTrapScale: number,
): RgbaColor {
  if (config.material.id === 'orbitTrap') {
    const appearance = getOrbitTrapAppearance(config);
    const trapDistance = appearance.metric === 'final' ? sample.finalTrapDistance : sample.minTrapDistance;
    const trapT = sampleOrbitTrapPaletteT(trapDistance, density, orbitTrapScale, appearance.paletteMapping);
    const orbitTrapColor = samplePalette(config.palette, trapT);

    if (!sample.escaped) {
      const interiorMix = computeOrbitTrapInteriorMix(trapDistance, orbitTrapScale, appearance.interiorMix);
      return applyOrbitTrapEmission(
        blendColor(INTERIOR_COLOR, orbitTrapColor, interiorMix),
        orbitTrapColor,
        trapDistance,
        orbitTrapScale,
        appearance.emission,
      );
    }

    const smoothT = sampleSmoothEscapePaletteT(sample.iteration, sample.magnitudeSquared, density);
    const smoothColor = samplePalette(config.palette, smoothT);
    const exteriorMix = computeOrbitTrapExteriorMix(
      sample.normalizedIterations,
      trapDistance,
      orbitTrapScale,
      appearance.exteriorMix,
    );
    return applyOrbitTrapEmission(
      blendColor(smoothColor, orbitTrapColor, exteriorMix),
      orbitTrapColor,
      trapDistance,
      orbitTrapScale,
      appearance.emission,
    );
  }

  const smoothT = sampleSmoothEscapePaletteT(sample.iteration, sample.magnitudeSquared, density);
  return samplePalette(config.palette, smoothT);
}

function toByte(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 255);
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}
