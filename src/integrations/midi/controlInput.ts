import { parseControlChange } from './controlChange';

export type ControlAddress = { protocol: 'midi-cc'; controller: number } | { protocol: 'midi-nrpn'; parameter: number };
export interface ControlInput { address: ControlAddress; channel: number; value: number; timestamp: number }
export const addressKey = (address: ControlAddress): string => address.protocol === 'midi-cc' ? `cc:${address.controller}` : `nrpn:${address.parameter}`;
export const addressLabel = (address: ControlAddress): string => address.protocol === 'midi-cc' ? `CC ${address.controller}` : `NRPN ${address.parameter}`;
export const inputKey = (input: Pick<ControlInput, 'address' | 'channel'>): string => `${input.channel}:${addressKey(input.address)}`;

/** Per-input decoder. Only complete ASM NRPN packets emit values, never transport CCs. */
export function createControlInputDecoder() {
  const channels = Array.from({ length: 16 }, () => ({ msb: null as number | null, lsb: null as number | null, data: null as number | null }));
  return (bytes: ArrayLike<number>, timestamp: number): ControlInput | null => {
    const cc = parseControlChange(bytes, timestamp);
    if (!cc) return null;
    const state = channels[cc.channel];
    if (cc.controller === 99) { state.msb = cc.value; state.lsb = null; state.data = null; return null; }
    if (cc.controller === 98) { state.lsb = cc.value; state.data = null; return null; }
    if ([100, 101, 121].includes(cc.controller)) { state.msb = state.lsb = state.data = null; return null; }
    if (cc.controller === 6) { state.data = cc.value; return null; }
    if (cc.controller === 38) {
      const data = state.data;
      state.data = null;
      if (state.msb === null || state.lsb === null || data === null || (state.msb === 127 && state.lsb === 127)) return null;
      return { address: { protocol: 'midi-nrpn', parameter: state.msb * 128 + state.lsb }, channel: cc.channel, value: data * 128 + cc.value, timestamp };
    }
    // In CC mode ASM uses 96/97 for ENV3; in an NRPN stream these are increment/decrement.
    if ((cc.controller === 96 || cc.controller === 97) && state.msb !== null && state.lsb !== null && !(state.msb === 127 && state.lsb === 127)) return null;
    return { address: { protocol: 'midi-cc', controller: cc.controller }, channel: cc.channel, value: cc.value, timestamp };
  };
}

/** Quantise before differencing to preserve accumulation of small NRPN steps. */
export function controlZoomPosition(value: number, maximum: number): number {
  return Math.round(Math.max(0, Math.min(maximum, value)) * 127 / maximum);
}

/** A bounded absolute knob becomes an unbounded-duration zoom speed control. */
export function controlZoomRate(value: number, maximum: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || maximum <= 0) return 0;
  const position = Math.max(-1, Math.min(1, value / maximum * 2 - 1));
  const deadZone = 0.08;
  if (Math.abs(position) <= deadZone) return 0;
  return Math.sign(position) * ((Math.abs(position) - deadZone) / (1 - deadZone)) ** 2;
}

/** Map a bounded controller value to a finite caller-chosen semantic range. */
export function controlRangeValue(value: number, maximum: number, minimum: number, upper: number, inverted = false): number | null {
  if (![value, maximum, minimum, upper].every(Number.isFinite) || maximum <= 0 || minimum === upper) return null;
  const normalised = Math.max(0, Math.min(1, value / maximum));
  const position = inverted ? 1 - normalised : normalised;
  return minimum + (upper - minimum) * position;
}
