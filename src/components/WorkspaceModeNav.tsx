import { getWorkspaceModeDefinition, workspaceModeDefinitions, type WorkspaceModeId } from '../app/workspaceModes';

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
  const activeDefinition = getWorkspaceModeDefinition(activeMode);

  return (
    <section className="control-panel__section control-panel__collapsible workspace-nav">
      <div className="workspace-nav__header">
        <div>
          <p className="control-panel__label">Explore tools</p>
          <strong>{activeDefinition.label}</strong>
          <span>{activeDefinition.description}</span>
        </div>
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
            onClick={() => onModeChange(mode.id)}
          >
            <strong>{mode.label}</strong>
            <span>{mode.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
