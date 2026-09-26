import { useEffect, useRef, useState } from 'react';
import { isHydrasynthInput } from './controlChange';
import { addressKey, addressLabel, createControlInputDecoder, inputKey, type ControlInput } from './controlInput';
import { controlMaximum, findHydrasynthExplorerControl } from './hydrasynthExplorerProfile';
import { deriveRelativeNavigationIntent, ExternalControlFrameBuffer, rangeTransforms, routeExternalControl,
  type ExternalControlDiagnostics, type ExternalControlRelationship } from '../../connections/externalControl';
import { clearPerformanceControlSetup, createPerformanceControlSetup, downloadPerformanceControlSetup,
  importPerformanceControlSetup, loadPerformanceControlSetup, savePerformanceControlSetup,
  type PerformanceControlBinding, type PerformanceSetupRead } from '../../connections/performanceSetup';
import { clearPerformanceControlTake, createPerformanceControlTake, loadPerformanceControlTake, savePerformanceControlTake,
  type PerformanceControlTake, type PerformanceTakeRead, type RecordedExternalControlEvent } from '../../connections/performanceTake';

interface MidiInput { id: string; name: string | null; state: 'connected' | 'disconnected'; onmidimessage: ((event: { data: Uint8Array; timeStamp: number }) => void) | null }
interface MidiAccess { inputs: Map<string, MidiInput>; onstatechange: (() => void) | null }
export type MidiAssignmentTarget = 'zoom' | 'palette.offset';
type AssignmentInput = Pick<ControlInput, 'address' | 'channel'> & { target: MidiAssignmentTarget; minimum?: number; maximum?: number; inverted?: boolean; curve?: number; learned?: boolean };
export type MidiAssignment = AssignmentInput & { relationship: ExternalControlRelationship };
type Assignment = MidiAssignment;
type Assignments = Partial<Record<MidiAssignmentTarget, Assignment>>;
type ArmedTargets = Record<MidiAssignmentTarget, boolean>;
interface TakeRecording { startedAt: number; relationships: ExternalControlRelationship[]; events: RecordedExternalControlEvent[] }
interface TakeReplay { take: PerformanceControlTake; startedAt: number | null; eventIndex: number }
const targets: MidiAssignmentTarget[] = ['zoom', 'palette.offset'];
const unarmed = (): ArmedTargets => ({ zoom: false, 'palette.offset': false });

function assignmentFromBinding(binding: PerformanceControlBinding): Assignment {
  const source = binding.relationship.source;
  return binding.settings.kind === 'zoom'
    ? { address: source.address, channel: source.channel, target: 'zoom', learned: source.deviceProfileId === 'learned-midi-control', relationship: structuredClone(binding.relationship) }
    : { address: source.address, channel: source.channel, target: 'palette.offset', minimum: binding.settings.minimum,
      maximum: binding.settings.maximum, inverted: binding.settings.inverted, curve: binding.settings.curve,
      learned: source.deviceProfileId === 'learned-midi-control',
      relationship: structuredClone(binding.relationship) };
}

function assignmentsFromSetup(read: PerformanceSetupRead): Assignments {
  if (read.status !== 'loaded') return {};
  return Object.fromEntries(read.setup.bindings.map((binding) => [binding.target, assignmentFromBinding(binding)])) as Assignments;
}

function bindingFromAssignment(assignment: Assignment): PerformanceControlBinding {
  return { id: assignment.target, target: assignment.target, relationship: structuredClone(assignment.relationship),
    settings: assignment.target === 'zoom' ? { kind: 'zoom', mode: assignment.relationship.mapping.target.kind === 'navigation-intent'
      ? assignment.relationship.mapping.target.mode : 'continuous' }
      : { kind: 'range', minimum: assignment.minimum ?? -1, maximum: assignment.maximum ?? 1,
        inverted: assignment.inverted ?? false, curve: assignment.curve ?? 1 } };
}

export function useMidiControls(active: boolean, running: boolean, onZoomDelta: (delta: number) => void, onPaletteOffset: (value: number) => void, onRelease: (target?: MidiAssignmentTarget) => void) {
  const initialSetup = useRef<PerformanceSetupRead | null>(null);
  if (!initialSetup.current) initialSetup.current = loadPerformanceControlSetup();
  const initialAssignments = useRef<Assignments>(assignmentsFromSetup(initialSetup.current));
  const initialZoomMode = initialAssignments.current.zoom?.relationship.mapping.target.kind === 'navigation-intent'
    ? initialAssignments.current.zoom.relationship.mapping.target.mode : 'continuous';
  const initialTake = useRef<PerformanceTakeRead | null>(null);
  if (!initialTake.current) initialTake.current = loadPerformanceControlTake();
  const access = useRef<MidiAccess | null>(null);
  const callbacks = useRef({ active, running, onZoomDelta, onPaletteOffset, onRelease });
  callbacks.current = { active, running, onZoomDelta, onPaletteOffset, onRelease };
  const runtime = useRef({ selectedId: '', assignments: initialAssignments.current, armed: unarmed(), previous: null as number | null, mode: initialZoomMode, rate: 0, remainder: 0 });
  const frameBuffer = useRef(new ExternalControlFrameBuffer());
  const frameRequest = useRef<number | null>(null);
  const takeFrameRequest = useRef<number | null>(null);
  const recording = useRef<TakeRecording | null>(null);
  const replay = useRef<TakeReplay | null>(null);
  const [zoomMode, setZoomMode] = useState<'continuous' | 'turn'>(initialZoomMode);
  const [zoomRate, setZoomRate] = useState(0);
  const [inputs, setInputs] = useState<MidiInput[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [revision, setRevision] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const mounted = useRef(true);
  const [assignments, setAssignments] = useState<Assignments>(initialAssignments.current);
  const [armedTargets, setArmedTargets] = useState<ArmedTargets>(unarmed());
  const [messages, setMessages] = useState<ControlInput[]>([]);
  const [lastInput, setLastInput] = useState<ControlInput | null>(null);
  const [traffic, setTraffic] = useState('No MIDI received yet.');
  const [status, setStatus] = useState(initialSetup.current.status === 'loaded'
    ? `Loaded ${initialSetup.current.setup.bindings.length} saved mapping${initialSetup.current.setup.bindings.length === 1 ? '' : 's'}. Connect an input, then arm when ready.`
    : initialSetup.current.status === 'unsupported' ? initialSetup.current.message : 'Connect the Explorer or its MIDI interface to begin.');
  const [setupStatus, setSetupStatus] = useState(initialSetup.current.status === 'loaded'
    ? `Saved locally · ${initialSetup.current.setup.bindings.length} mapping${initialSetup.current.setup.bindings.length === 1 ? '' : 's'}`
    : initialSetup.current.message);
  const [diagnostics, setDiagnostics] = useState<ExternalControlDiagnostics>(frameBuffer.current.diagnostics());
  const [isRecordingTake, setIsRecordingTake] = useState(false);
  const [isReplayingTake, setIsReplayingTake] = useState(false);
  const [take, setTake] = useState<PerformanceControlTake | null>(initialTake.current.status === 'loaded' ? initialTake.current.take : null);
  const [takeStatus, setTakeStatus] = useState(initialTake.current.status === 'loaded'
    ? `Saved take · ${initialTake.current.take.events.length} samples · ${(initialTake.current.take.durationMs / 1000).toFixed(2)} s`
    : initialTake.current.message);
  const holdZoom = () => { runtime.current.rate = 0; runtime.current.remainder = 0; runtime.current.previous = null; setZoomRate(0); };
  const applyRelationshipSample = (relationship: ExternalControlRelationship, sample: { sourceId: string; value: number; timestamp: number }) => {
    const output = routeExternalControl(relationship, sample); if (!output) return;
    if (output.kind === 'semantic-value') callbacks.current.onPaletteOffset(output.value);
    else if (output.kind === 'navigation-rate') {
      if (!callbacks.current.running || document.hidden) return;
      if (Math.sign(output.value) !== Math.sign(runtime.current.rate)) runtime.current.remainder = 0;
      runtime.current.rate = output.value; setZoomRate(output.value);
    } else {
      const previous = runtime.current.previous; runtime.current.previous = output.value;
      const intent = deriveRelativeNavigationIntent(previous, output);
      if (intent) callbacks.current.onZoomDelta(intent.delta);
    }
  };
  const stopReplay = (message?: string) => {
    if (takeFrameRequest.current !== null) cancelAnimationFrame(takeFrameRequest.current);
    takeFrameRequest.current = null; replay.current = null; holdZoom(); setIsReplayingTake(false);
    if (message) setTakeStatus(message);
  };
  const stopRecordingTake = (reason?: string) => {
    const captured = recording.current; if (!captured) return;
    recording.current = null; setIsRecordingTake(false);
    const elapsed = Math.max(0, Math.round(performance.now() - captured.startedAt));
    const next = createPerformanceControlTake(captured.relationships, captured.events, elapsed);
    setTake(next); savePerformanceControlTake(next);
    setTakeStatus(reason ?? `Saved take · ${next.events.length} samples · ${(next.durationMs / 1000).toFixed(2)} s`);
  };
  const persistAssignments = (next: Assignments) => {
    const bindings = targets.flatMap((target) => next[target] ? [bindingFromAssignment(next[target]!)] : []);
    if (!bindings.length) { clearPerformanceControlSetup(); setSetupStatus('No controller setup saved yet.'); return; }
    const setup = createPerformanceControlSetup(bindings);
    setSetupStatus(savePerformanceControlSetup(setup)
      ? `Saved locally · ${bindings.length} mapping${bindings.length === 1 ? '' : 's'}` : 'Controller setup could not be saved in this browser.');
  };
  const createRelationship = (value: AssignmentInput, mode = runtime.current.mode): ExternalControlRelationship => {
    const profile = value.learned ? undefined : findHydrasynthExplorerControl(value.address);
    const maximum = controlMaximum(value.address);
    const sourceId = `hydrasynth-explorer:${profile?.id ?? 'learned'}:${addressKey(value.address)}:ch${value.channel + 1}`;
    return {
      source: { schemaVersion: 1, id: sourceId, kind: 'absolute-control', deviceProfileId: profile ? 'asm-hydrasynth-explorer-2.2' : 'learned-midi-control',
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
      persistAssignments(runtime.current.assignments);
    }
  };
  const releaseTarget = (target: MidiAssignmentTarget) => {
    if (target === 'zoom') holdZoom();
    runtime.current.armed[target] = false;
    setArmedTargets({ ...runtime.current.armed });
    callbacks.current.onRelease(target);
  };
  const release = () => { stopReplay(); stopRecordingTake('Recording stopped because the live controller session ended.'); holdZoom(); runtime.current.armed = unarmed(); frameBuffer.current.reset(); setArmedTargets(unarmed()); callbacks.current.onRelease(); };
  const selectInput = (id: string) => {
    release(); runtime.current.selectedId = id;
    setSelectedId(id); setMessages([]); setLastInput(null); setTraffic('No MIDI received yet.');
    setStatus(id ? `${Object.keys(runtime.current.assignments).length ? 'Input bound. Existing mappings were retained and are safely disarmed. ' : ''}Turn a control on the synth to identify it.` : 'Choose an input to continue. Existing mappings are retained but disarmed.');
  };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (frameRequest.current !== null) cancelAnimationFrame(frameRequest.current); stopReplay(); stopRecordingTake(); for (const input of access.current?.inputs.values() ?? []) input.onmidimessage = null; if (access.current) access.current.onstatechange = null; callbacks.current.onRelease(); };
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
          applyRelationshipSample(assignment.relationship, sample);
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
      const captured = recording.current;
      if (captured) {
        const atMs = Math.max(0, Math.round(value.timestamp - captured.startedAt));
        for (const sourceId of new Set(matching.map((assignment) => assignment.relationship.source.id))) {
          if (captured.events.length < 4096) captured.events.push({ atMs, sourceId, value: value.value });
        }
        if (captured.events.length >= 4096) stopRecordingTake('Saved take at the 4096-sample limit.');
      }
      for (const sourceId of new Set(matching.map((assignment) => assignment.relationship.source.id))) {
        frameBuffer.current.push({ sourceId, value: value.value, timestamp: value.timestamp });
      }
      const establishesTurnBaseline = runtime.current.previous === null && matching.some((assignment) => assignment.target === 'zoom'
        && assignment.relationship.mapping.target.kind === 'navigation-intent' && assignment.relationship.mapping.target.mode === 'turn');
      if (establishesTurnBaseline) {
        if (frameRequest.current !== null) cancelAnimationFrame(frameRequest.current);
        flush();
      } else if (matching.length && frameRequest.current === null) frameRequest.current = requestAnimationFrame(flush);
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
      const refresh = () => { const connected = [...next.inputs.values()].filter((input) => input.state === 'connected'); setInputs(connected); const selected = runtime.current.selectedId; if (selected && !connected.some((input) => input.id === selected)) { selectInput(''); setStatus('Selected input disconnected. Live controls released; saved mappings remain available for explicit rebind and re-arm.'); } setRevision((value) => value + 1); };
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
    persistAssignments(runtime.current.assignments);
    const targetLabel = value.target === 'zoom' ? 'Zoom' : 'Palette offset';
    setStatus(`${value.learned ? addressLabel(value.address) : findHydrasynthExplorerControl(value.address)?.label ?? addressLabel(value.address)} assigned to ${targetLabel} on channel ${value.channel + 1}. Arm it now; if Perform is stopped, it will begin with Play.`);
  };
  const toggleArm = (target: MidiAssignmentTarget) => {
    if (runtime.current.armed[target]) { releaseTarget(target); setStatus(`${target === 'zoom' ? 'Zoom' : 'Palette offset'} disarmed and released.`); return; }
    const assignment = runtime.current.assignments[target]; if (!assignment || !runtime.current.selectedId) return;
    if (target === 'zoom') holdZoom(); runtime.current.armed[target] = true; setArmedTargets({ ...runtime.current.armed });
    setStatus(target === 'palette.offset' ? `Palette offset armed.${callbacks.current.active ? ' Turn the assigned control to set its temporary effective value.' : ' It will become live when you press Play.'}` : runtime.current.mode === 'continuous' ? `Zoom armed.${callbacks.current.active ? ' Turn above centre to keep zooming in, below centre to zoom out. Centre or Hold zoom stops motion.' : ' It will become live when you press Play.'}` : `Zoom armed.${callbacks.current.active ? ' First value establishes the position; further turns move Primary.' : ' It will become live when you press Play.'}`);
  };
  const startRecordingTake = () => {
    if (!callbacks.current.active || !callbacks.current.running) { setTakeStatus('Press Play, arm at least one mapping, then start recording.'); return false; }
    const relationships = targets.flatMap((target) => {
      const assignment = runtime.current.assignments[target];
      return assignment && runtime.current.armed[target] ? [structuredClone(assignment.relationship)] : [];
    });
    if (!relationships.length) { setTakeStatus('Arm at least one mapping before recording a take.'); return false; }
    stopReplay(); recording.current = { startedAt: performance.now(), relationships, events: [] }; setIsRecordingTake(true);
    setTakeStatus(`Recording ${relationships.length} mapped source${relationships.length === 1 ? '' : 's'}…`); return true;
  };
  const replayTake = () => {
    if (!take) { setTakeStatus('Record or import a take before replaying.'); return false; }
    if (!callbacks.current.active || !callbacks.current.running) { setTakeStatus('Press Play before replaying the saved take.'); return false; }
    stopRecordingTake(); releaseTarget('zoom'); releaseTarget('palette.offset');
    const current: TakeReplay = { take: structuredClone(take), startedAt: null, eventIndex: 0 }; replay.current = current; setIsReplayingTake(true);
    const bySource = new Map(current.take.relationships.map((relationship) => [relationship.source.id, relationship]));
    const tick = (timestamp: number) => {
      if (replay.current !== current) return;
      current.startedAt ??= timestamp;
      const elapsed = Math.min(current.take.durationMs, Math.max(0, Math.round(timestamp - current.startedAt)));
      while (current.eventIndex < current.take.events.length && current.take.events[current.eventIndex].atMs <= elapsed) {
        const event = current.take.events[current.eventIndex++]; const relationship = bySource.get(event.sourceId);
        if (relationship) applyRelationshipSample(relationship, { sourceId: event.sourceId, value: event.value, timestamp: event.atMs });
      }
      if (elapsed >= current.take.durationMs) {
        stopReplay(`Replay complete · ${current.take.events.length} samples · ${(current.take.durationMs / 1000).toFixed(2)} s`);
        callbacks.current.onRelease(); return;
      }
      takeFrameRequest.current = requestAnimationFrame(tick);
    };
    takeFrameRequest.current = requestAnimationFrame(tick); setTakeStatus(`Replaying saved take · ${take.events.length} samples…`); return true;
  };
  const clearTake = () => { stopReplay(); stopRecordingTake(); setTake(null); clearPerformanceControlTake(); setTakeStatus('No recorded take saved yet.'); };
  const clearSetup = () => {
    release(); runtime.current.assignments = {}; setAssignments({}); clearPerformanceControlSetup();
    setSetupStatus('No controller setup saved yet.'); setStatus('Saved controller setup cleared. Connect an input to create a new one.');
  };
  const importSetup = (json: string) => {
    const result = importPerformanceControlSetup(json);
    if (result.status !== 'loaded') { setSetupStatus(result.message); return false; }
    release(); const next = assignmentsFromSetup(result); runtime.current.assignments = next; setAssignments(next);
    const mode = next.zoom?.relationship.mapping.target.kind === 'navigation-intent' ? next.zoom.relationship.mapping.target.mode : 'continuous';
    runtime.current.mode = mode; setZoomMode(mode); savePerformanceControlSetup(result.setup);
    setSetupStatus(`Imported and saved · ${result.setup.bindings.length} mapping${result.setup.bindings.length === 1 ? '' : 's'}`);
    setStatus('Controller setup imported. Select an equivalent input and arm the mappings when ready.'); return true;
  };
  const exportSetup = () => {
    const bindings = targets.flatMap((target) => runtime.current.assignments[target] ? [bindingFromAssignment(runtime.current.assignments[target]!)] : []);
    if (!bindings.length) return false;
    downloadPerformanceControlSetup(createPerformanceControlSetup(bindings)); setSetupStatus('Controller setup exported as JSON.'); return true;
  };
  return { inputs, selectedId, connected: access.current !== null, connecting, connect, selectInput, assignments, assign, armedTargets, isArmed: (target: MidiAssignmentTarget) => armedTargets[target], toggleArm, release, releaseTarget, messages, lastInput, traffic, status, diagnostics, setupStatus, clearSetup, importSetup, exportSetup, zoomMode, changeZoomMode, zoomRate, holdZoom, take, takeStatus, isRecordingTake, isReplayingTake, startRecordingTake, stopRecordingTake, replayTake, clearTake };
}

export type MidiControlsApi = ReturnType<typeof useMidiControls>;
