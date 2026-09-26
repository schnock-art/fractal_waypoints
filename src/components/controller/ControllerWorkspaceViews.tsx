import { useRef, useState, type ChangeEvent } from 'react';
import type { ControlAddress } from '../../connections/externalControl';
import { addressLabel, inputKey } from '../../integrations/midi/controlInput';
import { explorerManualUrl, findHydrasynthExplorerControl, hydrasynthControlGroups, hydrasynthExplorerControls } from '../../integrations/midi/hydrasynthExplorerProfile';
import type { MidiAssignmentTarget, MidiControlsApi } from '../../integrations/midi/useMidiControls';
import type { ControllerLayoutsApi } from './useControllerLayouts';
import { ControllerMappingCard } from './ControllerMappingCard';
import { assignmentSourceLabel } from './controllerDisplay';

interface SharedProps { midi: MidiControlsApi; layouts: ControllerLayoutsApi; active: boolean; running: boolean }
interface LiveProps extends SharedProps { onNavigate: (view: 'mappings' | 'takes') => void }

export function LiveControllerView({ midi, layouts, active, running, onNavigate }: LiveProps) {
  const assignments = [midi.assignments.zoom, midi.assignments['palette.offset']].filter(Boolean).length;
  return <section className="controller-view controller-live" aria-labelledby="controller-live-title">
    <header className="controller-view__heading"><div><span className="control-panel__label">Live instrument</span><h3 id="controller-live-title">Ready to play</h3></div><small>{midi.traffic}</small></header>
    <div className="controller-live__summary">
      <div><small>Layout</small><strong>{layouts.activeLayout?.name ?? 'No named layout'}</strong></div>
      <div><small>Mappings</small><strong>{assignments} configured · {Object.values(midi.armedTargets).filter(Boolean).length} armed</strong></div>
      <div><small>Performance</small><strong>{midi.isRecordingTake ? '● Recording' : midi.isReplayingTake ? '▶ Replaying take' : running ? 'Playing' : 'Stopped'}</strong></div>
    </div>
    {midi.isRecordingTake ? <div className="controller-recording-banner" role="status"><strong>● Recording performance take</strong><button type="button" onClick={() => midi.stopRecordingTake()}>Stop recording</button></div> : null}
    <div className="controller-section-heading"><div><span className="control-panel__label">Active mappings</span><h4>What controls the fractal</h4></div><button type="button" className="is-secondary" onClick={() => onNavigate('mappings')}>+ Add mapping</button></div>
    <div className="controller-card-grid">
      <ControllerMappingCard assignment={midi.assignments.zoom} target="zoom" armed={midi.isArmed('zoom')} layout={layouts.activeLayout}
        canArm={!!midi.selectedId} onToggleArm={() => midi.toggleArm('zoom')} onEdit={() => onNavigate('mappings')} onRelease={() => midi.releaseTarget('zoom')} />
      <ControllerMappingCard assignment={midi.assignments['palette.offset']} target="palette.offset" armed={midi.isArmed('palette.offset')} layout={layouts.activeLayout}
        canArm={!!midi.selectedId} onToggleArm={() => midi.toggleArm('palette.offset')} onEdit={() => onNavigate('mappings')} onRelease={() => midi.releaseTarget('palette.offset')} />
    </div>
    {midi.isArmed('zoom') && midi.zoomMode === 'continuous' ? <div className="controller-inline-action"><small>{midi.zoomRate === 0 ? 'Zoom is held at centre.' : `Zooming ${midi.zoomRate > 0 ? 'in' : 'out'} · ${Math.round(Math.abs(midi.zoomRate) * 100)}% speed`}</small><button type="button" onClick={midi.holdZoom}>Hold zoom</button></div> : null}
    <section className="controller-take-summary" aria-label="Performance take">
      <div><span className="control-panel__label">Performance take</span><strong>{midi.take ? `${midi.take.name} · ${(midi.take.durationMs / 1000).toFixed(1)} s` : 'No saved take'}</strong><small>{midi.takeStatus}</small></div>
      <div className="controller-actions">
        {midi.isRecordingTake ? <button type="button" onClick={() => midi.stopRecordingTake()}>Stop recording</button>
          : <button type="button" disabled={!active || !running || !midi.selectedId || !midi.armedTargets.zoom && !midi.armedTargets['palette.offset']} onClick={midi.startRecordingTake}>● Record take</button>}
        <button type="button" className="is-secondary" disabled={!midi.take || !active || !running || midi.isRecordingTake || midi.isReplayingTake} onClick={midi.replayTake}>Replay</button>
        <button type="button" className="is-secondary" onClick={() => onNavigate('takes')}>Open Takes</button>
      </div>
    </section>
  </section>;
}

type DraftSource = { address: ControlAddress; channel: number; learned: boolean; label: string };

export function MappingControllerView({ midi, layouts }: SharedProps) {
  const setupFileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState<DraftSource | null>(null);
  const [target, setTarget] = useState<MidiAssignmentTarget>('zoom');
  const [minimum, setMinimum] = useState(-1); const [maximum, setMaximum] = useState(1);
  const [curve, setCurve] = useState(1); const [inverted, setInverted] = useState(false);
  const [directCc, setDirectCc] = useState(24); const [channel, setChannel] = useState(0);
  const [group, setGroup] = useState('Macros'); const [search, setSearch] = useState('');
  const [selectedControlId, setSelectedControlId] = useState('macro.1'); const [format, setFormat] = useState<'midi-cc' | 'midi-nrpn'>('midi-cc');
  const selectedControl = hydrasynthExplorerControls.find((control) => control.id === selectedControlId)!;
  const selectedAddress: ControlAddress | null = format === 'midi-cc' ? selectedControl.protocol
    : selectedControl.nrpn ? { protocol: 'midi-nrpn', parameter: selectedControl.nrpn.parameter } : null;
  const lastProfile = midi.lastInput ? findHydrasynthExplorerControl(midi.lastInput.address) : undefined;
  const lastLane = midi.lastInput && layouts.activeLayout?.lanes.find((lane) => lane.channel === midi.lastInput!.channel && JSON.stringify(lane.address) === JSON.stringify(midi.lastInput!.address));
  const visible = hydrasynthExplorerControls.filter((control) => search
    ? `${control.label} ${control.group} ${control.protocol.controller}`.toLowerCase().includes(search.toLowerCase()) : control.group === group);
  const rangeValid = target !== 'palette.offset' || Number.isFinite(minimum) && Number.isFinite(maximum) && minimum !== maximum && Number.isFinite(curve) && curve > 0 && curve <= 8;
  const edit = (nextTarget: MidiAssignmentTarget) => {
    const assignment = midi.assignments[nextTarget]; setTarget(nextTarget); setEditing(true);
    if (assignment) {
      setSource({ address: assignment.address, channel: assignment.channel, learned: !!assignment.learned, label: assignmentSourceLabel(assignment, layouts.activeLayout) });
      setMinimum(assignment.minimum ?? -1); setMaximum(assignment.maximum ?? 1); setCurve(assignment.curve ?? 1); setInverted(assignment.inverted ?? false);
    } else setSource(null);
  };
  const useLast = () => {
    if (!midi.lastInput) return;
    setSource({ address: midi.lastInput.address, channel: midi.lastInput.channel, learned: !!lastLane || !lastProfile, label: lastLane?.label ?? lastProfile?.label ?? addressLabel(midi.lastInput.address) });
  };
  const save = () => {
    if (!source || !rangeValid) return;
    midi.assign({ address: source.address, channel: source.channel, learned: source.learned, target, minimum, maximum, inverted, curve });
    setEditing(false);
  };
  const importSetup = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) midi.importSetup(await file.text()); };
  return <section className="controller-view" aria-labelledby="controller-mappings-title">
    <header className="controller-view__heading"><div><span className="control-panel__label">Mappings</span><h3 id="controller-mappings-title">What controls what</h3><p>Start with a signal, choose a target, then tune how it responds.</p></div><button type="button" onClick={() => { setEditing(true); setSource(null); }}>+ Add mapping</button></header>
    <div className="controller-card-grid">
      <ControllerMappingCard assignment={midi.assignments.zoom} target="zoom" armed={midi.isArmed('zoom')} layout={layouts.activeLayout} canArm={!!midi.selectedId} onToggleArm={() => midi.toggleArm('zoom')} onEdit={() => edit('zoom')} onRelease={() => midi.releaseTarget('zoom')} />
      <ControllerMappingCard assignment={midi.assignments['palette.offset']} target="palette.offset" armed={midi.isArmed('palette.offset')} layout={layouts.activeLayout} canArm={!!midi.selectedId} onToggleArm={() => midi.toggleArm('palette.offset')} onEdit={() => edit('palette.offset')} onRelease={() => midi.releaseTarget('palette.offset')} />
    </div>
    {editing ? <section className="mapping-editor" aria-label="Add mapping">
      <div className="mapping-editor__steps" aria-hidden="true"><strong>1 Source</strong><span>→</span><strong>2 Target</strong><span>→</span><strong>3 Response</strong></div>
      <section><span className="control-panel__label">1 · Source</span><h4>Move or send a control</h4>
        {midi.lastInput ? <div className="detected-source"><div><small>Detected</small><strong>{lastLane?.label ?? lastProfile?.label ?? addressLabel(midi.lastInput.address)}</strong><span>{addressLabel(midi.lastInput.address)} · Channel {midi.lastInput.channel + 1}{lastLane ? ` · ${layouts.activeLayout?.name}` : ''}</span></div><button type="button" onClick={useLast}>Use this source</button></div>
          : <p>Move a Hydrasynth control or generate a routed signal. The latest supported MIDI value will appear here.</p>}
        {source ? <div className="mapping-editor__selection" role="status"><small>Selected source</small><strong>{source.label}</strong><span>{addressLabel(source.address)} · Channel {source.channel + 1}</span></div> : null}
        <details><summary>Browse Hydrasynth controls</summary><div className="source-browser">
          <label>Find a control<input type="search" aria-label="Find a Hydrasynth control" placeholder="Cutoff, envelope, Macro…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label>Module<select aria-label="Hydrasynth module" value={group} onChange={(event) => { setGroup(event.target.value); setSearch(''); }}>{hydrasynthControlGroups.map((name) => <option key={name}>{name}</option>)}</select></label>
          <div className="hydrasynth-catalogue" aria-label="Explorer controls">{visible.map((control) => <button key={control.id} type="button" aria-pressed={selectedControlId === control.id} className={`hydrasynth-catalogue__control${lastProfile?.id === control.id ? ' is-identified' : ''}`} aria-label={`${control.label}, MIDI CC ${control.protocol.controller}`} onClick={() => setSelectedControlId(control.id)}><strong>{control.label}</strong><small>CC {control.protocol.controller}{control.nrpn ? ' · NRPN' : ''}{control.kind !== 'knob' ? ' · diagnostic only' : ''}</small></button>)}</div>
          <label>Transmission<select aria-label="Control transmission" value={format} onChange={(event) => setFormat(event.target.value as typeof format)}><option value="midi-cc">CC</option><option value="midi-nrpn">NRPN</option></select></label>
          <button type="button" disabled={!selectedAddress || selectedControl.kind !== 'knob'} onClick={() => selectedAddress && setSource({ address: selectedAddress, channel, learned: false, label: selectedControl.label })}>Use {selectedControl.label}</button>
          {!selectedAddress ? <small>Use Param TX = CC for this control; its NRPN address is not profiled.</small> : null}
        </div></details>
        <details><summary>Enter MIDI address manually</summary><div className="advanced-source"><small>Manual addresses stay learned/raw unless you explicitly name them in a layout.</small><label>Type<select aria-label="Direct MIDI type" disabled><option>MIDI CC</option></select></label><label>Number<input aria-label="Direct MIDI CC number" type="number" min="0" max="127" step="1" value={directCc} onChange={(event) => setDirectCc(event.target.valueAsNumber)} /></label><label>Channel<select aria-label="Control MIDI channel" value={channel} onChange={(event) => setChannel(Number(event.target.value))}>{Array.from({ length: 16 }, (_, index) => <option key={index} value={index}>{index + 1}</option>)}</select></label><button type="button" disabled={!Number.isInteger(directCc) || directCc < 0 || directCc > 127} onClick={() => setSource({ address: { protocol: 'midi-cc', controller: directCc }, channel, learned: true, label: `CC ${directCc}` })}>Use CC {Number.isInteger(directCc) ? directCc : '—'}</button></div></details>
      </section>
      <section><span className="control-panel__label">2 · Target</span><h4>Choose what moves</h4><label>Controller target<select aria-label="Controller target" value={target} onChange={(event) => setTarget(event.target.value as MidiAssignmentTarget)}><optgroup label="Navigation"><option value="zoom">Zoom</option></optgroup><optgroup label="Colour"><option value="palette.offset">Palette offset</option></optgroup></select></label></section>
      <section><span className="control-panel__label">3 · Response</span><h4>Shape the feel</h4>
        {target === 'zoom' ? <fieldset className="response-options"><legend>Zoom behaviour</legend><label><input type="radio" name="zoom-mode" checked={midi.zoomMode === 'continuous'} onChange={() => midi.changeZoomMode('continuous')} /> Continuous speed</label><label><input type="radio" name="zoom-mode" checked={midi.zoomMode === 'turn'} onChange={() => midi.changeZoomMode('turn')} /> Zoom while turning</label><small>{midi.zoomMode === 'continuous' ? 'Centre holds the view. Further from centre moves faster and continues at the knob limit.' : 'The first value establishes a baseline; subsequent turns move relative to it.'}</small></fieldset>
          : <div className="response-options"><div className="response-range"><label>Output minimum<input aria-label="Palette offset minimum" type="number" step="0.01" value={minimum} onChange={(event) => setMinimum(event.target.valueAsNumber)} /></label><label>Output maximum<input aria-label="Palette offset maximum" type="number" step="0.01" value={maximum} onChange={(event) => setMaximum(event.target.valueAsNumber)} /></label></div><label>Response curve <input aria-label="Palette response curve" type="range" min="0.1" max="8" step="0.1" value={curve} onChange={(event) => setCurve(event.target.valueAsNumber)} /><output>{curve.toFixed(1)}</output></label><label className="inline-check"><input aria-label="Invert Palette offset" type="checkbox" checked={inverted} onChange={(event) => setInverted(event.target.checked)} /> Invert response</label></div>}
      </section>
      <div className="mapping-editor__actions"><button type="button" className="is-secondary" onClick={() => setEditing(false)}>Cancel</button><button type="button" disabled={!midi.selectedId || !source || !rangeValid} onClick={save}>Save mapping</button></div>
    </section> : null}
    <details className="controller-manage"><summary>Manage saved controller setup</summary><small role="status">{midi.setupStatus}</small><div className="controller-actions"><button type="button" disabled={!midi.assignments.zoom && !midi.assignments['palette.offset']} onClick={midi.exportSetup}>Export setup JSON</button><button type="button" onClick={() => setupFileRef.current?.click()}>Import setup JSON</button><button type="button" className="is-danger" disabled={!midi.assignments.zoom && !midi.assignments['palette.offset']} onClick={midi.clearSetup}>Clear saved setup</button></div><input ref={setupFileRef} className="midi-setup__file" aria-label="Import controller setup JSON" type="file" accept="application/json,.json" onChange={importSetup} /></details>
  </section>;
}

export function ControllerLayoutsView({ midi, layouts }: SharedProps) {
  const fileRef = useRef<HTMLInputElement>(null); const [adding, setAdding] = useState(false);
  const [name, setName] = useState('Fractal Ways 1'); const [patch, setPatch] = useState(''); const [notes, setNotes] = useState('');
  const [laneLabel, setLaneLabel] = useState(''); const [directCc, setDirectCc] = useState(24); const [channel, setChannel] = useState(0); const [manual, setManual] = useState(false);
  const addFromLast = () => { if (midi.lastInput && layouts.addLane(laneLabel, midi.lastInput.address, midi.lastInput.channel)) { setLaneLabel(''); setAdding(false); } };
  const addManual = () => { if (layouts.addLane(laneLabel, { protocol: 'midi-cc', controller: directCc }, channel)) { setLaneLabel(''); setAdding(false); } };
  return <section className="controller-view" aria-labelledby="controller-layouts-title"><header className="controller-view__heading"><div><span className="control-panel__label">Layouts</span><h3 id="controller-layouts-title">Signals your instrument exposes</h3><p>Name the useful lanes in a particular hardware routing or synth patch.</p></div>{layouts.activeLayout ? <button type="button" onClick={() => setAdding(true)}>+ Add lane</button> : null}</header>
    <label className="controller-layout-picker">Active layout<select aria-label="Active controller layout" value={layouts.document.selectedLayoutId ?? ''} onChange={(event) => layouts.selectLayout(event.target.value)}><option value="">No layout — show raw MIDI addresses</option>{layouts.document.layouts.map((layout) => <option key={layout.id} value={layout.id}>{layout.name}</option>)}</select></label>
    {!layouts.activeLayout ? <section className="controller-empty-state"><h4>Create a controller layout</h4><p>A layout names the MIDI lanes exposed by your hardware patch. It does not change mappings or prove what generated a signal.</p><label>Layout name<input aria-label="New controller layout name" value={name} onChange={(event) => setName(event.target.value)} /></label><label>Expected synth patch<input aria-label="Expected hardware patch name" value={patch} onChange={(event) => setPatch(event.target.value)} /></label><label>Notes<textarea aria-label="Controller layout notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></label><button type="button" disabled={!name.trim()} onClick={() => { if (layouts.createLayout(name, patch, notes)) { setName(''); setPatch(''); setNotes(''); } }}>Create named layout</button></section>
      : <><section className="controller-layout-hero"><div><small>Controller layout</small><h4>{layouts.activeLayout.name}</h4><span>Hydrasynth Explorer</span></div><div><small>Expected synth patch</small><strong>{layouts.activeLayout.expectedHardwarePatchName || 'Not specified'}</strong><span>{layouts.activeLayout.notes || 'No layout notes'}</span></div></section>
        <div className="controller-section-heading"><div><span className="control-panel__label">Signal lanes</span><h4>Friendly names over raw endpoints</h4></div><button type="button" onClick={() => setAdding(true)}>+ Add lane</button></div>
        <div className="controller-lane-grid" aria-label="Controller layout lanes">{layouts.activeLayout.lanes.map((lane) => <article key={lane.id}><div><strong>{lane.label}</strong><small>{addressLabel(lane.address)} · Channel {lane.channel + 1}</small></div><button type="button" className="is-secondary" onClick={() => layouts.removeLane(lane.id)}>Remove lane</button></article>)}{!layouts.activeLayout.lanes.length ? <p>No signal lanes yet. Move a control or enter a routed CC to add one.</p> : null}</div>
        {adding ? <section className="lane-editor" aria-label="Add signal lane"><span className="control-panel__label">Add signal lane</span><h4>Move or generate the signal</h4>{midi.lastInput ? <div className="detected-source"><div><small>Received</small><strong>{addressLabel(midi.lastInput.address)}</strong><span>Channel {midi.lastInput.channel + 1}</span></div></div> : <p>Waiting for a supported CC or NRPN value…</p>}<label>Name this lane<input aria-label="Controller layout lane label" placeholder="Colour LFO" value={laneLabel} onChange={(event) => setLaneLabel(event.target.value)} /></label><div className="controller-actions"><button type="button" disabled={!midi.lastInput || !laneLabel.trim()} onClick={addFromLast}>Add received lane</button><button type="button" className="is-secondary" onClick={() => setManual((value) => !value)}>Enter endpoint manually</button><button type="button" className="is-secondary" onClick={() => setAdding(false)}>Cancel</button></div>{manual ? <div className="advanced-source"><label>CC number<input aria-label="Layout MIDI CC number" type="number" min="0" max="127" value={directCc} onChange={(event) => setDirectCc(event.target.valueAsNumber)} /></label><label>Channel<select aria-label="Layout MIDI channel" value={channel} onChange={(event) => setChannel(Number(event.target.value))}>{Array.from({ length: 16 }, (_, index) => <option key={index} value={index}>{index + 1}</option>)}</select></label><button type="button" disabled={!laneLabel.trim() || !Number.isInteger(directCc) || directCc < 0 || directCc > 127} onClick={addManual}>Add CC {Number.isInteger(directCc) ? directCc : '—'} lane</button></div> : null}</section> : null}
      </>}
    <details className="controller-manage"><summary>Manage layouts</summary><small role="status">{layouts.status}</small><div className="controller-actions"><button type="button" disabled={!layouts.document.layouts.length} onClick={layouts.exportLayouts}>Export layouts JSON</button><button type="button" onClick={() => fileRef.current?.click()}>Import layouts JSON</button><button type="button" className="is-danger" disabled={!layouts.activeLayout} onClick={layouts.deleteActiveLayout}>Delete selected layout</button></div><input ref={fileRef} className="midi-setup__file" aria-label="Import controller layouts JSON" type="file" accept="application/json,.json" onChange={layouts.importFile} /></details>
  </section>;
}

export function PerformanceTakesView({ midi, active, running, layouts }: SharedProps) {
  return <section className="controller-view" aria-labelledby="controller-takes-title"><header className="controller-view__heading"><div><span className="control-panel__label">Takes</span><h3 id="controller-takes-title">Recorded performance</h3><p>One locally saved take, replayable through its recorded mappings without the original controller.</p></div>{midi.isRecordingTake ? <button type="button" onClick={() => midi.stopRecordingTake()}>Stop recording</button> : <button type="button" disabled={!active || !running || !midi.selectedId || !midi.armedTargets.zoom && !midi.armedTargets['palette.offset']} onClick={midi.startRecordingTake}>● Record new take</button>}</header>
    <small role="status" className="controller-status">{midi.takeStatus}</small>
    {midi.take ? <article className="controller-saved-take"><div><small>Saved take</small><h4>{midi.take.name}</h4><strong>{(midi.take.durationMs / 1000).toFixed(1)} s · {midi.take.relationships.length} mapping{midi.take.relationships.length === 1 ? '' : 's'} · {midi.take.events.length} samples</strong></div><div className="controller-take-mappings">{midi.take.relationships.map((relationship) => { const lane = layouts.activeLayout?.lanes.find((item) => item.channel === relationship.source.channel && JSON.stringify(item.address) === JSON.stringify(relationship.source.address)); const profile = relationship.source.deviceProfileId === 'asm-hydrasynth-explorer-2.2' ? findHydrasynthExplorerControl(relationship.source.address) : undefined; const target = relationship.mapping.target.kind === 'navigation-intent' ? 'Zoom' : 'Palette offset'; return <span key={relationship.source.id}><strong>{lane?.label ?? profile?.label ?? addressLabel(relationship.source.address)}</strong> → {target}</span>; })}</div><div className="controller-actions"><button type="button" disabled={!active || !running || midi.isRecordingTake || midi.isReplayingTake} onClick={midi.replayTake}>Replay saved take</button><button type="button" className="is-danger" onClick={midi.clearTake}>Delete saved take</button></div></article>
      : <section className="controller-empty-state"><h4>No saved take</h4><p>Play Primary, arm at least one mapping, then record your controller performance.</p></section>}
    <small>A take stores timed controller samples and the mappings that interpreted them. It remains separate from controller setup, layouts, Waypoints and Journeys.</small>
  </section>;
}

export function MidiDiagnosticsView({ midi }: SharedProps) {
  return <section className="controller-view" aria-labelledby="controller-diagnostics-title"><header className="controller-view__heading"><div><span className="control-panel__label">Diagnostics & MIDI</span><h3 id="controller-diagnostics-title">Connection and signal details</h3><p>Use this view when controls are not transmitting or a raw endpoint needs inspection.</p></div></header>
    <section className="diagnostic-section"><h4>Connection</h4><small role="status">{midi.status}</small>{midi.connected ? <label>MIDI input<select aria-label="MIDI input" value={midi.selectedId} onChange={(event) => midi.selectInput(event.target.value)}><option value="">Select an input</option>{midi.inputs.map((input) => <option key={input.id} value={input.id}>{input.name ?? 'Unnamed MIDI input'}</option>)}</select></label> : <button type="button" disabled={midi.connecting} onClick={midi.connect}>{midi.connecting ? 'Connecting…' : 'Connect Hydrasynth Explorer'}</button>}</section>
    <section className="diagnostic-section"><h4>Incoming activity</h4><strong data-testid="hydrasynth-traffic">{midi.traffic}</strong><small>{midi.lastInput ? `${addressLabel(midi.lastInput.address)} · Channel ${midi.lastInput.channel + 1} · value ${midi.lastInput.value}` : 'No complete CC or NRPN value received yet.'}</small></section>
    <section className="diagnostic-section"><h4>Runtime diagnostics</h4><div className="diagnostic-metrics"><span><strong>{midi.diagnostics.received}</strong>Received</span><span><strong>{midi.diagnostics.emitted}</strong>Applied</span><span><strong>{midi.diagnostics.coalesced}</strong>Coalesced</span><span><strong>{midi.diagnostics.stale}</strong>Stale</span><span><strong>{midi.diagnostics.overflow}</strong>Overflow</span></div></section>
    <details className="midi-monitor" open><summary>Raw MIDI monitor ({midi.messages.length} controls)</summary><small>Complete CC / NRPN values. Raw messages remain diagnostic; create mappings from the Mappings view.</small><div className="midi-monitor__messages">{midi.messages.map((message) => { const profile = findHydrasynthExplorerControl(message.address); return <div key={inputKey(message)} className="diagnostic-message"><span>{profile?.label ?? addressLabel(message.address)}</span><span>Ch {message.channel + 1}</span><strong>{message.value}</strong><small>{addressLabel(message.address)}</small></div>; })}{!midi.messages.length ? <p>No controller values received yet.</p> : null}</div></details>
    <details className="hydrasynth-setup" open><summary>Hydrasynth setup · macros not responding?</summary><p>On the Explorer, open System Setup → MIDI page 10 → Param TX. Choose CC for the full named catalogue, or NRPN for supported high-resolution Macros and Filters. Off sends no parameter edits.</p><p>Press HOME for Macros 1–4; use PAGE for 5–8. Check that the Macro has a value rather than a dash and its Macro button is not engaged. Select the Explorer USB input, or your interface input when using a MIDI cable.</p><p>LFO rate and gain CCs report edits to those settings; they do not stream the LFO waveform. Route an LFO, PolyTouch, or another Mod Matrix source to an unused MIDI CC, then learn or enter that CC in Mappings.</p><a href={explorerManualUrl} target="_blank" rel="noreferrer">Open ASM Explorer manual (setup p. 83; MIDI chart pp. 94–96)</a></details>
    <details className="diagnostic-section"><summary>Device profile</summary><p>{hydrasynthExplorerControls.length} documented Explorer CC entries are available in the mapping source browser. Supported Macro/Filter NRPN aliases are decoded as complete values; unknown packed NRPNs remain diagnostic-only.</p></details>
  </section>;
}
