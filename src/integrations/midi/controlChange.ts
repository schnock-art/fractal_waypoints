export interface MidiControlChange {
  channel: number;
  controller: number;
  value: number;
  timestamp: number;
}

/** Parse the only MIDI message admitted by the first Hydrasynth input slice. */
export function parseControlChange(data: ArrayLike<number>, timestamp: number): MidiControlChange | null {
  if (data.length < 3 || !Number.isFinite(timestamp)) return null;
  const [status, controller, value] = [data[0], data[1], data[2]];
  if (status === undefined || controller === undefined || value === undefined
    || status < 0xb0 || status > 0xbf || controller < 0 || controller > 127 || value < 0 || value > 127) return null;
  return { channel: status & 0x0f, controller, value, timestamp };
}

/** Translate one relative hardware gesture into existing semantic zoom timing. */
export function midiCcDeltaToZoom(delta: number): { action: 'zoomIn' | 'zoomOut'; deltaSeconds: number } | null {
  if (!Number.isInteger(delta) || delta < -127 || delta > 127) throw new Error('MIDI CC deltas must be integers from -127 to 127.');
  if (delta === 0) return null;
  return { action: delta > 0 ? 'zoomIn' : 'zoomOut', deltaSeconds: Math.min(0.1, Math.abs(delta) * 0.01) };
}

export function isHydrasynthInput(name: string): boolean {
  return /hydrasynth/i.test(name);
}
