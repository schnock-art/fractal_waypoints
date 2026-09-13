// Canonical home for future material modules. The Phase 8.15 bridge re-exports
// the established registry while preserving existing imports during migration.
export {
  cloneMaterialPreset,
  createMaterialConfig,
  getMaterialCompatibility,
  materialPresets,
  materialRegistry,
  validateMaterialConfig,
} from '../../colouring/registry';
export type { MaterialDefinition, MaterialPreset } from '../../colouring/registry';
