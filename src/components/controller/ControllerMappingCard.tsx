import type { ControllerLayout } from '../../connections/controllerLayout';
import { addressLabel } from '../../integrations/midi/controlInput';
import type { MidiAssignment, MidiAssignmentTarget } from '../../integrations/midi/useMidiControls';
import { assignmentResponseLabel, assignmentSourceLabel } from './controllerDisplay';

interface Props {
  assignment?: MidiAssignment;
  target: MidiAssignmentTarget;
  armed: boolean;
  layout?: ControllerLayout;
  onToggleArm?: () => void;
  onEdit?: () => void;
  onRelease?: () => void;
  compact?: boolean;
  canArm?: boolean;
}

export function ControllerMappingCard({ assignment, target, armed, layout, onToggleArm, onEdit, onRelease, compact, canArm = true }: Props) {
  const targetLabel = target === 'zoom' ? 'Zoom' : 'Palette offset';
  const actionTarget = target === 'zoom' ? 'zoom' : 'Palette offset';
  return <article className={`controller-mapping-card${armed ? ' is-armed' : ''}${compact ? ' is-compact' : ''}`} {...(!compact ? { 'data-testid': `hydrasynth-mapping-${target === 'zoom' ? 'zoom' : 'palette'}` } : {})}>
    <div className="controller-mapping-card__heading">
      <div><strong>{assignmentSourceLabel(assignment, layout)}</strong>{assignment ? <small>{addressLabel(assignment.address)} · Channel {assignment.channel + 1}{layout ? ` · ${layout.name}` : ''}</small> : <small>No source selected</small>}</div>
      <span className={`controller-state${armed ? ' is-live' : ''}`}>{armed ? '● Armed' : '○ Disarmed'}</span>
    </div>
    <div className="controller-mapping-card__target"><span aria-hidden="true">→</span><strong>{targetLabel}</strong></div>
    <small>{assignment ? assignmentResponseLabel(assignment) : `Add a source to control ${targetLabel}.`}</small>
    {!compact ? <div className="controller-mapping-card__actions">
      {onToggleArm ? <button type="button" disabled={!assignment || !canArm} aria-pressed={armed} onClick={onToggleArm}>{armed ? `Disarm ${actionTarget}` : `Arm ${actionTarget}`}</button> : null}
      {onEdit ? <button type="button" className="is-secondary" onClick={onEdit}>{assignment ? 'Edit mapping' : 'Add mapping'}</button> : null}
      {onRelease && armed ? <button type="button" className="is-secondary" onClick={onRelease}>Release {actionTarget}</button> : null}
    </div> : null}
  </article>;
}
