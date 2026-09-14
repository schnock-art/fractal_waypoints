import { describe, expect, it } from 'vitest';
import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { iterateFormulaDetailed, iterateFormulaSample } from '../src/fractals/runtime';
import { normalizeNewtonParameters, polynomialRoots } from '../src/fractals/newton';
import { sampleCpuPixelColor } from '../src/rendering/fallback/CpuRenderCoordinator';
import { getMaterialCompatibility, resolveCompatibleRenderConfig } from '../src/visuals/materials/registry';
import { encodeRenderConfigToUrlParam, decodeRenderConfigFromUrlParam } from '../src/persistence/urlState';
import { interpolateRenderConfigs } from '../src/animation/interpolation';
import { runDiscoveryScan } from '../src/navigation/discovery';
import { getCuratedWaypoints } from '../src/navigation/curatedWaypoints';
import { buildRenderUniformData, RENDER_UNIFORM_BUFFER_SIZE } from '../src/rendering/webgpu/uniforms';
import { migrateWaypoint } from '../src/persistence/renderConfig';
import { createWaypoint } from '../src/navigation/waypoints';

describe('Newton and Nova convergence', () => {
  it('identifies every configured Newton root, including rotated and scaled polynomials', () => {
    for (const degree of [2, 3, 4, 6]) {
      const config = createDefaultRenderConfig('newton');
      config.fractal.parameters = normalizeNewtonParameters({ degree, rootRadius: 1.4, rootRotation: 0.3 });
      polynomialRoots(config.fractal.parameters).forEach(([re, im], root) => {
        const sample = iterateFormulaDetailed(config, re * 1.05, im * 1.05);
        expect(sample.convergence?.status).toBe('converged');
        expect(sample.convergence?.rootIdentity).toBe(root);
        expect(sample.convergence!.residual).toBeLessThanOrEqual(1e-5);
        expect(sample.escaped).toBe(false);
      });
    }
  });
  it('distinguishes a root, a zero derivative, a divergent step and an exhausted budget', () => {
    const config = createDefaultRenderConfig('newton');
    expect(iterateFormulaDetailed(config, 1, 0).convergence).toMatchObject({ status: 'converged', steps: 0, rootIdentity: 0 });
    expect(iterateFormulaDetailed(config, 0, 0).convergence).toMatchObject({ status: 'singular', rootIdentity: -1 });
    expect(iterateFormulaDetailed(config, 0.001, 0).convergence?.status).toBe('diverged');
    config.fractal.maxIterations = 1;
    expect(iterateFormulaDetailed(config, 2, 1).convergence?.status).toBe('unresolved');
    expect(Object.values(sampleCpuPixelColor(config, 0, 0)).every(Number.isFinite)).toBe(true);
  });
  it('uses fixed-point step convergence for Nova without assigning invented polynomial roots', () => {
    const config = createDefaultRenderConfig('nova');
    for (const point of [[0, 0], [0.1, 0.02]]) {
      const sample = iterateFormulaDetailed(config, point[0], point[1]);
      expect(sample.convergence).toMatchObject({ status: 'converged', rootIdentity: -1 });
      expect(sample.convergence!.residual).toBeLessThanOrEqual(1e-5);
    }
    expect(getMaterialCompatibility('nova', 'rootBasin').compatible).toBe(false);
    expect(getMaterialCompatibility('newton', 'surface').compatible).toBe(false);
    const saved = { ...config, material: { id: 'rootBasin' as const, parameters: {} } };
    expect(resolveCompatibleRenderConfig(saved).material.id).toBe('convergenceSpeed');
    expect(saved.material.id).toBe('rootBasin');
  });
  it('normalises bounds and preserves parameters and materials through URLs and Journey interpolation', () => {
    expect(normalizeNewtonParameters({ degree: 9, rootRadius: NaN, relaxation: 0 })).toMatchObject({ degree: 6, rootRadius: 1, relaxation: 0.2 });
    for (const formula of ['newton', 'nova'] as const) {
      const start = createDefaultRenderConfig(formula);
      const end = createDefaultRenderConfig(formula);
      end.fractal.parameters.rootRotation = 1;
      end.fractal.parameters.relaxation = 0.5;
      end.fractal.parameters.degree = 6;
      const mid = interpolateRenderConfigs(start, end, 0.5);
      expect(mid.fractal.parameters.rootRotation).toBe(0.5);
      expect(mid.fractal.parameters.relaxation).toBe(0.75);
      expect(mid.fractal.parameters.degree).toBe(5);
      expect(decodeRenderConfigFromUrlParam(encodeRenderConfigToUrlParam(mid))).toEqual(mid);
      const waypoint = createWaypoint({ name: 'Convergence test', renderConfig: mid, source: 'user', tags: [formula] });
      expect(migrateWaypoint(JSON.parse(JSON.stringify(waypoint)))?.renderConfig).toEqual(mid);
      const uniforms = buildRenderUniformData(mid, 100, 100);
      expect(uniforms.byteLength).toBe(RENDER_UNIFORM_BUFFER_SIZE);
      expect([...uniforms.slice(68, 72)]).toEqual([5, 0.75, expect.closeTo(1e-5), 1]);
    }
  });
  it('finds basin boundaries independently of material and retains curated formula configurations', () => {
    const config = createDefaultRenderConfig('newton');
    expect(iterateFormulaSample(config, 1, 0).basin).not.toBe(iterateFormulaSample(config, -0.5, 0.8660254).basin);
    for (const formula of ['newton', 'nova'] as const) {
      const scene = createDefaultRenderConfig(formula);
      const scan = runDiscoveryScan(scene, { levels: 1, samplesPerAxis: 4, maxResults: 2 });
      const recoloured = runDiscoveryScan({ ...scene, material: { id: 'classic', parameters: { density: 2 } } }, { levels: 1, samplesPerAxis: 4, maxResults: 2 });
      expect(scan.waypoints.map((w) => w.interestingnessScore)).toEqual(recoloured.waypoints.map((w) => w.interestingnessScore));
      expect(scan.waypoints.length).toBeGreaterThan(0);
      expect(scan.waypoints[0].renderConfig.fractal).toEqual(scene.fractal);
      expect(getCuratedWaypoints().filter((w) => w.renderConfig.fractal.formulaId === formula)).toHaveLength(2);
    }
  });
});
