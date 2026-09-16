# Phase 10.0 — Workspace and state design

Status: design complete, September 15, 2026. The original design below specifies the wider target, not an assertion that every feature is implemented. Read alongside [ADR-028](DECISIONS.md#adr-028-workspaces-share-one-mathematical-world), ADR-029, and [INTEROPERABILITY.md](INTEROPERABILITY.md).

Implementation update after the first 10.3 slice: Explore/Perform navigation, Primary scope, shared internal/Journey transport, two fixed semantic controls with temporary overrides, and a narrow ordered mapping editor now exist. Compare restoration, base/effective readouts, mapping issues and static-versus-base capture are exposed. Full pin setup, macros, freeze, takes, promotion/undo and project persistence remain future work by deliberate incremental scope. See [PERFORM_FINDINGS.md](PERFORM_FINDINGS.md) and [MODULATION_EVALUATION.md](MODULATION_EVALUATION.md) for exact implementation and limitations; the original acceptance specifications below remain open where those features are absent.

## 1. One world, different benches

Choose two navigation levels. The top-level workspaces are **Explore** and **Perform** when Perform ships. Explore remains the default. Do not show a disabled Patch tab before Phase 12 is deliberately started. Settings/help remain global, outside either workspace's tool list.

Explore retains the current formula/navigation essentials, canvas, and focused tool selector: Visual Lab, Palette, Waypoints, Discover, Compare, Journey. These are tools within Explore, not six peers of Perform. Preserve their familiar names and capabilities. Remember the last Explore tool when returning from Perform; do not automatically send users to Journey when they press a transport button.

Perform presents the same primary world with a compact set of pinned controls, explicit macros, active-value/modulation indicators, and transport/recording controls. It does not duplicate formula editors or the palette curve editor. An “Edit in Explore” action returns to the relevant tool on that same world. Future Patch edits the same source/mapping model; graph layout remains local editor state.

Keep the canvas and renderer ownership above workspace panels. Switching tools can mount/unmount editors but must not create a second world, reset time, or reset the renderer merely because the panel changed. On narrower screens, use a compact workspace selector and one scrollable tool surface; do not stack two full inspectors. This specifies hierarchy, not colours, typography, or pixel layout.

## 2. Explicit view scope

The first Perform slice controls **Primary only**. Show a persistent “Performing: Primary · [formula name]” label. Canvas focus, hover, Compare `activeSide`, and sidebar selection do not retarget performance mappings or recording.

Compare remains an Explore tool with its existing independent left/right configurations, modes, and viewport synchronisation. Returning to Explore restores the comparison layout and selected side. Switching to Perform displays Primary without copying a Compare side into it. If Compare is visible on entry, make this distinction explicit and offer “Use Left as Primary” / “Use Right as Primary” as separate user actions, never an implicit effect of navigation. These copy the chosen base configuration, leave the comparison intact, and use the replacement rules below. Performing multiple comparison views is not in the first slice.

The linked Julia preview remains a secondary Explore view with its current seed/style-link policy. “Use Julia as Primary” is an explicit independent snapshot/promotion: copy its configuration into Primary without continuing a hidden live link. There is no automatic promotion on focus. Stop active playback/recording before promotion; warn before replacing unsaved primary edits and retain an undoable previous base. This is an authorised user-directed copy, not a workspace-specific clone.

Comparison synchronisation continues to affect comparison sides only. Perform navigation affects Primary only. Settings may apply globally, but parameter controls always identify their domain/view scope. Future multi-view performance would require its own explicit target identity, persistence, and recording design.

## 3. Ownership and lifetime

These are conceptual responsibilities, not a mandate for a particular state library or a universal entity registry.

| State | Owner and lifetime | Workspace-switch rule |
| --- | --- | --- |
| Primary base `RenderConfig` | Shared application/domain state; edited by explicit domain actions | Preserve; never replace from an evaluated frame |
| Compare left/right, layout and Julia seed/preview | Shared view composition; explicit independent/linked views | Preserve while not displayed; no automatic promotion |
| Journey clip and keyframes | Shared authored document data, independent of visible Journey panel | Preserve; editing the clip never rewrites base implicitly |
| Sources, transforms and mappings | Serializable domain behaviour, not Perform widgets | One canonical owner; reuse in Journey and future Patch |
| Performance setup | Serializable pins/order, macro definitions and mapping references | Preserve; no copied formula or palette state |
| Transport, clock, overrides, held frame, recording draft | Shared session runtime, above workspace panels | Preserve while switching; keep a global activity indicator |
| Effective configuration | Derived output of evaluation for a named view/time | Recompute or hold explicitly; never autosave into base |
| Selected Explore tool, expanded editors, scroll, focus | Workspace-local UI state | Restore last tool/expansion; cancel stale pointer/key gestures |
| Settings, navigation bindings | Global user preferences | Unchanged; not part of a Waypoint |
| Discovery jobs/results, export jobs | Shared job state with explicit input snapshots | Switching panels does not cancel; replacement invalidates stale results by identity |
| Metric snapshots/diagnostics | Derived analysis/resource state | Label input identity and freshness; not authoritative world state |

Keep existing `RenderConfig.modulations` authoritative for legacy configurations. Do not copy those mappings into both a Perform setup and a configuration. Pins reference semantic targets; macro definitions reference owned mappings. Phase 10.2 will choose the additive versioned representation for richer behaviour and adapt old modulations exactly once. Phase 10.0 does not assign new schema numbers or invent a generic graph format.

## 4. Base versus evaluated values

Use the ADR-026 evaluation order: base or Journey keyframes → interpolation → modulation and performance overrides → final domain normalisation/validation → effective `RenderConfig` → renderer. The input to each evaluation is authored state plus explicit time and reproducible runtime inputs, never the previous effective configuration. Apply each modulation once. Today `sampleAnimationClip` already applies modulation; implementation must separate or reuse that stage without adding a second application downstream.

Transport is global to the primary performance. It has one explicit logical time, independent of panel mount and GPU completion. Journey and internal modulation use that time; seek/export must reconstruct deterministic source/transform state. Only one primary playback/recording activity is active at a time in the first slice. Switching workspaces does not restart or stop it. Reload/import always starts stopped; hidden-tab behaviour must pause the logical clock rather than silently skip recording intervals, with a visible resume action.

Ordinary Explore edits while stopped update the base. While playback or a take is active, shared editors identify the effective value as a preview and require “Stop and edit base” before changing authored formula/material/palette configuration. Perform gestures are explicit temporary target overrides after modulation, bounded by domain rules, until released via “Return to modulation”; they do not overwrite base. A take records their onset, values, release, and logical times. Do not make pointer release an undocumented commit or release rule.

| Action | Intended effect |
| --- | --- |
| Play / Resume | Start at zero after Stop, or continue the paused logical time |
| Pause | Hold logical time and effective values; preserve overrides and take state |
| Freeze view | Latch displayed effective configuration while logical time continues; show “View frozen” and recording status separately |
| Unfreeze | Show the current evaluated time, not a restarted source |
| Stop | End/finalise an active take, reset transport to zero, clear overrides/held view, display base with live evaluation inactive |
| Restore base | Stop and return to the existing authored base; preserve pins, mappings, clips, and completed takes |
| Reset mappings | Disable selected mappings (or explicitly all), clear their overrides, retain definitions for re-enabling/undo; do not reset formula or camera |
| Keep this frame as base | Explicitly snapshot the effective frame into a static base; clear baked modulation from that snapshot and disable session mappings affecting it to avoid double application; preserve previous base/setup for undo |
| Record | Capture a primary take with initial base/clip, source seeds, mapping revision and timed semantic gestures; preserve a completed draft for Journey review |

Freeze is a display hold, not a pause in mathematical evaluation; screenshots/“Save current frame” use the held view, while the take continues recording the underlying timeline. Label this distinction. Do not silently claim the freeze was recorded as a Journey effect. Recording display holds as authored events can be considered separately if needed.

Changing formula or loading a Waypoint is an explicit base replacement, not a workspace switch. First stop/finalise a take; preserve it for review. Clear temporary overrides and freeze state. Keep pins, but mark unavailable formula/material targets inactive with a reason; never reroute them to another parameter with a similar name. Existing setup mappings remain disarmed after replacement until reviewed/re-enabled; incoming legacy modulation definitions are preserved but transport starts stopped. Provide a “Clear unavailable pins” action, not silent deletion.

## 5. Persistence responsibilities

Today URL state serialises one `RenderConfig`; local storage persists Waypoints and navigation preferences. `AnimationClip` is serialisable but the app has no complete project-document import/export or performance-session recovery layer. The following is the target contract, not a claim those features exist.

| Surface | Save/load contract |
| --- | --- |
| Address bar | Primary authored base only; update on explicit base changes, not clock ticks, workspace selection, Compare focus, or effective modulation values |
| Copy view link | Default to a labelled static snapshot of the visible named view; if live/frozen, bake its effective values and remove modulations from the snapshot only. Do not mutate the current base/setup |
| Waypoint | Default “Save current view” captures a reproducible static visible view, with matching thumbnail; offer explicitly labelled “Save base configuration” to preserve authored modulation definitions. Neither includes pins, transport, or an entire performance setup |
| Journey | Authoritative keyframes and deterministic behaviour; performance takes need initial state, ordered timed gestures, seeds and mapping revisions, not raw UI recordings or merely approximate keyframes |
| Project document | Future versioned envelope for base, explicit view composition, palettes/Waypoints, Journey clips/takes and performance setup; workspace preference can be an optional hint, not mathematical state |
| Session recovery | Future best-effort draft recovery for authored world/setup/clip and UI selection; reopen stopped, clear transient overrides, never resume recording or hardware automatically |
| User preferences | Existing local navigation/settings remain independent of project and URL data |
| Image/video export | Static export uses the chosen effective/held view. Time-based export uses a frozen input document and deterministic evaluator, never a live screen or mutable setup |

On initial load, a valid explicit URL wins over recovered world state and opens Explore stopped; recovery must not silently combine unrelated mappings with it. Without a URL, offer recovery of a valid draft; otherwise use defaults. Invalid URLs/recovery data produce a clear fallback notice rather than data loss. Explicit project import warns about unsaved work, validates the entire incoming document, and replaces state atomically; it does not auto-start transport.

Existing saved URLs and Waypoints retain their modulation definitions and migrations. No schema bump is needed for this design. New performance/take/project structures require independent version fields and tested import/migration boundaries when implemented. The first richer behaviour change must include old saved-config fixtures, not move or rename persisted targets for UI convenience. Recovery storage is optional: show save failures and offer explicit export once supported; do not imply a take is durable merely because it exists in memory.

## 6. Design walkthrough and acceptance specifications

These are desk-checked scenarios against the design, not executed tests of unimplemented features. They define the later regression suite.

| Scenario | Expected result / invariant | Implementation gate |
| --- | --- | --- |
| Discover Phoenix → load result → save Waypoint → Perform | Same primary formula, viewport, palette, material and base; no automatic copy or reset | 10.3 browser flow |
| Pin Orbit memory and palette offset → start LFO → return to Explore | Pins persist, time continues, both base and effective values are distinguishable; base and address bar unchanged by ticks | 10.1 target tests; 10.2 evaluator; 10.3 browser flow |
| Record gesture → pause → resume → stop → replay/export | Take retains initial state and ordered overrides; paused wall time adds no motion; same samples at equal logical times | 10.2/10.3 recording and export fixtures |
| Switch workspace during recording | Recording remains on Primary; persistent indicator and Stop are reachable in either workspace | 10.3 browser/accessibility flow |
| Compare Right focused → Perform | Primary is clearly named; Right is not silently performed or copied; return restores Compare | 10.3 scope regression |
| Explicitly promote Compare Right / linked Julia | Primary changes only on explicit action; source remains intact; active take is stopped and prior base recoverable | 10.3 promotion regression |
| Phoenix → Newton while pins exist | Orbit memory becomes visibly unavailable; no write into Newton parameters; mappings remain disarmed until reviewed | 10.1 compatibility; 10.3 replacement flow |
| Save current frame with live modulation → reload link/Waypoint | Same static values, no modulation applied twice; active setup remains unchanged in the original session | 10.2 snapshot/serialization tests |
| Freeze during a take → save image → unfreeze | Image uses held view; take clock continues; unfreeze shows current time with no base mutation | 10.3 transport tests |
| Reload/recover or open explicit URL | Stopped, no surprise motion or hardware activity; explicit URL wins; base/setup not silently merged | Persistence integration tests |
| Future Patch replaces LFO with hardware | Same mapping/target and world; only source association changes; old source is not evaluated as well | Phase 11/12 design check only |

Keyboard focus returns to the workspace control or an appropriate tool heading after a switch, never an invisible control. Stop must remain reachable without relying on colour. Cancel held navigation keys/drag gestures on focus loss or workspace switch without resetting transport. With many pins, provide ordering and a usable empty state (“Pin controls from Explore”), rather than exposing the whole parameter catalogue by default.

## 7. Incremental implementation handoff

1. **10.1:** introduce domain-owned semantic descriptors/accessors for a small real set, beginning with Phoenix Orbit memory and palette offset. Preserve IDs, validate availability and bounds, and test without adding Perform or a giant registry.
2. **10.2, before a live clock:** extract authored versus effective ownership and pure evaluation from app orchestration; remove playback writes to base/URL; add transport, legacy single-application and static-snapshot tests. Then evolve internal sources/transforms. No new state-management dependency is required by this design.
3. **10.3:** add the workspace shell and focused Perform UI over that evaluator, explicit primary/promote scope, pins/macros, override/restore and recording semantics. A reproducible take model must precede a claim of performance recording/export; the existing navigation-event capture is not sufficient. Ship versioned setup/take persistence alongside those features, using a minimal project envelope rather than a general project framework. Session recovery can follow explicit save/load, but lack of recovery must be visible.
4. **10.4:** provide bounded capability-aware measurements to internal consumers. Panels subscribe to shared analysis results, not GPU texture internals or their own analysis backends.

Remaining implementation choices: exact parameter descriptor types (10.1), waveform/transform state and sampling/composition details plus migration representation (10.2), take sampling fidelity, concrete project schema and control layout (10.3), and metric snapshot budgets (10.4). They must satisfy this ownership/navigation/persistence contract; they do not reopen whether workspaces own different worlds. Hardware, Patch, feedback, deep zoom and 3D are not authorised by this design.

## 8. Repository findings and UX review

Evidence: [workspace modes](../src/app/workspaceModes.ts), [app composition](../src/app/App.tsx), [configuration types](../src/types/config.ts), [Journey sampling](../src/animation/interpolation.ts), [comparison model](../src/comparison/model.ts), [URL state](../src/persistence/urlState.ts), and [local storage](../src/persistence/storage.ts).

The current reusable renderer and serialisable domain model fit this design. The actual gaps are app-level state ownership, incomplete semantic metadata, playback writing into `mainConfig`, and the absence of durable performance/take documents. Existing `ComparisonConfig.activeSide` is useful editor selection, not an implicit global performance target. Current Journey start/record handlers select Journey and hide Compare; the future shell must replace those presentation side effects with explicit activity state. These are bounded follow-on changes, not reasons to introduce another renderer or generic graph framework.

UX risks addressed here: ambiguous Compare targets, hidden active recording, control values differing from saved base, double-applied modulation in snapshots, unavailable pins after formula changes, and confusion between freeze and pause. The roadmap records remaining focus-loss and recovery affordance verification. No live-app validation is claimed for these planned interactions; this phase changes documentation only.
