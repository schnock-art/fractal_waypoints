import type { ControllerLayout } from '../../connections/controllerLayout';
import { addressLabel } from '../../integrations/midi/controlInput';
import { midiTargetLabel, type MidiAssignment, type MidiAssignmentTarget } from '../../integrations/midi/useMidiControls';
import { assignmentResponseLabel, assignmentSourceLabel } from './controllerDisplay';

interface Props {
  assignment?: MidiAssignment;
  target: MidiAssignmentTarget;
  armed: boolean;
  layout?: ControllerLayout;
  onToggleArm?: () => void;
  onEdit?: () => void;
  onRelease?: () => void;
  onRemove?: () => void;
  compact?: boolean;
  canArm?: boolean;
  unavailableReason?: string;
}

export function ControllerMappingCard({ assignment, target, armed, layout, onToggleArm, onEdit, onRelease, onRemove, compact, canArm = true, unavailableReason }: Props) {
  const targetLabel = midiTargetLabel(target);
  const actionTarget = targetLabel;
  const testId = target === 'palette.offset' ? 'palette' : target === 'zoom' ? 'zoom' : target === 'formula.julia.cReal' ? 'julia-real' : 'julia-imaginary';
  return <article className={`controller-mapping-card${armed ? ' is-armed' : ''}${compact ? ' is-compact' : ''}`} {...(!compact ? { 'data-testid': `hydrasynth-mapping-${testId}` } : {})}>
    <div className="controller-mapping-card__heading">
      <div><strong>{assignmentSourceLabel(assignment, layout)}</strong>{assignment ? <small>{addressLabel(assignment.address)} · Channel {assignment.channel + 1}{layout ? ` · ${layout.name}` : ''}</small> : <small>No source selected</small>}</div>
      <span className={`controller-state${armed ? ' is-live' : ''}`}>{armed ? '● Armed' : '○ Disarmed'}</span>
    </div>
    <div className="controller-mapping-card__target"><span aria-hidden="true">→</span><strong>{targetLabel}</strong></div>
    <small>{assignment ? assignmentResponseLabel(assignment) : `Add a source to control ${targetLabel}.`}</small>
    {unavailableReason ? <small className="perform-warning">{unavailableReason}</small> : null}
    {!compact ? <div className="controller-mapping-card__actions">
      {onToggleArm ? <button type="button" disabled={!assignment || !canArm} aria-pressed={armed} onClick={onToggleArm}>{armed ? `Disarm ${actionTarget}` : `Arm ${actionTarget}`}</button> : null}
      {onEdit ? <button type="button" className="is-secondary" onClick={onEdit}>{assignment ? 'Edit mapping' : 'Add mapping'}</button> : null}
      {onRelease && armed ? <button type="button" className="is-secondary" onClick={onRelease}>Release {actionTarget}</button> : null}
      {onRemove && assignment ? <button type="button" className="is-danger" onClick={onRemove}>Remove mapping</button> : null}
    </div> : null}
  </article>;
}
