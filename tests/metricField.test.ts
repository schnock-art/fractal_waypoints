import { afterEach, describe, expect, it } from 'vitest';

import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { materialRegistry } from '../src/visuals/materials/registry';
import { METRIC_FIELD_FORMAT, requiresMetricField, shouldAllocateMetricField, shouldResizeMetricField } from '../src/rendering/webgpu/metricField';
import { buildRenderUniformData, RENDER_UNIFORM_BUFFER_SIZE, RENDER_UNIFORM_FLOAT_COUNT } from '../src/rendering/webgpu/uniforms';

const originalClassicSampling = materialRegistry.classic.sampling;

afterEach(() => {
  materialRegistry.classic.sampling = originalClassicSampling;
});

describe('metric field orchestration', () => {
  it('selects the field pass from material metadata, not a material-id list', () => {
    const classic = createDefaultRenderConfig();
    const topographic = createDefaultRenderConfig();
    topographic.material = { id: 'topographic', parameters: { contourLevels: 18, contourWidth: 0.13, relief: 0.72 } };

    expect(requiresMetricField(classic)).toBe(false);
    expect(requiresMetricField(topographic)).toBe(true);

    materialRegistry.classic.sampling = 'neighbourhood';
    expect(requiresMetricField(classic)).toBe(true);
  });

  it('only allocates lazily for a neighbourhood material and retains its allocation for point materials', () => {
    const classic = createDefaultRenderConfig();
    const surface = createDefaultRenderConfig();
    surface.material = { id: 'surface', parameters: { height: 3.4, lightAngle: 0.7, specular: 0.32, roughness: 0.55, ambient: 0.28 } };

    expect(shouldAllocateMetricField(false, classic)).toBe(false);
    expect(shouldAllocateMetricField(false, surface)).toBe(true);
    expect(shouldAllocateMetricField(true, classic)).toBe(false);
    expect(shouldResizeMetricField(false, true)).toBe(false);
    expect(shouldResizeMetricField(true, true)).toBe(true);
  });

  it('uses half-float metric fields and stable explicit uniform sections', () => {
    const config = createDefaultRenderConfig();
    config.material = {
      id: 'surface',
      parameters: { density: 0.03, height: 4.5, lightAngle: 0.55, specular: 0.55, roughness: 0.3, ambient: 0.2 },
    };
    const data = buildRenderUniformData(config, 1200, 700);

    expect(METRIC_FIELD_FORMAT).toBe('rgba16float');
    expect(data).toHaveLength(RENDER_UNIFORM_FLOAT_COUNT);
    expect(RENDER_UNIFORM_BUFFER_SIZE).toBe(RENDER_UNIFORM_FLOAT_COUNT * 4);
    expect([...data.slice(40, 44)]).toMatchObject([18, expect.closeTo(0.13), expect.closeTo(0.72), 0]);
    expect([...data.slice(44, 48)]).toMatchObject([4.5, expect.closeTo(0.55), expect.closeTo(0.55), expect.closeTo(0.2)]);
    expect([...data.slice(48, 52)]).toMatchObject([1, expect.closeTo(0.38), 0, 0]);
    expect([...data.slice(52, 56)]).toMatchObject([expect.closeTo(0.3), 2, 0, 0]);
  });
});
