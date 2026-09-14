import { describe, it, expect } from 'vitest';
import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { normalizePhoenixParameters } from '../src/fractals/phoenix';
import { iterateFormulaDetailed } from '../src/fractals/runtime';
import { getMaterialCompatibility } from '../src/visuals/materials/registry';
import { sampleCpuPixelColor } from '../src/rendering/fallback/CpuRenderCoordinator';
import { interpolateRenderConfigs } from '../src/animation/interpolation';
import { encodeRenderConfigToUrlParam, decodeRenderConfigFromUrlParam } from '../src/persistence/urlState';
import { migrateWaypoint } from '../src/persistence/renderConfig';
import { createWaypoint } from '../src/navigation/waypoints';
import { runDiscoveryScan } from '../src/navigation/discovery';
import { getCuratedWaypoints } from '../src/navigation/curatedWaypoints';
import { buildRenderUniformData } from '../src/rendering/webgpu/uniforms';

describe('Phoenix', () => {
  it('matches Julia exactly when memory is zero', () => {
    const phoenix = createDefaultRenderConfig('phoenix');
    phoenix.fractal.parameters.memory = 0;
    const julia = createDefaultRenderConfig('julia');
    julia.fractal.parameters = { ...phoenix.fractal.parameters };
    for (const [re, im] of [[0, 0], [1, 0.2], [-0.4, 0.1], [0.1, 0.7]]) {
      expect(iterateFormulaDetailed(phoenix, re, im)).toEqual(iterateFormulaDetailed(julia, re, im));
    }
  });
  it('remembers the old orbit, not the newly calculated value, and resets for every pixel', () => {
    const config = createDefaultRenderConfig('phoenix');
    config.fractal.parameters = { cReal: 0, cImag: 0, memory: -0.5 };
    config.fractal.maxIterations = 2;
    // z0=1+i, previous=0; z1=2i; z2=-4 - .5*(1+i).
    const sample = iterateFormulaDetailed(config, 1, 1);
    expect(sample.finalReal).toBe(-4.5); expect(sample.finalImaginary).toBe(-0.5);
    iterateFormulaDetailed(config, 0.3, 0.4);
    expect(iterateFormulaDetailed(config, 1, 1)).toEqual(sample);
  });
  it('normalises inputs and preserves parameter precision through uniforms and persistence', () => {
    expect(normalizePhoenixParameters({ cReal: NaN, cImag: 5, memory: -4 })).toEqual({ cReal: 0.56667, cImag: 2, memory: -1 });
    const start = createDefaultRenderConfig('phoenix');
    const end = createDefaultRenderConfig('phoenix');
    end.fractal.parameters.memory = -0.2;
    const mid = interpolateRenderConfigs(start, end, 0.5);
    expect(mid.fractal.parameters.memory).toBeCloseTo(-0.35);
    expect(decodeRenderConfigFromUrlParam(encodeRenderConfigToUrlParam(mid))).toEqual(mid);
    const waypoint = createWaypoint({ name: 'Phoenix test', renderConfig: mid, source: 'user', tags: ['phoenix'] });
    expect(migrateWaypoint(JSON.parse(JSON.stringify(waypoint)))?.renderConfig).toEqual(mid);
    const data = buildRenderUniformData(mid, 100, 100);
    expect(data[8] + data[9]).toBeCloseTo(mid.fractal.parameters.cReal, 13);
    expect(data[76] + data[77]).toBeCloseTo(mid.fractal.parameters.memory, 13);
  });
  it('supports escape materials and finite CPU rendering without inventing root metrics', () => {
    const config = createDefaultRenderConfig('phoenix');
    for (const id of ['classic', 'orbitTrap', 'surface', 'topographic', 'domainColouring'] as const) {
      expect(getMaterialCompatibility('phoenix', id).compatible).toBe(true);
      config.material.id = id;
      expect(Object.values(sampleCpuPixelColor(config, 0.5, 0.2)).every(Number.isFinite)).toBe(true);
    }
    expect(getMaterialCompatibility('phoenix', 'rootBasin').compatible).toBe(false);
  });
  it('discovers geometry independently of the chosen look and provides curated destinations', () => {
    const config = createDefaultRenderConfig('phoenix');
    const options = { levels: 1, samplesPerAxis: 4, maxResults: 2 };
    const scan = runDiscoveryScan(config, options);
    const other = runDiscoveryScan({ ...config, material: { id: 'surface', parameters: { height: 5 } } }, options);
    expect(scan.waypoints.length).toBeGreaterThan(0);
    expect(scan.waypoints.map((w) => w.renderConfig.viewport)).toEqual(other.waypoints.map((w) => w.renderConfig.viewport));
    expect(scan.waypoints[0].renderConfig.fractal).toEqual(config.fractal);
    expect(getCuratedWaypoints().filter((w) => w.renderConfig.fractal.formulaId === 'phoenix')).toHaveLength(3);
  });
});
