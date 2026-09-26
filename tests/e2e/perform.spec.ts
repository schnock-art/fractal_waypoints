import { test, expect } from '@playwright/test';
import { createDefaultRenderConfig } from '../../src/app/defaultConfig';
import { encodeRenderConfigToUrlParam, decodeRenderConfigFromUrlParam } from '../../src/persistence/urlState';
import type { RenderConfig } from '../../src/types/config';
// @ts-expect-error pngjs has no bundled declarations.
import { PNG } from 'pngjs';

test.use({ channel: 'chromium', launchOptions: { args: ['--enable-unsafe-webgpu'] } });
const fixture = () => {
  const base = createDefaultRenderConfig('phoenix'); base.palette.offset = 0.125;
  base.modulationProgram = { schemaVersion: 1,
    sources: [{ id: 'held', waveform: 'constant', amplitude: 0.25, offset: 0, phase: 0, frequencyHz: 1 }],
    mappings: [{ id: 'colour', sourceId: 'held', target: 'palette.offset', mode: 'add', enabled: true, transforms: [] }],
  };
  return base;
};
async function open(page: import('@playwright/test').Page, base: RenderConfig = fixture()) {
  await page.goto(`/?view=${encodeRenderConfigToUrlParam(base)}`);
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await expect(page.getByText('WebGPU', { exact: true }).first()).toBeVisible();
  await expect.poll(() => page.getByTestId('main-canvas').evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(1);
}
async function openController(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Open controller' }).click();
  return page.getByRole('dialog', { name: 'Hydrasynth Explorer' });
}
async function openMappingEditor(dialog: import('@playwright/test').Locator) {
  await dialog.getByRole('tab', { name: 'Mappings' }).click();
  await dialog.getByRole('button', { name: '+ Add mapping' }).click();
}
async function chooseProfileSource(dialog: import('@playwright/test').Locator, label: string) {
  await dialog.getByText('Browse Hydrasynth controls', { exact: true }).click();
  await dialog.getByRole('button', { name: new RegExp(`^${label}, MIDI CC`) }).click();
  await dialog.getByRole('button', { name: `Use ${label}` }).click();
}
async function chooseManualCc(dialog: import('@playwright/test').Locator, cc: number) {
  await dialog.getByText('Enter MIDI address manually', { exact: true }).click();
  await dialog.getByRole('spinbutton', { name: 'Direct MIDI CC number' }).fill(String(cc));
  await dialog.getByRole('button', { name: `Use CC ${cc}` }).click();
}
async function visiblePrimary(page: import('@playwright/test').Page) {
  await expect.poll(async () => {
    const png = PNG.sync.read(await page.getByTestId('main-canvas').screenshot());
    let bright = 0; for (let i = 0; i < png.data.length; i += 16) if (Math.max(png.data[i], png.data[i + 1], png.data[i + 2]) > 60) bright++;
    return bright / (png.data.length / 16);
  }).toBeGreaterThan(0.05);
}
test('Primary transport, live overrides, workspace continuity, capture and restoration', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await open(page);
  const authoredUrl = page.url();
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  expect(page.url()).toBe(authoredUrl);
  await expect(page.getByText('Performing: Primary · Phoenix', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play internal motion' }).click();
  const offset = page.getByTestId('control-palette.offset');
  await expect(offset).toContainText('Base 0.125 · Effective 0.375');
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  const held = await page.getByTestId('transport-time').textContent();
  await offset.getByRole('spinbutton').fill('2.75');
  await expect(offset).toContainText('Temporary override · 2.75');
  await page.getByRole('slider', { name: 'Orbit memory live' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('control-formula.phoenix.memory')).toContainText('Temporary override');
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.getByRole('slider', { name: /^Offset/ })).toBeDisabled();
  expect(await page.getByTestId('transport-time').textContent()).toBe(held);
  await page.getByRole('button', { name: 'Waypoints', exact: true }).click();
  await page.getByRole('button', { name: 'Quick save', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fractal-explorer:waypoints:v1') ?? '[]').length)).toBe(1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fractal-explorer:waypoints:v1')!)[0].renderConfig);
  expect(saved.palette.offset).toBe(2.75); expect(saved.modulationProgram).toBeUndefined();
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  await offset.getByRole('button', { name: /Return/ }).click();
  await expect(offset).toContainText('Effective 0.375');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(async () => {
    const png = PNG.sync.read(await page.getByTestId('main-canvas').screenshot());
    let bright = 0; for (let i = 0; i < png.data.length; i += 16) if (Math.max(png.data[i], png.data[i + 1], png.data[i + 2]) > 60) bright++;
    return bright / (png.data.length / 16);
  }).toBeGreaterThan(0.05);
  await page.screenshot({ path: info.outputPath('perform-live.png') });
  expect(page.url()).toBe(authoredUrl);
  await page.getByRole('button', { name: 'Resume motion' }).click();
  await expect.poll(async () => Number((await page.getByTestId('transport-time').textContent())!.split(' ')[0])).toBeGreaterThan(Number(held!.split(' ')[0]));
  await page.getByRole('button', { name: 'Stop and edit base' }).click();
  await expect(offset).toContainText('Base 0.125 · Effective 0.125');
  await expect(page.getByText(/^Temporary override ·/)).toHaveCount(0);
  expect(page.url()).toBe(authoredUrl);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Stop and edit base' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('ordered editor, smoothing, skipped mappings and lens restoration are inspectable', async ({ page }, info) => {
  const base = fixture(); const p = base.modulationProgram!;
  base.lens.effects.forEach((effect) => { if (effect.id === 'exposure') effect.enabled = false; });
  p.sources.push({ id: 'overflow', waveform: 'constant', amplitude: 1e308, offset: 1e308, phase: 0, frequencyHz: 0 });
  p.mappings.push({ ...p.mappings[0], id: 'replace', mode: 'replace' },
    { ...p.mappings[0], id: 'inactive', target: 'material.orbitAppearance.emission' },
    { ...p.mappings[0], id: 'invalid', sourceId: 'overflow' },
    { ...p.mappings[0], id: 'lens', target: 'lens.effects.exposure.amount' },
    { ...p.mappings[0], id: 'disabled', enabled: false });
  await open(page, base);
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  await page.getByRole('article', { name: 'Mapping 2', exact: true }).getByRole('button', { name: 'Move up' }).click();
  const first = page.getByRole('article', { name: 'Mapping 1', exact: true });
  await first.getByText('Source and transforms', { exact: true }).click();
  await first.getByRole('spinbutton', { name: /Smoothing window/ }).fill('0.5');
  await first.getByText('Source and transforms', { exact: true }).click();
  const authoredUrl = page.url();
  await page.getByRole('button', { name: 'Play internal motion' }).click();
  await expect(page.getByTestId('control-palette.offset')).toContainText('Effective 0.5');
  await expect(page.getByText(/2 evaluation warning/)).toBeVisible();
  await expect(page.getByRole('article', { name: 'Mapping 3', exact: true })).toContainText('inactive');
  await expect(page.getByRole('article', { name: 'Mapping 4', exact: true })).toContainText('invalid');
  await expect(page.getByRole('article', { name: 'Mapping 6', exact: true })).toContainText('disabled');
  const lens = page.getByRole('article', { name: 'Mapping 5', exact: true });
  await expect(lens).toContainText('Base lens: off · Effective lens: on');
  await page.getByRole('button', { name: 'Pause motion' }).click();
  await lens.scrollIntoViewIfNeeded();
  await visiblePrimary(page);
  await page.screenshot({ path: info.outputPath('perform-mappings.png') });
  await page.getByRole('button', { name: 'Stop and edit base' }).click();
  await expect(lens).toContainText('Base lens: off · Effective lens: off');
  expect(page.url()).toBe(authoredUrl);
  await page.getByRole('button', { name: 'Disable all mappings (keep definitions)' }).click();
  const saved = decodeRenderConfigFromUrlParam(new URL(page.url()).searchParams.get('view')!)!;
  expect(saved.modulationProgram!.mappings.every((entry) => !entry.enabled)).toBe(true);
  expect(saved.modulationProgram!.mappings[0].transforms).toEqual([{ kind: 'smooth', windowSeconds: 0.5 }]);
});

test('empty surface creates a playable wave; formula replacement keeps definitions disarmed', async ({ page }) => {
  await open(page, createDefaultRenderConfig('phoenix'));
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  await page.getByRole('button', { name: 'Add palette wave' }).click();
  await page.getByRole('button', { name: 'Play internal motion' }).click();
  await expect(page.getByRole('article', { name: 'Mapping 1', exact: true })).toContainText('active');
  await page.getByRole('button', { name: 'Stop and edit base' }).click();
  await page.getByRole('button', { name: 'Edit in Explore' }).click();
  await expect(page.getByRole('button', { name: 'Explore', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  expect(decodeRenderConfigFromUrlParam(new URL(page.url()).searchParams.get('view')!)!.modulationProgram?.mappings).toHaveLength(1);
  await page.locator('.control-panel__essentials select').first().selectOption('newton');
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  await expect(page.getByTestId('control-formula.phoenix.memory')).toContainText('Orbit memory requires Phoenix.');
  await expect(page.getByRole('article', { name: 'Mapping 1', exact: true })).toContainText('disabled');
});

test('Hydrasynth setup expands from the compact Perform launcher and restores focus', async ({ page }, info) => {
  await open(page);
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  const launcher = page.getByRole('button', { name: 'Open controller' });
  await expect(launcher).toBeInViewport();
  await expect(page.getByRole('region', { name: 'Hydrasynth Explorer controller' })).toContainText('MIDI access required');
  const dialog = await openController(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await expect(dialog.getByRole('tab', { name: 'Live' })).toHaveAttribute('aria-selected', 'true');
  await expect(dialog.getByRole('button', { name: 'Macro 8, MIDI CC 23' })).toHaveCount(0);
  await expect(dialog.getByText(/Raw MIDI monitor/)).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('controller-live.png') });
  await dialog.getByRole('tab', { name: 'Diagnostics' }).click();
  await expect(dialog.getByText(/Raw MIDI monitor/)).toBeVisible();
  await dialog.getByRole('tab', { name: 'Live' }).click();
  await dialog.getByRole('tab', { name: 'Live' }).press('ArrowRight');
  await expect(dialog.getByRole('tab', { name: 'Mappings' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(launcher).toBeFocused();
});

test('Hydrasynth controller layouts name reusable raw endpoints without changing their mapping identity', async ({ page }) => {
  await page.addInitScript(() => {
    type Input = { id: string; name: string; state: string; onmidimessage: null };
    const input: Input = { id: 'explorer', name: 'Hydrasynth Explorer', state: 'connected', onmidimessage: null };
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: async () => ({ inputs: new Map([['explorer', input]]), onstatechange: null }) });
  });
  await open(page);
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  const dialog = await openController(page);
  await dialog.getByRole('button', { name: 'Connect' }).click();
  await dialog.getByRole('tab', { name: 'Layouts' }).click();
  await dialog.getByLabel('New controller layout name').fill('Fractal Ways 1');
  await dialog.getByRole('button', { name: 'Create named layout' }).click();
  await dialog.getByRole('button', { name: '+ Add lane' }).first().click();
  await dialog.getByLabel('Controller layout lane label').fill('Colour LFO');
  await dialog.getByRole('button', { name: 'Enter endpoint manually' }).click();
  await dialog.getByLabel('Layout MIDI CC number').fill('26');
  await dialog.getByRole('button', { name: 'Add CC 26 lane' }).click();
  await expect(dialog.getByLabel('Controller layout lanes')).toContainText('Colour LFO');
  await openMappingEditor(dialog);
  await chooseManualCc(dialog, 26);
  await dialog.getByRole('combobox', { name: 'Controller target' }).selectOption('palette.offset');
  await dialog.getByRole('button', { name: 'Save mapping' }).click();
  await expect(page.getByTestId('hydrasynth-mapping-palette')).toContainText('Colour LFO');
  await expect(page.getByTestId('hydrasynth-mapping-palette')).toContainText('Palette offset');
  await expect(page.getByTestId('hydrasynth-mapping-palette')).toContainText('CC 26 · Channel 1');
  await page.reload();
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  const restored = await openController(page);
  await restored.getByRole('tab', { name: 'Layouts' }).click();
  await expect(restored.getByLabel('Controller layout lanes')).toContainText('Colour LFO');
});

test('Hydrasynth CC and NRPN controls assign, navigate, re-arm and release safely', async ({ page }) => {
  await page.addInitScript(() => {
    type Input = { id: string; name: string; state: string; onmidimessage: null | ((event: { data: Uint8Array; timeStamp: number }) => void) };
    const input: Input = { id: 'explorer', name: 'Hydrasynth Explorer', state: 'connected', onmidimessage: null };
    const access = { inputs: new Map([['explorer', input]]), onstatechange: null as null | (() => void) };
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: async () => access });
    Object.assign(window, {
      sendMidi: (data: number[]) => input.onmidimessage?.({ data: new Uint8Array(data), timeStamp: performance.now() }),
      disconnectMidi: () => { input.state = 'disconnected'; access.onstatechange?.(); },
      reconnectMidi: () => { input.state = 'connected'; access.onstatechange?.(); },
    });
  });
  const send = async (data: number[]) => page.evaluate((bytes) => (window as unknown as { sendMidi: (data: number[]) => void }).sendMidi(bytes), data);
  const nrpn = async (value: number) => { for (const [cc, n] of [[99, 63], [98, 88], [6, value >> 7], [38, value & 127]]) await send([0xb2, cc, n]); };
  await open(page);
  const authoredUrl = page.url();
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  await page.getByRole('button', { name: 'Play internal motion' }).click();
  const dialog = await openController(page);
  await dialog.getByRole('button', { name: 'Connect' }).click();
  await openMappingEditor(dialog);
  await dialog.getByRole('radio', { name: 'Zoom while turning' }).check();
  await send([0xb2, 74, 64]);
  await expect(dialog.getByText('Detected').locator('..')).toContainText('Filter 1 cutoff');
  await dialog.getByRole('button', { name: 'Use this source' }).click();
  await dialog.getByRole('button', { name: 'Save mapping' }).click();
  await dialog.getByRole('button', { name: 'Arm zoom', exact: true }).click();
  // Read the visible scale text rather than reaching into application state.
  const scale = () => page.getByText(/^Scale /).first().innerText();
  const baseScale = await scale();
  await send([0xb2, 74, 80]); // fresh baseline after arm
  expect(await scale()).toBe(baseScale);
  await send([0xb1, 74, 90]); // wrong channel
  expect(await scale()).toBe(baseScale);
  await send([0xb2, 74, 90]);
  await expect.poll(scale).not.toBe(baseScale);
  await dialog.getByRole('button', { name: 'Disarm zoom', exact: true }).click();
  await expect.poll(scale).toBe(baseScale);
  await nrpn(512);
  await dialog.getByRole('button', { name: '+ Add mapping' }).click();
  await expect(dialog.getByText('Detected').locator('..')).toContainText('Macro 1');
  await dialog.getByRole('button', { name: 'Use this source' }).click();
  await dialog.getByRole('button', { name: 'Save mapping' }).click();
  await dialog.getByRole('button', { name: 'Arm zoom', exact: true }).click();
  await nrpn(600);
  expect(await scale()).toBe(baseScale);
  await nrpn(650);
  await expect.poll(scale).not.toBe(baseScale);
  await dialog.getByRole('button', { name: 'Edit mapping' }).first().click();
  await dialog.getByRole('radio', { name: 'Continuous speed' }).check();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  const numericScale = async () => Number((await scale()).replace('Scale ', '').trim());
  const beforeContinuous = await numericScale();
  await nrpn(1024); // One endpoint message keeps moving without further MIDI input.
  await expect.poll(numericScale).toBeLessThan(beforeContinuous * 0.98);
  const continued = await numericScale();
  await expect.poll(numericScale).toBeLessThan(continued * 0.98);
  await nrpn(512); // centre holds the current view
  await page.waitForTimeout(40); // External absolute samples coalesce to the next animation frame.
  const centred = await scale();
  await page.waitForTimeout(150);
  expect(await scale()).toBe(centred);
  await nrpn(0);
  await expect.poll(numericScale).toBeGreaterThan(Number(centred.replace('Scale ', '').trim()) * 1.02);
  await page.getByRole('button', { name: 'Hold zoom', exact: true }).click();
  const heldZoom = await scale();
  await page.waitForTimeout(150);
  expect(await scale()).toBe(heldZoom);
  await nrpn(1024);
  await expect.poll(scale).not.toBe(heldZoom);
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  const pausedZoom = await scale();
  await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
  await page.waitForTimeout(150);
  expect(await scale()).toBe(pausedZoom); // Resume requires fresh controller input.
  await nrpn(1024);
  await expect.poll(scale).not.toBe(pausedZoom);
  await expect(page.getByRole('button', { name: 'Release MIDI zoom' })).toBeVisible();
  await page.evaluate(() => (window as unknown as { disconnectMidi: () => void }).disconnectMidi());
  await expect.poll(scale).toBe(baseScale);
  await expect(page.getByRole('button', { name: 'Release MIDI zoom' })).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { reconnectMidi: () => void }).reconnectMidi());
  await page.getByRole('button', { name: 'Open controller' }).click();
  await expect(page.getByRole('dialog', { name: 'Hydrasynth Explorer' })).toContainText('Controller reconnected');
  await page.getByRole('tab', { name: 'Mappings' }).click();
  await expect(page.getByTestId('hydrasynth-mapping-zoom')).toContainText('Macro 1');
  await page.getByRole('button', { name: 'Arm zoom', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await nrpn(1024);
  await expect.poll(scale).not.toBe(baseScale);
  expect(page.url()).toBe(authoredUrl);
});

test('MIDI access remains explicit and a chosen generic interface reconnects without guessing', async ({ page }) => {
  await page.addInitScript(() => {
    type Input = { id: string; name: string; state: string; onmidimessage: null };
    const focusrite: Input = { id: 'focusrite', name: 'Focusrite USB MIDI', state: 'connected', onmidimessage: null };
    const hydrasynth: Input = { id: 'explorer', name: 'Hydrasynth Explorer', state: 'connected', onmidimessage: null };
    const access = { inputs: new Map([['focusrite', focusrite], ['explorer', hydrasynth]]), onstatechange: null as null | (() => void) };
    let requests = 0;
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: async () => { requests += 1; return access; } });
    Object.assign(window, {
      midiAccessRequests: () => requests,
      disconnectFocusrite: () => { focusrite.state = 'disconnected'; access.onstatechange?.(); },
      reconnectFocusrite: () => { focusrite.state = 'connected'; access.onstatechange?.(); },
    });
  });
  await open(page);
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  const dialog = await openController(page);
  expect(await page.evaluate(() => (window as unknown as { midiAccessRequests: () => number }).midiAccessRequests())).toBe(0);
  await dialog.getByRole('button', { name: 'Connect' }).click();
  expect(await page.evaluate(() => (window as unknown as { midiAccessRequests: () => number }).midiAccessRequests())).toBe(1);
  await dialog.getByRole('tab', { name: 'Diagnostics' }).click();
  await dialog.getByRole('combobox', { name: 'MIDI input' }).selectOption('focusrite');
  await page.evaluate(() => (window as unknown as { disconnectFocusrite: () => void }).disconnectFocusrite());
  await expect(dialog.getByText('Controller disconnected')).toBeVisible();
  await page.evaluate(() => (window as unknown as { reconnectFocusrite: () => void }).reconnectFocusrite());
  await expect(dialog.getByText('Controller reconnected')).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: 'MIDI input' })).toHaveValue('focusrite');
});

test('ambiguous generic MIDI inputs require a user choice', async ({ page }) => {
  await page.addInitScript(() => {
    type Input = { id: string; name: string; state: string; onmidimessage: null };
    const first: Input = { id: 'interface-a', name: 'USB MIDI A', state: 'connected', onmidimessage: null };
    const second: Input = { id: 'interface-b', name: 'USB MIDI B', state: 'connected', onmidimessage: null };
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: async () => ({ inputs: new Map([['interface-a', first], ['interface-b', second]]), onstatechange: null }) });
  });
  await open(page);
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  const dialog = await openController(page);
  await dialog.getByRole('button', { name: 'Connect' }).click();
  await expect(dialog.getByText('Choose a MIDI input. More than one plausible controller is connected.')).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: 'MIDI input' })).toHaveValue('');
});

test('Hydrasynth maps a knob to a temporary Palette offset and restores it safely', async ({ page }) => {
  await page.addInitScript(() => {
    type Input = { id: string; name: string; state: string; onmidimessage: null | ((event: { data: Uint8Array; timeStamp: number }) => void) };
    const input: Input = { id: 'explorer', name: 'Hydrasynth Explorer', state: 'connected', onmidimessage: null };
    const access = { inputs: new Map([['explorer', input]]), onstatechange: null as null | (() => void) };
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: async () => access });
    Object.assign(window, { sendMidi: (data: number[]) => input.onmidimessage?.({ data: new Uint8Array(data), timeStamp: performance.now() }) });
  });
  const send = async (data: number[]) => page.evaluate((bytes) => (window as unknown as { sendMidi: (data: number[]) => void }).sendMidi(bytes), data);
  await open(page);
  const authoredUrl = page.url();
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  await page.getByRole('button', { name: 'Play internal motion' }).click();
  const dialog = await openController(page);
  await dialog.getByRole('button', { name: 'Connect' }).click();
  await openMappingEditor(dialog);
  await chooseProfileSource(dialog, 'Macro 1');
  await dialog.getByRole('combobox', { name: 'Controller target' }).selectOption('palette.offset');
  await dialog.getByRole('spinbutton', { name: 'Palette offset minimum' }).fill('-2');
  await dialog.getByRole('spinbutton', { name: 'Palette offset maximum' }).fill('3');
  await dialog.getByRole('button', { name: 'Save mapping' }).click();
  await dialog.getByRole('button', { name: 'Arm Palette offset', exact: true }).click();
  await send([0xb0, 16, 127]);
  await expect(page.getByTestId('control-palette.offset')).toContainText('Effective 3');
  expect(page.url()).toBe(authoredUrl);
  await dialog.getByRole('button', { name: 'Disarm Palette offset', exact: true }).click();
  await expect(page.getByTestId('control-palette.offset')).toContainText('Effective 0.375');
});

test('Hydrasynth accepts a custom received CC as a continuous Palette signal', async ({ page }) => {
  await page.addInitScript(() => {
    type Input = { id: string; name: string; state: string; onmidimessage: null | ((event: { data: Uint8Array; timeStamp: number }) => void) };
    const input: Input = { id: 'explorer', name: 'Hydrasynth Explorer', state: 'connected', onmidimessage: null };
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: async () => ({ inputs: new Map([['explorer', input]]), onstatechange: null }) });
    Object.assign(window, { sendMidi: (data: number[]) => input.onmidimessage?.({ data: new Uint8Array(data), timeStamp: performance.now() }) });
  });
  const send = async (data: number[]) => page.evaluate((bytes) => (window as unknown as { sendMidi: (data: number[]) => void }).sendMidi(bytes), data);
  await open(page);
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  await page.getByRole('button', { name: 'Play internal motion' }).click();
  const dialog = await openController(page);
  await dialog.getByRole('button', { name: 'Connect' }).click();
  await openMappingEditor(dialog);
  await send([0xb0, 126, 127]); // A custom CC not named by the Explorer parameter profile.
  await expect(dialog.getByText('Detected').locator('..')).toContainText('CC 126');
  await dialog.getByRole('button', { name: 'Use this source' }).click();
  await dialog.getByRole('combobox', { name: 'Controller target' }).selectOption('palette.offset');
  await dialog.getByRole('button', { name: 'Save mapping' }).click();
  await dialog.getByRole('button', { name: 'Arm Palette offset', exact: true }).click();
  await send([0xb0, 126, 0]);
  await expect(page.getByTestId('control-palette.offset')).toContainText('Effective -1');
  await send([0xb0, 126, 127]);
  await expect(page.getByTestId('control-palette.offset')).toContainText('Effective 1');
});

test('Hydrasynth assigns a CC endpoint directly without misidentifying its provenance', async ({ page }) => {
  await page.addInitScript(() => {
    type Input = { id: string; name: string; state: string; onmidimessage: null | ((event: { data: Uint8Array; timeStamp: number }) => void) };
    const input: Input = { id: 'explorer', name: 'Hydrasynth Explorer', state: 'connected', onmidimessage: null };
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: async () => ({ inputs: new Map([['explorer', input]]), onstatechange: null }) });
    Object.assign(window, { sendMidi: (data: number[]) => input.onmidimessage?.({ data: new Uint8Array(data), timeStamp: performance.now() }) });
  });
  const send = async (data: number[]) => page.evaluate((bytes) => (window as unknown as { sendMidi: (data: number[]) => void }).sendMidi(bytes), data);
  await open(page);
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  await page.getByRole('button', { name: 'Play internal motion' }).click();
  const dialog = await openController(page);
  await dialog.getByRole('button', { name: 'Connect' }).click();
  await openMappingEditor(dialog);
  await chooseManualCc(dialog, 16);
  await dialog.getByRole('combobox', { name: 'Controller target' }).selectOption('palette.offset');
  await dialog.getByRole('button', { name: 'Save mapping' }).click();
  await expect(page.getByTestId('hydrasynth-mapping-palette')).toContainText('CC 16');
  await expect(page.getByTestId('hydrasynth-mapping-palette')).toContainText('Palette offset');
  await expect(page.getByTestId('hydrasynth-mapping-palette')).not.toContainText('Macro 1');
  await dialog.getByRole('button', { name: 'Arm Palette offset', exact: true }).click();
  await send([0xb0, 16, 127]);
  await expect(page.getByTestId('control-palette.offset')).toContainText('Effective 1');
  const savedProfile = await page.evaluate(() => JSON.parse(localStorage.getItem('fractal-explorer:performance-setup:v1')!).bindings[0].relationship.source.deviceProfileId);
  expect(savedProfile).toBe('learned-midi-control');
});

test('Hydrasynth records and replays a mapped take after the input disconnects', async ({ page }) => {
  await page.addInitScript(() => {
    type Input = { id: string; name: string; state: string; onmidimessage: null | ((event: { data: Uint8Array; timeStamp: number }) => void) };
    const input: Input = { id: 'explorer', name: 'Hydrasynth Explorer', state: 'connected', onmidimessage: null };
    const access = { inputs: new Map([['explorer', input]]), onstatechange: null as null | (() => void) };
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: async () => access });
    Object.assign(window, {
      sendMidi: (data: number[]) => input.onmidimessage?.({ data: new Uint8Array(data), timeStamp: performance.now() }),
      disconnectMidi: () => { input.state = 'disconnected'; access.onstatechange?.(); },
    });
  });
  const send = async (data: number[]) => page.evaluate((bytes) => (window as unknown as { sendMidi: (data: number[]) => void }).sendMidi(bytes), data);
  await open(page);
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  await page.getByRole('button', { name: 'Play internal motion' }).click();
  const dialog = await openController(page);
  await dialog.getByRole('button', { name: 'Connect' }).click();
  await openMappingEditor(dialog);
  await chooseManualCc(dialog, 126);
  await dialog.getByRole('combobox', { name: 'Controller target' }).selectOption('palette.offset');
  await dialog.getByRole('button', { name: 'Save mapping' }).click();
  await dialog.getByRole('button', { name: 'Arm Palette offset', exact: true }).click();
  await dialog.getByRole('tab', { name: 'Takes' }).click();
  await dialog.getByRole('button', { name: '● Record new take' }).click();
  await send([0xb0, 126, 0]);
  await page.waitForTimeout(300);
  await send([0xb0, 126, 127]);
  await page.waitForTimeout(180);
  await dialog.getByRole('button', { name: 'Stop recording' }).click();
  await expect(dialog.getByText(/Saved take · 2 samples/)).toBeVisible();
  await page.evaluate(() => (window as unknown as { disconnectMidi: () => void }).disconnectMidi());
  await dialog.getByRole('button', { name: 'Replay saved take' }).click();
  await expect(page.getByTestId('control-palette.offset')).toContainText('Effective -1');
  await page.waitForTimeout(340);
  await expect(page.getByTestId('control-palette.offset')).toContainText('Effective 1');
  await expect(dialog.getByText(/Replay complete · 2 samples/)).toBeVisible();
  await expect(page.getByTestId('control-palette.offset')).toContainText('Effective 0.375');
});

test('Hydrasynth runs Zoom and Palette offset mappings simultaneously and releases each independently', async ({ page }) => {
  await page.addInitScript(() => {
    type Input = { id: string; name: string; state: string; onmidimessage: null | ((event: { data: Uint8Array; timeStamp: number }) => void) };
    const input: Input = { id: 'explorer', name: 'Hydrasynth Explorer', state: 'connected', onmidimessage: null };
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: async () => ({ inputs: new Map([['explorer', input]]), onstatechange: null }) });
    Object.assign(window, { sendMidi: (data: number[]) => input.onmidimessage?.({ data: new Uint8Array(data), timeStamp: performance.now() }) });
  });
  const send = async (data: number[]) => page.evaluate((bytes) => (window as unknown as { sendMidi: (data: number[]) => void }).sendMidi(bytes), data);
  await open(page);
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  const dialog = await openController(page);
  await dialog.getByRole('button', { name: 'Connect' }).click();
  await openMappingEditor(dialog);
  await chooseProfileSource(dialog, 'Macro 1');
  await dialog.getByRole('button', { name: 'Save mapping' }).click();
  await dialog.getByRole('button', { name: 'Arm zoom', exact: true }).click();
  await dialog.getByRole('button', { name: '+ Add mapping' }).click();
  await send([0xb0, 126, 127]);
  await dialog.getByRole('button', { name: 'Use this source' }).click();
  await dialog.getByRole('combobox', { name: 'Controller target' }).selectOption('palette.offset');
  await dialog.getByRole('button', { name: 'Save mapping' }).click();
  await expect(page.getByTestId('hydrasynth-mapping-zoom')).toContainText('Macro 1');
  await expect(page.getByTestId('hydrasynth-mapping-palette')).toContainText('CC 126');
  await dialog.getByRole('button', { name: 'Arm Palette offset', exact: true }).click();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Play internal motion' }).click();
  const scale = () => page.getByText(/^Scale /).first().innerText();
  const baseScale = await scale();
  await send([0xb0, 16, 127]);
  await expect.poll(scale).not.toBe(baseScale);
  await send([0xb0, 126, 0]);
  await expect(page.getByTestId('control-palette.offset')).toContainText('Effective -1');
  await page.getByRole('button', { name: 'Release MIDI zoom' }).click();
  await expect.poll(scale).toBe(baseScale);
  await expect(page.getByTestId('control-palette.offset')).toContainText('Effective -1');
  await page.getByRole('button', { name: 'Release MIDI Palette offset' }).click();
  await expect(page.getByTestId('control-palette.offset')).toContainText('Effective 0.375');
  const savedSetup = await page.evaluate(() => JSON.parse(localStorage.getItem('fractal-explorer:performance-setup:v1')!));
  expect(savedSetup.schemaVersion).toBe(1);
  expect(savedSetup.bindings).toHaveLength(2);
  expect(JSON.stringify(savedSetup)).not.toContain('selectedId');
  expect(JSON.stringify(savedSetup)).not.toContain('renderConfig');

  await page.reload();
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  const restoredLauncher = page.getByRole('region', { name: 'Hydrasynth Explorer controller' });
  await expect(restoredLauncher).toContainText('Macro 1');
  await expect(restoredLauncher).toContainText('CC 126');
  await page.getByRole('button', { name: 'Open controller' }).click();
  await page.getByRole('tab', { name: 'Mappings' }).click();
  await expect(page.getByTestId('hydrasynth-mapping-zoom')).toContainText('Macro 1');
  await expect(page.getByTestId('hydrasynth-mapping-palette')).toContainText('CC 126');
  await page.getByText('Manage saved controller setup', { exact: true }).click();
  await expect(page.getByText('Saved locally · 2 mappings')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Arm zoom', exact: true })).toBeDisabled();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export setup JSON' }).click();
  const setupDownload = await downloadEvent;
  expect(setupDownload.suggestedFilename()).toBe('fractal-waypoints-controller-setup.json');
  const setupPath = await setupDownload.path();
  expect(setupPath).toBeTruthy();
  await page.getByRole('button', { name: 'Clear saved setup' }).click();
  await expect(page.getByTestId('hydrasynth-mapping-zoom')).toContainText('Unassigned');
  await page.getByLabel('Import controller setup JSON').setInputFiles(setupPath!);
  await expect(page.getByTestId('hydrasynth-mapping-zoom')).toContainText('Macro 1');
  await expect(page.getByTestId('hydrasynth-mapping-palette')).toContainText('CC 126');
  await expect(page.getByText('Imported and saved · 2 mappings')).toBeVisible();
});

test('noise smoothing is editable, time advances, and hidden-document handling holds the clock', async ({ page }, info) => {
  await open(page);
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  const mapping = page.getByRole('article', { name: 'Mapping 1', exact: true });
  await mapping.getByText('Source and transforms', { exact: true }).click();
  await mapping.getByRole('combobox', { name: 'Waveform', exact: true }).selectOption('noise');
  await mapping.getByRole('spinbutton', { name: 'Frequency (Hz)', exact: true }).fill('2');
  await mapping.getByRole('spinbutton', { name: /Smoothing window/ }).fill('0.5');
  await mapping.getByRole('spinbutton', { name: 'Noise seed', exact: true }).fill('37');
  await expect.poll(() => decodeRenderConfigFromUrlParam(new URL(page.url()).searchParams.get('view')!)?.modulationProgram?.sources[0].seed).toBe(37);
  const url = page.url();
  await page.getByRole('button', { name: 'Play internal motion' }).click();
  await expect.poll(async () => Number((await page.getByTestId('transport-time').textContent())!.split(' ')[0])).toBeGreaterThan(1);
  await expect(mapping).toContainText('active');
  // Exercise the browser visibility handler explicitly; not a claim of OS tab-switch QA.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: 'Resume motion' })).toBeVisible();
  const held = await page.getByTestId('transport-time').textContent();
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  expect(await page.getByTestId('transport-time').textContent()).toBe(held);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByRole('button', { name: 'Resume motion' })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: 'Edit in Explore' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Stop and edit base' })).toBeInViewport();
  await expect(page.getByTestId('main-canvas')).toBeInViewport();
  await visiblePrimary(page);
  await page.screenshot({ path: info.outputPath('perform-short-screen.png') });
  expect(page.url()).toBe(url);
});

test('Compare Right is never promoted and the Primary canvas survives workspace switches', async ({ page }) => {
  await open(page);
  await page.getByTestId('main-canvas').evaluate((canvas) => { canvas.dataset.continuity = 'same-primary'; });
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  const side = page.locator('.comparison-panel__side-card');
  await page.getByRole('button', { name: 'Edit Right', exact: true }).click();
  await side.getByLabel('Formula', { exact: true }).selectOption('newton');
  await page.getByRole('button', { name: /^Overlay Blend both/ }).click();
  await page.getByRole('button', { name: 'Right', exact: true }).click();
  await page.getByRole('button', { name: 'Open comparison' }).click();
  await expect(page.getByTestId('comparison-right-canvas')).toBeVisible();
  const url = page.url();
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  await expect(page.getByText('Performing: Primary · Phoenix', { exact: true })).toBeVisible();
  await expect(page.getByText(/Compare is preserved/)).toBeVisible();
  await expect(page.getByTestId('main-canvas')).toHaveAttribute('data-continuity', 'same-primary');
  await expect(page.getByTestId('comparison-right-canvas')).toBeHidden();
  await page.getByRole('button', { name: 'Play internal motion' }).click();
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause motion', exact: true })).toBeVisible();
  await expect(page.getByTestId('main-canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Stop and edit base' }).click();
  await expect(page.getByTestId('comparison-right-canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Right', exact: true })).toHaveClass('is-active');
  await expect(side.getByLabel('Formula', { exact: true })).toHaveValue('newton');
  expect(page.url()).toBe(url);
});

test('legacy motion stays unchanged until explicit conversion, and Journey shares the workspace transport', async ({ page }) => {
  const base = fixture(); delete base.modulationProgram;
  base.modulations = [{ id: 'saved-original', target: 'palette.offset', waveform: 'constant', frequencyHz: 1, amplitude: 0.25, phase: 0, offset: 0, enabled: true }];
  await open(page, base);
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  const url = page.url();
  await page.getByRole('button', { name: 'Play internal motion' }).click();
  await expect(page.getByTestId('control-palette.offset')).toContainText('Effective 0.375');
  await page.getByRole('button', { name: 'Stop and edit base' }).click();
  expect(page.url()).toBe(url);
  await page.getByRole('button', { name: 'Convert legacy motion for editing' }).click();
  const converted = decodeRenderConfigFromUrlParam(new URL(page.url()).searchParams.get('view')!)!;
  expect(converted.modulations).toEqual([]); expect(converted.modulationProgram?.schemaVersion).toBe(1);
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByRole('button', { name: 'Journey', exact: true }).click();
  await page.getByRole('button', { name: 'Play journey', exact: true }).click();
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  await expect(page.getByText(/Journey is playing its captured clip/)).toBeVisible();
  await page.getByRole('button', { name: 'Pause Journey', exact: true }).click();
  await expect(page.getByTestId('control-palette.offset')).toContainText('Effective 0.375');
  await page.getByRole('button', { name: 'Stop and edit base' }).click();
});
