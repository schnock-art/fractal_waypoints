import type { ModulationTarget, ModulationWaveform, ParameterModulation } from '../../types/config';

export interface InternalSource {
  id: string;
  waveform: ModulationWaveform | 'noise';
  frequencyHz: number;
  phase: number;
  amplitude: number;
  offset: number;
  seed?: number;
}
export type SignalTransform = { kind: 'scale' | 'offset' | 'curve'; value: number }
  | { kind: 'invert' }
  | { kind: 'clamp'; min: number; max: number }
  | { kind: 'smooth'; windowSeconds: number };
export interface InternalMapping {
  id: string;
  sourceId: string;
  target: ModulationTarget;
  mode: 'add' | 'replace';
  enabled: boolean;
  transforms: SignalTransform[];
}
export interface InternalModulationProgram {
  schemaVersion: 1;
  sources: InternalSource[];
  /** Array order is the only priority mechanism; later mappings see earlier writes. */
  mappings: InternalMapping[];
}

export const modulationTargets: readonly ModulationTarget[] = [
  'palette.offset', 'material.orbitAppearance.emission', 'material.orbitTraps[0].rotation',
  'material.orbitTraps[1].rotation', 'lens.effects.exposure.amount', 'lens.effects.vignette.amount',
];

/** Derived adapter, not a second persisted copy. Stored IDs and legacy order stay intact. */
export function adaptLegacyModulations(entries: ParameterModulation[]): InternalModulationProgram {
  return {
    schemaVersion: 1,
    sources: entries.map((entry, index) => ({ id: `legacy-${index}`, waveform: entry.waveform,
      frequencyHz: entry.frequencyHz, phase: entry.phase, amplitude: entry.amplitude, offset: entry.offset })),
    mappings: entries.map((entry, index) => ({ id: `legacy-${index}`, sourceId: `legacy-${index}`,
      target: entry.target, enabled: entry.enabled, mode: 'add', transforms: [] })),
  };
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Also the import boundary: reject malformed/ambiguous programs, never guess their meaning. */
export function isInternalModulationProgram(value: unknown): value is InternalModulationProgram {
  if (!record(value) || value.schemaVersion !== 1 || !Array.isArray(value.sources) || !Array.isArray(value.mappings)
    || value.sources.length > 32 || value.mappings.length > 64) return false;
  const sourceIds = new Set<string>(); const mappingIds = new Set<string>();
  for (const source of value.sources) {
    if (!record(source) || typeof source.id !== 'string' || !source.id || sourceIds.has(source.id)
      || !['constant', 'sine', 'triangle', 'saw', 'noise'].includes(String(source.waveform))
      || !finite(source.frequencyHz)
      || !finite(source.phase) || !finite(source.amplitude) || !finite(source.offset)
      || (source.seed !== undefined && (!finite(source.seed) || !Number.isInteger(source.seed)))
      || (source.waveform === 'noise' && (!finite(source.seed) || !Number.isInteger(source.seed)))) return false;
    sourceIds.add(source.id);
  }
  for (const mapping of value.mappings) {
    if (!record(mapping) || typeof mapping.id !== 'string' || !mapping.id || mappingIds.has(mapping.id)
      || typeof mapping.sourceId !== 'string' || !sourceIds.has(mapping.sourceId)
      || !modulationTargets.includes(mapping.target as ModulationTarget)
      || !['add', 'replace'].includes(String(mapping.mode)) || typeof mapping.enabled !== 'boolean'
      || !Array.isArray(mapping.transforms) || mapping.transforms.length > 8) return false;
    mappingIds.add(mapping.id);
    for (const [index, transform] of mapping.transforms.entries()) {
      if (!record(transform)) return false;
      switch (transform.kind) {
        case 'scale': case 'offset': if (!finite(transform.value)) return false; break;
        case 'curve': if (!finite(transform.value) || transform.value <= 0 || transform.value > 8) return false; break;
        case 'invert': break;
        case 'clamp': if (!finite(transform.min) || !finite(transform.max) || transform.min > transform.max) return false; break;
        case 'smooth':
          if (index !== mapping.transforms.length - 1 || !finite(transform.windowSeconds)
            || transform.windowSeconds <= 0 || transform.windowSeconds > 10) return false;
          break;
        default: return false;
      }
    }
  }
  return true;
}

export function evaluateInternalSource(source: InternalSource, timeSeconds: number): number {
  const cycles = timeSeconds * source.frequencyHz + source.phase;
  if (!Number.isFinite(cycles)) throw new Error('Modulation phase overflow.');
  // Keep legacy signed-remainder phase behaviour, including negative authored phases.
  const phase = cycles % 1;
  const wave = source.waveform === 'sine' ? Math.sin(phase * Math.PI * 2)
    : source.waveform === 'triangle' ? 1 - 4 * Math.abs(phase - 0.5)
    : source.waveform === 'saw' ? phase * 2 - 1
    : source.waveform === 'noise' ? noiseAt(Math.floor(cycles), source.seed ?? 0) : 1;
  return source.offset + source.amplitude * wave;
}

function noiseAt(index: number, seed: number): number {
  let hash = (index | 0) ^ (seed | 0);
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 0xffffffff * 2 - 1;
}

export function evaluateMappingSignal(source: InternalSource, transforms: SignalTransform[], timeSeconds: number): number {
  const point = (time: number) => {
    let value = evaluateInternalSource(source, time);
    for (const transform of transforms) {
      switch (transform.kind) {
        case 'scale': value *= transform.value; break;
        case 'offset': value += transform.value; break;
        case 'invert': value = -value; break;
        case 'clamp': value = Math.min(transform.max, Math.max(transform.min, value)); break;
        case 'curve': value = Math.sign(value) * Math.pow(Math.abs(value), transform.value); break;
      }
      if (!Number.isFinite(value)) throw new Error('Modulation signal overflow.');
    }
    return value;
  };
  const last = transforms.at(-1);
  if (last?.kind !== 'smooth') return point(timeSeconds);
  // Fixed 16-point trailing mean; pre-zero time holds the initial value. No frame-history state.
  let sum = 0;
  for (let i = 0; i < 16; i++) sum += point(Math.max(0, timeSeconds - last.windowSeconds * i / 15)) / 16;
  return sum;
}
