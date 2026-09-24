import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { addressLabel, inputKey, type ControlAddress } from '../integrations/midi/controlInput';
import { explorerManualUrl, findHydrasynthExplorerControl, hydrasynthControlGroups, hydrasynthExplorerControls } from '../integrations/midi/hydrasynthExplorerProfile';
import { useMidiControls, type MidiAssignmentTarget } from '../integrations/midi/useMidiControls';

interface Props { active: boolean; running: boolean; onZoomDelta: (delta: number) => void; onPaletteOffset: (value: number) => void; onRelease: (target?: MidiAssignmentTarget) => void }
export function HydrasynthMidiPanel({ active, running, onZoomDelta, onPaletteOffset, onRelease }: Props) {
  const midi = useMidiControls(active, running, onZoomDelta, onPaletteOffset, onRelease);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const setupFileRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [group, setGroup] = useState('Macros');
  const [search, setSearch] = useState('');
  const [selectedControlId, setSelectedControlId] = useState('macro.1');
  const [channel, setChannel] = useState(0);
  const [directCc, setDirectCc] = useState(24);
  const [format, setFormat] = useState<'midi-cc' | 'midi-nrpn'>('midi-cc');
  const [target, setTarget] = useState<MidiAssignmentTarget>('zoom');
  const [minimum, setMinimum] = useState(-1);
  const [maximum, setMaximum] = useState(1);
  const [inverted, setInverted] = useState(false);
  const [curve, setCurve] = useState(1);
  const selectedControl = hydrasynthExplorerControls.find((control) => control.id === selectedControlId)!;
  const selectedAddress: ControlAddress | null = format === 'midi-cc' ? selectedControl.protocol
    : selectedControl.nrpn ? { protocol: 'midi-nrpn', parameter: selectedControl.nrpn.parameter } : null;
  const selected = midi.inputs.find((input) => input.id === midi.selectedId);
  const connectionLabel = selected?.name ?? (midi.connected ? 'Choose an input' : 'Not connected');
  const zoomAssignment = midi.assignments.zoom;
  const paletteAssignment = midi.assignments['palette.offset'];
  const zoomControl = zoomAssignment?.relationship.source.deviceProfileId === 'asm-hydrasynth-explorer-2.2' ? findHydrasynthExplorerControl(zoomAssignment.address) : undefined;
  const paletteControl = paletteAssignment?.relationship.source.deviceProfileId === 'asm-hydrasynth-explorer-2.2' ? findHydrasynthExplorerControl(paletteAssignment.address) : undefined;
  const currentAssignment = midi.assignments[target];
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
  const assignLastReceived = () => {
    if (!midi.lastInput || midi.lastInput.address.protocol !== 'midi-cc') return;
    midi.assign({ address: midi.lastInput.address, channel: midi.lastInput.channel, target, minimum, maximum, inverted, curve });
  };
  const directCcIsValid = Number.isInteger(directCc) && directCc >= 0 && directCc <= 127;
  const assignmentRangeIsValid = target !== 'palette.offset' || (Number.isFinite(minimum) && Number.isFinite(maximum)
    && minimum !== maximum && Number.isFinite(curve) && curve > 0 && curve <= 8);
  const assignDirectCc = () => {
    if (!directCcIsValid) return;
    midi.assign({ address: { protocol: 'midi-cc', controller: directCc }, channel, target, minimum, maximum, inverted, curve, learned: true });
  };
  const importSetupFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (file) midi.importSetup(await file.text());
  };
  return <>
    <section aria-label="Hydrasynth Explorer controller" className="perform-card hydrasynth-launcher">
      <div className="hydrasynth-launcher__heading">
        <div><span className="control-panel__label">Controller</span><h3>Hydrasynth Explorer</h3></div>
        <span className={`hydrasynth-launcher__state${midi.selectedId ? ' is-connected' : ''}`}>{midi.selectedId ? 'Connected' : 'Setup required'}</span>
      </div>
      <div className="hydrasynth-launcher__summary">
        <span><small>Input</small><strong>{connectionLabel}</strong></span>
        <span><small>Zoom</small><strong>{zoomControl?.label ?? (zoomAssignment ? addressLabel(zoomAssignment.address) : 'Unassigned')}{midi.armedTargets.zoom ? ' · Armed' : ''}</strong></span>
        <span><small>Palette</small><strong>{paletteControl?.label ?? (paletteAssignment ? addressLabel(paletteAssignment.address) : 'Unassigned')}{midi.armedTargets['palette.offset'] ? ' · Armed' : ''}</strong></span>
      </div>
      <button ref={launcherRef} type="button" aria-haspopup="dialog" aria-expanded={expanded} onClick={() => setExpanded(true)}>Open Hydrasynth controls</button>
      {midi.armedTargets.zoom ? <>{midi.zoomMode === 'continuous' ? <><small>{midi.zoomRate === 0 ? 'Zoom held · turn the knob to move' : `Zooming ${midi.zoomRate > 0 ? 'in' : 'out'} · ${Math.round(Math.abs(midi.zoomRate) * 100)}% speed`}</small><button type="button" onClick={midi.holdZoom}>Hold zoom</button></> : null}<button type="button" onClick={() => midi.releaseTarget('zoom')}>Release MIDI zoom</button></> : null}
      {midi.armedTargets['palette.offset'] ? <button type="button" onClick={() => midi.releaseTarget('palette.offset')}>Release MIDI Palette offset</button> : null}
    </section>
    {expanded ? createPortal(<div className="hydrasynth-dialog-layer">
      <button type="button" tabIndex={-1} className="hydrasynth-dialog__backdrop" aria-label="Close Hydrasynth controls" onClick={close} />
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="hydrasynth-dialog-title" className="hydrasynth-dialog">
        <header className="hydrasynth-dialog__header">
          <div><span className="control-panel__label">Physical controller</span><h2 id="hydrasynth-dialog-title">Hydrasynth Explorer controls</h2><p>Select controls, assign Zoom and Palette offset, then arm them now or while Perform is playing.</p></div>
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
          <p>This catalogue describes transmitted parameters, not an independent MIDI address for every physical knob. Controls without a documented CC and unprofiled NRPN parameters remain diagnostic-only. Notes, pitch bend, pressure and clock are not live control sources.</p>
          <p>LFO rate and gain CCs report edits to those settings; they do not stream the LFO waveform. To use an LFO, PolyTouch or another Mod Matrix source continuously, route it to an unused MIDI CC, then enter that CC directly below or learn it from incoming activity.</p>
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
              {target === 'palette.offset' ? <div className="midi-assignment__range"><label>Offset minimum<input aria-label="Palette offset minimum" type="number" step="0.01" value={minimum} onChange={(event) => setMinimum(event.target.valueAsNumber)} /></label><label>Offset maximum<input aria-label="Palette offset maximum" type="number" step="0.01" value={maximum} onChange={(event) => setMaximum(event.target.valueAsNumber)} /></label><label>Response curve<input aria-label="Palette response curve" type="number" min="0.1" max="8" step="0.1" value={curve} onChange={(event) => setCurve(event.target.valueAsNumber)} /></label><label><input aria-label="Invert Palette offset" type="checkbox" checked={inverted} onChange={(event) => setInverted(event.target.checked)} /> Invert</label></div> : null}
              <button type="button" disabled={!midi.selectedId || !selectedAddress || selectedControl.kind !== 'knob' || (target === 'palette.offset' && (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum === maximum || !Number.isFinite(curve) || curve <= 0 || curve > 8))} onClick={() => { if (selectedAddress) midi.assign({ address: selectedAddress, channel, target, minimum, maximum, inverted, curve }); }}>Assign {selectedControl.label} to {target === 'zoom' ? 'zoom' : 'Palette offset'}</button>
              <div className="midi-assignment__range">
                <label>Direct CC number<input aria-label="Direct MIDI CC number" type="number" min="0" max="127" step="1" value={directCc} onChange={(event) => setDirectCc(event.target.valueAsNumber)} /></label>
                <button type="button" disabled={!midi.selectedId || !directCcIsValid || !assignmentRangeIsValid} onClick={assignDirectCc}>Assign CC {directCcIsValid ? directCc : '—'} directly to {target === 'zoom' ? 'zoom' : 'Palette offset'}</button>
              </div>
              <button type="button" disabled={!midi.selectedId || !midi.lastInput || midi.lastInput.address.protocol !== 'midi-cc' || !assignmentRangeIsValid} onClick={assignLastReceived}>Assign last received CC to {target === 'zoom' ? 'zoom' : 'Palette offset'}</button>
              {!selectedAddress ? <small>Use Param TX = CC for this named control. Its NRPN address is not profiled yet.</small> : null}
              {selectedControl.kind !== 'knob' ? <small>Switch and system messages can be inspected but cannot drive a live target.</small> : null}
              <small>Match Param TX and MIDI TX on the Explorer. For Mod Matrix sources such as PolyTouch or an LFO, route the source to an unused CC and enter that destination above. Direct CC assignments describe the received endpoint, not the source that produced it. Each replaces only this target's assignment.</small>
            </div>
            <div className="midi-assignment" data-testid="hydrasynth-assignment">
              <span className="control-panel__label">Configured mappings</span>
              <div className="midi-mapping-list">
                <div className="midi-mapping-row" data-testid="hydrasynth-mapping-zoom">
                  <div><strong>{zoomControl?.label ?? (zoomAssignment ? addressLabel(zoomAssignment.address) : 'Unassigned')} → Zoom</strong><small>{zoomAssignment ? `${addressLabel(zoomAssignment.address)} · Channel ${zoomAssignment.channel + 1} · absolute value → signed response → ${midi.zoomMode === 'continuous' ? 'zoom-rate intent' : 'relative zoom intent'}` : 'Choose Zoom above, then assign a control.'}</small></div>
                  <button type="button" disabled={!zoomAssignment || !midi.selectedId} aria-pressed={midi.isArmed('zoom')} onClick={() => midi.toggleArm('zoom')}>{midi.isArmed('zoom') ? 'Disarm zoom' : 'Arm zoom'}</button>
                </div>
                <div className="midi-mapping-row" data-testid="hydrasynth-mapping-palette">
                  <div><strong>{paletteControl?.label ?? (paletteAssignment ? addressLabel(paletteAssignment.address) : 'Unassigned')} → Palette offset</strong><small>{paletteAssignment ? `${addressLabel(paletteAssignment.address)} · Channel ${paletteAssignment.channel + 1} · absolute value → ${paletteAssignment.inverted ? 'invert → ' : ''}curve ${paletteAssignment.curve ?? 1} → range ${paletteAssignment.minimum ?? -1}…${paletteAssignment.maximum ?? 1} → semantic parameter` : 'Choose Palette offset above, then assign a control or LFO CC.'}</small></div>
                  <button type="button" disabled={!paletteAssignment || !midi.selectedId} aria-pressed={midi.isArmed('palette.offset')} onClick={() => midi.toggleArm('palette.offset')}>{midi.isArmed('palette.offset') ? 'Disarm Palette offset' : 'Arm Palette offset'}</button>
                </div>
              </div>
              <details className="midi-setup">
                <summary>Saved controller setup</summary>
                <small role="status">{midi.setupStatus}</small>
                <div className="midi-setup__actions">
                  <button type="button" disabled={!zoomAssignment && !paletteAssignment} onClick={midi.exportSetup}>Export JSON</button>
                  <button type="button" onClick={() => setupFileRef.current?.click()}>Import JSON</button>
                  <button type="button" disabled={!zoomAssignment && !paletteAssignment} onClick={midi.clearSetup}>Clear saved setup</button>
                </div>
                <input ref={setupFileRef} className="midi-setup__file" aria-label="Import controller setup JSON" type="file" accept="application/json,.json" onChange={importSetupFile} />
                <small>Mappings save automatically. Inputs reconnect by profile, control address and channel—never by a browser port ID. Arming and live values are not saved.</small>
              </details>
              <small>Options for the target selected above:</small>
              {target === 'zoom' ? <><label>Zoom behaviour<select aria-label="Zoom behaviour" value={midi.zoomMode} onChange={(event) => midi.changeZoomMode(event.target.value as 'continuous' | 'turn')}><option value="continuous">Continuous — knob controls speed</option><option value="turn">Zoom while turning</option></select></label>
              {midi.zoomMode === 'continuous' ? <><small>Above centre: keep zooming in. Below centre: keep zooming out. Centre stops. Further from centre means faster. Motion continues at the knob limit.</small><button type="button" disabled={!midi.isArmed('zoom')} onClick={midi.holdZoom}>Hold zoom</button><small>Hold keeps this view; turn the knob to move again. Pause or leaving the browser stops motion until a fresh knob message.</small></> : null}</> : currentAssignment ? <small>Maps the knob's full range to {currentAssignment.minimum ?? -1}…{currentAssignment.maximum ?? 1}{currentAssignment.inverted ? ', inverted' : ''}. This is a temporary effective value; it does not alter the saved palette.</small> : null}
              {!active ? <small>You can arm both mappings while stopped. Close the editor and press Play once; there is no need to reopen it.</small> : null}
            </div>
            <small role="status" className="hydrasynth-dialog__status">{midi.status}</small>
            <details className="midi-monitor">
              <summary>Advanced MIDI monitor ({midi.messages.length} controls)</summary>
              <small>Complete CC / NRPN values. Unknown CCs can be assigned as custom signals; unknown NRPNs may encode several parameters in their value bytes and remain diagnostic-only.</small>
              <small>Runtime: {midi.diagnostics.received} received · {midi.diagnostics.emitted} applied frames · {midi.diagnostics.coalesced} coalesced · {midi.diagnostics.stale} stale · {midi.diagnostics.overflow} overflow</small>
              <div className="midi-monitor__messages">{midi.messages.map((message) => {
                const profile = findHydrasynthExplorerControl(message.address);
                const canAssign = profile?.kind === 'knob' || (!profile && message.address.protocol === 'midi-cc');
                return <button key={inputKey(message)} type="button" disabled={!canAssign} onClick={() => midi.assign({ ...message, target, minimum, maximum, inverted, curve })}>
                  <span>{profile?.label ?? addressLabel(message.address)}</span><span>Ch {message.channel + 1}</span><strong>{message.value}</strong><small>{addressLabel(message.address)} · {canAssign ? `Assign to ${target === 'zoom' ? 'zoom' : 'Palette offset'}` : 'Diagnostic only'}</small>
                </button>;
              })}</div>
            </details>
            <small>Closing keeps the connection and armed mappings. Stop, input loss or leaving Perform releases both. Each target can be armed/released independently. Mapping definitions persist in the controller setup; arming and live values remain session-only.</small>
          </aside>
        </div>
      </section>
    </div>, document.body) : null}
  </>;
}
