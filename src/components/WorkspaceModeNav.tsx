import { workspaceModeDefinitions, type WorkspaceModeId } from '../app/workspaceModes';

interface WorkspaceModeNavProps {
  activeMode: WorkspaceModeId;
  onModeChange: (mode: WorkspaceModeId) => void;
  highlightMode?: WorkspaceModeId;
}

export function WorkspaceModeNav({
  activeMode,
  onModeChange,
  highlightMode,
}: WorkspaceModeNavProps) {
  return (
    <nav className="workspace-nav" aria-label="Explore tools">
      <div className="workspace-nav__header">
        <p className="control-panel__label">Explore tools</p>
      </div>

      <div className="workspace-nav__grid">
        {workspaceModeDefinitions.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={[
              'workspace-nav__mode',
              mode.id === activeMode ? 'is-active' : '',
              mode.id === highlightMode ? 'is-first-flight-target' : '',
            ].filter(Boolean).join(' ')}
            aria-pressed={mode.id === activeMode}
            title={mode.description}
            onClick={() => onModeChange(mode.id)}
          >
            <strong>{mode.label}</strong>
            <span>{mode.description}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
