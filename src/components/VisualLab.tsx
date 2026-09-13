import { cloneMaterialPreset, createMaterialConfig, getMaterialCompatibility, materialPresets, materialRegistry } from '../visuals/materials/registry';
import { getLensEffectAmount, lensEffectRegistry, updateLensEffect } from '../visuals/lenses/model';
import type { MaterialId, RenderConfig } from '../types/config';
import { ActiveMaterialControls, RangeControl } from './MaterialEditors';

interface VisualLabProps {
  config: RenderConfig;
  onChange: (updater: (current: RenderConfig) => RenderConfig) => void;
}

export function VisualLab({ config, onChange }: VisualLabProps) {
  const material = materialRegistry[config.material.id];
  const compatibility = getMaterialCompatibility(config.fractal.formulaId, material.id);

  return (
    <details className="control-panel__section control-panel__collapsible" open>
      <summary className="control-panel__summary">Visual Lab</summary>
      <div className="discover-panel">
        <div className="control-panel__note">
          <p>Material → Lens</p>
          <strong>{material.displayName}</strong>
          <span>{material.description}</span>
          <span>{material.sampling === 'point' ? 'Uses local orbit metrics in the direct render path.' : 'Requires neighbouring metric samples.'}</span>
          {!compatibility.compatible ? <span>Unavailable for this formula: {compatibility.missing.join(', ')}</span> : null}
        </div>
        <div className="control-panel__section-heading"><div><p className="control-panel__label">Material presets</p><strong>Reusable looks, independent of the formula</strong></div></div>
        <div className="visual-lab__preset-grid">
          {materialPresets.map((preset) => <button className="visual-lab__preset-card" key={preset.id} type="button" onClick={() => onChange((current) => ({ ...current, ...cloneMaterialPreset(preset) }))}><strong>{preset.name}</strong><span>{preset.description}</span></button>)}
        </div>
        <div className="control-panel__grid">
          <label><span>Material</span><select value={config.material.id} onChange={(event) => onChange((current) => {
            return { ...current, material: createMaterialConfig(event.target.value as MaterialId) };
          })}>
            {Object.values(materialRegistry).map((entry) => <option key={entry.id} value={entry.id} disabled={!getMaterialCompatibility(config.fractal.formulaId, entry.id).compatible}>{entry.displayName}</option>)}
          </select></label>
        </div>
        <ActiveMaterialControls definition={material} config={config} onChange={onChange} />
        <div className="control-panel__section-heading"><div><p className="control-panel__label">Lens</p><strong>Ordered presentation effects</strong></div></div>
        <div className="control-panel__grid">
          {Object.values(lensEffectRegistry).map((effect) => {
            const parameter = effect.parameters[0];
            const amount = getLensEffectAmount(config.lens, effect.id);
            return <RangeControl key={effect.id} label={parameter.label} value={amount} min={parameter.min} max={parameter.max} step={parameter.step} suffix={effect.id === 'exposure' ? 'x' : '%'} display={effect.id === 'vignette' ? (value) => String(Math.round(value * 100)) : undefined} onChange={(nextAmount) => onChange((current) => ({ ...current, lens: updateLensEffect(current.lens, effect.id, { amount: nextAmount }, effect.id === 'exposure' || nextAmount > 0) }))} />;
          })}
        </div>
        <div className="control-panel__note">{Object.values(lensEffectRegistry).map((effect) => <span key={effect.id}>{effect.displayName}: {effect.description}</span>)}</div>
      </div>
    </details>
  );
}
