import { toNumber } from '../math/doubleSingle';
import type { RenderConfig } from '../types/config';

export type DeepZoomSeverity = 'ok' | 'info' | 'warning';

export interface DeepZoomDiagnostics {
  severity: DeepZoomSeverity;
  summary: string;
  zoomDepth: number;
  recommendedIterations: number;
  details: string[];
  hints: string[];
}

export function analyzeDeepZoom(config: RenderConfig): DeepZoomDiagnostics {
  const scale = Math.max(toNumber(config.viewport.scale), 1e-30);
  const zoomDepth = Math.max(0, -Math.log10(scale));
  const recommendedIterations = getRecommendedIterations(zoomDepth);
  const iterationGap = recommendedIterations - config.fractal.maxIterations;

  if (zoomDepth >= 12) {
    return {
      severity: 'warning',
      summary: 'Extreme zoom: this viewport is approaching the practical limits of the current double-single, non-perturbation path.',
      zoomDepth: roundMetric(zoomDepth),
      recommendedIterations,
      details: buildDetails(config, zoomDepth, recommendedIterations),
      hints: [
        iterationGap > 0
          ? `Increase iterations toward ${recommendedIterations} to recover fine boundary detail.`
          : `Iterations are already in a good range for this zoom, but precision limits may still appear.`,
        'Expect deeper zoom work to benefit from future perturbation rendering rather than only higher iteration counts.',
        'If the image starts to smear or lose structure, save a Waypoint so this region can be revisited after deeper-zoom rendering upgrades.',
      ],
    };
  }

  if (zoomDepth >= 8 || iterationGap > 80) {
    return {
      severity: 'info',
      summary: 'Deep zoom: detail demand is rising, so iteration count and precision headroom matter more here.',
      zoomDepth: roundMetric(zoomDepth),
      recommendedIterations,
      details: buildDetails(config, zoomDepth, recommendedIterations),
      hints: [
        iterationGap > 0
          ? `Consider increasing iterations toward ${recommendedIterations} for cleaner boundary structure.`
          : 'Iteration count is roughly aligned with this zoom depth.',
        'Compare this region against a nearby Waypoint if you want to judge whether more iterations are revealing new structure or just noise.',
      ],
    };
  }

  return {
    severity: 'ok',
    summary: 'Zoom depth is within the comfortable range of the current realtime path.',
    zoomDepth: roundMetric(zoomDepth),
    recommendedIterations,
    details: buildDetails(config, zoomDepth, recommendedIterations),
    hints: [],
  };
}

function buildDetails(
  config: RenderConfig,
  zoomDepth: number,
  recommendedIterations: number,
): string[] {
  return [
    `Formula: ${config.fractal.formulaId}`,
    `Zoom depth: 1e-${roundMetric(zoomDepth).toFixed(2)}`,
    `Viewport scale: ${toNumber(config.viewport.scale).toExponential(4)}`,
    `Current iterations: ${config.fractal.maxIterations}`,
    `Recommended iterations: ${recommendedIterations}`,
  ];
}

function getRecommendedIterations(zoomDepth: number): number {
  if (zoomDepth < 3) {
    return 180;
  }

  if (zoomDepth < 8) {
    return Math.round(180 + ((zoomDepth - 3) * 28));
  }

  return Math.round(320 + ((zoomDepth - 8) * 40));
}

function roundMetric(value: number): number {
  return Number(value.toFixed(2));
}
