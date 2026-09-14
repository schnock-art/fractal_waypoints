import { normalizeMultibrotPower } from '../fractals/multibrot';
import type { RenderConfig } from '../types/config';

export function MultibrotControls({ config, onChange }: { config: RenderConfig; onChange: (config: RenderConfig) => void }) {
  if (config.fractal.formulaId !== 'multibrot') return null;
  const power = normalizeMultibrotPower(config.fractal.parameters.power);
  return <div className="control-panel__section">
    <label><span>Power</span><input aria-label="Power" type="range" min="2" max="8" step="0.01" value={power}
      onChange={(event) => onChange({ ...config, fractal: { ...config.fractal, parameters: { power: normalizeMultibrotPower(Number(event.target.value)) } } })} />
      <strong>{power.toFixed(2)}</strong></label>
    <small>Whole powers give symmetric forms. Fractional powers use a branch seam and reduced precision; save different powers as Journey keyframes to animate them.</small>
  </div>;
}
