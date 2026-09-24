import { useState } from 'react';
import type { ModulationTarget, RenderConfig } from '../types/config';
import { describeSemanticParameter, readSemanticParameter, type SemanticParameterId } from '../parameters/semantic';
import { commitPerformanceProgram, movePerformanceMapping, type PerformanceOverrides } from '../performance/model';
import { adaptLegacyModulations, modulationTargets, type InternalModulationProgram, type InternalSource, type SignalTransform } from '../visuals/modulation/program';
import { readModulationTarget, type MappingEvaluation } from '../visuals/modulation/runtime';
import { getLensEffect } from '../visuals/lenses/model';
import { HydrasynthMidiPanel } from './HydrasynthMidiPanel';

const labels: Record<ModulationTarget, string> = {
  'palette.offset': 'Palette offset',
  'material.orbitAppearance.emission': 'Orbit emission',
  'material.orbitTraps[0].rotation': 'Trap 1 rotation',
  'material.orbitTraps[1].rotation': 'Trap 2 rotation',
  'lens.effects.exposure.amount': 'Exposure',
  'lens.effects.vignette.amount': 'Vignette',
};
const controls: SemanticParameterId[] = ['palette.offset', 'formula.phoenix.memory'];
const format = (value: number | undefined) => value === undefined ? 'Unavailable' : Number(value.toFixed(4)).toString();
function describeTransform(transform: SignalTransform): string {
  switch (transform.kind) {
    case 'scale': return `Multiply by ${transform.value}`;
    case 'offset': return `Add ${transform.value}`;
    case 'curve': return `Signed power ${transform.value}`;
    case 'invert': return 'Invert sign';
    case 'clamp': return `Limit to ${transform.min}…${transform.max}`;
    case 'smooth': return `Trailing mean ${transform.windowSeconds} s`;
  }
}

interface Props {
  base: RenderConfig;
  effective: RenderConfig;
  active: boolean;
  running: boolean;
  journey: boolean;
  mappings: MappingEvaluation[];
  overrides: PerformanceOverrides;
  onOverride: (id: SemanticParameterId, value?: number) => void;
  onMidiZoom: (delta: number) => void;
  onMidiPaletteOffset: (value: number) => void;
  onMidiRelease: () => void;
  onChange: (config: RenderConfig) => void;
  onEdit: () => void;
}

export function PerformPanel({ base, effective, active, running, journey, mappings, overrides, onOverride, onMidiZoom, onMidiPaletteOffset, onMidiRelease, onChange, onEdit }: Props) {
  const [error, setError] = useState<string | null>(null);
  const program = base.modulationProgram ?? adaptLegacyModulations(base.modulations);
  const legacy = !base.modulationProgram && base.modulations.length > 0;
  const commit = (next: InternalModulationProgram) => {
    try { onChange(commitPerformanceProgram(base, next)); setError(null); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Invalid program.'); }
  };
  const change = (edit: (next: InternalModulationProgram) => void) => {
    const next = structuredClone(program); edit(next); commit(next);
  };
  return <div className="perform-panel control-panel__section">
    <div className="perform-card">
      <button type="button" onClick={onEdit}>Edit in Explore</button>
      <small>Primary only · no takes are being recorded.</small>
    </div>
    <HydrasynthMidiPanel active={active} running={running} onZoomDelta={onMidiZoom} onPaletteOffset={onMidiPaletteOffset} onRelease={onMidiRelease} />
    <section aria-label="Selected controls" className="perform-card">
      <h3>Selected controls</h3>
      <p>{active ? 'Knobs temporarily replace the evaluated value until Return to modulation or Stop.' : 'Press Play to use temporary live controls. Edit authored values in Explore.'}</p>
      {controls.map((id) => {
        const descriptor = describeSemanticParameter(id)!;
        const authored = readSemanticParameter(base, id);
        const live = readSemanticParameter(effective, id);
        return <div key={id} className="perform-control" data-testid={`control-${id}`}>
          <strong>{descriptor.label}</strong>
          <span>Base {authored.status === 'available' ? format(authored.value) : 'Unavailable'} · Effective {live.status === 'available' ? format(live.value) : 'Unavailable'}</span>
          {live.status !== 'available' ? <small>{live.reason}</small> : <>
            <input aria-label={`${descriptor.label} live`} type="range" min={descriptor.display.min} max={descriptor.display.max} step={descriptor.display.step}
              value={live.value} disabled={!active} onChange={(event) => onOverride(id, Number(event.target.value))} />
            {id === 'palette.offset' ? <label>Exact live offset (unbounded)
              <input type="number" step="0.01" value={live.value} disabled={!active}
                onChange={(event) => { if (event.target.value !== '' && Number.isFinite(event.target.valueAsNumber)) onOverride(id, event.target.valueAsNumber); }} />
            </label> : <small>Direct semantic control only; Orbit memory is not a waveform target.</small>}
            {overrides[id] !== undefined ? <><small>Temporary override · {format(overrides[id])}</small>
              <button type="button" onClick={() => onOverride(id)}>Return {descriptor.label} to modulation</button></> : null}
          </>}
        </div>;
      })}
    </section>
    <section aria-label="Ordered mappings" className="perform-card">
      <h3>Ordered mappings</h3>
      <p>Top to bottom. Add uses the preceding result; Replace overwrites it. Each write applies its target limits before the next mapping.</p>
      {journey && active ? <p role="status">Journey is playing its captured clip. These are Primary base definitions, not the clip’s mapping list.</p> : null}
      {active ? <small>Stop and edit base to change sources, order or mappings.</small> : null}
      {error ? <p role="alert">{error}</p> : null}
      {legacy ? <div><p>Legacy motion is preserved and played once. Converting explicitly replaces it with an editable version-1 program.</p>
        <button type="button" disabled={active} onClick={() => commit(program)}>Convert legacy motion for editing</button></div> : null}
      {!program.mappings.length ? <p>No mappings yet. Add a gentle palette wave, then Play.</p> : null}
      {program.mappings.map((mapping, index) => {
        const trace = !journey && active ? mappings[index] : undefined;
        const available = readModulationTarget(base, mapping.target) !== undefined;
        const status = trace?.status ?? (!mapping.enabled ? 'disabled' : !available ? 'inactive' : 'ready');
        const source = program.sources.find((entry) => entry.id === mapping.sourceId)!;
        const smooth = mapping.transforms.find((entry) => entry.kind === 'smooth');
        const lensId = mapping.target === 'lens.effects.exposure.amount' ? 'exposure' : mapping.target === 'lens.effects.vignette.amount' ? 'vignette' : null;
        return <article key={mapping.id} className="perform-mapping" aria-label={`Mapping ${index + 1}`}>
          <strong>{index + 1}. {labels[mapping.target]} · {status}</strong>
          <small>ID: {mapping.id} · Source: {mapping.sourceId}</small>
          <span>Base {format(readModulationTarget(base, mapping.target))} · Effective {format(readModulationTarget(effective, mapping.target))}</span>
          {trace?.status === 'active' ? <small>At this step: {format(trace.before)} → {mapping.mode} signal {format(trace.signal)} → {format(trace.after)} (before final validation and overrides)</small> : null}
          {trace?.reason || !available ? <p className="perform-warning">{trace?.reason ?? 'Inactive: requires Orbit Trap material and the addressed trap slot.'}</p> : null}
          {lensId ? <small>Enabled writes turn this lens on, even at zero signal. Base lens: {getLensEffect(base.lens, lensId).enabled ? 'on' : 'off'} · Effective lens: {getLensEffect(effective.lens, lensId).enabled ? 'on' : 'off'}. Stop restores base.</small> : null}
          <fieldset disabled={active || legacy}>
            <label><input type="checkbox" checked={mapping.enabled} onChange={(event) => change((next) => { next.mappings[index].enabled = event.target.checked; })} /> Enabled</label>
            <label>Target<select value={mapping.target} onChange={(event) => change((next) => { next.mappings[index].target = event.target.value as ModulationTarget; })}>
              {modulationTargets.map((target) => <option key={target} value={target}>{labels[target]}</option>)}
            </select></label>
            <label>Mode<select value={mapping.mode} onChange={(event) => change((next) => { next.mappings[index].mode = event.target.value as 'add' | 'replace'; })}>
              <option value="add">Add</option><option value="replace">Replace</option>
            </select></label>
            <div className="perform-actions">
              <button type="button" disabled={index === 0} onClick={() => commit(movePerformanceMapping(program, index, -1))}>Move up</button>
              <button type="button" disabled={index === program.mappings.length - 1} onClick={() => commit(movePerformanceMapping(program, index, 1))}>Move down</button>
            </div>
            <details><summary>Source and transforms</summary>
              <small>Source edits affect all mappings referencing {source.id} ({program.mappings.filter((entry) => entry.sourceId === source.id).length}).</small>
              <label>Source<select value={mapping.sourceId} onChange={(event) => change((next) => { next.mappings[index].sourceId = event.target.value; })}>
                {program.sources.map((entry) => <option key={entry.id}>{entry.id}</option>)}
              </select></label>
              <label>Waveform<select value={source.waveform} onChange={(event) => change((next) => {
                const edited = next.sources.find((entry) => entry.id === source.id)!;
                edited.waveform = event.target.value as InternalSource['waveform'];
                if (edited.waveform === 'noise') edited.seed ??= 1;
              })}>{['sine', 'triangle', 'saw', 'noise', 'constant'].map((wave) => <option key={wave}>{wave}</option>)}</select></label>
              {(['amplitude', 'frequencyHz', 'phase', 'offset', ...(source.waveform === 'noise' ? ['seed'] as const : [])] as const).map((key) =>
                <label key={key}>{({ amplitude: 'Amplitude (target units)', frequencyHz: 'Frequency (Hz)', phase: 'Phase (cycles)', offset: 'Source offset', seed: 'Noise seed' })[key]}
                  <input type="number" step={key === 'seed' ? 1 : 0.01} value={source[key] ?? 1} onChange={(event) => {
                    if (event.target.value !== '') change((next) => { next.sources.find((entry) => entry.id === source.id)![key] = event.target.valueAsNumber; });
                  }} />
                </label>)}
              <small>Transforms in order: {mapping.transforms.map(describeTransform).join(' → ') || 'none'}. Existing non-smoothing transforms are retained, inspect-only in this slice.</small>
              <label>Smoothing window (seconds; 0 = off)<input type="number" min="0" max="10" step="0.05" value={smooth?.windowSeconds ?? 0}
                onChange={(event) => { if (event.target.value !== '') change((next) => {
                  const transforms: SignalTransform[] = next.mappings[index].transforms.filter((entry) => entry.kind !== 'smooth');
                  if (event.target.valueAsNumber !== 0) transforms.push({ kind: 'smooth', windowSeconds: event.target.valueAsNumber });
                  next.mappings[index].transforms = transforms;
                }); }} /></label>
              <small>16-sample trailing mean; introduces lag, starts from time zero. High frequencies can alias. Play to judge the feel.</small>
            </details>
          </fieldset>
        </article>;
      })}
      <button type="button" disabled={active || legacy || program.sources.length >= 32 || program.mappings.length >= 64} onClick={() => change((next) => {
        let count = 1;
        while (next.sources.some((entry) => entry.id === `wave-${count}`) || next.mappings.some((entry) => entry.id === `wave-${count}`)) count++;
        const id = `wave-${count}`;
        next.sources.push({ id, waveform: 'sine', frequencyHz: 0.1, phase: 0, amplitude: 0.15, offset: 0 });
        next.mappings.push({ id, sourceId: id, target: 'palette.offset', mode: 'add', enabled: true, transforms: [] });
      })}>Add palette wave</button>
      <button type="button" disabled={active || legacy || !program.mappings.some((entry) => entry.enabled)} onClick={() => change((next) => { next.mappings.forEach((entry) => { entry.enabled = false; }); })}>Disable all mappings (keep definitions)</button>
    </section>
    <small>Fixed selected controls and temporary overrides are session-only. Base motion definitions use existing URLs and Save base configuration in Waypoints. This is not setup/take persistence; Journey exports do not record live gestures.</small>
  </div>;
}
