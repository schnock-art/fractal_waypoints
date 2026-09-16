import type { RendererDiagnostics } from '../rendering/diagnostics';
import type { ComparisonConfig, ComparisonSide, NavigationSettings, RenderConfig } from '../types/config';
import { RenderView } from './RenderView';

interface ComparisonStageProps {
  interactionEnabled?: boolean;
  comparison: ComparisonConfig;
  navigationSettings: NavigationSettings;
  onLeftConfigChange: (config: RenderConfig) => void;
  onRightConfigChange: (config: RenderConfig) => void;
  onDiagnosticsChange?: (diagnostics: RendererDiagnostics) => void;
  onResetSide: (side: ComparisonSide) => void;
}

export function ComparisonStage({
  interactionEnabled = true,
  comparison,
  navigationSettings,
  onLeftConfigChange,
  onRightConfigChange,
  onDiagnosticsChange,
  onResetSide,
}: ComparisonStageProps) {
  const overlayMode = comparison.mode !== 'split';
  const overlayStyle = comparison.mode === 'wipe'
    ? { clipPath: `inset(0 ${Math.max(0, 1 - comparison.wipe) * 100}% 0 0)` }
    : { opacity: comparison.overlayOpacity };
  const overlayClassName = comparison.mode === 'difference'
    ? 'comparison-stage__layer comparison-stage__layer--stack comparison-stage__layer--difference'
    : 'comparison-stage__layer comparison-stage__layer--stack';

  return (
    <section className={comparison.mode === 'split' ? 'comparison-stage comparison-stage--split' : 'comparison-stage comparison-stage--stacked'}>
      <div className="comparison-stage__layer comparison-stage__layer--base">
        <RenderView
          viewId="comparison-left"
          title="Compare / Left"
          subtitle={comparison.synchroniseViewport ? 'Shared viewport reference surface' : 'Independent comparison surface'}
          config={comparison.left}
          onConfigChange={onLeftConfigChange}
          onDiagnosticsChange={onDiagnosticsChange}
          navigationSettings={navigationSettings}
          onRequestReset={() => onResetSide('left')}
          interactionEnabled={interactionEnabled && (!overlayMode || comparison.activeSide === 'left')}
        />
      </div>

      <div
        className={overlayMode ? overlayClassName : 'comparison-stage__layer comparison-stage__layer--base'}
        style={overlayMode ? overlayStyle : undefined}
      >
        <RenderView
          viewId="comparison-right"
          title="Compare / Right"
          subtitle={comparison.synchroniseViewport ? 'Shared viewport comparison surface' : 'Independent comparison surface'}
          config={comparison.right}
          onConfigChange={onRightConfigChange}
          onDiagnosticsChange={onDiagnosticsChange}
          navigationSettings={navigationSettings}
          onRequestReset={() => onResetSide('right')}
          interactionEnabled={interactionEnabled && (!overlayMode || comparison.activeSide === 'right')}
        />
      </div>
    </section>
  );
}
