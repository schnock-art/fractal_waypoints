import { describe, expect, it } from 'vitest';

import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { fromNumber } from '../src/math/doubleSingle';
import { analyzeDeepZoom } from '../src/rendering/deepZoomDiagnostics';

describe('deep zoom diagnostics', () => {
  it('treats ordinary exploration scales as healthy', () => {
    const diagnostics = analyzeDeepZoom(createDefaultRenderConfig('mandelbrot'));

    expect(diagnostics.severity).toBe('ok');
    expect(diagnostics.recommendedIterations).toBeGreaterThan(0);
  });

  it('flags deep zooms that need more iteration headroom', () => {
    const config = createDefaultRenderConfig('burningShip');
    config.viewport.scale = fromNumber(1e-9);
    config.fractal.maxIterations = 180;

    const diagnostics = analyzeDeepZoom(config);

    expect(diagnostics.severity).toBe('info');
    expect(diagnostics.summary).toContain('Deep zoom');
    expect(diagnostics.hints.some((hint) => hint.includes('iterations'))).toBe(true);
  });

  it('warns when the viewport reaches extreme zoom territory', () => {
    const config = createDefaultRenderConfig('tricorn');
    config.viewport.scale = fromNumber(1e-13);
    config.fractal.maxIterations = 640;

    const diagnostics = analyzeDeepZoom(config);

    expect(diagnostics.severity).toBe('warning');
    expect(diagnostics.summary).toContain('Extreme zoom');
    expect(diagnostics.hints.some((hint) => hint.includes('perturbation'))).toBe(true);
  });
});
