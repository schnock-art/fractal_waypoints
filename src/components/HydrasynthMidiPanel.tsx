import { useEffect, useRef, useState } from 'react';
import { isHydrasynthInput, parseControlChange } from '../integrations/midi/controlChange';

interface BrowserMidiInput {
  id: string;
  name: string | null;
  state: 'connected' | 'disconnected';
  onmidimessage: ((event: { data: Uint8Array; timeStamp: number }) => void) | null;
}
interface BrowserMidiAccess {
  inputs: Map<string, BrowserMidiInput>;
  onstatechange: (() => void) | null;
}
type MidiNavigator = Navigator & { requestMIDIAccess?: () => Promise<BrowserMidiAccess> };

interface Props {
  active: boolean;
  onZoomDelta: (delta: number) => void;
  onRelease: () => void;
}

interface SeenControlChange {
  channel: number;
  controller: number;
  value: number;
}

export function HydrasynthMidiPanel({ active, onZoomDelta, onRelease }: Props) {
  const accessRef = useRef<BrowserMidiAccess | null>(null);
  const previousValueRef = useRef<number | null>(null);
  const callbacksRef = useRef({ onZoomDelta, onRelease, active, armed: false, learning: false, controller: null as number | null });
  callbacksRef.current = { onZoomDelta, onRelease, active, armed: callbacksRef.current.armed, learning: callbacksRef.current.learning, controller: callbacksRef.current.controller };
  const [inputs, setInputs] = useState<BrowserMidiInput[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [channel, setChannel] = useState<number | null>(null);
  const [controller, setController] = useState<number | null>(null);
  const [learning, setLearning] = useState(false);
  const [armed, setArmed] = useState(false);
  const [status, setStatus] = useState('Not connected. Browser permission is required before MIDI input is visible.');
  const [lastValue, setLastValue] = useState<number | null>(null);
  const [messages, setMessages] = useState<SeenControlChange[]>([]);

  callbacksRef.current = { onZoomDelta, onRelease, active, armed, learning, controller };
  const refreshInputs = () => {
    const next = [...(accessRef.current?.inputs.values() ?? [])].filter((input) => input.state === 'connected');
    setInputs(next);
    setSelectedId((current) => {
      if (current && next.some((input) => input.id === current)) return current;
      const preferred = next.find((input) => isHydrasynthInput(input.name ?? '')) ?? next[0];
      if (!preferred) {
        callbacksRef.current.onRelease();
        setArmed(false);
        setLearning(false);
        setChannel(null);
        setController(null);
        setMessages([]);
        setStatus('MIDI input disconnected. Temporary zoom was released safely.');
        return '';
      }
      return preferred.id;
    });
  };

  useEffect(() => () => {
    for (const input of accessRef.current?.inputs.values() ?? []) input.onmidimessage = null;
    if (accessRef.current) accessRef.current.onstatechange = null;
    callbacksRef.current.onRelease();
  }, []);

  useEffect(() => {
    const access = accessRef.current;
    if (!access) return;
    for (const input of access.inputs.values()) input.onmidimessage = null;
    const selected = access.inputs.get(selectedId);
    if (!selected) return;
    selected.onmidimessage = (event) => {
      const message = parseControlChange(event.data, event.timeStamp);
      if (!message) return;
      const current = callbacksRef.current;
      setLastValue(message.value);
      setMessages((previous) => [{ channel: message.channel, controller: message.controller, value: message.value }, ...previous].slice(0, 8));
      if (current.learning) {
        setStatus(`CC #${message.controller} on channel ${message.channel + 1} received. Choose its Assign button below.`);
        return;
      }
      if (current.armed && current.active && current.controller === message.controller && channel === message.channel) {
        const previous = previousValueRef.current;
        previousValueRef.current = message.value;
        if (previous !== null) current.onZoomDelta(message.value - previous);
      }
    };
    return () => { selected.onmidimessage = null; };
  }, [selectedId, channel, controller, learning, armed, active]);

  async function connect() {
    const request = (navigator as MidiNavigator).requestMIDIAccess;
    if (!request) {
      setStatus('Web MIDI is unavailable in this browser. Use a Chromium-based browser over HTTPS or localhost.');
      return;
    }
    try {
      accessRef.current = await request.call(navigator);
      accessRef.current.onstatechange = refreshInputs;
      refreshInputs();
      setStatus('MIDI access granted. Select the Focusrite input, then move a Hydrasynth knob to monitor its messages.');
    } catch {
      setStatus('MIDI permission was not granted. Connect the Explorer and allow MIDI access to try again.');
    }
  }

  const selected = inputs.find((input) => input.id === selectedId);
  const assigned = controller !== null && channel !== null;
  const assign = (message: SeenControlChange) => {
    setChannel(message.channel);
    setController(message.controller);
    previousValueRef.current = message.value;
    setLearning(false);
    setArmed(false);
    setStatus(`Zoom assigned to CC #${message.controller} · channel ${message.channel + 1}. Press Play, then Arm zoom control.`);
  };
  return <section aria-label="Hydrasynth Explorer MIDI" className="perform-card">
    <h3>Hydrasynth Explorer MIDI</h3>
    <p>Assign a Hydrasynth control to relative Primary zoom using the existing double-single navigation path. It never changes the authored configuration.</p>
    {!accessRef.current ? <button type="button" onClick={connect}>Connect Hydrasynth Explorer</button> : <label>Input
      <select aria-label="MIDI input" value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setChannel(null); setController(null); setMessages([]); setArmed(false); onRelease(); }}>
        <option value="">Select an input</option>
        {inputs.map((input) => <option key={input.id} value={input.id}>{input.name ?? 'Unnamed MIDI input'}</option>)}
      </select>
    </label>}
    {selected && !isHydrasynthInput(selected.name ?? '') ? <small>Selected input is not named Hydrasynth. You may still learn it deliberately.</small> : null}
    {accessRef.current && !inputs.length ? <small>No MIDI inputs are currently connected. Plug in the Explorer, then wait for it to appear.</small> : null}
    <div className="midi-assignment" data-testid="hydrasynth-assignment">
      <span className="control-panel__label">Zoom mapping</span>
      <strong>{assigned ? `CC #${controller} · Channel ${(channel ?? 0) + 1}` : 'Unassigned'}</strong>
      <small>{armed ? 'Armed · turning the assigned control navigates Primary.' : assigned ? 'Ready · press Play, then arm it.' : 'Move a knob, then assign one observed CC below.'}</small>
    </div>
    <section className="midi-monitor" aria-label="Live MIDI monitor">
      <div><span className="control-panel__label">Live MIDI monitor</span><small>{learning ? 'Listening: move a knob, then choose its CC.' : 'Turn a knob to confirm the Focusrite is receiving MIDI.'}</small></div>
      {!messages.length ? <p className="midi-monitor__empty">No control-change messages yet. On the Explorer, ensure Global/System MIDI parameter transmit is set to CC rather than Off or NRPN.</p> : <div className="midi-monitor__messages">
        {messages.map((message, index) => <button key={`${message.channel}-${message.controller}-${message.value}-${index}`} type="button" className={message.controller === controller && message.channel === channel ? 'is-assigned' : undefined} onClick={() => assign(message)}>
          <span>CC #{message.controller}</span><span>Ch {message.channel + 1}</span><strong>{message.value}/127</strong><small>{message.controller === controller && message.channel === channel ? 'Assigned to zoom' : 'Assign to zoom'}</small>
        </button>)}
      </div>}
    </section>
    <div className="perform-actions">
      <button type="button" disabled={!selectedId} aria-pressed={learning} onClick={() => { setLearning((current) => !current); setArmed(false); onRelease(); setStatus(learning ? 'CC learn paused. Pick a message from the monitor when ready.' : 'Listening for a control change. Turn a Hydrasynth knob.'); }}>{learning ? 'Stop CC learn' : 'Listen for a control'}</button>
      <button type="button" disabled={!assigned || !active} aria-pressed={armed} onClick={() => { setArmed((current) => !current); setStatus(armed ? 'Zoom control disarmed and released.' : `CC #${controller} · channel ${(channel ?? 0) + 1} armed for relative Primary zoom.`); if (armed) onRelease(); }}>{armed ? 'Disarm zoom control' : 'Arm zoom control'}</button>
      <button type="button" disabled={!armed && lastValue === null} onClick={() => { setArmed(false); onRelease(); setStatus('Zoom control released; authored view and internal motion remain unchanged.'); }}>Release zoom control</button>
    </div>
    <small role="status">{status}</small>
    <small>{controller === null ? 'No CC assigned yet.' : `Assigned CC #${controller}${lastValue === null ? '' : ` · latest input ${lastValue}/127`}.`} {armed && !active ? 'Press Play before MIDI can affect the view.' : ''}</small>
    <small>Live MIDI zoom is session-only in this first slice: it is not recorded into Journeys or exported. Disconnecting releases the temporary view.</small>
  </section>;
}
