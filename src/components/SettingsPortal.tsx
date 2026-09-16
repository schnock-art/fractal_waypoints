import { navigationActionDefinitions } from '../navigation/settings';
import { getBoundKey } from '../navigation/keyboard';
import type { DeepZoomDiagnostics } from '../rendering/deepZoomDiagnostics';
import type { RendererDiagnostics } from '../rendering/diagnostics';
import type { NavigationActionId, NavigationSettings } from '../types/config';

interface SettingsPortalProps {
  open: boolean;
  navigationSettings: NavigationSettings;
  pixelDensity: number;
  qualityLocked?: boolean;
  rebindingAction: NavigationActionId | null;
  rendererDiagnostics: RendererDiagnostics | null;
  deepZoomDiagnostics: DeepZoomDiagnostics;
  onClose: () => void;
  onResetNavigationSettings: () => void;
  onStartRebinding: (action: NavigationActionId) => void;
  onPixelDensityChange: (value: number) => void;
  onNavigationSettingsChange: (updater: (current: NavigationSettings) => NavigationSettings) => void;
  highlightControls?: boolean;
}

export function SettingsPortal({
  open,
  navigationSettings,
  pixelDensity,
  qualityLocked = false,
  rebindingAction,
  rendererDiagnostics,
  deepZoomDiagnostics,
  onClose,
  onResetNavigationSettings,
  onStartRebinding,
  onPixelDensityChange,
  onNavigationSettingsChange,
  highlightControls = false,
}: SettingsPortalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="settings-portal" role="dialog" aria-modal="true" aria-label="Settings portal">
      <button type="button" className="settings-portal__backdrop" onClick={onClose} aria-label="Close settings portal" />
      <section className="settings-portal__sheet">
        <div className="settings-portal__header">
          <div>
            <p className="control-panel__label">Settings</p>
            <h2>Explore tuning and global controls</h2>
            <span>Low-frequency controls live here so the Explore sidebar can stay focused.</span>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className={highlightControls ? 'settings-portal__body is-first-flight-target' : 'settings-portal__body'} data-testid="settings-controls">
          <section className="settings-portal__section">
            <p className="control-panel__label">View quality</p>
            <label>
              <span>Pixel density</span>
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.25"
                value={pixelDensity}
                disabled={qualityLocked}
                onChange={(event) => onPixelDensityChange(Number(event.target.value))}
              />
              <strong>{pixelDensity.toFixed(2)}x</strong>
              <small>Lower this to improve responsiveness at the cost of image resolution.</small>
              {qualityLocked ? <small>Stop the Journey preview to edit authored quality.</small> : null}
            </label>
          </section>

          <section className="settings-portal__section">
            <div className="control-panel__section-heading">
              <p className="control-panel__label">Navigation tuning</p>
              <button type="button" onClick={onResetNavigationSettings}>
                Restore defaults
              </button>
            </div>
            <div className="control-panel__grid">
              <label>
                <span>Move speed</span>
                <input
                  type="range"
                  min="0.2"
                  max="2"
                  step="0.05"
                  value={navigationSettings.panSpeed}
                  onChange={(event) =>
                    onNavigationSettingsChange((current) => ({
                      ...current,
                      panSpeed: Number(event.target.value),
                    }))
                  }
                />
                <strong>{navigationSettings.panSpeed.toFixed(2)}</strong>
              </label>
              <label>
                <span>Zoom speed</span>
                <input
                  type="range"
                  min="0.4"
                  max="3"
                  step="0.1"
                  value={navigationSettings.zoomSpeed}
                  onChange={(event) =>
                    onNavigationSettingsChange((current) => ({
                      ...current,
                      zoomSpeed: Number(event.target.value),
                    }))
                  }
                />
                <strong>{navigationSettings.zoomSpeed.toFixed(2)}</strong>
              </label>
              <label>
                <span>Turn speed</span>
                <input
                  type="range"
                  min="0.3"
                  max="3"
                  step="0.05"
                  value={navigationSettings.rotationSpeed}
                  onChange={(event) =>
                    onNavigationSettingsChange((current) => ({
                      ...current,
                      rotationSpeed: Number(event.target.value),
                    }))
                  }
                />
                <strong>{navigationSettings.rotationSpeed.toFixed(2)}</strong>
              </label>
              <label>
                <span>Boost multiplier</span>
                <input
                  type="range"
                  min="1.25"
                  max="6"
                  step="0.25"
                  value={navigationSettings.boostMultiplier}
                  onChange={(event) =>
                    onNavigationSettingsChange((current) => ({
                      ...current,
                      boostMultiplier: Number(event.target.value),
                    }))
                  }
                />
                <strong>{navigationSettings.boostMultiplier.toFixed(2)}x</strong>
              </label>
              <label>
                <span>Precision multiplier</span>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={navigationSettings.precisionMultiplier}
                  onChange={(event) =>
                    onNavigationSettingsChange((current) => ({
                      ...current,
                      precisionMultiplier: Number(event.target.value),
                    }))
                  }
                />
                <strong>{navigationSettings.precisionMultiplier.toFixed(2)}x</strong>
              </label>
            </div>
          </section>

          <section className="settings-portal__section">
            <p className="control-panel__label">Bindings</p>
            <div className="control-panel__bindings">
              {navigationActionDefinitions.map((definition) => (
                <div key={definition.id} className="control-panel__binding-row">
                  <span>{definition.label}</span>
                  <button
                    type="button"
                    onClick={() => onStartRebinding(definition.id)}
                    className={rebindingAction === definition.id ? 'control-panel__binding-button is-listening' : 'control-panel__binding-button'}
                  >
                    {rebindingAction === definition.id
                      ? 'Press a key...'
                      : formatBindingLabel(getBoundKey(navigationSettings, definition.id))}
                  </button>
                </div>
              ))}
            </div>
            {rebindingAction ? (
              <div className="control-panel__note control-panel__note--warning">
                <p>Rebinding</p>
                <strong>{navigationActionDefinitions.find((definition) => definition.id === rebindingAction)?.label}</strong>
                <span>Press any key to bind it, or press Escape to cancel.</span>
              </div>
            ) : null}
          </section>

          {rendererDiagnostics ? (
            <section className="settings-portal__section">
              <div className="control-panel__note">
                <p>Renderer diagnostics</p>
                <strong>{rendererDiagnostics.summary}</strong>
                {rendererDiagnostics.failureMessage ? <span>{rendererDiagnostics.failureMessage}</span> : null}
                {rendererDiagnostics.details.slice(0, 3).map((detail) => (
                  <span key={detail}>{detail}</span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="settings-portal__section">
            <div className={deepZoomDiagnostics.severity === 'warning' ? 'control-panel__note control-panel__note--warning' : 'control-panel__note'}>
              <p>Deep zoom diagnostics</p>
              <strong>{deepZoomDiagnostics.summary}</strong>
              {deepZoomDiagnostics.details.map((detail) => (
                <span key={detail}>{detail}</span>
              ))}
              {deepZoomDiagnostics.hints.map((hint) => (
                <span key={hint}>{hint}</span>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function formatBindingLabel(key: string | null): string {
  if (!key) {
    return 'Unbound';
  }

  if (key === ' ') {
    return 'Space';
  }

  return key.length === 1 ? key.toUpperCase() : key;
}
