# Phase 10.1 — Two-target pressure test

Implemented on main, September 15, 2026. Scope: Phoenix Orbit memory and palette offset only. No Perform surface, clock, graph, universal registry, new modulation target, or persistence schema was introduced.

| Target | Domain owner | Value contract | Existing consumers |
| --- | --- | --- | --- |
| `formula.phoenix.memory` | `fractals/phoenix.ts` | Continuous dimensionless coefficient; default −0.5, clamp to [−1, 1], linear interpolation; inactive outside Phoenix | Shared Explore/Compare Phoenix controls; domain normalisation used by import and Journey |
| `palette.offset` | `palettes/offset.ts` | Continuous palette-coordinate displacement; default 0, finite but unbounded, linear interpolation, no automatic wrapping | Palette editor, normalisation, existing palette modulation, Journey/config serialization |

`parameters/semantic.ts` provides closed, explicit describe/read/write dispatch. IDs are semantic names, not traversable object paths. The caller supplies the exact configuration; there is no active-view lookup, React-state address, GPU offset, clock, or base/effective ownership in these accessors. The existing persisted `palette.offset` ID is unchanged. Phoenix's new qualified address does not rename its stored `fractal.parameters.memory` field or extend `ModulationTarget`.

Writes accept only finite numbers. Unknown/inactive/invalid requests return a reason and the original configuration without mutation. Valid writes replace only the owned branch and preserve unrelated fields. Reads apply the domain's default/clamp policy to incomplete values without repairing the input in place; they are not whole-document validation. Import repair still uses domain defaults, unlike interactive writes which reject non-finite input. Palette modulation now rejects a non-finite/overflowed offset write instead of emitting an infinite offset.

The descriptors contain domain owner, continuous numeric kind, unit, default, bounds, linear interpolation policy, modulation eligibility, and separate display hints. Eligibility expresses mathematical suitability, not registration in today's waveform runtime. Both targets are eligible, but Phoenix remains Journey-keyframe-only until a later deliberate runtime extension. No discrete, event, or persistent-state protocol was invented to pad out this two-number contract.

## What the targets taught us

1. **Availability belongs to the owner.** A non-Phoenix formula can contain a numeric `memory` property and still must not accept this target. Unavailable is distinct from zero and from an unknown address. Formula transitions must not silently retarget stored controls.
2. **Display range is not a domain bound.** Palette's −1…1 slider is only an editing window. Clamping semantic writes there would break existing saved offsets and modulation. Repeat, mirror and clamp interpret offset differently, so wrapping or shortest-path interpolation would also change behaviour. Orbit memory genuinely is bounded.
3. **Display step is not quantisation.** Memory values between slider steps remain valid in imports, semantic writes and Journey interpolation.
4. **A small read/write seam is enough for this slice.** The palette-only editor uses its palette accessor without being taught about `RenderConfig`; the full-config semantic dispatcher and modulation use that same owner. UI, animation and persistence need not share one giant registry to share domain rules.
5. **Validation has layers.** Rejecting a bad command, repairing legacy input, and validating an entire evaluated frame are different operations. This seam validates only two writes; it does not fulfil Phase 10.2's final-frame validator or fix app-level base/effective state ownership.

## Review before expanding

- Add a discrete target only with explicit rounding/transition policy and tests; events/state require a separate actual use case. These two continuous targets do not validate a universal parameter type.
- Review composition, overflow/invalid-input reporting, unavailable mappings and semantic-to-waveform registration in 10.2. Do not infer support from `modulationEligible` alone.
- Preserve raw palette displacement and linear interpolation unless a separately explicit cyclic control is desired. Extremely large finite values still have GPU precision limits; “finite” is not a precision guarantee.
- Keep bounded positional trap-slot IDs unchanged. If reordering is introduced, decide stable instance identity and migration before exposing those targets.
- Decide whether normalized reads need accompanying repair diagnostics when consumers start accepting malformed documents directly; currently import and domain normalisation own repair.
- No registry-wide extraction, generic path traversal, new schema envelope, or global final validator is justified by these two targets. Review a concrete third owner before generalising descriptor ownership types.

## Future external playable-target admission

Phase 11.8 will use this semantic seam to assess external controller targets across navigation, formula, palette, material and lens owners. Every target must have a stable semantic identity, declared value kind, availability/inactive behaviour, true bounds distinct from display hints, interpolation policy, hardware-affordance fit, temporary-override ownership, composition policy, take-replay behaviour, performance impact and demonstrated expressive value. Julia real/imaginary coordinates are the first planned formula-specific acceptance case. Existing numeric configuration fields and internal modulation membership alone do not admit an external target.

## Verification and UX

Focused tests cover unknown/prototype-like addresses, formula availability, non-finite/non-number input, continuous clamping, unwrapped offsets across repeat modes, pure writes, read defaults, URL/Waypoint compatibility, Journey interpolation and legacy palette modulation without accumulation. The Phoenix browser regression exercises both existing controls, visible GPU rendering, reload and independent Compare editing.

No new UI is presented. Existing labels/ranges stay familiar. One pre-existing UX limitation is now explicit: an imported offset outside −1…1 can exceed the slider's representable range while its number remains valid. Track a later editor affordance rather than silently clamping saved data in this semantic slice.

Verified: 140 unit tests (including 15 new focused cases), TypeScript check, production build, and both Phoenix WebGPU browser tests pass. Inspected the captured lit-surface frame after both edits. The initial sandbox launch was blocked; the permitted browser run exposed a test locator mismatch (the offset label includes its displayed value), which was corrected before the successful rerun. No dependency or schema changes.
