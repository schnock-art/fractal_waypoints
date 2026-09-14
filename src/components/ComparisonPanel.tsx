import { materialRegistry } from '../visuals/materials/registry';
import { clonePalette } from '../palettes/model';
import { palettePresets } from '../palettes/presets';
import { summarizeComparisonWorkspace } from '../comparison/workspace';
import type { ComparisonConfig, ComparisonMode, ComparisonSide, FormulaId, MaterialId, RenderConfig } from '../types/config';
import { formulaRegistry } from '../fractals/registry';
import { MultibrotControls } from './MultibrotControls';
import { NewtonControls } from './NewtonControls';
import { isConvergentFormula, normalizeNewtonParameters } from '../fractals/newton';
import { resolveCompatibleRenderConfig, getMaterialCompatibility } from '../visuals/materials/registry';

interface ComparisonPanelProps {
  enabled: boolean;
  comparison: ComparisonConfig;
  onToggleEnabled: () => void;
  onModeChange: (mode: ComparisonMode) => void;
  onSyncChange: (enabled: boolean) => void;
  onActiveSideChange: (side: ComparisonSide) => void;
  onComparisonChange: (updater: (current: ComparisonConfig) => ComparisonConfig) => void;
  onSideConfigChange: (side: ComparisonSide, updater: (current: RenderConfig) => RenderConfig) => void;
  onLoadExploreToSide: (side: ComparisonSide) => void;
}

export function ComparisonPanel({
  enabled,
  comparison,
  onToggleEnabled,
  onModeChange,
  onSyncChange,
  onActiveSideChange,
  onComparisonChange,
  onSideConfigChange,
  onLoadExploreToSide,
}: ComparisonPanelProps) {
  const summary = summarizeComparisonWorkspace(comparison, enabled);

  return (
    <details className="control-panel__section control-panel__collapsible" open>
      <summary className="control-panel__summary">Compare</summary>

      <div className="comparison-panel">
        <div className="comparison-panel__overview">
          <div className="control-panel__note">
            <p>Comparison stage</p>
            <strong>{enabled ? 'Comparison mode is active' : 'Explore mode is active'}</strong>
            <span>{summary.modeLabel} · {summary.syncLabel}</span>
            <span>{summary.interactionLabel}</span>
          </div>

          <div className="comparison-panel__mode-grid">
            {([
              ['split', 'Split'],
              ['wipe', 'Wipe'],
              ['overlay', 'Overlay'],
              ['difference', 'Difference'],
            ] as const).map(([modeId, label]) => (
              <button
                key={modeId}
                type="button"
                className={comparison.mode === modeId ? 'comparison-panel__mode-card is-active' : 'comparison-panel__mode-card'}
                onClick={() => onModeChange(modeId)}
              >
                <strong>{label}</strong>
                <span>{getComparisonModeDescription(modeId)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="comparison-panel__toolbar">
          <button type="button" onClick={onToggleEnabled}>
            {enabled ? 'Exit comparison' : 'Open comparison'}
          </button>
          <label className="comparison-panel__toggle">
            <input
              type="checkbox"
              checked={comparison.synchroniseViewport}
              onChange={(event) => onSyncChange(event.target.checked)}
            />
            <span>Shared viewport</span>
          </label>
        </div>

        {comparison.mode === 'wipe' ? (
          <label>
            <span>Wipe position</span>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.01"
              value={comparison.wipe}
              onChange={(event) =>
                onComparisonChange((current) => ({
                  ...current,
                  wipe: Number(event.target.value),
                }))
              }
            />
            <strong>{Math.round(comparison.wipe * 100)}%</strong>
          </label>
        ) : null}

        {comparison.mode === 'overlay' || comparison.mode === 'difference' ? (
          <>
            <label>
              <span>Overlay opacity</span>
              <input
                type="range"
                min="0.15"
                max="1"
                step="0.05"
                value={comparison.overlayOpacity}
                onChange={(event) =>
                  onComparisonChange((current) => ({
                    ...current,
                    overlayOpacity: Number(event.target.value),
                  }))
                }
              />
              <strong>{Math.round(comparison.overlayOpacity * 100)}%</strong>
            </label>
            <div className="comparison-panel__side-toggle">
              <span>Interactive side</span>
              <div className="comparison-panel__side-buttons">
                <button
                  type="button"
                  className={comparison.activeSide === 'left' ? 'is-active' : ''}
                  onClick={() => onActiveSideChange('left')}
                >
                  Left
                </button>
                <button
                  type="button"
                  className={comparison.activeSide === 'right' ? 'is-active' : ''}
                  onClick={() => onActiveSideChange('right')}
                >
                  Right
                </button>
              </div>
            </div>
          </>
        ) : null}

        <div className="comparison-panel__sides">
          <ComparisonSideCard
            label="Left"
            config={comparison.left}
            onConfigChange={(updater) => onSideConfigChange('left', updater)}
            onLoadExplore={() => onLoadExploreToSide('left')}
          />
          <ComparisonSideCard
            label="Right"
            config={comparison.right}
            onConfigChange={(updater) => onSideConfigChange('right', updater)}
            onLoadExplore={() => onLoadExploreToSide('right')}
          />
        </div>
      </div>
    </details>
  );
}

interface ComparisonSideCardProps {
  label: string;
  config: RenderConfig;
  onConfigChange: (updater: (current: RenderConfig) => RenderConfig) => void;
  onLoadExplore: () => void;
}

function ComparisonSideCard({
  label,
  config,
  onConfigChange,
  onLoadExplore,
}: ComparisonSideCardProps) {
  return (
    <div className="comparison-panel__side-card">
      <div className="comparison-panel__side-header">
        <div>
          <strong>{label}</strong>
          <span>{formulaRegistry[config.fractal.formulaId].displayName}</span>
        </div>
        <button type="button" onClick={onLoadExplore}>
          Use current view
        </button>
      </div>

      <label>
        <span>Formula</span>
        <select
          aria-label="Formula"
          value={config.fractal.formulaId}
          onChange={(event) => {
            const formulaId = event.target.value as FormulaId;
            const parameters: Record<string, number> = formulaId === 'julia'
              ? {
                cReal: config.fractal.parameters.cReal ?? -0.8,
                cImag: config.fractal.parameters.cImag ?? 0.156,
              }
              : isConvergentFormula(formulaId) ? normalizeNewtonParameters() : formulaId === 'multibrot' ? { power: 3 } : {};

            onConfigChange((current) => resolveCompatibleRenderConfig({
              ...current,
              fractal: {
                ...current.fractal,
                formulaId,
                parameters,
              },
            }));
          }}
        >
          {Object.values(formulaRegistry).map((formula) => (
            <option key={formula.id} value={formula.id}>
              {formula.displayName}
            </option>
          ))}
        </select>
      </label>

      <MultibrotControls config={config} onChange={(next) => onConfigChange(() => next)} />
      <NewtonControls config={config} onChange={(next) => onConfigChange(() => next)} />
      <label>
        <span>Palette preset</span>
        <select
          value={findMatchingPalettePresetId(config.palette)}
          onChange={(event) => {
            const preset = palettePresets.find((entry) => entry.id === event.target.value);
            if (!preset) {
              return;
            }

            onConfigChange((current) => ({
              ...current,
              palette: clonePalette(preset.palette),
            }));
          }}
        >
          {palettePresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Material</span>
        <select
          value={config.material.id}
          onChange={(event) =>
            onConfigChange((current) => ({
              ...current,
              material: {
                ...current.material,
                id: event.target.value as MaterialId,
              },
            }))
          }
        >
          {Object.values(materialRegistry).map((material) => (
            <option key={material.id} value={material.id} disabled={!getMaterialCompatibility(config.fractal.formulaId, material.id).compatible}>
              {material.displayName}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Iterations</span>
        <input
          type="range"
          min="64"
          max="512"
          step="8"
          value={config.fractal.maxIterations}
          onChange={(event) =>
            onConfigChange((current) => ({
              ...current,
              fractal: {
                ...current.fractal,
                maxIterations: Number(event.target.value),
              },
            }))
          }
        />
        <strong>{config.fractal.maxIterations}</strong>
      </label>

      <label>
        <span>Colour density</span>
        <input
          type="range"
          min="0.004"
          max="0.08"
          step="0.002"
          value={config.material.parameters.density ?? 0.032}
          onChange={(event) =>
            onConfigChange((current) => ({
              ...current,
              material: {
                ...current.material,
                parameters: {
                  ...current.material.parameters,
                  density: Number(event.target.value),
                },
              },
            }))
          }
        />
        <strong>{(config.material.parameters.density ?? 0.032).toFixed(3)}</strong>
      </label>

      {config.material.id === 'orbitTrap' ? (
        <label>
          <span>Trap scale</span>
          <input
            type="range"
            min="0.2"
            max="3"
            step="0.05"
            value={config.material.parameters.trapScale ?? 1}
            onChange={(event) =>
              onConfigChange((current) => ({
                ...current,
                material: {
                  ...current.material,
                  parameters: {
                    ...current.material.parameters,
                    trapScale: Number(event.target.value),
                  },
                },
              }))
            }
          />
          <strong>{(config.material.parameters.trapScale ?? 1).toFixed(2)}</strong>
        </label>
      ) : null}
    </div>
  );
}

function findMatchingPalettePresetId(palette: RenderConfig['palette']): string {
  const match = palettePresets.find((preset) => JSON.stringify(preset.palette) === JSON.stringify(palette));
  return match?.id ?? palettePresets[0].id;
}

function getComparisonModeDescription(mode: ComparisonMode): string {
  switch (mode) {
    case 'split':
      return 'Two surfaces side by side for direct reading.';
    case 'wipe':
      return 'Slide a reveal line through one shared scene.';
    case 'overlay':
      return 'Blend both renders to compare structure and color.';
    case 'difference':
      return 'Highlight where the two renders diverge most.';
    default:
      return mode;
  }
}
