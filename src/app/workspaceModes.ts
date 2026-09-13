export type WorkspaceModeId =
  | 'visualLab'
  | 'palette'
  | 'waypoints'
  | 'discover'
  | 'compare'
  | 'journey';

export interface WorkspaceModeDefinition {
  id: WorkspaceModeId;
  label: string;
  description: string;
}

export const workspaceModeDefinitions: WorkspaceModeDefinition[] = [
  {
    id: 'visualLab',
    label: 'Visual Lab',
    description: 'Shape materials and lens treatment.',
  },
  {
    id: 'palette',
    label: 'Palette',
    description: 'Shape the active colour language.',
  },
  {
    id: 'waypoints',
    label: 'Waypoints',
    description: 'Save, organize, and revisit fractal destinations.',
  },
  {
    id: 'discover',
    label: 'Discover',
    description: 'Scan the current region for promising structures.',
  },
  {
    id: 'compare',
    label: 'Compare',
    description: 'Tune left and right views side by side.',
  },
  {
    id: 'journey',
    label: 'Journey',
    description: 'Build keyframed motion through fractal space.',
  },
];

export function getWorkspaceModeDefinition(modeId: WorkspaceModeId): WorkspaceModeDefinition {
  return workspaceModeDefinitions.find((entry) => entry.id === modeId) ?? workspaceModeDefinitions[0];
}
