/** Only the continuous numeric contract exercised by Phase 10.1, not an event/state model. */
export interface NumericParameterDescriptor {
  readonly id: string;
  readonly owner: { readonly kind: 'formula'; readonly id: 'phoenix' } | { readonly kind: 'palette' };
  readonly label: string;
  readonly kind: 'continuous-number';
  readonly unit: 'dimensionless' | 'palette-coordinate';
  readonly defaultValue: number;
  readonly bounds: { readonly min: number; readonly max: number } | null;
  readonly interpolation: 'linear';
  readonly modulationEligible: boolean;
  readonly display: { readonly min: number; readonly max: number; readonly step: number };
}
