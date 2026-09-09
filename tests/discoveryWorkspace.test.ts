import { describe, expect, it } from 'vitest';

import { createWaypoint } from '../src/navigation/waypoints';
import { estimateDiscoveryTileCount, getDiscoveryIntensityLabel, summarizeDiscoveryWorkspace } from '../src/navigation/discoveryWorkspace';
import { createDefaultRenderConfig } from '../src/app/defaultConfig';

describe('discovery workspace helpers', () => {
  it('estimates tile counts from discovery options', () => {
    expect(estimateDiscoveryTileCount({
      levels: 3,
      beamWidth: 5,
      samplesPerAxis: 7,
      maxResults: 6,
    })).toBeGreaterThan(1);
  });

  it('classifies scan intensity for UX summaries', () => {
    expect(getDiscoveryIntensityLabel({
      levels: 1,
      beamWidth: 2,
      samplesPerAxis: 4,
      maxResults: 2,
    })).toBe('Quick scan');

    expect(getDiscoveryIntensityLabel({
      levels: 5,
      beamWidth: 8,
      samplesPerAxis: 10,
      maxResults: 12,
    })).toBe('Deep scan');
  });

  it('summarizes best score from discovery results', () => {
    const waypoint = createWaypoint({
      name: 'Discovery 1',
      renderConfig: createDefaultRenderConfig('mandelbrot'),
      source: 'discovered',
    });

    const summary = summarizeDiscoveryWorkspace({
      levels: 3,
      beamWidth: 5,
      samplesPerAxis: 7,
      maxResults: 6,
    }, [waypoint]);

    expect(summary.topScoreLabel).toBe((waypoint.interestingnessScore ?? 0).toFixed(2));
  });
});
