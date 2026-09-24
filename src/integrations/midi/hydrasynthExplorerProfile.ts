import type { ControlAddress } from './controlInput';
export type { ControlAddress } from './controlInput';
export const explorerManualUrl = 'https://www.mecldata.com/download/asm/Hydrasynth_Explorer_Owners_Manual_2.2.0.pdf';

export interface PhysicalControl {
  id: string;
  label: string;
  group: string;
  kind: 'knob' | 'switch' | 'message';
  protocol: { protocol: 'midi-cc'; controller: number };
  nrpn?: { parameter: number; maximum: number };
}

// ASM Explorer 2.2 CC chart, pp. 94–96. Parameter identities, not fixed encoders.
// Macro/filter NRPN aliases: ASM legacy MIDI spec 1.5, pp. 8–9 and 23.
const group = (name: string, entries: readonly (readonly [number, string, PhysicalControl['kind']?])[]): PhysicalControl[] => entries.map(([controller, label, kind = 'knob']) => ({
  id: `cc.${controller}`, label, group: name, kind, protocol: { protocol: 'midi-cc', controller },
}));
export const hydrasynthExplorerControls: readonly PhysicalControl[] = [
  ...Array.from({ length: 8 }, (_, i): PhysicalControl => ({ id: `macro.${i + 1}`, label: `Macro ${i + 1}`, group: 'Macros', kind: 'knob',
    protocol: { protocol: 'midi-cc', controller: 16 + i }, nrpn: { parameter: 0x3f * 128 + 0x58 + i, maximum: 1024 } })),
  ...group('Filters', [[74, 'Filter 1 cutoff'], [71, 'Filter 1 resonance'], [50, 'Filter 1 drive'], [51, 'Filter 1 key tracking'], [52, 'Filter 1 LFO 1 amount'], [53, 'Filter 1 velocity envelope'], [54, 'Filter 1 envelope 1 amount'],
    [55, 'Filter 2 cutoff'], [56, 'Filter 2 resonance'], [57, 'Filter 2 type / morph'], [58, 'Filter 2 key tracking'], [59, 'Filter 2 LFO 1 amount'], [60, 'Filter 2 velocity envelope'], [61, 'Filter 2 envelope 1 amount']]).map((control) => {
      const aliases: Record<number, number> = { 74: 0x4028, 71: 0x4029, 50: 0x402b, 51: 0x4166, 52: 0x4160, 53: 0x4169, 54: 0x4161, 55: 0x402c, 56: 0x402d, 57: 0x402e, 58: 0x4167, 59: 0x4162, 60: 0x416a, 61: 0x4163 };
      const packed = aliases[control.protocol.controller];
      return { ...control, nrpn: { parameter: (packed >> 8) * 128 + (packed & 255), maximum: 8192 } };
    }),
  ...group('Oscillators', [[24, 'Oscillator 1 wave scan'], [26, 'Oscillator 2 wave scan'], [111, 'Oscillator 1 cents'], [112, 'Oscillator 2 cents'], [113, 'Oscillator 3 cents']]),
  ...group('Mixer', [[3, 'Noise level'], [8, 'Noise pan'], [9, 'Ring modulation level'], [10, 'Ring modulation pan'], [43, 'Ring modulation depth'], [44, 'Oscillator 1 level'], [45, 'Oscillator 1 pan'], [46, 'Oscillator 2 level'], [47, 'Oscillator 2 pan'], [48, 'Oscillator 3 level'], [49, 'Oscillator 3 pan'], [114, 'Oscillator 3 filter ratio'], [115, 'Noise filter ratio'], [116, 'Ring modulation filter ratio'], [118, 'Oscillator 1 filter ratio'], [119, 'Oscillator 2 filter ratio']]),
  ...[[29, 30, 31], [33, 34, 35], [36, 37, 39], [40, 41, 42]].flatMap((cc, i) => group('Mutators', cc.map((n, j) => [n, `Mutator ${i + 1} ${['ratio', 'depth', 'dry / wet'][j]}`] as const))),
  ...[[70, 72], [28, 73], [75, 76], [77, 78], [79, 80]].flatMap((cc, i) => group('LFOs', [[cc[0], `LFO ${i + 1} gain`], [cc[1], `LFO ${i + 1} rate`]])),
  ...[[81, 82, 83, 84], [85, 86, 87, 88], [89, 90, 96, 97], [25, 27, 125, 124], [102, 103, 104, 105]].flatMap((cc, i) => group('Envelopes', cc.map((n, j) => [n, `Envelope ${i + 1} ${['attack', 'decay', 'sustain', 'release'][j]}`] as const))),
  ...group('Effects', [[12, 'Pre-FX parameter 1'], [13, 'Pre-FX parameter 2'], [93, 'Pre-FX mix'], [68, 'Post-FX parameter 1'], [69, 'Post-FX parameter 2'], [94, 'Post-FX mix'], [14, 'Delay feedback'], [15, 'Delay time'], [63, 'Delay wet tone'], [92, 'Delay dry / wet'], [65, 'Reverb time'], [67, 'Reverb tone'], [91, 'Reverb dry / wet']]),
  ...group('Arpeggiator', [[106, 'Arp division'], [107, 'Arp gate'], [108, 'Arp mode'], [109, 'Arp ratchet'], [110, 'Arp chance'], [120, 'Arp octave'], [122, 'Arp length']]),
  ...group('Voice / performance', [[62, 'Amp LFO 2 amount'], [5, 'Glide time'], [66, 'Glide', 'switch'], [95, 'Voice detune'], [117, 'Stereo width'], [1, 'Mod strip'], [7, 'Master volume'], [11, 'Expression'], [64, 'Sustain', 'switch'], [0, 'Bank select MSB', 'message'], [32, 'Bank select LSB', 'message'], [123, 'All notes off', 'message']]),
];
export const hydrasynthControlGroups = [...new Set(hydrasynthExplorerControls.map((control) => control.group))];
export function findHydrasynthExplorerControl(address: ControlAddress | number): PhysicalControl | undefined {
  if (typeof address === 'number') return hydrasynthExplorerControls.find((control) => control.protocol.controller === address);
  return hydrasynthExplorerControls.find((control) => address.protocol === 'midi-cc' ? control.protocol.controller === address.controller : control.nrpn?.parameter === address.parameter);
}
export function controlMaximum(address: ControlAddress): number {
  return address.protocol === 'midi-cc' ? 127 : findHydrasynthExplorerControl(address)?.nrpn?.maximum ?? 16383;
}
