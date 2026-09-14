import { describe, it, expect } from 'vitest';
import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { iterateFormulaDetailed } from '../src/fractals/runtime';
import { multibrotPower, normalizeMultibrotPower } from '../src/fractals/multibrot';
import { interpolateRenderConfigs } from '../src/animation/interpolation';
import { encodeRenderConfigToUrlParam, decodeRenderConfigFromUrlParam } from '../src/persistence/urlState';
import { runDiscoveryScan } from '../src/navigation/discovery';
import { getCuratedWaypoints } from '../src/navigation/curatedWaypoints';

describe('Multibrot', () => {
  it('matches Mandelbrot exactly at power two', () => {
    const config = createDefaultRenderConfig('multibrot');
    config.fractal.parameters.power = 2;
    for (const [re, im] of [[0, 0], [1, 0], [-0.75, 0.1], [-1.4, 0.2]]) {
      expect(iterateFormulaDetailed(config, re, im)).toEqual(iterateFormulaDetailed(createDefaultRenderConfig(), re, im));
    }
  });
  it('computes integer and principal fractional powers including zero safely', () => {
    expect(multibrotPower(1, 1, 3)).toEqual([-2, 2]);
    expect(multibrotPower(0, 0, 2.5)).toEqual([0, 0]);
    const [re, im] = multibrotPower(-1, 0, 2.5);
    expect(re).toBeCloseTo(0); expect(im).toBeCloseTo(1);
    expect(normalizeMultibrotPower(NaN)).toBe(3);
    expect(normalizeMultibrotPower(100)).toBe(8);
    expect(normalizeMultibrotPower(-1)).toBe(2);
  });
  it('round-trips power and interpolates deterministic power sweeps', () => {
    const start = createDefaultRenderConfig('multibrot');
    const end = createDefaultRenderConfig('multibrot');
    end.fractal.parameters.power = 6;
    const middle = interpolateRenderConfigs(start, end, 0.5);
    expect(middle.fractal.parameters.power).toBe(4.5);
    expect(decodeRenderConfigFromUrlParam(encodeRenderConfigToUrlParam(middle))).toEqual(middle);
    end.fractal.parameters.power = 999;
    expect(decodeRenderConfigFromUrlParam(encodeRenderConfigToUrlParam(end))?.fractal.parameters.power).toBe(8);
  });
  it('discovers finite ranked destinations that retain the selected power', () => {
    const config = createDefaultRenderConfig('multibrot');
    const scan = runDiscoveryScan(config, { levels: 1, samplesPerAxis: 5, maxResults: 3 });
    expect(scan.waypoints.length).toBeGreaterThan(0);
    for (const point of scan.waypoints) {
      expect(point.renderConfig.fractal).toEqual(config.fractal);
      expect(Number.isFinite(point.interestingnessScore)).toBe(true);
    }
    expect(getCuratedWaypoints().filter((point) => point.renderConfig.fractal.formulaId === 'multibrot')).toHaveLength(3);
  });
});
