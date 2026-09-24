import { useEffect, useRef, useState } from 'react';
import { isHydrasynthInput } from './controlChange';
import { addressKey, addressLabel, createControlInputDecoder, inputKey, type ControlInput } from './controlInput';
import { controlMaximum, findHydrasynthExplorerControl } from './hydrasynthExplorerProfile';
import { deriveRelativeNavigationIntent, ExternalControlFrameBuffer, rangeTransforms, routeExternalControl,
  type ExternalControlDiagnostics, type ExternalControlRelationship } from '../../connections/externalControl';

interface MidiInput { id: string; name: string | null; state: 'connected' | 'disconnected'; onmidimessage: ((event: { data: Uint8Array; timeStamp: number }) => void) | null }
interface MidiAccess { inputs: Map<string, MidiInput>; onstatechange: (() => void) | null }
export type MidiAssignmentTarget = 'zoom' | 'palette.offset';
type AssignmentInput = Pick<ControlInput, 'address' | 'channel'> & { target: MidiAssignmentTarget; minimum?: number; maximum?: number; inverted?: boolean; curve?: number };
export type MidiAssignment = AssignmentInput & { relationship: ExternalControlRelationship };
type Assignment = MidiAssignment;
type Assignments = Partial<Record<MidiAssignmentTarget, Assignment>>;
type ArmedTargets = Record<MidiAssignmentTarget, boolean>;
const targets: MidiAssignmentTarget[] = ['zoom', 'palette.offset'];
const unarmed = (): ArmedTargets => ({ zoom: false, 'palette.offset': false });

export function useMidiControls(active: boolean, running: boolean, onZoomDelta: (delta: number) => void, onPaletteOffset: (value: number) => void, onRelease: (target?: MidiAssignmentTarget) => void) {
  const access = useRef<MidiAccess | null>(null);
  const callbacks = useRef({ active, running, onZoomDelta, onPaletteOffset, onRelease });
  callbacks.current = { active, running, onZoomDelta, onPaletteOffset, onRelease };
  const runtime = useRef({ selectedId: '', assignments: {} as Assignments, armed: unarmed(), previous: null as number | null, mode: 'continuous' as 'continuous' | 'turn', rate: 0, remainder: 0 });
  const frameBuffer = useRef(new ExternalControlFrameBuffer());
  const frameRequest = useRef<number | null>(null);
  const [zoomMode, setZoomMode] = useState<'continuous' | 'turn'>('continuous');
  const [zoomRate, setZoomRate] = useState(0);
  const [inputs, setInputs] = useState<MidiInput[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [revision, setRevision] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const mounted = useRef(true);
  const [assignments, setAssignments] = useState<Assignments>({});
  const [armedTargets, setArmedTargets] = useState<ArmedTargets>(unarmed());
  const [messages, setMessages] = useState<ControlInput[]>([]);
  const [lastInput, setLastInput] = useState<ControlInput | null>(null);
  const [traffic, setTraffic] = useState('No MIDI received yet.');
  const [status, setStatus] = useState('Connect the Explorer or its MIDI interface to begin.');
  const [diagnostics, setDiagnostics] = useState<ExternalControlDiagnostics>(frameBuffer.current.diagnostics());
  const holdZoom = () => { runtime.current.rate = 0; runtime.current.remainder = 0; runtime.current.previous = null; setZoomRate(0); };
  const createRelationship = (value: AssignmentInput, mode = runtime.current.mode): ExternalControlRelationship => {
    const profile = findHydrasynthExplorerControl(value.address);
    const maximum = controlMaximum(value.address);
    const sourceId = `hydrasynth-explorer:${profile?.id ?? 'learned'}:${addressKey(value.address)}:ch${value.channel + 1}`;
    return {
      source: { schemaVersion: 1, id: sourceId, kind: 'absolute-control', deviceProfileId: 'asm-hydrasynth-explorer-2.2',
        controlId: profile?.id ?? addressKey(value.address), address: value.address, channel: value.channel, minimum: 0, maximum },
      mapping: { schemaVersion: 1, id: `${value.target}:${sourceId}`, sourceId, enabled: true,
        target: value.target === 'palette.offset' ? { kind: 'semantic-parameter', id: value.target }
          : { kind: 'navigation-intent', id: 'zoom', mode },
        transforms: value.target === 'palette.offset'
          ? rangeTransforms(0, maximum, value.minimum ?? -1, value.maximum ?? 1, value.inverted, value.curve ?? 1)
          : rangeTransforms(0, maximum, mode === 'continuous' ? -1 : 0, mode === 'continuous' ? 1 : 127),
      },
    };
  };
  const changeZoomMode = (mode: 'continuous' | 'turn') => {
    holdZoom(); runtime.current.mode = mode; setZoomMode(mode);
    const assignment = runtime.current.assignments.zoom;
    if (assignment) {
      runtime.current.assignments = { ...runtime.current.assignments, zoom: { ...assignment, relationship: createRelationship(assignment, mode) } };
      setAssignments({ ...runtime.current.assignments });
    }
  };
  const releaseTarget = (target: MidiAssignmentTarget) => {
    if (target === 'zoom') holdZoom();
    runtime.current.armed[target] = false;
    setArmedTargets({ ...runtime.current.armed });
    callbacks.current.onRelease(target);
  };
  const release = () => { holdZoom(); runtime.current.armed = unarmed(); frameBuffer.current.reset(); setArmedTargets(unarmed()); callbacks.current.onRelease(); };
  const selectInput = (id: string) => {
    release(); runtime.current.selectedId = id;
    setSelectedId(id); setMessages([]); setLastInput(null); setTraffic('No MIDI received yet.');
    setStatus(id ? `${Object.keys(runtime.current.assignments).length ? 'Input bound. Existing mappings were retained and are safely disarmed. ' : ''}Turn a control on the synth to identify it.` : 'Choose an input to continue. Existing mappings are retained but disarmed.');
  };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (frameRequest.current !== null) cancelAnimationFrame(frameRequest.current); for (const input of access.current?.inputs.values() ?? []) input.onmidimessage = null; if (access.current) access.current.onstatechange = null; callbacks.current.onRelease(); };
  }, []);
  useEffect(() => { if (!active) release(); }, [active]);
  useEffect(() => {
    holdZoom(); if (!running) return;
    let frame = 0; let previousTime: number | null = null;
    const tick = (now: number) => {
      const elapsed = previousTime === null ? 0 : Math.min(0.05, Math.max(0, (now - previousTime) / 1000)); previousTime = now;
      const current = runtime.current;
      if (current.armed.zoom && current.assignments.zoom && callbacks.current.active && callbacks.current.running && current.mode === 'continuous' && !document.hidden) {
        current.remainder += current.rate * elapsed * 100;
        const steps = Math.trunc(current.remainder); current.remainder -= steps;
        if (steps !== 0) callbacks.current.onZoomDelta(steps);
      }
      frame = requestAnimationFrame(tick);
    };
    const hide = () => { if (document.hidden) holdZoom(); };
    frame = requestAnimationFrame(tick); document.addEventListener('visibilitychange', hide); window.addEventListener('blur', holdZoom);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', hide); window.removeEventListener('blur', holdZoom); holdZoom(); };
  }, [running]);
  useEffect(() => {
    const input = access.current?.inputs.get(selectedId); if (!input) return;
    const decode = createControlInputDecoder();
    const flush = () => {
      frameRequest.current = null;
      for (const sample of frameBuffer.current.drain()) {
        for (const target of targets) {
          const assignment = runtime.current.assignments[target];
          if (!runtime.current.armed[target] || !assignment || assignment.relationship.source.id !== sample.sourceId) continue;
          const output = routeExternalControl(assignment.relationship, sample); if (!output) continue;
          if (output.kind === 'semantic-value') callbacks.current.onPaletteOffset(output.value);
          else if (output.kind === 'navigation-rate') {
            if (!callbacks.current.running || document.hidden) continue;
            if (Math.sign(output.value) !== Math.sign(runtime.current.rate)) runtime.current.remainder = 0;
            runtime.current.rate = output.value; setZoomRate(output.value);
          } else {
            const previous = runtime.current.previous; runtime.current.previous = output.value;
            const intent = deriveRelativeNavigationIntent(previous, output);
            if (intent) callbacks.current.onZoomDelta(intent.delta);
          }
        }
      }
      setDiagnostics(frameBuffer.current.diagnostics());
    };
    input.onmidimessage = (event) => {
      const value = decode(event.data, event.timeStamp);
      if (!value) { if (event.data[0] >= 0xb0 && event.data[0] <= 0xbf && [99, 98, 6, 38].includes(event.data[1])) setTraffic('NRPN traffic received; waiting for a complete parameter value.'); else if (event.data[0] < 0xf0) setTraffic('MIDI received (notes, pressure or pitch). Turn a parameter knob; check Param TX if no control values arrive.'); return; }
      const profile = findHydrasynthExplorerControl(value.address);
      setTraffic(`${profile?.label ?? addressLabel(value.address)} · ${addressLabel(value.address)} · Ch ${value.channel + 1} · value ${value.value}`);
      setLastInput(value); setMessages((previous) => [value, ...previous.filter((entry) => inputKey(entry) !== inputKey(value))].slice(0, 32));
      const current = runtime.current; if (!callbacks.current.active) return;
      const matching = targets.map((target) => current.assignments[target]).filter((assignment): assignment is Assignment => !!assignment
        && current.armed[assignment.target] && inputKey(assignment) === inputKey(value));
      for (const sourceId of new Set(matching.map((assignment) => assignment.relationship.source.id))) {
        frameBuffer.current.push({ sourceId, value: value.value, timestamp: value.timestamp });
      }
      if (matching.length && frameRequest.current === null) frameRequest.current = requestAnimationFrame(flush);
    };
    return () => { input.onmidimessage = null; };
  }, [selectedId, revision]);
  async function connect() {
    if (connecting) return;
    const request = (navigator as Navigator & { requestMIDIAccess?: () => Promise<MidiAccess> }).requestMIDIAccess;
    if (!request) { setStatus('Web MIDI requires a supported browser over HTTPS or localhost.'); return; }
    setConnecting(true);
    try {
      const next = await request.call(navigator); if (!mounted.current) return; access.current = next;
      const refresh = () => { const connected = [...next.inputs.values()].filter((input) => input.state === 'connected'); setInputs(connected); const selected = runtime.current.selectedId; if (selected && !connected.some((input) => input.id === selected)) { selectInput(''); setStatus('Selected input disconnected. Live controls released; select an input and assign again.'); } setRevision((value) => value + 1); };
      next.onstatechange = refresh; refresh();
      const connected = [...next.inputs.values()].filter((input) => input.state === 'connected'); const preferred = connected.find((input) => isHydrasynthInput(input.name ?? '')) ?? connected[0];
      if (preferred) selectInput(preferred.id); else setStatus('No MIDI inputs connected. Plug in the Explorer or its MIDI interface, then select the input.');
    } catch { if (mounted.current) setStatus('MIDI permission was not granted. Allow MIDI access to connect.'); }
    finally { if (mounted.current) setConnecting(false); }
  }
  const assign = (value: AssignmentInput) => {
    releaseTarget(value.target);
    const assignment: Assignment = { ...value, relationship: createRelationship(value) };
    runtime.current.assignments = { ...runtime.current.assignments, [value.target]: assignment }; setAssignments({ ...runtime.current.assignments });
    const targetLabel = value.target === 'zoom' ? 'Zoom' : 'Palette offset';
    setStatus(`${findHydrasynthExplorerControl(value.address)?.label ?? addressLabel(value.address)} assigned to ${targetLabel} on channel ${value.channel + 1}. Arm it now; if Perform is stopped, it will begin with Play.`);
  };
  const toggleArm = (target: MidiAssignmentTarget) => {
    if (runtime.current.armed[target]) { releaseTarget(target); setStatus(`${target === 'zoom' ? 'Zoom' : 'Palette offset'} disarmed and released.`); return; }
    const assignment = runtime.current.assignments[target]; if (!assignment || !runtime.current.selectedId) return;
    if (target === 'zoom') holdZoom(); runtime.current.armed[target] = true; setArmedTargets({ ...runtime.current.armed });
    setStatus(target === 'palette.offset' ? `Palette offset armed.${callbacks.current.active ? ' Turn the assigned control to set its temporary effective value.' : ' It will become live when you press Play.'}` : runtime.current.mode === 'continuous' ? `Zoom armed.${callbacks.current.active ? ' Turn above centre to keep zooming in, below centre to zoom out. Centre or Hold zoom stops motion.' : ' It will become live when you press Play.'}` : `Zoom armed.${callbacks.current.active ? ' First value establishes the position; further turns move Primary.' : ' It will become live when you press Play.'}`);
  };
  return { inputs, selectedId, connected: access.current !== null, connecting, connect, selectInput, assignments, assign, armedTargets, isArmed: (target: MidiAssignmentTarget) => armedTargets[target], toggleArm, release, releaseTarget, messages, lastInput, traffic, status, diagnostics, zoomMode, changeZoomMode, zoomRate, holdZoom };
}
