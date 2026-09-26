import { beforeEach, describe, expect, it } from 'vitest';
import { createControllerLayoutsDocument, findControllerLayoutLane, importControllerLayouts, isControllerLayoutsDocument,
  loadControllerLayouts, saveControllerLayouts, CONTROLLER_LAYOUT_STORAGE_KEY, type ControllerLayout } from '../src/connections/controllerLayout';

const layout = (): ControllerLayout => ({
  schemaVersion: 1, id: 'fractal-ways-1', name: 'Fractal Ways 1', deviceProfileId: 'asm-hydrasynth-explorer-2.2',
  expectedHardwarePatchName: 'Fractal Ways', notes: 'Palette motion', lanes: [
    { id: 'colour-lfo', label: 'Colour LFO', address: { protocol: 'midi-cc', controller: 26 }, channel: 0 },
    { id: 'macro-1', label: 'Macro 1', address: { protocol: 'midi-nrpn', parameter: 0 }, channel: 1, minimum: 0, maximum: 16383 },
  ],
});

describe('controller layouts', () => {
  beforeEach(() => window.localStorage.clear());

  it('persists a user-owned, reusable endpoint interpretation separately from controller setups', () => {
    const document = createControllerLayoutsDocument([layout()], 'fractal-ways-1');
    expect(saveControllerLayouts(document)).toBe(true);
    expect(loadControllerLayouts()).toEqual({ status: 'loaded', document });
    expect(JSON.stringify(document)).not.toContain('palette.offset');
    expect(JSON.stringify(document)).not.toContain('transforms');
    expect(findControllerLayoutLane(document.layouts[0], { protocol: 'midi-cc', controller: 26 }, 0)?.label).toBe('Colour LFO');
  });

  it('rejects ambiguous lanes and leaves future stored data untouched', () => {
    const valid = createControllerLayoutsDocument([layout()]);
    expect(isControllerLayoutsDocument({ ...valid, layouts: [{ ...valid.layouts[0], lanes: [...valid.layouts[0].lanes, { ...valid.layouts[0].lanes[0], id: 'duplicate' }] }] })).toBe(false);
    const future = JSON.stringify({ schemaVersion: 7, layouts: [] });
    window.localStorage.setItem(CONTROLLER_LAYOUT_STORAGE_KEY, future);
    expect(loadControllerLayouts()).toEqual({ status: 'unsupported', message: 'Controller layouts version 7 is newer than this app supports. They were not changed.' });
    expect(window.localStorage.getItem(CONTROLLER_LAYOUT_STORAGE_KEY)).toBe(future);
    expect(importControllerLayouts('{broken').status).toBe('invalid');
  });
});
