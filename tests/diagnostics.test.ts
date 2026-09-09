import { describe, expect, it } from 'vitest';

import { buildRendererDiagnostics } from '../src/rendering/diagnostics';

const baseSnapshot = {
  isSecureContext: true,
  hasNavigatorGpu: true,
  hasAdapter: false,
  hasCanvasWebGpuContext: true,
  locationProtocol: 'http:',
  userAgent: 'Test Browser',
};

describe('renderer diagnostics', () => {
  it('explains adapter startup failures clearly', () => {
    const diagnostics = buildRendererDiagnostics('adapter-unavailable', baseSnapshot);

    expect(diagnostics.interactive).toBe(false);
    expect(diagnostics.summary).toContain('requestAdapter()');
    expect(diagnostics.hints.some((hint) => hint.includes('chrome://gpu'))).toBe(true);
  });

  it('marks a healthy WebGPU path as interactive', () => {
    const diagnostics = buildRendererDiagnostics('ok', {
      ...baseSnapshot,
      hasAdapter: true,
    });

    expect(diagnostics.interactive).toBe(true);
    expect(diagnostics.backendLabel).toBe('WebGPU');
    expect(diagnostics.hints).toHaveLength(0);
  });

  it('distinguishes shader compilation problems from adapter failures', () => {
    const diagnostics = buildRendererDiagnostics('shader-compilation-failed', {
      ...baseSnapshot,
      hasAdapter: true,
      failureMessage: 'WGSL compilation failed.',
    });

    expect(diagnostics.summary).toContain('shader failed to compile');
    expect(diagnostics.hints.some((hint) => hint.includes('WGSL'))).toBe(true);
  });

  it('marks CPU fallback as interactive when WebGPU is unavailable', () => {
    const diagnostics = buildRendererDiagnostics('adapter-unavailable', baseSnapshot, {
      backendLabel: 'CPU fallback',
      interactive: true,
      fallbackActive: true,
    });

    expect(diagnostics.interactive).toBe(true);
    expect(diagnostics.fallbackActive).toBe(true);
    expect(diagnostics.summary).toContain('CPU fallback renderer');
  });
});
