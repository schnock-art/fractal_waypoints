import { isControlAddress, type ControlAddress } from './externalControl';

export const CONTROLLER_LAYOUT_SCHEMA_VERSION = 1 as const;
export const CONTROLLER_LAYOUT_STORAGE_KEY = 'fractal-explorer:controller-layouts:v1';

export interface ControllerLayoutLane {
  id: string;
  label: string;
  address: ControlAddress;
  channel: number;
  minimum?: number;
  maximum?: number;
}

/** A user-authored interpretation of incoming MIDI endpoints. It is never source provenance. */
export interface ControllerLayout {
  schemaVersion: typeof CONTROLLER_LAYOUT_SCHEMA_VERSION;
  id: string;
  name: string;
  deviceProfileId?: string;
  expectedHardwarePatchName?: string;
  notes?: string;
  lanes: ControllerLayoutLane[];
}

export interface ControllerLayoutsDocument {
  schemaVersion: typeof CONTROLLER_LAYOUT_SCHEMA_VERSION;
  selectedLayoutId?: string;
  layouts: ControllerLayout[];
}

export type ControllerLayoutsRead = { status: 'loaded'; document: ControllerLayoutsDocument }
  | { status: 'empty' | 'invalid' | 'unsupported'; message: string };

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const laneKey = (lane: Pick<ControllerLayoutLane, 'address' | 'channel'>) => `${lane.channel}:${lane.address.protocol === 'midi-cc' ? `cc:${lane.address.controller}` : `nrpn:${lane.address.parameter}`}`;

export function isControllerLayoutLane(value: unknown): value is ControllerLayoutLane {
  if (!record(value) || typeof value.id !== 'string' || !value.id || typeof value.label !== 'string' || !value.label.trim()
    || !isControlAddress(value.address) || typeof value.channel !== 'number' || !Number.isInteger(value.channel) || value.channel < 0 || value.channel > 15) return false;
  if (value.minimum !== undefined && !finite(value.minimum) || value.maximum !== undefined && !finite(value.maximum)) return false;
  return value.minimum === undefined || value.maximum === undefined || value.minimum < value.maximum;
}

export function isControllerLayout(value: unknown): value is ControllerLayout {
  if (!record(value) || value.schemaVersion !== CONTROLLER_LAYOUT_SCHEMA_VERSION || typeof value.id !== 'string' || !value.id
    || typeof value.name !== 'string' || !value.name.trim() || !Array.isArray(value.lanes) || value.lanes.length > 64) return false;
  if (value.deviceProfileId !== undefined && (typeof value.deviceProfileId !== 'string' || !value.deviceProfileId)) return false;
  if (value.expectedHardwarePatchName !== undefined && typeof value.expectedHardwarePatchName !== 'string') return false;
  if (value.notes !== undefined && typeof value.notes !== 'string') return false;
  const ids = new Set<string>(); const endpoints = new Set<string>();
  return value.lanes.every((lane) => {
    if (!isControllerLayoutLane(lane) || ids.has(lane.id) || endpoints.has(laneKey(lane))) return false;
    ids.add(lane.id); endpoints.add(laneKey(lane)); return true;
  });
}

export function isControllerLayoutsDocument(value: unknown): value is ControllerLayoutsDocument {
  if (!record(value) || value.schemaVersion !== CONTROLLER_LAYOUT_SCHEMA_VERSION || !Array.isArray(value.layouts) || value.layouts.length > 32) return false;
  if (value.selectedLayoutId !== undefined && (typeof value.selectedLayoutId !== 'string' || !value.selectedLayoutId)) return false;
  const ids = new Set<string>();
  if (!value.layouts.every((layout) => isControllerLayout(layout) && !ids.has(layout.id) && (ids.add(layout.id), true))) return false;
  return value.selectedLayoutId === undefined || ids.has(value.selectedLayoutId);
}

export function createControllerLayoutsDocument(layouts: ControllerLayout[] = [], selectedLayoutId?: string): ControllerLayoutsDocument {
  const document: ControllerLayoutsDocument = { schemaVersion: CONTROLLER_LAYOUT_SCHEMA_VERSION, layouts: structuredClone(layouts), ...(selectedLayoutId ? { selectedLayoutId } : {}) };
  if (!isControllerLayoutsDocument(document)) throw new Error('Invalid controller layouts document.');
  return document;
}

export function parseControllerLayouts(value: unknown): ControllerLayoutsRead {
  if (!record(value)) return { status: 'invalid', message: 'Controller layouts are not a JSON object.' };
  if (typeof value.schemaVersion === 'number' && value.schemaVersion > CONTROLLER_LAYOUT_SCHEMA_VERSION) {
    return { status: 'unsupported', message: `Controller layouts version ${value.schemaVersion} is newer than this app supports. They were not changed.` };
  }
  if (!isControllerLayoutsDocument(value)) return { status: 'invalid', message: 'Controller layouts are invalid or incomplete.' };
  return { status: 'loaded', document: structuredClone(value) };
}

export function importControllerLayouts(json: string): ControllerLayoutsRead {
  try { return parseControllerLayouts(JSON.parse(json)); }
  catch { return { status: 'invalid', message: 'Controller layouts are not valid JSON.' }; }
}

export function exportControllerLayouts(document: ControllerLayoutsDocument): string {
  if (!isControllerLayoutsDocument(document)) throw new Error('Cannot export invalid controller layouts.');
  return JSON.stringify(document, null, 2);
}

export function loadControllerLayouts(): ControllerLayoutsRead {
  try {
    const raw = window.localStorage.getItem(CONTROLLER_LAYOUT_STORAGE_KEY);
    return raw ? importControllerLayouts(raw) : { status: 'empty', message: 'No controller layouts saved yet.' };
  } catch { return { status: 'invalid', message: 'Controller layout storage is unavailable.' }; }
}

export function saveControllerLayouts(document: ControllerLayoutsDocument): boolean {
  if (!isControllerLayoutsDocument(document)) return false;
  try { window.localStorage.setItem(CONTROLLER_LAYOUT_STORAGE_KEY, JSON.stringify(document)); return true; }
  catch { return false; }
}

export function downloadControllerLayouts(layouts: ControllerLayoutsDocument): void {
  const blob = new Blob([exportControllerLayouts(layouts)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const anchor = globalThis.document.createElement('a');
  anchor.href = url; anchor.download = 'fractal-waypoints-controller-layouts.json'; anchor.click(); URL.revokeObjectURL(url);
}

export function findControllerLayoutLane(layout: ControllerLayout | undefined, address: ControlAddress, channel: number): ControllerLayoutLane | undefined {
  return layout?.lanes.find((lane) => lane.channel === channel && laneKey(lane) === laneKey({ address, channel }));
}
