import type { ComparisonConfig } from '../types/config';

export interface ComparisonWorkspaceSummary {
  modeLabel: string;
  syncLabel: string;
  interactionLabel: string;
}

export function summarizeComparisonWorkspace(comparison: ComparisonConfig, enabled: boolean): ComparisonWorkspaceSummary {
  return {
    modeLabel: getComparisonModeLabel(comparison.mode),
    syncLabel: comparison.synchroniseViewport ? 'Shared viewport' : 'Independent viewports',
    interactionLabel: enabled
      ? `Live on the ${comparison.activeSide} side`
      : 'Comparison stage is parked',
  };
}

function getComparisonModeLabel(mode: ComparisonConfig['mode']): string {
  switch (mode) {
    case 'split':
      return 'Split';
    case 'wipe':
      return 'Wipe';
    case 'overlay':
      return 'Overlay';
    case 'difference':
      return 'Difference';
    default:
      return mode;
  }
}
