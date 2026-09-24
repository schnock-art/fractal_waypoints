import { describe, expect, it } from 'vitest';
import { controlMaximum, findHydrasynthExplorerControl, hydrasynthExplorerControls } from '../src/integrations/midi/hydrasynthExplorerProfile';

describe('Hydrasynth Explorer device profile', () => {
  it('keeps macro identities and covers the complete documented CC chart without duplicates', () => {
    expect(hydrasynthExplorerControls).toHaveLength(117);
    expect(new Set(hydrasynthExplorerControls.map((control) => control.id)).size).toBe(117);
    expect(new Set(hydrasynthExplorerControls.map((control) => control.protocol.controller)).size).toBe(117);
    expect(hydrasynthExplorerControls.slice(0, 8).map((control) => control.id)).toEqual([
      'macro.1', 'macro.2', 'macro.3', 'macro.4', 'macro.5', 'macro.6', 'macro.7', 'macro.8',
    ]);
    expect(hydrasynthExplorerControls.slice(0, 8).map((control) => control.protocol.controller)).toEqual([16, 17, 18, 19, 20, 21, 22, 23]);
    for (const cc of [6, 38, 98, 99, 100, 101, 121]) expect(findHydrasynthExplorerControl(cc)).toBeUndefined();
  });

  it('identifies only controls represented by the profile', () => {
    expect(findHydrasynthExplorerControl(16)?.label).toBe('Macro 1');
    expect(findHydrasynthExplorerControl(23)?.id).toBe('macro.8');
    expect(findHydrasynthExplorerControl(74)?.label).toBe('Filter 1 cutoff');
    expect(findHydrasynthExplorerControl(125)?.label).toBe('Envelope 4 sustain');
    expect(findHydrasynthExplorerControl(120)?.label).toBe('Arp octave');
    expect(findHydrasynthExplorerControl(123)?.kind).toBe('message');
  });

  it('recognises documented NRPN aliases with their actual ranges', () => {
    const macro = { protocol: 'midi-nrpn', parameter: 8152 } as const;
    expect(findHydrasynthExplorerControl(macro)?.id).toBe('macro.1');
    expect(controlMaximum(macro)).toBe(1024);
    expect(findHydrasynthExplorerControl({ protocol: 'midi-nrpn', parameter: 8232 })?.protocol.controller).toBe(74);
    expect(controlMaximum({ protocol: 'midi-nrpn', parameter: 8232 })).toBe(8192);
  });
});
