import { isExternalControlRelationship, type ExternalControlRelationship } from './externalControl';

export const PERFORMANCE_TAKE_SCHEMA_VERSION = 1 as const;
export const PERFORMANCE_TAKE_STORAGE_KEY = 'fractal-explorer:performance-take:v1';
const maximumEvents = 4096;

export interface RecordedExternalControlEvent {
  atMs: number;
  sourceId: string;
  value: number;
}

/** A portable logical input sequence. It snapshots mappings but never browser ports or fractal world state. */
export interface PerformanceControlTake {
  schemaVersion: typeof PERFORMANCE_TAKE_SCHEMA_VERSION;
  name: string;
  durationMs: number;
  relationships: ExternalControlRelationship[];
  events: RecordedExternalControlEvent[];
}

export type PerformanceTakeRead = { status: 'loaded'; take: PerformanceControlTake }
  | { status: 'empty' | 'invalid' | 'unsupported'; message: string };

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function isPerformanceControlTake(value: unknown): value is PerformanceControlTake {
  if (!record(value) || value.schemaVersion !== PERFORMANCE_TAKE_SCHEMA_VERSION || typeof value.name !== 'string' || !value.name.trim()
    || !Number.isInteger(value.durationMs) || typeof value.durationMs !== 'number' || value.durationMs < 0 || value.durationMs > 3_600_000
    || !Array.isArray(value.relationships) || !value.relationships.length || value.relationships.length > 16
    || !Array.isArray(value.events) || value.events.length > maximumEvents) return false;
  const sourceIds = new Set<string>();
  for (const relationship of value.relationships) {
    if (!isExternalControlRelationship(relationship) || sourceIds.has(relationship.source.id)) return false;
    sourceIds.add(relationship.source.id);
  }
  let previousAtMs = -1;
  for (const event of value.events) {
    if (!record(event) || !Number.isInteger(event.atMs) || typeof event.atMs !== 'number' || event.atMs < 0 || event.atMs < previousAtMs || event.atMs > value.durationMs
      || typeof event.sourceId !== 'string' || !sourceIds.has(event.sourceId) || !finite(event.value)) return false;
    previousAtMs = event.atMs;
  }
  return true;
}

export function createPerformanceControlTake(relationships: ExternalControlRelationship[], events: RecordedExternalControlEvent[], durationMs: number, name = 'Explorer take'): PerformanceControlTake {
  const take: PerformanceControlTake = {
    schemaVersion: PERFORMANCE_TAKE_SCHEMA_VERSION,
    name,
    durationMs: Math.max(0, Math.round(durationMs)),
    relationships: structuredClone(relationships),
    events: events.map((event) => ({ ...event, atMs: Math.max(0, Math.round(event.atMs)) })).sort((left, right) => left.atMs - right.atMs),
  };
  if (!isPerformanceControlTake(take)) throw new Error('Invalid performance take.');
  return take;
}

export function parsePerformanceControlTake(value: unknown): PerformanceTakeRead {
  if (!record(value)) return { status: 'invalid', message: 'The performance take is not a JSON object.' };
  if (typeof value.schemaVersion === 'number' && value.schemaVersion > PERFORMANCE_TAKE_SCHEMA_VERSION) {
    return { status: 'unsupported', message: `Performance take version ${value.schemaVersion} is newer than this app supports. It was not changed.` };
  }
  if (!isPerformanceControlTake(value)) return { status: 'invalid', message: 'The performance take is invalid or incomplete.' };
  return { status: 'loaded', take: structuredClone(value) };
}

export function loadPerformanceControlTake(): PerformanceTakeRead {
  try {
    const raw = window.localStorage.getItem(PERFORMANCE_TAKE_STORAGE_KEY);
    return raw ? parsePerformanceControlTake(JSON.parse(raw)) : { status: 'empty', message: 'No recorded take saved yet.' };
  } catch { return { status: 'invalid', message: 'Performance take storage is unavailable.' }; }
}

export function savePerformanceControlTake(take: PerformanceControlTake): boolean {
  if (!isPerformanceControlTake(take)) return false;
  try { window.localStorage.setItem(PERFORMANCE_TAKE_STORAGE_KEY, JSON.stringify(take)); return true; }
  catch { return false; }
}

export function clearPerformanceControlTake(): void {
  try { window.localStorage.removeItem(PERFORMANCE_TAKE_STORAGE_KEY); } catch { /* Optional local storage. */ }
}
