import {
  cloneMaterialPreset,
  lensEffectRegistry,
  materialPresets,
  materialRegistry,
} from '../colouring/registry';
import { cloneOrbitTrapSet, createOrbitTrap, MAX_ORBIT_TRAPS } from '../colouring/orbitTraps';
import { cloneOrbitTrapAppearance } from '../colouring/orbitMaterial';
import { getOrbitTrapAppearance, getOrbitTrapSet } from '../colouring/runtime';
import type { MaterialId, OrbitTrapPaletteMapping, OrbitTrapShape, RenderConfig } from '../types/config';

interface VisualLabProps {
  config: RenderConfig;
  onChange: (updater: (current: RenderConfig) => RenderConfig) => void;
}

const trapShapes: { id: OrbitTrapShape; label: string }[] = [
  { id: 'point', label: 'Point' },
  { id: 'line', label: 'Line' },
  { id: 'circle', label: 'Circle' },
  { id: 'cross', label: 'Cross' },
  { id: 'spiral', label: 'Spiral' },
];

export function VisualLab({ config, onChange }: VisualLabProps) {
  const material = materialRegistry[config.material.id];
  const trapSet = getOrbitTrapSet(config);
  const trapAppearance = getOrbitTrapAppearance(config);

  function updateTraps(updater: (current: typeof trapSet) => typeof trapSet) {
    onChange((current) => ({
      ...current,
      material: {
        ...current.material,
        orbitTraps: updater(getOrbitTrapSet(current)),
      },
    }));
  }

  function updateAppearance(updater: (current: typeof trapAppearance) => typeof trapAppearance) {
    onChange((current) => ({
      ...current,
      material: {
        ...current.material,
        orbitAppearance: updater(getOrbitTrapAppearance(current)),
      },
    }));
  }

  return (
    <details className="control-panel__section control-panel__collapsible" open>
      <summary className="control-panel__summary">Visual Lab</summary>
      <div className="discover-panel">
        <div className="control-panel__note">
          <p>Material → Lens</p>
          <strong>{material.displayName}</strong>
          <span>{material.description}</span>
          <span>Materials read orbit metrics; lens controls only adjust the completed image.</span>
        </div>

        <div className="control-panel__section-heading">
          <div>
            <p className="control-panel__label">Material presets</p>
            <strong>Reusable looks, independent of the formula</strong>
          </div>
        </div>
        <div className="visual-lab__preset-grid">
          {materialPresets.map((preset) => (
            <button className="visual-lab__preset-card" key={preset.id} type="button" onClick={() => onChange((current) => ({ ...current, ...cloneMaterialPreset(preset) }))}>
              <strong>{preset.name}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>

        <div className="control-panel__grid">
          <label>
            <span>Material</span>
            <select
              value={config.material.id}
              onChange={(event) => onChange((current) => ({
                ...current,
                material: {
                  ...current.material,
                  id: event.target.value as MaterialId,
                  orbitTraps: event.target.value === 'orbitTrap'
                    ? cloneOrbitTrapSet(current.material.orbitTraps)
                    : current.material.orbitTraps,
                },
              }))}
            >
              {Object.values(materialRegistry).map((entry) => <option key={entry.id} value={entry.id}>{entry.displayName}</option>)}
            </select>
          </label>
          <RangeControl label="Colour density" value={config.material.parameters.density ?? 0.032} min={0.004} max={0.08} step={0.002} display={(value) => value.toFixed(3)} onChange={(density) => onChange((current) => ({
            ...current,
            material: { ...current.material, parameters: { ...current.material.parameters, density } },
          }))} />
          {config.material.id === 'orbitTrap' ? (
            <RangeControl label="Trap response" value={config.material.parameters.trapScale ?? 1} min={0.2} max={3} step={0.05} onChange={(trapScale) => onChange((current) => ({
              ...current,
              material: { ...current.material, parameters: { ...current.material.parameters, trapScale } },
            }))} />
          ) : null}
        </div>

        {config.material.id === 'orbitTrap' ? (
          <section className="discover-panel__workflow-card">
            <div className="control-panel__section-heading">
              <div>
                <p className="control-panel__label">Trap field</p>
                <strong>Compose up to two transformed SDF traps</strong>
              </div>
              <button type="button" disabled={trapSet.traps.length >= MAX_ORBIT_TRAPS} onClick={() => updateTraps((current) => ({
                ...cloneOrbitTrapSet(current),
                traps: [...current.traps, createOrbitTrap('point')],
              }))}>
                Add trap
              </button>
            </div>
            <label>
              <span>Composition</span>
              <select value={trapSet.composition} onChange={(event) => updateTraps((current) => ({
                ...cloneOrbitTrapSet(current),
                composition: event.target.value === 'maximum' ? 'maximum' : 'minimum',
              }))}>
                <option value="minimum">Nearest / union</option>
                <option value="maximum">Intersection</option>
              </select>
            </label>

            {trapSet.traps.map((trap, index) => (
              <div className="control-panel__note" key={`trap-${index}`}>
                <div className="control-panel__section-heading">
                  <strong>Trap {index + 1}</strong>
                  <button type="button" disabled={trapSet.traps.length === 1} onClick={() => updateTraps((current) => ({
                    ...cloneOrbitTrapSet(current),
                    traps: current.traps.filter((_, trapIndex) => trapIndex !== index),
                  }))}>
                    Remove
                  </button>
                </div>
                <div className="control-panel__grid">
                  <label>
                    <span>Trap {index + 1} shape</span>
                    <select value={trap.shape} onChange={(event) => updateTrap(updateTraps, index, { shape: event.target.value as OrbitTrapShape })}>
                      {trapShapes.map((shape) => <option key={shape.id} value={shape.id}>{shape.label}</option>)}
                    </select>
                  </label>
                  <RangeControl label={`Trap ${index + 1} X`} value={trap.x} min={-2} max={2} step={0.02} onChange={(x) => updateTrap(updateTraps, index, { x })} />
                  <RangeControl label={`Trap ${index + 1} Y`} value={trap.y} min={-2} max={2} step={0.02} onChange={(y) => updateTrap(updateTraps, index, { y })} />
                  <RangeControl label={`Trap ${index + 1} rotation`} value={trap.rotation} min={-3.14} max={3.14} step={0.05} onChange={(rotation) => updateTrap(updateTraps, index, { rotation })} />
                  <RangeControl label={`Trap ${index + 1} scale`} value={trap.scale} min={0.1} max={2} step={0.05} onChange={(scale) => updateTrap(updateTraps, index, { scale })} />
                </div>
              </div>
            ))}
          </section>
        ) : null}

        {config.material.id === 'orbitTrap' ? (
          <section className="discover-panel__workflow-card">
            <div className="control-panel__section-heading">
              <div>
                <p className="control-panel__label">Material response</p>
                <strong>Keep the escape boundary readable while shaping the trap signal</strong>
              </div>
            </div>
            <div className="control-panel__grid">
              <label>
                <span>Orbit metric</span>
                <select value={trapAppearance.metric} onChange={(event) => updateAppearance((current) => ({
                  ...cloneOrbitTrapAppearance(current),
                  metric: event.target.value === 'final' ? 'final' : 'nearest',
                }))}>
                  <option value="nearest">Closest approach</option>
                  <option value="final">Final orbit point</option>
                </select>
              </label>
              <label>
                <span>Palette mapping</span>
                <select value={trapAppearance.paletteMapping} onChange={(event) => updateAppearance((current) => ({
                  ...cloneOrbitTrapAppearance(current),
                  paletteMapping: event.target.value as OrbitTrapPaletteMapping,
                }))}>
                  <option value="signal">Proximity signal</option>
                  <option value="distanceBands">Distance bands</option>
                </select>
              </label>
              <RangeControl label="Exterior trap mix" value={trapAppearance.exteriorMix} min={0} max={1} step={0.05} suffix="%" display={(value) => String(Math.round(value * 100))} onChange={(exteriorMix) => updateAppearance((current) => ({
                ...cloneOrbitTrapAppearance(current),
                exteriorMix,
              }))} />
              <RangeControl label="Interior trap mix" value={trapAppearance.interiorMix} min={0} max={1} step={0.05} suffix="%" display={(value) => String(Math.round(value * 100))} onChange={(interiorMix) => updateAppearance((current) => ({
                ...cloneOrbitTrapAppearance(current),
                interiorMix,
              }))} />
              <RangeControl label="Emissive accent" value={trapAppearance.emission} min={0} max={0.7} step={0.05} suffix="%" display={(value) => String(Math.round(value * 100))} onChange={(emission) => updateAppearance((current) => ({
                ...cloneOrbitTrapAppearance(current),
                emission,
              }))} />
            </div>
          </section>
        ) : null}

        <div className="control-panel__section-heading">
          <div>
            <p className="control-panel__label">Lens</p>
            <strong>Restrained presentation controls</strong>
          </div>
        </div>
        <div className="control-panel__grid">
          <RangeControl label="Exposure" value={config.lens.exposure} min={0.5} max={1.8} step={0.05} suffix="x" onChange={(exposure) => onChange((current) => ({ ...current, lens: { ...current.lens, exposure } }))} />
          <RangeControl label="Vignette" value={config.lens.vignette} min={0} max={0.75} step={0.05} suffix="%" display={(value) => String(Math.round(value * 100))} onChange={(vignette) => onChange((current) => ({ ...current, lens: { ...current.lens, vignette } }))} />
        </div>
        <div className="control-panel__note">
          {lensEffectRegistry.map((effect) => <span key={effect.id}>{effect.displayName}: {effect.description}</span>)}
        </div>
      </div>
    </details>
  );
}

function updateTrap(
  updateTraps: (updater: (current: ReturnType<typeof getOrbitTrapSet>) => ReturnType<typeof getOrbitTrapSet>) => void,
  index: number,
  updates: Partial<ReturnType<typeof getOrbitTrapSet>['traps'][number]>,
) {
  updateTraps((current) => ({
    ...cloneOrbitTrapSet(current),
    traps: current.traps.map((trap, trapIndex) => trapIndex === index ? { ...trap, ...updates } : trap),
  }));
}

function RangeControl({ label, value, min, max, step, suffix = '', display = (next) => next.toFixed(2), onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  display?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <strong>{display(value)}{suffix}</strong>
    </label>
  );
}
