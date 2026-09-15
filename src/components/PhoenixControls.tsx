import { normalizePhoenixParameters, phoenixParameterDefinitions } from '../fractals/phoenix';
import type { RenderConfig } from '../types/config';
import { writeSemanticParameter } from '../parameters/semantic';

export function PhoenixControls({ config, onChange }: { config: RenderConfig; onChange: (config: RenderConfig) => void }) {
  if (config.fractal.formulaId !== 'phoenix') return null;
  const parameters = normalizePhoenixParameters(config.fractal.parameters);
  const control = (definition: typeof phoenixParameterDefinitions[number]) => <label key={definition.id}>
    <span>{definition.label}</span>
    <input aria-label={definition.label} type="range" min={definition.min} max={definition.max} step={definition.step} value={parameters[definition.id]}
      onChange={(event) => onChange(definition.id === 'memory'
        ? writeSemanticParameter(config, 'formula.phoenix.memory', Number(event.target.value)).config
        : { ...config, fractal: { ...config.fractal, parameters: normalizePhoenixParameters({ ...parameters, [definition.id]: Number(event.target.value) }) } })} />
    <strong>{parameters[definition.id].toFixed(5)}</strong>
  </label>;
  return <div className="control-panel__section">
    {control(phoenixParameterDefinitions[2])}
    <small>Each orbit remembers its previous step. Zero memory gives the matching Julia set.</small>
    <details><summary>Phoenix shape</summary>
      {phoenixParameterDefinitions.slice(0, 2).map(control)}
      <small>The pixel is the starting point; the earlier orbit value starts at zero. Save different shapes as Journey keyframes to animate the memory and constant.</small>
    </details>
  </div>;
}
