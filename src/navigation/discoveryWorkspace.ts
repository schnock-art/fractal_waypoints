import type { Waypoint } from '../types/config';
import type { DiscoveryOptions } from './discovery';

export interface DiscoveryWorkspaceSummary {
  intensityLabel: string;
  estimatedTileCount: number;
  topScoreLabel: string;
}

export function summarizeDiscoveryWorkspace(
  options: DiscoveryOptions,
  results: Waypoint[],
): DiscoveryWorkspaceSummary {
  return {
    intensityLabel: getDiscoveryIntensityLabel(options),
    estimatedTileCount: estimateDiscoveryTileCount(options),
    topScoreLabel: results.length > 0
      ? (results[0].interestingnessScore ?? 0).toFixed(2)
      : 'None yet',
  };
}

export function estimateDiscoveryTileCount(options: DiscoveryOptions): number {
  let total = 1;
  let frontier = 1;

  for (let level = 1; level <= options.levels; level += 1) {
    const children = frontier * 4;
    total += children;
    frontier = Math.min(children, options.beamWidth);
  }

  return total;
}

export function getDiscoveryIntensityLabel(options: DiscoveryOptions): string {
  const score =
    (options.levels * 1.4) +
    (options.beamWidth * 1.1) +
    (options.samplesPerAxis * 0.8) +
    (options.maxResults * 0.35);

  if (score >= 20) {
    return 'Deep scan';
  }

  if (score >= 14) {
    return 'Focused scan';
  }

  return 'Quick scan';
}
