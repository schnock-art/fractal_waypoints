import { describe, expect, it } from 'vitest';
import { isHydrasynthInput, midiCcDeltaToZoom, parseControlChange } from '../src/integrations/midi/controlChange';

describe('Hydrasynth MIDI CC boundary', () => {
  it('accepts only valid control-change messages and preserves channel/timestamp', () => {
    expect(parseControlChange([0xb3, 16, 64], 12.5)).toEqual({ channel: 3, controller: 16, value: 64, timestamp: 12.5 });
    expect(parseControlChange([0x93, 16, 64], 12.5)).toBeNull();
    expect(parseControlChange([0xb0, 128, 64], 12.5)).toBeNull();
  });

  it('converts relative CC motion to small bounded semantic zoom gestures', () => {
    expect(midiCcDeltaToZoom(0)).toBeNull();
    expect(midiCcDeltaToZoom(1)).toEqual({ action: 'zoomIn', deltaSeconds: 0.01 });
    expect(midiCcDeltaToZoom(-5)).toEqual({ action: 'zoomOut', deltaSeconds: 0.05 });
    expect(midiCcDeltaToZoom(127)).toEqual({ action: 'zoomIn', deltaSeconds: 0.1 });
    expect(() => midiCcDeltaToZoom(1.5)).toThrow('-127 to 127');
  });

  it('recognises Hydrasynth input names without requiring an exact browser label', () => {
    expect(isHydrasynthInput('Hydrasynth Explorer MIDI')).toBe(true);
    expect(isHydrasynthInput('USB MIDI Device')).toBe(false);
  });
});
