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
} from '../../visuals/materials/runtime';
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

  const materialColor = !sample.escaped && (config.material.id === 'classic')
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

  if (config.material.id === 'domainColouring') {
    const phaseScale = config.material.parameters.phaseScale ?? 1;
    const magnitudeScale = config.material.parameters.magnitudeScale ?? 0.38;
    const phaseT = fract(((sample.complexPhase / (Math.PI * 2)) + 0.5) * phaseScale);
    const magnitudeT = fract(Math.log2(Math.max(sample.magnitude, 1.0001)) * magnitudeScale);
    const colour = samplePalette(config.palette, fract(phaseT + magnitudeT));
    return sample.escaped ? colour : blendColor(INTERIOR_COLOR, colour, 0.3);
  }

  if (config.material.id === 'topographic') {
    const levels = Math.max(2, config.material.parameters.contourLevels ?? 18);
    const width = clampUnit(config.material.parameters.contourWidth ?? 0.13);
    const relief = clampUnit(config.material.parameters.relief ?? 0.72);
    const height = fract(sample.smoothIteration / Math.max(config.fractal.maxIterations, 1));
    const band = fract(height * levels);
    const contour = 1 - smoothstep(0.5 - width, 0.5 + width, Math.abs(band - 0.5));
    const terrain = samplePalette(config.palette, fract(height * (1 + (density * 18))));
    const base = sample.escaped ? terrain : blendColor(INTERIOR_COLOR, terrain, 0.22);
    return blendColor(base, { r: 0.01, g: 0.012, b: 0.02, a: 1 }, contour * relief);
  }

  if (config.material.id === 'surface') {
    const height = Math.max(0.1, config.material.parameters.height ?? 3.4);
    const lightAngle = config.material.parameters.lightAngle ?? 0.7;
    const specular = clampUnit(config.material.parameters.specular ?? 0.32);
    const roughness = clampUnit(config.material.parameters.roughness ?? 0.55);
    const ambient = clampUnit(config.material.parameters.ambient ?? 0.28);
    const paletteT = sampleSmoothEscapePaletteT(sample.iteration, sample.magnitudeSquared, density);
    const base = samplePalette(config.palette, paletteT);
    const directional = Math.max(0, Math.cos(sample.complexPhase - lightAngle));
    const lit = ambient + ((1 - ambient) * directional * Math.min(height / 3.4, 1.35));
    const highlight = Math.pow(directional, 6 + ((1 - roughness) * 44)) * specular;
    const shaded = {
      r: clampUnit((base.r * lit) + highlight),
      g: clampUnit((base.g * lit) + highlight),
      b: clampUnit((base.b * lit) + highlight),
      a: 1,
    };
    return sample.escaped ? shaded : blendColor(INTERIOR_COLOR, shaded, 0.2);
  }

  const smoothT = sampleSmoothEscapePaletteT(sample.iteration, sample.magnitudeSquared, density);
  return samplePalette(config.palette, smoothT);
}

function toByte(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 255);
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clampUnit((value - edge0) / Math.max(edge1 - edge0, 0.0001));
  return t * t * (3 - (2 * t));
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}
