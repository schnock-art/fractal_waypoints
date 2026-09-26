import type { SemanticParameterId } from '../parameters/semantic';
import { applySignalTransforms, isSignalTransform, type SignalTransform } from './signalTransforms';

export type ControlAddress = { protocol: 'midi-cc'; controller: number }
  | { protocol: 'midi-nrpn'; parameter: number };

/** Serializable identity. Browser input IDs and live connection state deliberately do not belong here. */
export interface ExternalControlSourceIdentity {
  schemaVersion: 1;
  id: string;
  kind: 'absolute-control';
  deviceProfileId: string;
  controlId: string;
  address: ControlAddress;
  channel: number;
  minimum: number;
  maximum: number;
}

export type ExternalControlTarget =
  | { kind: 'semantic-parameter'; id: SemanticParameterId }
  | { kind: 'navigation-intent'; id: 'zoom'; mode: 'continuous' | 'turn' };

export interface ExternalControlMapping {
  schemaVersion: 1;
  id: string;
  sourceId: string;
  enabled: boolean;
  transforms: SignalTransform[];
  target: ExternalControlTarget;
}

export interface ExternalControlRelationship {
  source: ExternalControlSourceIdentity;
  mapping: ExternalControlMapping;
}

export interface ExternalControlSample {
  sourceId: string;
  value: number;
  timestamp: number;
}

export type ExternalControlOutput =
  | { kind: 'semantic-value'; target: SemanticParameterId; value: number; timestamp: number }
  | { kind: 'navigation-position'; target: 'zoom'; value: number; timestamp: number }
  | { kind: 'navigation-rate'; target: 'zoom'; value: number; timestamp: number };

export interface ExternalControlDiagnostics {
  received: number;
  emitted: number;
  coalesced: number;
  stale: number;
  overflow: number;
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const integer = (value: unknown): value is number => finite(value) && Number.isInteger(value);

export function isControlAddress(value: unknown): value is ControlAddress {
  if (!record(value)) return false;
  return value.protocol === 'midi-cc' ? integer(value.controller) && value.controller >= 0 && value.controller <= 127
    : value.protocol === 'midi-nrpn' && integer(value.parameter) && value.parameter >= 0 && value.parameter <= 16383;
}

export function isExternalControlRelationship(value: unknown): value is ExternalControlRelationship {
  if (!record(value) || !record(value.source) || !record(value.mapping)) return false;
  const source = value.source; const mapping = value.mapping;
  if (source.schemaVersion !== 1 || source.kind !== 'absolute-control' || typeof source.id !== 'string' || !source.id
    || typeof source.deviceProfileId !== 'string' || !source.deviceProfileId || typeof source.controlId !== 'string' || !source.controlId
    || !isControlAddress(source.address) || !integer(source.channel) || source.channel < 0 || source.channel > 15
    || !finite(source.minimum) || !finite(source.maximum) || source.minimum >= source.maximum) return false;
  if (mapping.schemaVersion !== 1 || typeof mapping.id !== 'string' || !mapping.id || mapping.sourceId !== source.id
    || typeof mapping.enabled !== 'boolean' || !Array.isArray(mapping.transforms) || mapping.transforms.length > 8
    || !record(mapping.target)) return false;
  const transforms = mapping.transforms as unknown[];
  if (transforms.some((transform, index) => !isSignalTransform(transform, index, transforms.length)
    || (record(transform) && transform.kind === 'smooth'))) return false;
  return mapping.target.kind === 'semantic-parameter' ? ['palette.offset', 'formula.phoenix.memory', 'formula.julia.cReal', 'formula.julia.cImag'].includes(String(mapping.target.id))
    : mapping.target.kind === 'navigation-intent' && mapping.target.id === 'zoom' && ['continuous', 'turn'].includes(String(mapping.target.mode));
}

/** Range conversion is expressed entirely with the same transforms used by internal sources. */
export function rangeTransforms(sourceMinimum: number, sourceMaximum: number, targetMinimum: number, targetMaximum: number, inverted = false, curve = 1): SignalTransform[] {
  if (![sourceMinimum, sourceMaximum, targetMinimum, targetMaximum, curve].every(Number.isFinite)
    || sourceMinimum >= sourceMaximum || targetMinimum === targetMaximum || curve <= 0 || curve > 8) throw new Error('Invalid control range.');
  const sourceSpan = sourceMaximum - sourceMinimum;
  const transforms: SignalTransform[] = [{ kind: 'offset', value: sourceMinimum === 0 ? 0 : -sourceMinimum }, { kind: 'scale', value: 1 / sourceSpan }];
  if (inverted) transforms.push({ kind: 'invert' }, { kind: 'offset', value: 1 });
  if (curve !== 1) transforms.push({ kind: 'curve', value: curve });
  transforms.push({ kind: 'scale', value: targetMaximum - targetMinimum }, { kind: 'offset', value: targetMinimum },
    { kind: 'clamp', min: Math.min(targetMinimum, targetMaximum), max: Math.max(targetMinimum, targetMaximum) });
  return transforms;
}

export function routeExternalControl(relationship: ExternalControlRelationship, sample: ExternalControlSample): ExternalControlOutput | null {
  if (!relationship.mapping.enabled || sample.sourceId !== relationship.source.id || !Number.isFinite(sample.timestamp)) return null;
  const value = applySignalTransforms(sample.value, relationship.mapping.transforms);
  const target = relationship.mapping.target;
  if (target.kind === 'semantic-parameter') return { kind: 'semantic-value', target: target.id, value, timestamp: sample.timestamp };
  if (target.mode === 'turn') return { kind: 'navigation-position', target: target.id, value: Math.round(value), timestamp: sample.timestamp };
  const deadZone = 0.08;
  const bounded = Math.max(-1, Math.min(1, value));
  const rate = Math.abs(bounded) <= deadZone ? 0 : Math.sign(bounded) * ((Math.abs(bounded) - deadZone) / (1 - deadZone)) ** 2;
  return { kind: 'navigation-rate', target: target.id, value: rate, timestamp: sample.timestamp };
}

export interface RelativeNavigationIntent { kind: 'relative-navigation-intent'; target: 'zoom'; delta: number; timestamp: number }
export function deriveRelativeNavigationIntent(previous: number | null, output: ExternalControlOutput): RelativeNavigationIntent | null {
  if (output.kind !== 'navigation-position' || previous === null || output.value === previous) return null;
  return { kind: 'relative-navigation-intent', target: output.target, delta: output.value - previous, timestamp: output.timestamp };
}

/** Latest absolute value wins once per animation frame. Relative intent is derived after draining, so endpoint delta is retained. */
export class ExternalControlFrameBuffer {
  private pending = new Map<string, ExternalControlSample>();
  private lastTimestamp = new Map<string, number>();
  private counts: ExternalControlDiagnostics = { received: 0, emitted: 0, coalesced: 0, stale: 0, overflow: 0 };
  constructor(private readonly maximumSources = 32) {}
  push(sample: ExternalControlSample): boolean {
    this.counts.received++;
    if (!Number.isFinite(sample.value) || !Number.isFinite(sample.timestamp)) { this.counts.stale++; return false; }
    const previousTimestamp = this.lastTimestamp.get(sample.sourceId);
    if (previousTimestamp !== undefined && sample.timestamp < previousTimestamp) { this.counts.stale++; return false; }
    if (!this.pending.has(sample.sourceId) && this.pending.size >= this.maximumSources) { this.counts.overflow++; return false; }
    if (this.pending.has(sample.sourceId)) this.counts.coalesced++;
    this.pending.set(sample.sourceId, sample); this.lastTimestamp.set(sample.sourceId, sample.timestamp);
    return true;
  }
  drain(): ExternalControlSample[] {
    const result = [...this.pending.values()].sort((a, b) => a.timestamp - b.timestamp);
    this.pending.clear(); this.counts.emitted += result.length;
    return result;
  }
  reset(): void { this.pending.clear(); this.lastTimestamp.clear(); }
  diagnostics(): ExternalControlDiagnostics { return { ...this.counts }; }
}
