import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { midiAssignmentTargets, useMidiControls, type MidiAssignmentTarget } from '../integrations/midi/useMidiControls';
import type { SemanticParameterId } from '../parameters/semantic';
import { ControllerMappingCard } from './controller/ControllerMappingCard';
import { ControllerLayoutsView, LiveControllerView, MappingControllerView, MidiDiagnosticsView, PerformanceTakesView } from './controller/ControllerWorkspaceViews';
import { useControllerLayouts } from './controller/useControllerLayouts';

interface Props { active: boolean; running: boolean; onZoomDelta: (delta: number) => void; onSemanticValue: (target: SemanticParameterId, value: number) => void; onRelease: (target?: MidiAssignmentTarget) => void; isTargetAvailable: (target: MidiAssignmentTarget) => boolean }
type ControllerView = 'live' | 'mappings' | 'layouts' | 'takes' | 'diagnostics';
const views: { id: ControllerView; label: string }[] = [
  { id: 'live', label: 'Live' }, { id: 'mappings', label: 'Mappings' }, { id: 'layouts', label: 'Layouts' },
  { id: 'takes', label: 'Takes' }, { id: 'diagnostics', label: 'Diagnostics' },
];

function connectionLabel(midi: ReturnType<typeof useMidiControls>, armedCount: number) {
  if (midi.connecting) return '◌ Reconnecting';
  if (midi.connectionState === 'permission-required') return '○ MIDI access required';
  if (midi.connectionState === 'disconnected') return '○ Disconnected';
  if (midi.connectionState === 'choosing-input') return '○ Choose input';
  return `● Connected · ${armedCount} armed`;
}

export function HydrasynthMidiPanel({ active, running, onZoomDelta, onSemanticValue, onRelease, isTargetAvailable }: Props) {
  const midi = useMidiControls(active, running, onZoomDelta, onSemanticValue, onRelease, isTargetAvailable);
  const layouts = useControllerLayouts();
  const launcherRef = useRef<HTMLButtonElement>(null); const dialogRef = useRef<HTMLElement>(null); const closeRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false); const [view, setView] = useState<ControllerView>('live');
  const selected = midi.inputs.find((input) => input.id === midi.selectedId);
  const mappingCount = midiAssignmentTargets.filter((target) => midi.assignments[target]).length;
  const armedCount = Object.values(midi.armedTargets).filter(Boolean).length;
  const connection = connectionLabel(midi, armedCount);
  const close = () => { setExpanded(false); requestAnimationFrame(() => launcherRef.current?.focus()); };
  const open = () => { setView('live'); setExpanded(true); };

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; closeRef.current?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key === 'Tab') {
        const elements = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href]') ?? [])].filter((element) => element.getClientRects().length > 0);
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keys);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keys); };
  }, [expanded]);

  const selectView = (next: ControllerView) => { setView(next); requestAnimationFrame(() => document.getElementById(`controller-tab-${next}`)?.focus()); };
  const tabKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : (index + direction + views.length) % views.length;
    selectView(views[nextIndex].id);
  };

  return <>
    <section aria-label="Hydrasynth Explorer controller" className="perform-card hydrasynth-launcher">
      <div className="hydrasynth-launcher__heading"><div><span className="control-panel__label">Controller</span><h3>Hydrasynth Explorer</h3></div><span className={`hydrasynth-launcher__state${midi.selectedId ? ' is-connected' : ''}`}>{connection}</span></div>
      <div className="hydrasynth-launcher__instrument"><strong>{layouts.activeLayout?.name ?? selected?.name ?? 'No named layout'}</strong><small>{mappingCount} mapping{mappingCount === 1 ? '' : 's'} · {armedCount} armed{midi.isRecordingTake ? ' · Recording' : midi.isReplayingTake ? ' · Replaying' : ''}</small></div>
      {mappingCount ? <div className="hydrasynth-launcher__mappings">{midiAssignmentTargets.filter((target) => midi.assignments[target]).map((target) => <ControllerMappingCard key={target} assignment={midi.assignments[target]} target={target} armed={midi.isArmed(target)} layout={layouts.activeLayout} compact />)}</div> : null}
      <button ref={launcherRef} type="button" aria-haspopup="dialog" aria-expanded={expanded} onClick={open}>Open controller</button>
      {midi.isRecordingTake ? <button type="button" onClick={() => midi.stopRecordingTake()}>Stop recording</button> : null}
      {midi.armedTargets.zoom && midi.zoomMode === 'continuous' ? <button type="button" className="is-secondary" onClick={midi.holdZoom}>Hold zoom</button> : null}
      {midi.armedTargets.zoom ? <button type="button" className="is-secondary" onClick={() => midi.releaseTarget('zoom')}>Release MIDI zoom</button> : null}
      {midi.armedTargets['palette.offset'] ? <button type="button" className="is-secondary" onClick={() => midi.releaseTarget('palette.offset')}>Release MIDI Palette offset</button> : null}
    </section>
    {expanded ? createPortal(<div className="hydrasynth-dialog-layer">
      <button type="button" tabIndex={-1} className="hydrasynth-dialog__backdrop" aria-label="Close controller workspace" onClick={close} />
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="hydrasynth-dialog-title" className="hydrasynth-dialog controller-workspace">
        <header className="controller-workspace__header">
          <div><span className="control-panel__label">Controller workspace</span><h2 id="hydrasynth-dialog-title">Hydrasynth Explorer</h2><p><span className={`controller-state${midi.selectedId ? ' is-live' : ''}`}>{connection}</span>{selected ? ` · ${selected.name ?? 'Unnamed MIDI input'}` : ''}{layouts.activeLayout ? ` · ${layouts.activeLayout.name}` : ''}</p></div>
          <div className="controller-workspace__header-actions">{midi.isRecordingTake ? <button type="button" className="is-recording" onClick={() => midi.stopRecordingTake()}>● Recording · Stop</button> : midi.isReplayingTake ? <span className="controller-state is-live">▶ Replaying take</span> : null}{!midi.connected ? <button type="button" disabled={midi.connecting} onClick={midi.connect}>{midi.connecting ? 'Connecting…' : 'Connect'}</button> : !midi.selectedId ? <label className="controller-header-input">Input<select aria-label="MIDI input" value={midi.selectedId} onChange={(event) => midi.selectInput(event.target.value)}><option value="">Select an input</option>{midi.inputs.map((input) => <option key={input.id} value={input.id}>{input.name ?? 'Unnamed MIDI input'}</option>)}</select></label> : null}<button ref={closeRef} type="button" className="is-secondary" onClick={close}>Close</button></div>
        </header>
        <div className="controller-workspace__body">
          <nav className="controller-workspace__nav" role="tablist" aria-label="Controller workspace sections">{views.map((item, index) => <button id={`controller-tab-${item.id}`} key={item.id} role="tab" type="button" aria-selected={view === item.id} aria-controls="controller-panel" tabIndex={view === item.id ? 0 : -1} onKeyDown={(event) => tabKey(event, index)} onClick={() => selectView(item.id)}>{item.label}{item.id === 'live' && (midi.isRecordingTake || midi.isReplayingTake) ? <span aria-hidden="true">●</span> : null}</button>)}</nav>
          <main id="controller-panel" role="tabpanel" aria-labelledby={`controller-tab-${view}`} className="controller-workspace__content" tabIndex={0}>
            {view === 'live' ? <LiveControllerView midi={midi} layouts={layouts} active={active} running={running} onNavigate={selectView} /> : null}
            {view === 'mappings' ? <MappingControllerView midi={midi} layouts={layouts} active={active} running={running} /> : null}
            {view === 'layouts' ? <ControllerLayoutsView midi={midi} layouts={layouts} active={active} running={running} /> : null}
            {view === 'takes' ? <PerformanceTakesView midi={midi} layouts={layouts} active={active} running={running} /> : null}
            {view === 'diagnostics' ? <MidiDiagnosticsView midi={midi} layouts={layouts} active={active} running={running} /> : null}
          </main>
        </div>
      </section>
    </div>, document.body) : null}
  </>;
}
