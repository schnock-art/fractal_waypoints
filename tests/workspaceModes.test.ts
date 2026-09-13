import { describe, expect, it } from 'vitest';

import { getWorkspaceModeDefinition, workspaceModeDefinitions } from '../src/app/workspaceModes';

describe('workspace mode definitions', () => {
  it('keeps the workflow modes in a stable order', () => {
    expect(workspaceModeDefinitions.map((mode) => mode.id)).toEqual([
      'visualLab',
      'palette',
      'waypoints',
      'discover',
      'compare',
      'journey',
    ]);
  });

  it('returns a concrete definition for each workspace mode', () => {
    expect(getWorkspaceModeDefinition('visualLab').label).toBe('Visual Lab');
    expect(getWorkspaceModeDefinition('compare').label).toBe('Compare');
    expect(getWorkspaceModeDefinition('journey').description.length).toBeGreaterThan(10);
  });
});
