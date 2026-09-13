import { describe, expect, it } from 'vitest';

import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { createDefaultDiscoveryOptions, createMaterialIndependentDiscoveryConfig, runDiscoveryScan } from '../src/navigation/discovery';
import { complexFromNumbers } from '../src/math/complex';
import { fromNumber } from '../src/math/doubleSingle';
import { createLensConfig } from '../src/visuals/lenses/model';

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

  it('ranks the same geometry regardless of material, palette, lens, or trap styling', () => {
    const baseline = createDefaultRenderConfig('mandelbrot');
    baseline.viewport.centre = complexFromNumbers(-0.7435, 0.1314);
    baseline.viewport.scale = fromNumber(0.12);
    const styled = createDefaultRenderConfig('mandelbrot');
    styled.viewport = structuredClone(baseline.viewport);
    styled.material = {
      id: 'orbitTrap',
      parameters: { density: 0.06, trapScale: 2.4 },
      orbitAppearance: { metric: 'final', paletteMapping: 'distanceBands', exteriorMix: 0.25, interiorMix: 0.7, emission: 0.5 },
    };
    styled.lens = createLensConfig(1.6, 0.5);
    styled.palette.offset = 0.62;

    const options = { levels: 2, beamWidth: 4, samplesPerAxis: 5, maxResults: 4 };
    const baselineRun = runDiscoveryScan(baseline, options);
    const styledRun = runDiscoveryScan(styled, options);

    expect(createMaterialIndependentDiscoveryConfig(styled).material.id).toBe('classic');
    expect(styledRun.waypoints.map((waypoint) => waypoint.interestingnessScore))
      .toEqual(baselineRun.waypoints.map((waypoint) => waypoint.interestingnessScore));
    expect(styledRun.waypoints.map((waypoint) => waypoint.name))
      .toEqual(baselineRun.waypoints.map((waypoint) => waypoint.name));
  });
});
