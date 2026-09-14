import { isConvergentFormula, iterateNewton, normalizeNewtonParameters } from '../fractals/newton';
import type { RenderConfig } from '../types/config';

export function NewtonControls({ config, onChange }: { config: RenderConfig; onChange: (config: RenderConfig) => void }) {
  if (!isConvergentFormula(config.fractal.formulaId)) return null;
  const p = normalizeNewtonParameters(config.fractal.parameters);
  const update = (key: string, value: number) => onChange({ ...config, fractal: { ...config.fractal, parameters: normalizeNewtonParameters({ ...p, [key]: value }) } });
  const control = (key: string, label: string, min: number, max: number, step: number) => <label key={key}>
    <span>{label}</span><input aria-label={label} type="range" min={min} max={max} step={step} value={p[key]} onChange={(event) => update(key, Number(event.target.value))} /><strong>{p[key].toFixed(step === 1 ? 0 : 2)}</strong>
  </label>;
  const centre = config.viewport.centre;
  const diagnostic = iterateNewton(config, centre.re.hi + centre.re.lo, centre.im.hi + centre.im.lo).convergence!;
  return <div className="control-panel__section">
    {control('degree', 'Polynomial roots', 2, 6, 1)}
    <details><summary>Polynomial & convergence</summary>
      <small>Roots sit evenly around a circle. Newton maps starting points to roots; Nova starts at the first root and adds the pixel coordinate each step.</small>
      {control('rootRadius', 'Root radius', 0.5, 2, 0.01)}
      {control('rootRotation', 'Root rotation', -3.14, 3.14, 0.01)}
      {control('relaxation', 'Relaxation', 0.2, 1.8, 0.01)}
      {control('toleranceExponent', 'Convergence precision', 4, 7, 1)}
      <small>Tolerance: 10⁻{p.toleranceExponent.toFixed(0)}. Degree changes are discrete; radius, rotation and relaxation can animate in Journey.</small>
      <p>Centre orbit: {diagnostic.status}, {diagnostic.steps} steps{diagnostic.rootIdentity >= 0 ? `, root ${diagnostic.rootIdentity + 1}` : ''}. Residual {diagnostic.residual.toExponential(1)}.</p>
      <small>Newton checks the polynomial residual; Nova checks step size. Nova fixed points are not generally polynomial roots, so it uses Convergence Speed. Unresolved orbits are dark, singular ones muted violet, divergent ones slate.</small>
    </details>
  </div>;
}
