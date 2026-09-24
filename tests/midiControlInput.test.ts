import { describe, expect, it } from 'vitest';
import { controlRangeValue, controlZoomPosition, controlZoomRate, createControlInputDecoder, inputKey } from '../src/integrations/midi/controlInput';

describe('complete MIDI control input', () => {
  it('maps CC and NRPN endpoints to sustained speed with a quiet centre and fine control', () => {
    for (const maximum of [127, 1024, 8192]) {
      expect(controlZoomRate(0, maximum)).toBe(-1);
      expect(controlZoomRate(maximum, maximum)).toBe(1);
      expect(controlZoomRate(Math.floor(maximum / 2), maximum)).toBe(0);
      expect(controlZoomRate(Math.ceil(maximum / 2), maximum)).toBe(0);
      expect(controlZoomRate(maximum * 0.75, maximum)).toBeGreaterThan(0);
      expect(controlZoomRate(maximum * 0.75, maximum)).toBeLessThan(0.5);
    }
    expect(controlZoomRate(NaN, 127)).toBe(0);
    expect(controlZoomRate(50, 0)).toBe(0);
  });
  it('maps bounded values to a caller-owned semantic range without imposing a domain bound', () => {
    expect(controlRangeValue(0, 127, -2, 3)).toBe(-2);
    expect(controlRangeValue(127, 127, -2, 3)).toBe(3);
    expect(controlRangeValue(64, 127, -2, 3)).toBeCloseTo(0.5197, 3);
    expect(controlRangeValue(0, 1024, -2, 3, true)).toBe(3);
    expect(controlRangeValue(1024, 1024, -2, 3, true)).toBe(-2);
    expect(controlRangeValue(10, 0, -2, 3)).toBeNull();
    expect(controlRangeValue(10, 127, 1, 1)).toBeNull();
  });
  it('assembles a Macro NRPN once, without exposing transport bytes as controls', () => {
    const decode = createControlInputDecoder();
    for (const [cc, value] of [[99, 63], [98, 88], [6, 4]]) expect(decode([0xb2, cc, value], 1)).toBeNull();
    const result = decode([0xb2, 38, 0], 2);
    expect(result).toEqual({ address: { protocol: 'midi-nrpn', parameter: 8152 }, channel: 2, value: 512, timestamp: 2 });
    expect(inputKey(result!)).toBe('2:nrpn:8152');
    expect(decode([0xb2, 38, 10], 3)).toBeNull();
    expect(decode([0xb2, 6, 8], 4)).toBeNull();
    expect(decode([0xb2, 38, 0], 5)?.value).toBe(1024);
  });
  it('isolates channels, rejects incomplete packets and clears state for RPN/null selections', () => {
    const decode = createControlInputDecoder();
    decode([0xb0, 99, 63], 0); decode([0xb0, 98, 88], 0); decode([0xb0, 6, 1], 0);
    expect(decode([0xb1, 38, 0], 1)).toBeNull();
    decode([0xb0, 101, 0], 2);
    expect(decode([0xb0, 38, 0], 3)).toBeNull();
    decode([0xb0, 99, 127], 4); decode([0xb0, 98, 127], 4); decode([0xb0, 6, 1], 4);
    expect(decode([0xb0, 38, 0], 5)).toBeNull();
    const fresh = createControlInputDecoder();
    expect(fresh([0xb0, 38, 0], 6)).toBeNull();
  });
  it('does not mistake ASM envelope and arp CCs for system commands in CC mode', () => {
    const decode = createControlInputDecoder();
    for (const cc of [16, 74, 96, 97, 120, 122, 124, 125]) expect(decode([0xb0, cc, 50], 0)?.address).toEqual({ protocol: 'midi-cc', controller: cc });
    expect(decode([0xb0, NaN, 20], 0)).toBeNull();
    expect(decode([0xb0, 74, 1.5], 0)).toBeNull();
  });
  it('normalises known ranges without losing accumulated fine movement', () => {
    expect(controlZoomPosition(1024, 1024)).toBe(127);
    expect(controlZoomPosition(8192, 8192)).toBe(127);
    const positions = Array.from({ length: 17 }, (_, i) => controlZoomPosition(i, 1024));
    expect(positions.at(-1)! - positions[0]).toBe(2);
  });
});
