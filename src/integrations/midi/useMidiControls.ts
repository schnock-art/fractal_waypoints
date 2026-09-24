import { useEffect, useRef, useState } from 'react';
import { isHydrasynthInput } from './controlChange';
import { addressLabel, controlRangeValue, controlZoomPosition, controlZoomRate, createControlInputDecoder, inputKey, type ControlInput } from './controlInput';
import { controlMaximum, findHydrasynthExplorerControl } from './hydrasynthExplorerProfile';

interface MidiInput {
  id: string; name: string | null; state: 'connected' | 'disconnected';
  onmidimessage: ((event: { data: Uint8Array; timeStamp: number }) => void) | null;
}
interface MidiAccess { inputs: Map<string, MidiInput>; onstatechange: (() => void) | null }
export type MidiAssignmentTarget = 'zoom' | 'palette.offset';
type Assignment = Pick<ControlInput, 'address' | 'channel'> & { target: MidiAssignmentTarget; minimum?: number; maximum?: number; inverted?: boolean };
export function useMidiControls(active: boolean, running: boolean, onZoomDelta: (delta: number) => void, onPaletteOffset: (value: number) => void, onRelease: () => void) {
  const access = useRef<MidiAccess | null>(null);
  const callbacks = useRef({ active, running, onZoomDelta, onPaletteOffset, onRelease });
  callbacks.current = { active, running, onZoomDelta, onPaletteOffset, onRelease };
  const runtime = useRef({ selectedId: '', armed: false, assignment: null as Assignment | null, previous: null as number | null, mode: 'continuous' as 'continuous' | 'turn', rate: 0, remainder: 0 });
  const [zoomMode, setZoomMode] = useState<'continuous' | 'turn'>('continuous');
  const [zoomRate, setZoomRate] = useState(0);
  const [inputs, setInputs] = useState<MidiInput[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [revision, setRevision] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const mounted = useRef(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [armed, setArmed] = useState(false);
  const [messages, setMessages] = useState<ControlInput[]>([]);
  const [lastInput, setLastInput] = useState<ControlInput | null>(null);
  const [traffic, setTraffic] = useState('No MIDI received yet.');
  const [status, setStatus] = useState('Connect the Explorer or its MIDI interface to begin.');
  const holdZoom = () => {
    runtime.current.rate = 0;
    runtime.current.remainder = 0;
    runtime.current.previous = null;
    setZoomRate(0);
  };
  const changeZoomMode = (mode: 'continuous' | 'turn') => {
    holdZoom();
    runtime.current.mode = mode;
    setZoomMode(mode);
  };
  const release = () => {
    holdZoom();
    runtime.current.armed = false;
    runtime.current.previous = null;
    setArmed(false);
    callbacks.current.onRelease();
  };
  const selectInput = (id: string) => {
    release();
    runtime.current.selectedId = id;
    runtime.current.assignment = null;
    setSelectedId(id); setAssignment(null); setMessages([]); setLastInput(null);
    setTraffic('No MIDI received yet.');
    setStatus(id ? 'Turn a control on the synth to identify it.' : 'Choose an input to continue.');
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const input of access.current?.inputs.values() ?? []) input.onmidimessage = null;
      if (access.current) access.current.onstatechange = null;
      callbacks.current.onRelease();
    };
  }, []);
  useEffect(() => { if (!active) release(); }, [active]);
  useEffect(() => {
    holdZoom();
    if (!running) return;
    let frame = 0;
    let previousTime: number | null = null;
    const tick = (now: number) => {
      const elapsed = previousTime === null ? 0 : Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
      previousTime = now;
      const current = runtime.current;
      if (current.armed && callbacks.current.active && callbacks.current.running && current.mode === 'continuous' && !document.hidden) {
        // Existing zoom intents use one hundredth of a navigation second per step.
        current.remainder += current.rate * elapsed * 100;
        const steps = Math.trunc(current.remainder);
        current.remainder -= steps;
        if (steps !== 0) callbacks.current.onZoomDelta(steps);
      }
      frame = requestAnimationFrame(tick);
    };
    const hide = () => { if (document.hidden) holdZoom(); };
    frame = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('blur', holdZoom);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('blur', holdZoom);
      holdZoom();
    };
  }, [running]);
  useEffect(() => {
    const input = access.current?.inputs.get(selectedId);
    if (!input) return;
    const decode = createControlInputDecoder();
    input.onmidimessage = (event) => {
      const value = decode(event.data, event.timeStamp);
      if (!value) {
        if (event.data[0] >= 0xb0 && event.data[0] <= 0xbf && [99, 98, 6, 38].includes(event.data[1])) setTraffic('NRPN traffic received; waiting for a complete parameter value.');
        else if (event.data[0] < 0xf0) setTraffic('MIDI received (notes, pressure or pitch). Turn a parameter knob; check Param TX if no control values arrive.');
        return;
      }
      const profile = findHydrasynthExplorerControl(value.address);
      setTraffic(`${profile?.label ?? addressLabel(value.address)} · ${addressLabel(value.address)} · Ch ${value.channel + 1} · value ${value.value}`);
      setLastInput(value);
      setMessages((previous) => [value, ...previous.filter((entry) => inputKey(entry) !== inputKey(value))].slice(0, 32));
      const current = runtime.current;
      if (!current.armed || !callbacks.current.active || !current.assignment || inputKey(current.assignment) !== inputKey(value)) return;
      if (current.assignment.target === 'palette.offset') {
        const mapped = controlRangeValue(value.value, controlMaximum(value.address), current.assignment.minimum ?? -1, current.assignment.maximum ?? 1, current.assignment.inverted);
        if (mapped !== null) callbacks.current.onPaletteOffset(mapped);
        return;
      }
      if (current.mode === 'continuous') {
        if (!callbacks.current.running || document.hidden) return;
        const rate = controlZoomRate(value.value, controlMaximum(value.address));
        if (Math.sign(rate) !== Math.sign(current.rate)) current.remainder = 0;
        current.rate = rate;
        setZoomRate(current.rate);
        return;
      }
      const position = controlZoomPosition(value.value, controlMaximum(value.address));
      const previous = current.previous;
      current.previous = position;
      if (previous !== null && position !== previous) callbacks.current.onZoomDelta(position - previous);
    };
    return () => { input.onmidimessage = null; };
  }, [selectedId, revision]);
  async function connect() {
    if (connecting) return;
    const request = (navigator as Navigator & { requestMIDIAccess?: () => Promise<MidiAccess> }).requestMIDIAccess;
    if (!request) { setStatus('Web MIDI requires a supported browser over HTTPS or localhost.'); return; }
    setConnecting(true);
    try {
      const next = await request.call(navigator);
      if (!mounted.current) return;
      access.current = next;
      const refresh = () => {
        const connected = [...next.inputs.values()].filter((input) => input.state === 'connected');
        setInputs(connected);
        const selected = runtime.current.selectedId;
        if (selected && !connected.some((input) => input.id === selected)) {
          selectInput('');
          setStatus('Selected input disconnected. Zoom released; select an input and assign again.');
        }
        setRevision((value) => value + 1);
      };
      next.onstatechange = refresh;
      refresh();
      const connected = [...next.inputs.values()].filter((input) => input.state === 'connected');
      const preferred = connected.find((input) => isHydrasynthInput(input.name ?? '')) ?? connected[0];
      if (preferred) selectInput(preferred.id);
      else setStatus('No MIDI inputs connected. Plug in the Explorer or its MIDI interface, then select the input.');
    } catch { if (mounted.current) setStatus('MIDI permission was not granted. Allow MIDI access to connect.'); }
    finally { if (mounted.current) setConnecting(false); }
  }
  const assign = (value: Assignment) => {
    release();
    runtime.current.assignment = value;
    setAssignment(value);
    const targetLabel = value.target === 'zoom' ? 'zoom' : 'Palette offset';
    setStatus(`${findHydrasynthExplorerControl(value.address)?.label ?? addressLabel(value.address)} assigned to ${targetLabel} on channel ${value.channel + 1}. ${active ? 'Arm when ready.' : 'Close this editor and press Play, then return to arm.'}`);
  };
  const toggleArm = () => {
    if (runtime.current.armed) { release(); setStatus('Zoom disarmed and released.'); return; }
    if (!runtime.current.assignment || !runtime.current.selectedId || !callbacks.current.active) return;
    runtime.current.previous = null;
    runtime.current.armed = true;
    setArmed(true);
    holdZoom();
    setStatus(runtime.current.assignment.target === 'palette.offset'
      ? 'Armed. Turn the knob to set the temporary Palette offset. Release or Stop restores the evaluated value.'
      : runtime.current.mode === 'continuous'
      ? 'Armed. Turn above centre to keep zooming in, below centre to zoom out. Centre or Hold zoom stops motion. Close this editor to see the view.'
      : 'Armed. First value establishes the position; further turns move Primary. Close this editor to see the view.');
  };
  return { inputs, selectedId, connected: access.current !== null, connecting, connect, selectInput, assignment, assign, armed, toggleArm, release, messages, lastInput, traffic, status, zoomMode, changeZoomMode, zoomRate, holdZoom };
}
