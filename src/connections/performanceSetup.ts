import { isExternalControlRelationship, rangeTransforms, type ExternalControlRelationship } from './externalControl';

export const PERFORMANCE_SETUP_SCHEMA_VERSION = 1 as const;
export const PERFORMANCE_SETUP_STORAGE_KEY = 'fractal-explorer:performance-setup:v1';

export type PerformanceBindingTarget = 'zoom' | 'palette.offset' | 'formula.julia.cReal' | 'formula.julia.cImag';
export type PerformanceBindingSettings =
  | { kind: 'zoom'; mode: 'continuous' | 'turn' }
  | { kind: 'range'; minimum: number; maximum: number; inverted: boolean; curve: number };

export interface PerformanceControlBinding {
  id: string;
  target: PerformanceBindingTarget;
  relationship: ExternalControlRelationship;
  settings: PerformanceBindingSettings;
}

export interface DeviceProfileReference {
  id: string;
  kind: 'profile' | 'learned';
}

export interface PerformanceControlSetup {
  schemaVersion: typeof PERFORMANCE_SETUP_SCHEMA_VERSION;
  name: string;
  deviceProfiles: DeviceProfileReference[];
  bindings: PerformanceControlBinding[];
}

export type PerformanceSetupRead = { status: 'loaded'; setup: PerformanceControlSetup }
  | { status: 'empty' | 'invalid' | 'unsupported'; message: string };

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function sameTransforms(left: ExternalControlRelationship['mapping']['transforms'], right: ExternalControlRelationship['mapping']['transforms']): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function isPerformanceControlSetup(value: unknown): value is PerformanceControlSetup {
  if (!record(value) || value.schemaVersion !== PERFORMANCE_SETUP_SCHEMA_VERSION || typeof value.name !== 'string' || !value.name.trim()
    || !Array.isArray(value.deviceProfiles) || value.deviceProfiles.length > 16 || !Array.isArray(value.bindings) || value.bindings.length > 16) return false;
  const profileIds = new Set<string>();
  for (const profile of value.deviceProfiles) {
    if (!record(profile) || typeof profile.id !== 'string' || !profile.id || profileIds.has(profile.id)
      || !['profile', 'learned'].includes(String(profile.kind))) return false;
    profileIds.add(profile.id);
  }
  const bindingIds = new Set<string>(); const targets = new Set<string>();
  for (const binding of value.bindings) {
    if (!record(binding) || typeof binding.id !== 'string' || !binding.id || bindingIds.has(binding.id)
      || !['zoom', 'palette.offset', 'formula.julia.cReal', 'formula.julia.cImag'].includes(String(binding.target)) || targets.has(String(binding.target))
      || !isExternalControlRelationship(binding.relationship) || !record(binding.settings)) return false;
    const relationship = binding.relationship; const target = binding.target as PerformanceBindingTarget;
    if (!profileIds.has(relationship.source.deviceProfileId)) return false;
    if (target === 'zoom') {
      if (binding.settings.kind !== 'zoom' || !['continuous', 'turn'].includes(String(binding.settings.mode))
        || relationship.mapping.target.kind !== 'navigation-intent' || relationship.mapping.target.id !== 'zoom'
        || relationship.mapping.target.mode !== binding.settings.mode) return false;
      const expected = rangeTransforms(relationship.source.minimum, relationship.source.maximum,
        binding.settings.mode === 'continuous' ? -1 : 0, binding.settings.mode === 'continuous' ? 1 : 127);
      if (!sameTransforms(relationship.mapping.transforms, expected)) return false;
    } else {
      if (binding.settings.kind !== 'range' || !finite(binding.settings.minimum) || !finite(binding.settings.maximum)
        || binding.settings.minimum === binding.settings.maximum || typeof binding.settings.inverted !== 'boolean'
        || !finite(binding.settings.curve) || binding.settings.curve <= 0 || binding.settings.curve > 8
        || relationship.mapping.target.kind !== 'semantic-parameter' || relationship.mapping.target.id !== target) return false;
      const expected = rangeTransforms(relationship.source.minimum, relationship.source.maximum, binding.settings.minimum,
        binding.settings.maximum, binding.settings.inverted, binding.settings.curve);
      if (!sameTransforms(relationship.mapping.transforms, expected)) return false;
    }
    bindingIds.add(binding.id); targets.add(target);
  }
  return true;
}

export function createPerformanceControlSetup(bindings: PerformanceControlBinding[], name = 'My controller setup'): PerformanceControlSetup {
  const deviceProfiles = [...new Map(bindings.map((binding) => {
    const id = binding.relationship.source.deviceProfileId;
    return [id, { id, kind: id === 'learned-midi-control' ? 'learned' as const : 'profile' as const }];
  })).values()];
  const setup: PerformanceControlSetup = { schemaVersion: PERFORMANCE_SETUP_SCHEMA_VERSION, name, deviceProfiles, bindings: structuredClone(bindings) };
  if (!isPerformanceControlSetup(setup)) throw new Error('Invalid performance control setup.');
  return setup;
}

export function parsePerformanceControlSetup(value: unknown): PerformanceSetupRead {
  if (!record(value)) return { status: 'invalid', message: 'The controller setup is not a JSON object.' };
  if (typeof value.schemaVersion === 'number' && value.schemaVersion > PERFORMANCE_SETUP_SCHEMA_VERSION) {
    return { status: 'unsupported', message: `Controller setup version ${value.schemaVersion} is newer than this app supports. It was not changed.` };
  }
  if (!isPerformanceControlSetup(value)) return { status: 'invalid', message: 'The controller setup is invalid or incomplete.' };
  return { status: 'loaded', setup: structuredClone(value) };
}

export function importPerformanceControlSetup(json: string): PerformanceSetupRead {
  try { return parsePerformanceControlSetup(JSON.parse(json)); }
  catch { return { status: 'invalid', message: 'The controller setup is not valid JSON.' }; }
}

export function exportPerformanceControlSetup(setup: PerformanceControlSetup): string {
  if (!isPerformanceControlSetup(setup)) throw new Error('Cannot export an invalid controller setup.');
  return JSON.stringify(setup, null, 2);
}

export function loadPerformanceControlSetup(): PerformanceSetupRead {
  try {
    const raw = window.localStorage.getItem(PERFORMANCE_SETUP_STORAGE_KEY);
    return raw ? importPerformanceControlSetup(raw) : { status: 'empty', message: 'No controller setup saved yet.' };
  } catch { return { status: 'invalid', message: 'Controller setup storage is unavailable.' }; }
}

export function savePerformanceControlSetup(setup: PerformanceControlSetup): boolean {
  if (!isPerformanceControlSetup(setup)) return false;
  try { window.localStorage.setItem(PERFORMANCE_SETUP_STORAGE_KEY, JSON.stringify(setup)); return true; }
  catch { return false; }
}

export function clearPerformanceControlSetup(): void {
  try { window.localStorage.removeItem(PERFORMANCE_SETUP_STORAGE_KEY); } catch { /* Optional local storage. */ }
}

export function downloadPerformanceControlSetup(setup: PerformanceControlSetup): void {
  const blob = new Blob([exportPerformanceControlSetup(setup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'fractal-waypoints-controller-setup.json'; anchor.click(); URL.revokeObjectURL(url);
}
