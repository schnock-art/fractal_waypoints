import { cloneMaterialPreset, createMaterialConfig, getMaterialCompatibility, materialPresets, materialRegistry, resolveCompatibleRenderConfig } from '../visuals/materials/registry';
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
    <section className="visual-lab tool-panel" aria-label="Visual Lab controls">
      <div className="discover-panel">
        <div className="control-panel__note">
          <p>Material → Lens</p>
          <strong>{material.displayName}</strong>
          <span>{material.description}</span>
          <span>{material.sampling === 'point' ? 'Uses local orbit metrics in the direct render path.' : 'Requires neighbouring metric samples.'}</span>
          {material.cpuSupport === 'approximate' ? <span>CPU fallback preserves this look with a lighter approximation; WebGPU enables full field detail.</span> : null}
          {!compatibility.compatible ? <span>This saved look needs {compatibility.missing.join(', ')}. Rendering with {materialRegistry[resolveCompatibleRenderConfig(config).material.id].displayName} instead; your saved look is preserved.</span> : null}
        </div>
        <div className="control-panel__section-heading"><div><p className="control-panel__label">Material presets</p><strong>Reusable looks, independent of the formula</strong></div></div>
        <div className="visual-lab__preset-grid">
          {materialPresets.filter((preset) => getMaterialCompatibility(config.fractal.formulaId, preset.material.id).compatible).map((preset) => <button className="visual-lab__preset-card" key={preset.id} type="button" onClick={() => onChange((current) => ({ ...current, ...cloneMaterialPreset(preset) }))}><strong>{preset.name}</strong><span>{preset.description}</span></button>)}
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
          {Object.values(lensEffectRegistry).flatMap((effect) => effect.parameters.map((parameter) => {
            const amount = getLensEffectAmount(config.lens, effect.id);
            const value = config.lens.effects.find((candidate) => candidate.id === effect.id)?.parameters[parameter.id] ?? parameter.defaultValue;
            return <RangeControl key={`${effect.id}-${parameter.id}`} label={parameter.label} value={value} min={parameter.min} max={parameter.max} step={parameter.step} suffix={effect.id === 'exposure' ? 'x' : ''} onChange={(nextValue) => onChange((current) => ({ ...current, lens: updateLensEffect(current.lens, effect.id, { [parameter.id]: nextValue }, effect.id === 'exposure' || effect.id === 'toneMapping' || nextValue > 0) }))} />;
          }))}
        </div>
        <details className="control-panel__note"><summary>About lens effects</summary>{Object.values(lensEffectRegistry).map((effect) => <span key={effect.id}>{effect.displayName}: {effect.description}</span>)}</details>
      </div>
    </section>
  );
}
