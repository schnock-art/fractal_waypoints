import { complexFromNumbers } from '../math/complex';
import { add, fromNumber, multiplyByFloat, toNumber } from '../math/doubleSingle';
import { iterateFormulaSample } from '../fractals/runtime';
import { clonePalette } from '../palettes/model';
import type { RenderConfig, Waypoint } from '../types/config';
import { createWaypoint } from './waypoints';

export interface DiscoveryOptions {
  levels: number;
  beamWidth: number;
  samplesPerAxis: number;
  maxResults: number;
}

export interface DiscoveryMetrics {
  score: number;
  boundaryDensity: number;
  iterationVariance: number;
  escapeRatio: number;
  zoomDepth: number;
  level: number;
}

export interface DiscoveryRun {
  scannedTiles: number;
  options: DiscoveryOptions;
  waypoints: Waypoint[];
}

interface TileCandidate {
  config: RenderConfig;
  metrics: DiscoveryMetrics;
}

interface SampleMetrics {
  boundaryDensity: number;
  iterationVariance: number;
  escapeRatio: number;
}

const DEFAULT_DISCOVERY_OPTIONS: DiscoveryOptions = {
  levels: 3,
  beamWidth: 5,
  samplesPerAxis: 7,
  maxResults: 6,
};

export function createDefaultDiscoveryOptions(): DiscoveryOptions {
  return { ...DEFAULT_DISCOVERY_OPTIONS };
}

export function runDiscoveryScan(
  baseConfig: RenderConfig,
  options: Partial<DiscoveryOptions> = {},
): DiscoveryRun {
  const resolved = normalizeOptions(options);
  let frontier: TileCandidate[] = [createCandidate(baseConfig, analyzeTile(baseConfig, 0, resolved))];
  const ranked: TileCandidate[] = [];
  let scannedTiles = 1;

  for (let level = 1; level <= resolved.levels; level += 1) {
    const nextLayer: TileCandidate[] = [];

    for (const parent of frontier) {
      const children = subdivideTile(parent.config).map((config) => {
        const metrics = analyzeTile(config, level, resolved);
        scannedTiles += 1;
        return createCandidate(config, metrics);
      });

      nextLayer.push(...children);
    }

    nextLayer.sort(compareCandidates);
    ranked.push(...nextLayer);
    frontier = nextLayer.slice(0, resolved.beamWidth);
  }

  const unique = dedupeCandidates(ranked, resolved.maxResults);
  const waypoints = unique.map((candidate, index) => candidateToWaypoint(candidate, index));

  return {
    scannedTiles,
    options: resolved,
    waypoints,
  };
}

function normalizeOptions(options: Partial<DiscoveryOptions>): DiscoveryOptions {
  return {
    levels: clampInteger(options.levels, 1, 5, DEFAULT_DISCOVERY_OPTIONS.levels),
    beamWidth: clampInteger(options.beamWidth, 2, 8, DEFAULT_DISCOVERY_OPTIONS.beamWidth),
    samplesPerAxis: clampInteger(options.samplesPerAxis, 4, 10, DEFAULT_DISCOVERY_OPTIONS.samplesPerAxis),
    maxResults: clampInteger(options.maxResults, 1, 12, DEFAULT_DISCOVERY_OPTIONS.maxResults),
  };
}

function analyzeTile(
  config: RenderConfig,
  level: number,
  options: DiscoveryOptions,
): DiscoveryMetrics {
  const sampleMetrics = sampleTile(config, options.samplesPerAxis);
  const zoomDepth = Math.max(0, Math.log10(1 / Math.max(toNumber(config.viewport.scale), 1e-12)));
  const score =
    (sampleMetrics.boundaryDensity * 4.8) +
    (sampleMetrics.iterationVariance * 3.6) +
    ((1 - Math.abs(sampleMetrics.escapeRatio - 0.5)) * 1.4) +
    (zoomDepth * 0.35) +
    (level * 0.45);

  return {
    score: Number(score.toFixed(3)),
    boundaryDensity: Number(sampleMetrics.boundaryDensity.toFixed(3)),
    iterationVariance: Number(sampleMetrics.iterationVariance.toFixed(3)),
    escapeRatio: Number(sampleMetrics.escapeRatio.toFixed(3)),
    zoomDepth: Number(zoomDepth.toFixed(3)),
    level,
  };
}

function sampleTile(config: RenderConfig, samplesPerAxis: number): SampleMetrics {
  const analysisConfig = createMaterialIndependentDiscoveryConfig(config);
  const iterationGrid: number[][] = [];
  const escapedGrid: boolean[][] = [];
  let escapedCount = 0;

  for (let row = 0; row < samplesPerAxis; row += 1) {
    const rowIterations: number[] = [];
    const rowEscapes: boolean[] = [];

    for (let column = 0; column < samplesPerAxis; column += 1) {
      const x = samplesPerAxis === 1 ? 0.5 : column / (samplesPerAxis - 1);
      const y = samplesPerAxis === 1 ? 0.5 : row / (samplesPerAxis - 1);
      const point = mapSamplePoint(analysisConfig, x, y);
      const sample = iterateFractal(analysisConfig, point.real, point.imaginary);
      rowIterations.push(sample.normalizedIterations);
      rowEscapes.push(sample.escaped);

      if (sample.escaped) {
        escapedCount += 1;
      }
    }

    iterationGrid.push(rowIterations);
    escapedGrid.push(rowEscapes);
  }

  const flatIterations = iterationGrid.flat();
  const mean = flatIterations.reduce((sum, value) => sum + value, 0) / flatIterations.length;
  const variance = flatIterations.reduce((sum, value) => {
    const delta = value - mean;
    return sum + (delta * delta);
  }, 0) / flatIterations.length;
  const boundaryDensity = computeBoundaryDensity(escapedGrid);

  return {
    boundaryDensity,
    iterationVariance: Math.sqrt(variance),
    escapeRatio: escapedCount / flatIterations.length,
  };
}

export function createMaterialIndependentDiscoveryConfig(config: RenderConfig): RenderConfig {
  return {
    ...config,
    material: { id: 'classic', parameters: { density: 0.032 } },
    lens: { exposure: 1, vignette: 0 },
    palette: clonePalette(config.palette),
  };
}

function computeBoundaryDensity(escapedGrid: boolean[][]): number {
  let transitions = 0;
  let comparisons = 0;

  for (let row = 0; row < escapedGrid.length; row += 1) {
    for (let column = 0; column < escapedGrid[row].length; column += 1) {
      if (column + 1 < escapedGrid[row].length) {
        comparisons += 1;
        if (escapedGrid[row][column] !== escapedGrid[row][column + 1]) {
          transitions += 1;
        }
      }

      if (row + 1 < escapedGrid.length) {
        comparisons += 1;
        if (escapedGrid[row][column] !== escapedGrid[row + 1][column]) {
          transitions += 1;
        }
      }
    }
  }

  return comparisons === 0 ? 0 : transitions / comparisons;
}

function subdivideTile(config: RenderConfig): RenderConfig[] {
  const children: RenderConfig[] = [];
  const nextScale = multiplyByFloat(config.viewport.scale, 0.5);
  const offsets = [-0.25, 0.25];

  for (const y of offsets) {
    for (const x of offsets) {
      const offset = rotateOffset(
        x * config.viewport.aspectRatio,
        y,
        config.viewport.rotation,
      );

      children.push({
        ...config,
        viewport: {
          ...config.viewport,
          centre: {
            re: add(config.viewport.centre.re, multiplyByFloat(config.viewport.scale, offset.x)),
            im: add(config.viewport.centre.im, multiplyByFloat(config.viewport.scale, offset.y)),
          },
          scale: nextScale,
        },
        palette: clonePalette(config.palette),
      });
    }
  }

  return children;
}

function mapSamplePoint(config: RenderConfig, x: number, y: number): { real: number; imaginary: number } {
  const offset = rotateOffset(
    (x - 0.5) * config.viewport.aspectRatio,
    0.5 - y,
    config.viewport.rotation,
  );

  return {
    real: toNumber(add(config.viewport.centre.re, multiplyByFloat(config.viewport.scale, offset.x))),
    imaginary: toNumber(add(config.viewport.centre.im, multiplyByFloat(config.viewport.scale, offset.y))),
  };
}

function rotateOffset(x: number, y: number, rotation: number): { x: number; y: number } {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  return {
    x: (x * cosine) - (y * sine),
    y: (x * sine) + (y * cosine),
  };
}

function iterateFractal(config: RenderConfig, real: number, imaginary: number): { escaped: boolean; normalizedIterations: number } {
  return iterateFormulaSample(config, real, imaginary);
}

function dedupeCandidates(candidates: TileCandidate[], limit: number): TileCandidate[] {
  const deduped: TileCandidate[] = [];

  for (const candidate of [...candidates].sort(compareCandidates)) {
    if (deduped.some((existing) => isNearCandidate(existing, candidate))) {
      continue;
    }

    deduped.push(candidate);
    if (deduped.length >= limit) {
      break;
    }
  }

  return deduped;
}

function isNearCandidate(left: TileCandidate, right: TileCandidate): boolean {
  if (left.config.fractal.formulaId !== right.config.fractal.formulaId) {
    return false;
  }

  const dx = toNumber(left.config.viewport.centre.re) - toNumber(right.config.viewport.centre.re);
  const dy = toNumber(left.config.viewport.centre.im) - toNumber(right.config.viewport.centre.im);
  const distance = Math.hypot(dx, dy);
  const threshold = toNumber(left.config.viewport.scale) * 0.45;

  return distance <= threshold;
}

function candidateToWaypoint(candidate: TileCandidate, index: number): Waypoint {
  const descriptor = describeCandidate(candidate.metrics);
  const nextConfig = {
    ...candidate.config,
    viewport: {
      ...candidate.config.viewport,
      centre: complexFromNumbers(
        toNumber(candidate.config.viewport.centre.re),
        toNumber(candidate.config.viewport.centre.im),
      ),
      scale: fromNumber(toNumber(candidate.config.viewport.scale)),
    },
    palette: clonePalette(candidate.config.palette),
  };

  return createWaypoint({
    name: `Discovery ${index + 1}: ${descriptor.label}`,
    description: descriptor.description,
    renderConfig: nextConfig,
    source: 'discovered',
    tags: descriptor.tags,
  });
}

function describeCandidate(metrics: DiscoveryMetrics): { label: string; description: string; tags: string[] } {
  if (metrics.boundaryDensity >= 0.36) {
    return {
      label: 'Boundary Vein',
      description: 'Dense escape-boundary transitions suggest a richly detailed edge region.',
      tags: ['boundary', 'detail', 'discovery'],
    };
  }

  if (metrics.iterationVariance >= 0.3) {
    return {
      label: 'Variance Bloom',
      description: 'Wide iteration spread hints at layered structures and dramatic tonal shifts.',
      tags: ['variance', 'contrast', 'discovery'],
    };
  }

  return {
    label: 'Balanced Basin',
    description: 'A mixed region with a stable blend of interior mass and escaping filaments.',
    tags: ['mixed', 'structure', 'discovery'],
  };
}

function createCandidate(config: RenderConfig, metrics: DiscoveryMetrics): TileCandidate {
  return {
    config,
    metrics,
  };
}

function compareCandidates(left: TileCandidate, right: TileCandidate): number {
  return right.metrics.score - left.metrics.score;
}

function clampInteger(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}
