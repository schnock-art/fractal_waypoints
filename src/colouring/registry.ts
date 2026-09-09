import type { ColouringAlgorithmId } from '../types/config';

export interface ColouringDefinition {
  id: ColouringAlgorithmId;
  displayName: string;
  description: string;
}

export const colouringRegistry: Record<ColouringAlgorithmId, ColouringDefinition> = {
  smoothEscapeTime: {
    id: 'smoothEscapeTime',
    displayName: 'Smooth Escape Time',
    description: 'Continuous escape-time colouring for classic fractal exploration.',
  },
  orbitTrap: {
    id: 'orbitTrap',
    displayName: 'Orbit Trap',
    description: 'Blends closest-orbit trap accents with classic escape-time structure for more readable sculptural detail.',
  },
};
