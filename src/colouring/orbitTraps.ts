import type {
  OrbitTrapComposition,
  OrbitTrapConfig,
  OrbitTrapSetConfig,
  OrbitTrapShape,
} from '../types/config';

export const MAX_ORBIT_TRAPS = 2;

export const defaultOrbitTrapSet: OrbitTrapSetConfig = {
  composition: 'minimum',
  traps: [
    { shape: 'circle', x: 0, y: 0, rotation: 0, scale: 1 },
    { shape: 'cross', x: 0, y: 0, rotation: 0, scale: 1 },
  ],
};

export function cloneOrbitTrapSet(value: OrbitTrapSetConfig = defaultOrbitTrapSet): OrbitTrapSetConfig {
  return {
    composition: value.composition,
    traps: value.traps.slice(0, MAX_ORBIT_TRAPS).map((trap) => ({ ...trap })),
  };
}

export function normalizeOrbitTrapSet(value: OrbitTrapSetConfig | undefined): OrbitTrapSetConfig {
  if (!value || !Array.isArray(value.traps) || value.traps.length === 0) {
    return cloneOrbitTrapSet();
  }

  const traps = value.traps
    .filter((trap) => isOrbitTrapShape(trap.shape))
    .slice(0, MAX_ORBIT_TRAPS)
    .map((trap) => ({
      shape: trap.shape,
      x: finiteOr(trap.x, 0),
      y: finiteOr(trap.y, 0),
      rotation: finiteOr(trap.rotation, 0),
      scale: Math.max(0.05, finiteOr(trap.scale, 1)),
    }));

  return {
    composition: value.composition === 'maximum' ? 'maximum' : 'minimum',
    traps: traps.length > 0 ? traps : cloneOrbitTrapSet().traps,
  };
}

export function createOrbitTrap(shape: OrbitTrapShape = 'point'): OrbitTrapConfig {
  return { shape, x: 0, y: 0, rotation: 0, scale: 1 };
}

export function getOrbitTrapShapeCode(shape: OrbitTrapShape): number {
  switch (shape) {
    case 'point': return 0;
    case 'line': return 1;
    case 'circle': return 2;
    case 'cross': return 3;
    case 'spiral': return 4;
  }
}

export function getOrbitTrapCompositionCode(composition: OrbitTrapComposition): number {
  return composition === 'maximum' ? 1 : 0;
}

function isOrbitTrapShape(value: unknown): value is OrbitTrapShape {
  return value === 'point' || value === 'line' || value === 'circle' || value === 'cross' || value === 'spiral';
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}
