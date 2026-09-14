import { describe, expect, it } from 'vitest';

import { mandelbrotShader, webGpuShaderModules } from '../src/rendering/webgpu/mandelbrotShader';

describe('renderer iteration parity', () => {
  it('uses a squared bailout threshold in the WebGPU path, matching CPU iteration', () => {
    expect(mandelbrotShader).toContain('let bailout_squared = bailout * bailout;');
    expect(mandelbrotShader).toContain('if (magnitude_squared > bailout_squared)');
  });

  it('keeps formula iteration separate from material selection through orbit metrics', () => {
    expect(mandelbrotShader).toContain('struct OrbitMetrics');
    expect(mandelbrotShader).toContain('fn iterate_formula(');
    expect(mandelbrotShader).toContain('let metrics = iterate_formula(');
  });

  it('keeps shader responsibilities composable and exposes a metric field pass for neighbourhood materials', () => {
    expect(webGpuShaderModules.contracts).toContain('struct OrbitMetrics');
    expect(webGpuShaderModules.coordinates).toContain('fn ds_add');
    expect(webGpuShaderModules.fieldsAndMaterials).toContain('fn trap_sdf');
    expect(webGpuShaderModules.formulaMetrics).toContain('fn iterate_formula');
    expect(webGpuShaderModules.presentation).toContain('fn fs_main');
    expect(webGpuShaderModules.presentation).toContain('fn metric_field_fs');
    expect(webGpuShaderModules.presentation).toContain('fn field_material_fs');
    expect(webGpuShaderModules.fieldsAndMaterials).toContain('fn field_sample');
  });
});
