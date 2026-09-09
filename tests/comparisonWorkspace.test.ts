import { describe, expect, it } from 'vitest';

import { createDefaultRenderConfig } from '../src/app/defaultConfig';
import { createDefaultComparisonConfig, setComparisonSynchronization } from '../src/comparison/model';
import { summarizeComparisonWorkspace } from '../src/comparison/workspace';

describe('comparison workspace helpers', () => {
  it('summarizes the active comparison mode and sync state', () => {
    const comparison = createDefaultComparisonConfig(createDefaultRenderConfig('mandelbrot'));
    const summary = summarizeComparisonWorkspace(comparison, true);

    expect(summary.modeLabel).toBe('Split');
    expect(summary.syncLabel).toBe('Shared viewport');
    expect(summary.interactionLabel).toContain('left');
  });

  it('reports parked state when comparison is not open', () => {
    const comparison = setComparisonSynchronization(
      createDefaultComparisonConfig(createDefaultRenderConfig('julia')),
      false,
    );
    const summary = summarizeComparisonWorkspace(comparison, false);

    expect(summary.syncLabel).toBe('Independent viewports');
    expect(summary.interactionLabel).toBe('Comparison stage is parked');
  });
});
