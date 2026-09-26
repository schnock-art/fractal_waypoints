import { findControllerLayoutLane, type ControllerLayout } from '../../connections/controllerLayout';
import { addressLabel } from '../../integrations/midi/controlInput';
import { findHydrasynthExplorerControl } from '../../integrations/midi/hydrasynthExplorerProfile';
import type { MidiAssignment } from '../../integrations/midi/useMidiControls';

export function assignmentSourceLabel(assignment: MidiAssignment | undefined, layout: ControllerLayout | undefined): string {
  if (!assignment) return 'Unassigned';
  const lane = findControllerLayoutLane(layout, assignment.address, assignment.channel);
  if (lane) return lane.label;
  if (assignment.relationship.source.deviceProfileId === 'asm-hydrasynth-explorer-2.2') {
    return findHydrasynthExplorerControl(assignment.address)?.label ?? addressLabel(assignment.address);
  }
  return addressLabel(assignment.address);
}

export function assignmentResponseLabel(assignment: MidiAssignment): string {
  if (assignment.target === 'zoom') {
    return assignment.relationship.mapping.target.kind === 'navigation-intent' && assignment.relationship.mapping.target.mode === 'turn'
      ? 'Zoom while turning' : 'Continuous speed · centre hold';
  }
  return `Range ${assignment.minimum ?? -1}…${assignment.maximum ?? 1} · Curve ${assignment.curve ?? 1}${assignment.inverted ? ' · Inverted' : ''}`;
}
