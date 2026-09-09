import { describe, expect, it } from 'vitest';

import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { createDefaultDiscoveryOptions, runDiscoveryScan } from '../src/navigation/discovery';
import { complexFromNumbers } from '../src/math/complex';
import { fromNumber } from '../src/math/doubleSingle';

describe('discovery scan', () => {
  it('returns deduplicated discovered waypoints', () => {
    const config = createDefaultRenderConfig('mandelbrot');
    config.viewport.centre = complexFromNumbers(-0.7435, 0.1314);
    config.viewport.scale = fromNumber(0.12);

    const run = runDiscoveryScan(config, {
      levels: 2,
      beamWidth: 4,
      samplesPerAxis: 5,
      maxResults: 4,
    });

    expect(run.scannedTiles).toBeGreaterThan(1);
    expect(run.waypoints.length).toBeGreaterThan(0);
    expect(run.waypoints.length).toBeLessThanOrEqual(4);
    expect(new Set(run.waypoints.map((waypoint) => waypoint.id)).size).toBe(run.waypoints.length);
    expect(run.waypoints.every((waypoint) => waypoint.source === 'discovered')).toBe(true);
  });

  it('normalizes discovery options to safe bounds', () => {
    const config = createDefaultRenderConfig('julia');
    const defaults = createDefaultDiscoveryOptions();
    const run = runDiscoveryScan(config, {
      levels: 99,
      beamWidth: 0,
      samplesPerAxis: 200,
      maxResults: -2,
    });

    expect(run.options.levels).toBe(5);
    expect(run.options.beamWidth).toBe(2);
    expect(run.options.samplesPerAxis).toBe(10);
    expect(run.options.maxResults).toBe(1);
    expect(defaults.levels).toBe(3);
  });
});
