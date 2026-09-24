# Phase 10.2 — Internal evaluation, without a graph

Implementation update: the [first 10.3 Perform slice](PERFORM_FINDINGS.md) now exposes these mechanisms directly. Runtime results additionally carry ordered mapping diagnostics; the six target IDs, waveform/transform evaluation, ordered application and validation policies remain unchanged. The original 10.2 report below is historical.

Implemented from main. This extends existing internal modulation and Journey; it does not implement Perform, external control, discrete events, persistent signal state, or Patch. The six existing `ModulationTarget` IDs are unchanged. Phoenix Orbit memory remains a semantic/keyframe target, not a new waveform target.

## Ownership and evaluation

`App.tsx` keeps `mainConfig` authored. Journey has an independent logical preview time and a cloned playback clip. Ticks update only preview time, never `mainConfig` or URL state. Selecting a different tool does not restart transport. Editing the Journey document does not mutate the captured playback clip; replay starts from a fresh clone.

The shared path is `sampleAnimationBase` (interpolation only) → `evaluateConfiguration` → source/transform/mapping application → `normalizeEvaluatedConfig` → effective configuration. `sampleAnimationClip` wraps that path for existing callers and export. There is no second modulation stage in a renderer. Stopped Explore retains its existing non-running behaviour; loading a configuration does not automatically start motion.

Live preview, arbitrary-time sampling and generated frames call the same evaluator. A failed frame pauses preview and displays its reason, using a validated base fallback rather than the invalid candidate. Inactive or overflowed mappings are skipped with per-mapping issues, leaving earlier valid writes intact. The preview displays these issues; `sampleAnimationClip` retains its configuration-only return type. Export follows the same skip policy, but richer export warning presentation remains a review item before Perform.

Canvas resize was another potential write-back route: `RenderView` previously passed entire configurations upstream. Primary surface callbacks now own viewport only and consult current preview state, not a captured stale flag. During preview, aspect-ratio changes are presentation-local. Held navigation actions/drag state are cleared when interaction is disabled. The browser regression covers resize without changing authored URL state.

## Serializable composition

`RenderConfig.modulationProgram` is optional and independently versioned (`schemaVersion: 1`). The outer render-config schema remains 5: the optional extension does not relocate legacy fields. A configuration has either a program or nonempty legacy `modulations`, never both. Imports and evaluation reject ambiguity or unsupported program versions. No persisted migration to a second copy is performed; older configurations still retain their original IDs and values.

Legacy entries adapt in memory into one source and one additive mapping each, preserving list order. Adapter-local IDs identify entries by position but do not rename saved IDs. Disabled entries are now true no-ops; an enabled zero-valued mapping is still a deliberate target write. Waveform evaluation retains the existing signed-remainder phase convention, including negative authored phases/frequencies, rather than silently changing old curves.

A new program contains at most 32 sources and 64 mappings, with at most eight transforms per mapping. These are bounded document/work limits, not domain parameter ranges; legacy lists are validated entry-by-entry without imposing a new size limit on old documents. Sources can be shared; mappings refer to source IDs. There are no source-to-source edges, callbacks, graph traversal, target discovery, or cycle semantics.

Sources: constant, sine, triangle, saw, and seeded deterministic noise. Frequency is cycles per second; phase is in cycles; amplitude and offset act before transforms. Period is derived from nonzero frequency, not stored redundantly. Negative frequency reverses phase progression under the legacy convention; zero frequency holds a phase. Noise is a held value per integer cycle, generated from a 32-bit hash of cycle index and seed. It repeats with the hash's finite integer space and is not a random stream with mutable state.

Transforms run in listed order: scale, offset, sign inversion, clamp, signed power curve, and optional smoothing. Curve exponent must be positive and at most 8. Smoothing must be last, with a window in (0, 10] seconds. It is a fixed 16-point trailing mean, holding the time-zero signal for samples before zero. It is deliberately not a frame-history low-pass filter: seek, pause, export and reload give the same value for the same explicit time. This bounded approximation can alias high-frequency sources; it is not an audio filter.

Phase 11.4 moves the stateless transform definitions and evaluator to `connections/signalTransforms.ts` so external absolute controls use exactly the same scale/offset/invert/clamp/curve semantics. Internal smoothing stays in this explicit-time evaluator; it is intentionally not reinterpreted as live frame history. The external relationship/runtime contract is documented in [EXTERNAL_CONTROL.md](EXTERNAL_CONTROL.md).

Mapping mode is **add** or **replace**, in array order. Later mappings observe previous writes, including target-local clamping. Array order is the only priority mechanism. Mapping values use the target's existing domain units, not normalized slider positions. Palette displacement remains finite/unbounded and unwrapped. Material-specific trap/emission mappings are inactive outside Orbit Trap; absent trap slots are inactive. Lens mappings retain the existing effect-by-ID access and enable-on-write policy. No generic parameter-path setter was added.

## Validation and persistence boundaries

Program validation checks version, source/mapping IDs and references, supported waveforms/targets/transforms, finite settings, and bounded document sizes. Unknown target names are rejected, including `formula.phoenix.memory` in a program: mathematical eligibility does not automatically grant waveform support.

The final typed-frame boundary rejects non-finite numbers before normalisation, validates positive geometry/quality/iteration inputs and numeric parameter maps, uses domain normalisers for Phoenix/Newton/Multibrot, palette, traps and lenses, validates material requirements, and resolves formula/material compatibility in the effective output only. Iterations are rounded; continuous memory is clamped but not quantised. Palette offset is not clamped to its editing window. Finite values are not a guarantee of useful GPU precision or affordable render cost; existing rendering limits/diagnostics remain relevant.

This is a composed boundary for current typed render data, not an arbitrary-JSON schema validator or a universal future-parameter catalogue. Existing import repair remains separate. Non-finite keyframe data is checked before interpolation can mask it through repair. New program imports deep-clone the accepted data; configuration/Waypoint clones and URL round trips preserve it. Current older builds will not understand the new optional program; sharing static captures is the backwards-compatible visual route. Decide broader forward-version rejection policy before promising project portability across builds.

`snapshotEffectiveConfig` clones, validates and removes both motion representations from a captured frame. App captures also use the displayed canvas aspect ratio. Quick save, refresh and copied view links capture this static state; **Save base configuration** explicitly retains authored motion definitions. Capturing a preview into a Journey keyframe also bakes motion so it cannot be applied twice. None of these operations replaces the base. Full performance setup/project/take persistence remains Phase 10.3 work.

## Transport and UI scope

Journey preview has global-in-the-current-shell pause/resume and **Stop and edit base** controls, visible after changing tools. Main camera/formula/palette/material/quality editing is locked during preview. Stop clears preview time and restores the authored base. Finishing a Journey holds its final preview until Stop, without committing it. Hiding the document pauses logical time; resuming requires an explicit action. Starting Journey ends navigation capture; starting navigation capture stops the Journey. Existing navigation capture is still not performance recording.

Freeze, overrides, macros, multiple performance views and live controller recording remain deliberately unimplemented. Perform will build on these ownership constraints rather than infer a general event/state protocol from two types of transport state.

## Lessons and review before Perform

1. Separating interpolation from evaluation was straightforward; preventing incidental UI/resize callbacks from writing effective data back was the real ownership test. Keep view operations narrow.
2. Determinism requires a defined clock and smoothing history policy, not merely seeded noise. Review whether the bounded trailing mean feels right before presenting smoothing as a musical control.
3. Target-local clamping plus mapping order is observable. Review how Perform makes order and add/replace understandable; do not add a second priority system implicitly.
4. Disabled/inactive legacy writes used to have incidental side effects (for example enabling a lens at zero). They are now explicit no-ops when disabled/inactive. Review lens enable-on-write versus parameter value as a UX distinction before exposing macros.
5. Repair, rejected commands and final-frame validation are separate responsibilities. Before Perform, surface skipped-mapping issues in export feedback and decide broader malformed-input/unsupported-version recovery messaging.
6. The program has no native editor yet; it is a serialisable domain capability exercised through loaded configurations and Journey, not a hidden general patch framework. Keep the first Perform editor targeted to actual use cases.
7. Do not broaden target support to match the new source list. Preserve Phoenix ownership and unbounded palette displacement. Trap reordering still needs a separate identity/migration decision.

Tests cover legacy waveforms, single application, ordered composition, transforms, noise/smoothing seeks, cloning/serialization, snapshots, disabled/inactive targets, overflow and final-domain validation. Browser tests cover both persisted representations through playback, pause, tool switching, resize, static Waypoint capture, Stop and reload, alongside the existing GPU workflows.

Verification: 157 unit tests, TypeScript check and production build pass. The full 23-test browser suite passes; the two new ownership tests were additionally strengthened and rerun with visible-pixel assertions before capture and after resize. Inspected the resulting live preview screenshot. No dependencies, semantic targets, GPU kernels, external integrations or graph runtime were added. Changes remain on main, ready for review/commit.
