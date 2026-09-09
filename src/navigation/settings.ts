import {
  NAVIGATION_SCHEMA_VERSION,
  type NavigationActionId,
  type NavigationSettings,
} from '../types/config';

export interface NavigationActionDefinition {
  id: NavigationActionId;
  label: string;
  kind: 'continuous' | 'discrete';
}

export const navigationActionDefinitions: NavigationActionDefinition[] = [
  { id: 'moveUp', label: 'Move up', kind: 'continuous' },
  { id: 'moveLeft', label: 'Move left', kind: 'continuous' },
  { id: 'moveDown', label: 'Move down', kind: 'continuous' },
  { id: 'moveRight', label: 'Move right', kind: 'continuous' },
  { id: 'zoomIn', label: 'Zoom in', kind: 'continuous' },
  { id: 'zoomOut', label: 'Zoom out', kind: 'continuous' },
  { id: 'rotateLeft', label: 'Rotate left', kind: 'continuous' },
  { id: 'rotateRight', label: 'Rotate right', kind: 'continuous' },
  { id: 'precisionModifier', label: 'Precision modifier', kind: 'continuous' },
  { id: 'boostModifier', label: 'Boost modifier', kind: 'continuous' },
  { id: 'resetView', label: 'Reset view', kind: 'discrete' },
  { id: 'juliaRealDecrease', label: 'Julia real -', kind: 'discrete' },
  { id: 'juliaRealIncrease', label: 'Julia real +', kind: 'discrete' },
  { id: 'juliaImaginaryIncrease', label: 'Julia imaginary +', kind: 'discrete' },
  { id: 'juliaImaginaryDecrease', label: 'Julia imaginary -', kind: 'discrete' },
];

export const navigationActionDefinitionMap = Object.fromEntries(
  navigationActionDefinitions.map((definition) => [definition.id, definition]),
) as Record<NavigationActionId, NavigationActionDefinition>;

export function createDefaultNavigationSettings(): NavigationSettings {
  return {
    schemaVersion: NAVIGATION_SCHEMA_VERSION,
    bindings: [
      { action: 'moveUp', key: 'w' },
      { action: 'moveLeft', key: 'a' },
      { action: 'moveDown', key: 's' },
      { action: 'moveRight', key: 'd' },
      { action: 'zoomIn', key: 'q' },
      { action: 'zoomOut', key: 'e' },
      { action: 'rotateLeft', key: 'z' },
      { action: 'rotateRight', key: 'c' },
      { action: 'precisionModifier', key: 'Shift' },
      { action: 'boostModifier', key: 'Control' },
      { action: 'resetView', key: 'r' },
      { action: 'juliaRealDecrease', key: 'j' },
      { action: 'juliaRealIncrease', key: 'l' },
      { action: 'juliaImaginaryIncrease', key: 'i' },
      { action: 'juliaImaginaryDecrease', key: 'k' },
    ],
    panSpeed: 0.85,
    zoomSpeed: 1.6,
    rotationSpeed: 1.25,
    boostMultiplier: 3,
    precisionMultiplier: 0.3,
  };
}
