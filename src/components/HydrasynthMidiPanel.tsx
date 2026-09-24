import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addressLabel, inputKey, type ControlAddress } from '../integrations/midi/controlInput';
import { explorerManualUrl, findHydrasynthExplorerControl, hydrasynthControlGroups, hydrasynthExplorerControls } from '../integrations/midi/hydrasynthExplorerProfile';
import { useMidiControls, type MidiAssignmentTarget } from '../integrations/midi/useMidiControls';

interface Props { active: boolean; running: boolean; onZoomDelta: (delta: number) => void; onPaletteOffset: (value: number) => void; onRelease: () => void }
export function HydrasynthMidiPanel({ active, running, onZoomDelta, onPaletteOffset, onRelease }: Props) {
  const midi = useMidiControls(active, running, onZoomDelta, onPaletteOffset, onRelease);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [group, setGroup] = useState('Macros');
  const [search, setSearch] = useState('');
  const [selectedControlId, setSelectedControlId] = useState('macro.1');
  const [channel, setChannel] = useState(0);
  const [format, setFormat] = useState<'midi-cc' | 'midi-nrpn'>('midi-cc');
  const [target, setTarget] = useState<MidiAssignmentTarget>('zoom');
  const [minimum, setMinimum] = useState(-1);
  const [maximum, setMaximum] = useState(1);
  const [inverted, setInverted] = useState(false);
  const selectedControl = hydrasynthExplorerControls.find((control) => control.id === selectedControlId)!;
  const selectedAddress: ControlAddress | null = format === 'midi-cc' ? selectedControl.protocol
    : selectedControl.nrpn ? { protocol: 'midi-nrpn', parameter: selectedControl.nrpn.parameter } : null;
  const selected = midi.inputs.find((input) => input.id === midi.selectedId);
  const connectionLabel = selected?.name ?? (midi.connected ? 'Choose an input' : 'Not connected');
  const mappedControl = midi.assignment ? findHydrasynthExplorerControl(midi.assignment.address) : undefined;
  const lastControl = midi.lastInput ? findHydrasynthExplorerControl(midi.lastInput.address) : undefined;
  const visible = hydrasynthExplorerControls.filter((control) => search
    ? `${control.label} ${control.group} ${control.protocol.controller}`.toLowerCase().includes(search.toLowerCase())
    : control.group === group);
  const close = () => { setExpanded(false); requestAnimationFrame(() => launcherRef.current?.focus()); };
  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const elements = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, summary, a[href]') ?? [])].filter((element) => element.getClientRects().length > 0);
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keys);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keys); };
  }, [expanded]);
  const selectLast = () => {
    if (!midi.lastInput || !lastControl) return;
    setSelectedControlId(lastControl.id); setGroup(lastControl.group); setSearch('');
    setChannel(midi.lastInput.channel); setFormat(midi.lastInput.address.protocol);
  };
  return <>
    <section aria-label="Hydrasynth Explorer controller" className="perform-card hydrasynth-launcher">
      <div className="hydrasynth-launcher__heading">
        <div><span className="control-panel__label">Controller</span><h3>Hydrasynth Explorer</h3></div>
        <span className={`hydrasynth-launcher__state${midi.selectedId ? ' is-connected' : ''}`}>{midi.selectedId ? 'Connected' : 'Setup required'}</span>
      </div>
      <div className="hydrasynth-launcher__summary">
        <span><small>Input</small><strong>{connectionLabel}</strong></span>
        <span><small>{midi.assignment?.target === 'palette.offset' ? 'Palette offset' : 'Zoom'}</small><strong>{mappedControl?.label ?? (midi.assignment ? addressLabel(midi.assignment.address) : 'Unassigned')}{midi.armed ? ' · Armed' : ''}</strong></span>
      </div>
      <button ref={launcherRef} type="button" aria-haspopup="dialog" aria-expanded={expanded} onClick={() => setExpanded(true)}>Open Hydrasynth controls</button>
      {midi.armed ? <>
        {midi.assignment?.target === 'zoom' && midi.zoomMode === 'continuous' ? <><small>{midi.zoomRate === 0 ? 'Zoom held · turn the knob to move' : `Zooming ${midi.zoomRate > 0 ? 'in' : 'out'} · ${Math.round(Math.abs(midi.zoomRate) * 100)}% speed`}</small><button type="button" onClick={midi.holdZoom}>Hold zoom</button></> : null}
        <button type="button" onClick={midi.release}>Release MIDI control</button>
      </> : null}
    </section>
    {expanded ? createPortal(<div className="hydrasynth-dialog-layer">
      <button type="button" tabIndex={-1} className="hydrasynth-dialog__backdrop" aria-label="Close Hydrasynth controls" onClick={close} />
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="hydrasynth-dialog-title" className="hydrasynth-dialog">
        <header className="hydrasynth-dialog__header">
          <div><span className="control-panel__label">Physical controller</span><h2 id="hydrasynth-dialog-title">Hydrasynth Explorer controls</h2><p>Select a control, assign it to a live target, then arm it while Perform is playing.</p></div>
          <button ref={closeRef} type="button" onClick={close}>Close</button>
        </header>
        <div className="hydrasynth-dialog__connection">
          {!midi.connected ? <button type="button" disabled={midi.connecting} onClick={midi.connect}>{midi.connecting ? 'Connecting…' : 'Connect Hydrasynth Explorer'}</button> : <label>Input
            <select aria-label="MIDI input" value={midi.selectedId} onChange={(event) => midi.selectInput(event.target.value)}>
              <option value="">Select an input</option>
              {midi.inputs.map((input) => <option key={input.id} value={input.id}>{input.name ?? 'Unnamed MIDI input'}</option>)}
            </select>
          </label>}
          <div><span className="control-panel__label">Incoming activity</span><small data-testid="hydrasynth-traffic">{midi.traffic}</small></div>
        </div>
        <details className="hydrasynth-setup">
          <summary>Hardware setup · macros not responding?</summary>
          <p>On the Explorer, open System Setup → MIDI page 10 → Param TX. Choose CC for the full named catalogue, or NRPN for the supported high-resolution Macros and Filters. Off sends no parameter edits.</p>
          <p>Press HOME for Macros 1–4; use PAGE for 5–8. The four encoders change function on other module pages. Check that the Macro has a value rather than a dash and its Macro button is not engaged. Select the Explorer USB input, or your interface input when using a MIDI cable.</p>
          <p>This catalogue describes transmitted parameters, not an independent MIDI address for every physical knob. Controls without a documented CC and unprofiled NRPN parameters remain diagnostic-only. Notes, pitch bend, pressure and clock are not zoom sources.</p>
          <a href={explorerManualUrl} target="_blank" rel="noreferrer">Open ASM Explorer manual (setup p. 83; MIDI chart pp. 94–96)</a>
        </details>
        <div className="hydrasynth-dialog__body">
          <section className="hydrasynth-map" aria-label="Hydrasynth Explorer control map">
            <div className="hydrasynth-map__heading"><span className="control-panel__label">Explorer parameter controls</span><small>Choose a module or search all {hydrasynthExplorerControls.length} documented CC entries. Turning a knob highlights the received parameter.</small></div>
            <label>Find a control<input type="search" aria-label="Find a Hydrasynth control" placeholder="Cutoff, envelope, Macro…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <label>Module<select aria-label="Hydrasynth module" value={group} onChange={(event) => { setGroup(event.target.value); setSearch(''); }}>{hydrasynthControlGroups.map((name) => <option key={name}>{name}</option>)}</select></label>
            <div className="hydrasynth-catalogue" aria-label="Explorer controls">
              {visible.map((control) => <button key={control.id} type="button" aria-pressed={selectedControlId === control.id}
                className={`hydrasynth-catalogue__control${lastControl?.id === control.id ? ' is-identified' : ''}`}
                aria-label={`${control.label}, MIDI CC ${control.protocol.controller}`}
                onClick={() => setSelectedControlId(control.id)}>
                <strong>{control.label}</strong><small>CC {control.protocol.controller}{control.nrpn ? ' · NRPN' : ''}{control.kind !== 'knob' ? ' · diagnostic only' : ''}</small>
              </button>)}
              {!visible.length ? <p>No matching controls.</p> : null}
            </div>
            <div className="hydrasynth-map__inspection" data-testid="hydrasynth-control-inspection">
              <strong>Selected: {selectedControl.label}</strong>
              <small>{selectedControl.group} · CC {selectedControl.protocol.controller}{selectedControl.nrpn ? ` · NRPN ${selectedControl.nrpn.parameter}` : ''}</small>
              <small>Last touched: {lastControl?.label ?? (midi.lastInput ? addressLabel(midi.lastInput.address) : 'None yet')}</small>
              <button type="button" disabled={!lastControl} onClick={selectLast}>Select last touched control</button>
            </div>
          </section>
          <aside className="hydrasynth-dialog__assignment">
            <div className="midi-assignment">
              <span className="control-panel__label">Assign selected control</span><strong>{selectedControl.label} → {target === 'zoom' ? 'Relative zoom' : 'Palette offset'}</strong>
              <label>Target<select aria-label="Controller target" value={target} onChange={(event) => setTarget(event.target.value as MidiAssignmentTarget)}><option value="zoom">Zoom</option><option value="palette.offset">Palette offset</option></select></label>
              <label>Transmission<select aria-label="Control transmission" value={format} onChange={(event) => setFormat(event.target.value as typeof format)}><option value="midi-cc">CC</option><option value="midi-nrpn">NRPN</option></select></label>
              <label>MIDI channel<select aria-label="Control MIDI channel" value={channel} onChange={(event) => setChannel(Number(event.target.value))}>{Array.from({ length: 16 }, (_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></label>
              {target === 'palette.offset' ? <div className="midi-assignment__range"><label>Offset minimum<input aria-label="Palette offset minimum" type="number" step="0.01" value={minimum} onChange={(event) => setMinimum(event.target.valueAsNumber)} /></label><label>Offset maximum<input aria-label="Palette offset maximum" type="number" step="0.01" value={maximum} onChange={(event) => setMaximum(event.target.valueAsNumber)} /></label><label><input aria-label="Invert Palette offset" type="checkbox" checked={inverted} onChange={(event) => setInverted(event.target.checked)} /> Invert</label></div> : null}
              <button type="button" disabled={!midi.selectedId || !selectedAddress || selectedControl.kind !== 'knob' || (target === 'palette.offset' && (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum === maximum))} onClick={() => { if (selectedAddress) midi.assign({ address: selectedAddress, channel, target, minimum, maximum, inverted }); }}>Assign {selectedControl.label} to {target === 'zoom' ? 'zoom' : 'Palette offset'}</button>
              {!selectedAddress ? <small>Use Param TX = CC for this named control. Its NRPN address is not profiled yet.</small> : null}
              {selectedControl.kind !== 'knob' ? <small>Switch and system messages can be inspected but cannot drive a live target.</small> : null}
              <small>Match Param TX and MIDI TX on the Explorer. “Select last touched” fills these from incoming data. This replaces the current session-only assignment.</small>
            </div>
            <div className="midi-assignment" data-testid="hydrasynth-assignment">
              <span className="control-panel__label">Current {midi.assignment?.target === 'palette.offset' ? 'Palette offset' : 'zoom'} mapping</span>
              {midi.assignment?.target !== 'palette.offset' ? <><label>Zoom behaviour<select aria-label="Zoom behaviour" value={midi.zoomMode} onChange={(event) => midi.changeZoomMode(event.target.value as 'continuous' | 'turn')}><option value="continuous">Continuous — knob controls speed</option><option value="turn">Zoom while turning</option></select></label>
              {midi.zoomMode === 'continuous' ? <><small>Above centre: keep zooming in. Below centre: keep zooming out. Centre stops. Further from centre means faster. Motion continues at the knob limit.</small><button type="button" disabled={!midi.armed} onClick={midi.holdZoom}>Hold zoom</button><small>Hold keeps this view; turn the knob to move again. Pause or leaving the browser stops motion until a fresh knob message.</small></> : null}</> : <small>Maps the knob's full range to {midi.assignment.minimum ?? -1}…{midi.assignment.maximum ?? 1}{midi.assignment.inverted ? ', inverted' : ''}. This is a temporary effective value; it does not alter the saved palette.</small>}
              <strong>{mappedControl?.label ?? (midi.assignment ? addressLabel(midi.assignment.address) : 'Unassigned')}</strong>
              <small>{midi.assignment ? `${addressLabel(midi.assignment.address)} · Channel ${midi.assignment.channel + 1}` : 'Choose any supported parameter above.'}</small>
              <button type="button" disabled={!midi.assignment || !active || !midi.selectedId} aria-pressed={midi.armed} onClick={midi.toggleArm}>{midi.armed ? 'Disarm control' : 'Arm control'}</button>
              <button type="button" disabled={!midi.armed} onClick={midi.release}>Release</button>
              {!active ? <small>Close the editor and press Play in Perform, then return to arm.</small> : null}
            </div>
            <small role="status" className="hydrasynth-dialog__status">{midi.status}</small>
            <details className="midi-monitor">
              <summary>Advanced MIDI monitor ({midi.messages.length} controls)</summary>
              <small>Complete CC / NRPN values. Unknown NRPNs may encode several parameters in their value bytes and remain diagnostic-only.</small>
              <div className="midi-monitor__messages">{midi.messages.map((message) => {
                const profile = findHydrasynthExplorerControl(message.address);
                const canAssign = profile?.kind === 'knob' || (!profile && message.address.protocol === 'midi-cc');
                return <button key={inputKey(message)} type="button" disabled={!canAssign} onClick={() => midi.assign({ ...message, target, minimum, maximum, inverted })}>
                  <span>{profile?.label ?? addressLabel(message.address)}</span><span>Ch {message.channel + 1}</span><strong>{message.value}</strong><small>{addressLabel(message.address)} · {canAssign ? `Assign to ${target === 'zoom' ? 'zoom' : 'Palette offset'}` : 'Diagnostic only'}</small>
                </button>;
              })}</div>
            </details>
            <small>Closing keeps the connection and armed mapping. Stop, Release, input loss or leaving Perform restores the prior effective value. Assignments are session-only; one control source is active at a time.</small>
          </aside>
        </div>
      </section>
    </div>, document.body) : null}
  </>;
}
