# Fractal Explorer — Roadmap

## Direction after Phase 9 — From Explorer to Instrument

Current milestone: Phase 9.3 and the **Phase 10.0 design** are complete. The next implementation slice is **Phase 10.1**. Perform and the new evaluator are not implemented yet. Historical completion records below remain intact; relocated unchecked work is linked to its new home rather than declared complete.

| Era | Role | Status |
| --- | --- | --- |
| Phases 1–7 | Core explorer: navigation, Waypoints, Discover, Compare, Journey | Delivered foundation; historical follow-ups remain |
| Phase 8 | Visual instrument: metrics, materials, Visual Lab, HDR | Delivered core; polish and capability-gated work remain |
| Phase 9 | Mathematical architecture pressure test | Complete milestone; specialist admissions remain research |
| Phase 10 | The Instrument: make the existing world playable | 10.0 design complete; 10.1 semantic controls next |
| Phases 11–12 | Connections, then Patch Bay | Unscheduled until deliberately started |

Deep Space, Third Dimension, and Alternative Mathematics are optional parallel research tracks, not prerequisites for the instrument. The long-term Schnock Generative Instrument is a conceptual workshop of independently useful peers, not an application rename, monorepo plan, or framework mandate.

## Phase 1 — Rendering foundation

- [x] Scaffold TypeScript application and test runner.
- [x] Define domain types and schema constants.
- [x] Implement and unit-test CPU double-single arithmetic.
- [x] Implement matching WGSL double-single helpers.
- [x] Initialise WebGPU and render a full-screen surface.
- [x] Implement coordinate mapping with double-single viewport centres.
- [x] Implement Mandelbrot and Julia.
- [x] Introduce a reusable `RenderView` abstraction for Explore, Julia preview, and future comparison layouts.
- [x] Add smooth pan and zoom.
- [x] Add configurable keyboard navigation with default game-like bindings.
- [x] Add basic smooth escape-time colouring.
- [x] Create the render coordinator interface.

Definition of done: users can explore Mandelbrot and Julia sets, with viewport coordinates going through the double-single path and rendering routed through the reusable `RenderView` abstraction.

## Phase 2 — Palette system

- [x] Define palette model and validation.
- [x] Implement linear, smoothstep, and cubic interpolation.
- [x] Build palette curve editor.
- [x] Add stop insertion, movement, deletion, colour editing, reverse, repeat, and mirror.
- [x] Add palette presets and PNG export.
- [x] Test CPU/GPU palette sampling against shared fixtures.

Status on August 29, 2026: complete.

## Phase 2.5 — Palette UX refinement

- [x] Rework the palette editor around a more direct color-picker style interaction model.
- [x] Improve stop selection, visual feedback, and quick color editing flows.
- [x] Review palette controls against Explore, Discover, Compare, and Journey workflows.
- [x] Preserve the existing palette data model while refining the editor experience.

Status on August 30, 2026: complete.

## Phase 3 — Waypoints and sharing

- [x] Save/edit Waypoints and thumbnails.
- [x] Add navigation and browser history integration.
- [x] Encode/decode RenderConfig in URLs.
- [x] Persist user navigation settings and key bindings.
- [x] Add curated initial Waypoints.
- [x] Add basic interestingness scoring.

Status on August 29, 2026: complete.

## Phase 4 — Discovery

- [x] Implement multi-resolution tile sampling.
- [x] Score boundary density and iteration variance.
- [x] Deduplicate nearby candidates.
- [x] Convert candidates into Waypoints.
- [x] Add Discover UI and progress reporting.

Status on August 29, 2026: complete.

## Phase 5 — Comparison

- [x] Implement split view with shared viewport.
- [x] Add independent left/right configurations.
- [x] Add wipe, difference, and overlay modes.
- [x] Reuse the existing `RenderView` foundation rather than introducing a comparison-only render path.

Status on August 29, 2026: complete.

## Phase 6 — Animation and recording

- [x] Define keyframe editor.
- [x] Implement configuration interpolation.
- [x] Add Waypoint-to-Waypoint journeys and parameter animation.
- [x] Support optional recording and playback of semantic navigation actions for preview tooling, while exports remain configuration-driven.
- [x] Generate deterministic frames at a target FPS.
- [x] Add browser-native WebM and image-sequence export.

Status on August 29, 2026: complete.

## Phase 6.5 — Workspace shell redesign

- [x] Separate always-on Explore essentials from the heavier authoring workflows.
- [x] Introduce a focused workspace switcher for `Palette`, `Waypoints`, `Discover`, `Compare`, and `Journey`.
- [x] Move low-frequency controls such as bindings, navigation tuning, diagnostics, and quality into a settings portal.
- [x] Rebalance the shell so the fractal surfaces stay primary on desktop while the sidebar remains scrollable.
- [x] Keep the workflow shell compatible with the reusable `RenderView` composition and future panel extensions.

Status on August 30, 2026: complete.

## Phase 7 — Advanced rendering and portability

- [x] Add orbit traps and more 2D formulas.
- [ ] Add distance estimation.
- [ ] Improve deep-zoom diagnostics and investigate perturbation rendering.
- [x] Add CPU fallback.
- [ ] Add WebGL/lightweight sharing fallback.
- [ ] Experiment with 3D fractals.

## Phase 7.1 — Formula expansion

- [x] Add `Burning Ship` and `Tricorn` as first advanced formula additions.
- [x] Route the new formulas through the shared WebGPU and CPU/discovery iteration paths.
- [x] Keep Explore, Discover, Waypoints, Compare, and Journey compatible with the expanded formula registry.
- [x] Add tests for formula registration, defaults, and discovery compatibility.

Status on August 30, 2026: complete.

## Phase 7.2 — Deep-zoom diagnostics

- [x] Add live diagnostics that evaluate the current viewport zoom depth and iteration headroom.
- [x] Surface deep-zoom guidance in the focused shell and the settings portal.
- [x] Distinguish between healthy, cautionary, and extreme zoom ranges for the current non-perturbation path.
- [x] Add tests for deep-zoom recommendations and warning thresholds.

Status on August 30, 2026: complete.

## Phase 7.3 — Orbit trap colouring

- [x] Add orbit-trap colouring as a modular colouring algorithm rather than a formula-specific branch.
- [x] Route orbit-trap controls through Explore and Compare without breaking existing palette workflows.
- [x] Support orbit-trap rendering on the shared WebGPU path.
- [x] Add tests for orbit-trap colouring runtime behavior.

Status on August 30, 2026: complete.

## Phase 7.35 — Orbit trap refinement

- [x] Bias orbit-trap colouring toward boundary readability so it supports zoom exploration better.
- [x] Blend trap response with classic escape-time structure instead of fully replacing navigational cues.
- [x] Add trap variants or richer controls only after the default orbit-trap look becomes useful for exploration.
- [x] Re-check the live app visually after the refinement to confirm the mode feels intentional rather than merely psychedelic.

Status on September 2, 2026: complete.

## Phase 7.4 — CPU fallback

- [x] Replace the diagnostic placeholder-only path with a real CPU fractal renderer behind the shared renderer interface.
- [x] Support the current formula and colouring stack through the CPU fallback path.
- [x] Treat CPU fallback as a supported interactive mode in diagnostics rather than a blocked canvas state.
- [x] Add tests for CPU fallback behavior and fallback diagnostics.

Status on August 30, 2026: complete.

## Phase 7.5 — Waypoint UX refinement

- [x] Improve information hierarchy, grouping, and scanning for saved, curated, and discovered Waypoints.
- [x] Add richer thumbnail handling, quick actions, and bulk organization flows.
- [x] Refine save/edit/share interactions so frequent waypointing feels lightweight during exploration.
- [x] Review the Waypoint panel layout against comparison, discovery, and animation workflows.

Status on August 30, 2026: complete.

## Phase 7.6 — Palette workflow refinement

- [x] Push the palette editor further toward a direct color-grading and color-picker workflow.
- [x] Add richer preset browsing, faster stop manipulation, and stronger visual feedback for palette structure.
- [x] Tighten the relationship between palette authoring and live Explore, Compare, and Journey previews.
- [x] Validate the refined palette workflow against the new workspace shell so it stays fast without overloading the main sidebar.

Status on August 30, 2026: complete.

## Phase 7.7 — Compare and Journey UX refinement

- [x] Reframe comparison mode around clearer mode choices, state summaries, and faster side-level decisions.
- [x] Make journey authoring feel more task-oriented with stronger clip summaries, recording status, and waypoint journey guidance.
- [x] Reduce raw form feel in Compare and Journey while preserving the underlying `RenderView`, comparison, and animation architecture.
- [x] Validate the refined Compare and Journey workspaces against the focused workspace shell.

Status on August 30, 2026: complete.

## Phase 7.8 — Discovery UX refinement

- [x] Reframe discovery around clearer scan summaries, scan intensity, and expected search breadth.
- [x] Separate scan setup from result triage so discovered regions are easier to evaluate quickly.
- [x] Improve discovery result readability with ranking cues and compact descriptive metadata.
- [x] Validate the refined Discover workspace against the focused workspace shell.

Status on August 30, 2026: complete.

## Phase 7.9 — Interaction regression coverage

- [x] Make the linked Julia panel state explicit so idle and seeded modes are visually distinct.
- [x] Add browser-level regression coverage for Mandelbrot-to-Julia linking and Julia-panel focus.
- [x] Keep the regression harness lightweight so unit tests and browser tests can evolve independently.

Status on August 30, 2026: complete.

## Phase 7.95 — Project onboarding and product demo

- [x] Add a product-focused README with setup, commands, and feature orientation.
- [x] Add reproducible Playwright product-demo capture for README visuals.
- [x] Add a compact Makefile for local development, verification, and demo capture.

Status on September 2, 2026: complete.

## Phase 7.96 — Shell density refinement

- [x] Compact the always-on Explore controls without reducing their legibility.
- [x] Keep the workspace launcher visible without forcing a sidebar scroll at typical desktop heights.
- [x] Preserve scrolling for long, task-specific workspace content and small viewports.

Status on September 8, 2026: complete.

## Phase 7.97 — Julia tuning and Waypoint preview refinement

- [x] Add direct linked-Julia parameter controls from the Explore workflow.
- [x] Render Waypoint thumbnails from their saved configurations as PNG data URLs.
- [x] Backfill missing Waypoint previews when they appear in the workspace.

Status on September 8, 2026: complete.

## Phase 7.98 — Linked Julia keyboard tuning

- [x] Add configurable focused-surface hotkeys for linked Julia real and imaginary parameter changes.
- [x] Expose the Julia parameter bindings in the Settings portal.
- [x] Document the default `J`/`L` real and `I`/`K` imaginary controls, including 0.001 and `Shift` 0.0001 fine steps, beside the linked Julia inputs.

Status on September 8, 2026: complete.

## Phase 7.99 — Guided product demos and onboarding

- [x] Create a deterministic Playwright capture for Mandelbrot-to-Julia linking and repeated keyboard tuning.
- [x] Add a deterministic Explore navigation flow showing real pan and wheel-zoom input.
- [x] Add a deterministic palette-preset flow showing immediate rendering changes.
- [x] Add a deterministic Waypoint flow that saves and surfaces a named portal with its generated preview.
- [x] Add deterministic demo flows for Compare and Journey.
- [x] Package the linked-Julia flow as a concise WebM product clip for the README and project documentation.
- [x] Add GIF packaging for short-loop embeds where that format is preferable.
- [x] Keep capture scripts distinct from correctness assertions, while sharing stable fixtures and reproducible initial render configurations.
- [x] Add a skippable, restartable in-app "First flight" tutorial that guides users through the real Explore UI with focused highlights: navigation, Julia linking, parameter tuning, Settings and control orientation, and saving a Waypoint.
- [ ] Persist tutorial completion locally and provide a clear restart entry point from the settings/help surface.
- [ ] Add browser regression coverage for the tutorial’s key transitions and the demo capture setup.

## Phase 8 — Visual Lab foundation

Goal: evolve the existing smooth-escape and first orbit-trap modes into a composable visual system without changing the underlying 2D fractal mathematics.

- [x] Define the initial extensible `OrbitMetrics` contract shared by CPU and WGSL paths: escape state, iteration count, smooth iteration, final complex value, magnitude, and requested trap distance. Derivative, distance estimate, root/convergence, and formula-specific values remain opt-in capabilities.
- [x] Establish the first `formula → orbit metrics → material → lens` pipeline, keeping formula evaluation and WebGPU resource ownership out of React components.
- [x] Version and migrate `RenderConfig` from the `ColouringConfig` shape to serialisable `MaterialConfig` and `LensConfig` structures. Legacy URL and persisted Waypoint configurations migrate to equivalent materials with a neutral lens.
- [x] Add an initial material registry with metric capability declarations, defaults, and compatibility metadata rather than hardcoding material choices in the Explore UI.
- [x] Add an initial lens-effect registry for presentation-only exposure and vignette. Coordinate-distorting sampling effects remain deferred and separately labelled.
- [ ] Establish CPU/WebGPU parity fixtures for shared metrics and documented CPU approximations or capability notices for GPU-only lens passes.
- [x] Add a focused **Visual Lab** workspace with live material/lens controls and only controls relevant to the active material. Material/lens preset browsing remains next.
- [x] Add unit tests for initial metrics, legacy migration, configuration interpolation, and URL round trips; add a Playwright Visual Lab material-switching flow.
- [ ] Add material validation and CPU/WebGPU metric parity fixtures; extend browser coverage to save and reload a visually styled Waypoint.

Definition of done: a saved render configuration can reproduce a compatible named material and restrained lens treatment across Explore, Compare, Waypoints, Journey, URL sharing, and export, while legacy colouring configurations still load correctly.

## Phase 8.1 — Rich orbit traps and palette fields

Goal: turn the current circle/cross orbit trap into an expressive but navigable shader tool.

- [x] Support point, line, circle, cross, spiral, and two-trap composited SDF fields with serialisable transforms and union/intersection composition.
- [x] Let materials choose trap metric, palette mapping, interior/exterior mixing, and optional emissive response while retaining a readable classic-escape baseline.
- [x] Add formula-agnostic `Classic Escape`, `Filament`, `Signal Fire`, and `Etched Orbit` material presets. User-created preset storage remains separate follow-up work.
- [x] Support deterministic Journey interpolation of trap position, rotation, and scale. Dedicated perfectly-loopable material animation and palette-offset animation remain follow-up work.
- [x] Update discovery scoring only where it can use a material-independent metric, so results remain meaningful when a different look is applied.

Definition of done: users can apply, tune, animate, save, share, and export several trap-based looks without changing a formula or losing boundary readability.

Status on September 13, 2026: complete.

## Phase 8.15 — Rendering pipeline hardening

Goal: make the existing `coordinates → formula → metrics → material → lens → display` boundaries durable before adding neighbourhood-sampled surface materials.

- [x] Formalize formula metric capabilities and material requirements, compatibility, validation, defaults, editor identities, and sampling requirements.
- [x] Organize Visual Lab around material-specific editors, keeping the host focused on presets, active-material selection, and lenses.
- [x] Split the generated WGSL source into explicit contract, coordinate, field/material, formula-metric, and presentation modules while retaining the direct one-pass optimisation.
- [x] Establish point versus neighbourhood sampling metadata and document the deferred intermediate-metric-texture strategy for surface normals.
- [x] Migrate exposure and vignette to an ordered, serialisable `LensConfig.effects[]` model while preserving version-1 through version-3 render configurations.
- [x] Add deterministic serialisable modulation primitives applied after a Journey keyframe/base configuration, with fixed targets and waveform-only sources.
- [x] Add metric/material/lens/modulation validation and parity-contract fixtures; preserve CPU rendering for all current point materials and effects.
- [x] Introduce the formula-agnostic **Questionable Radioactive Glass** preset, with restrained emission and a conventional Classic Escape reset.

Definition of done: new metrics, materials, lens effects, and animations can be added through declared seams without adding formula-specific visual branches or a monolithic Visual Lab.

Status on September 13, 2026: complete.

## Phase 8.2 — Surface and cartographic materials

Goal: make existing 2D fractals feel sculptural without pretending they are a separate 3D renderer.

- [x] Add topographic contour materials with adjustable level count, line width, contrast, and zoom-aware spacing as the first neighbourhood-material architecture test.
- [x] Add domain-colouring materials using final complex value/phase/magnitude; prepare root-basin mapping as a capability for Newton fractals.
- [x] Add a smooth-iteration height source, screen-space normal sampling, directional/rim/ambient lighting, roughness, and specular controls.
- [ ] Add distance-estimate height sources when a formula genuinely advertises derivative/distance-estimate capability; do not fabricate it from escape-time data.
- [x] Add material presets that demonstrate distinct visual languages—Topographic Atlas, Engraved Obsidian, Molten Metal, Bioluminescent Coral, and Questionable Radioactive Glass—without overwhelming the default Explore view.
- [x] Verify accessibility and legibility: contours and relief retain structural non-colour cues, no bloom is introduced, CPU approximation is labelled, and Classic Escape remains an immediate reset.

Definition of done: lighting and contour effects add clear depth or structure at interactive WebGPU rates, with their performance cost and CPU-fallback behaviour communicated honestly.

Status on September 13, 2026: core material pass complete. Distance-estimate height remains capability-gated research: it requires a formula that genuinely supplies a distance estimate, not merely a derivative used for convergence. Phase 9 completion does not imply that capability.

## Phase 8.25 — Rendering Cleanup Before HDR

Goal: make Phase 8.3 safer without changing the Phase 8.2 visual model, persisted configurations, presets, exports, or CPU fallback.

- [x] Derive metric-field pass selection from the material registry’s `sampling` metadata rather than named material IDs.
- [x] Promote the temporary neighbourhood metric field from `rgba8unorm` to `rgba16float` after evaluating contour continuity, normal smoothness, and specular stability against its 2× temporary-memory cost.
- [x] Allocate the metric-field texture lazily only after a neighbourhood material is selected; retain it after allocation to avoid switching churn and resize it only when it exists.
- [x] Move canonical material, runtime, and orbit-trap implementation ownership under `src/visuals`, retaining narrow `colouring` compatibility bridges.
- [x] Extract the explicit 14-`vec4` WebGPU uniform layout and packing helper from the renderer coordinator, eliminating material-parameter slot collisions before HDR parameters arrive.
- [x] Add field-path metadata, lazy-allocation, half-float-format, uniform-layout, material compatibility, persistence, build, and browser regression coverage.

Definition of done: the Phase 8.2 material system produces the same saved visual configurations while field allocation, material capabilities, precision, and uniform packing are explicit and independently testable.

Status on September 14, 2026: complete.

## Phase 8.3 — HDR lens pipeline

Goal: add cinematic finish while ensuring the fractal remains the subject.

- [x] Render materials into an HDR-capable intermediate target and add exposure plus tone mapping before presentation.
- [x] Add thresholded, downsampled bloom with an intensity cap and sensible dark-scene defaults.
- [x] Add subtle optional vignette, grain, colour grading, sharpening, and chromatic aberration; keep all disabled unless a preset explicitly enables them.
- [x] Add resize/resource lifecycle, renderer contract, migration, and browser coverage for deterministic serialised lens settings.
Follow-up moved to the [polish backlog](#polish-backlog--not-instrument-prerequisites): selectable post-process quality tiers; the first HDR slice intentionally uses a stable half-resolution bloom target.
- [x] Keep coordinate-distorting effects out of the HDR lens pipeline; they remain an experimental future sampling category requiring direct comparison and reset affordances.

Definition of done: lens presets enhance bright local detail without washing out exploration, and recorded journeys match the on-screen material/lens look.

Status on September 14, 2026: core HDR pipeline complete. Selectable post-process quality tiers remain a focused follow-up; the CPU fallback preserves the pre-HDR lens subset and treats the new GPU post effects as presentation enhancements.

Rendering regression follow-up (September 14, 2026): fixed an invalid metric-pass bind group that caused black WebGPU frames for Topographic and Lit Surface presets. GPU browser regressions now require a WebGPU context and check validation errors and visible output after selection, resize, and reload; CPU fallback success does not satisfy these checks.

Follow-up moved to the [polish backlog](#polish-backlog--not-instrument-prerequisites): asynchronous GPU validation/device-error diagnostics.

## Phase 9 — 2D formula families

Goal: broaden discovery and comparison with formulas that reuse the new metric/material architecture instead of creating unrelated visual branches.

### Phase 9.1 — Multibrot

- [x] Add `z^n + c` with a validated, animatable power parameter and stable defaults.
- [x] Implement CPU/WGSL iteration and metric parity, formula-specific curated Waypoints, and discovery coverage.
- [x] Make Compare especially useful for power sweeps with synchronized viewport and animated power journeys.

Phase 9.1 ships powers 2–8 (default 3), Explore and per-side Compare controls, and Cubic Butterfly, Quartic Crown, and Sixth-power Star curated Waypoints. Existing shared viewports and Journey keyframe interpolation support power comparisons and sweeps. Fractional powers have a branch seam and reduced precision, explained beside the control. Saved-view startup now respects the URL instead of resetting its formula to Mandelbrot. GPU readback tests compare orbit metrics against CPU results, including the zero-origin phase convention.

Follow-up moved to the [polish backlog](#polish-backlog--not-instrument-prerequisites): one-click paired power-sweep Compare and Journey templates.

### Phase 9.2 — Newton and Nova

- [x] Add polynomial/root configuration, derivative-based iteration, convergence diagnostics, and root-basin metrics.
- [x] Add root identity and convergence speed materials, with a useful fallback when roots are numerically ambiguous.
- [x] Add Newton/Nova curated Waypoints, discovery heuristics, and test coverage for convergence and persistence.

Phase 9.2 implements regular-root polynomials (2–6 roots, configurable radius/rotation/relaxation/tolerance), Newton starting-point basins, and parameter-plane Nova. Root Atlas and Nova Silk provide compatible starting looks. Newton Triskelion, Newton Four Winds, Nova Silk Delta, and Nova Clover are curated Waypoints. CPU/WGSL readback fixtures cover convergence, roots, singularities and non-default polynomials; browser tests exercise tuning, reload, visible GPU output and Compare. Journey normalises discrete root-count transitions. Advanced controls are expandable; the sidebar reserves workspace space so expanded controls cannot hide Visual Lab.

Follow-ups moved to [Alternative Mathematics](#alternative-mathematics--specialist-admission) (free roots, arbitrary polynomials, Nova Julia) and the [polish backlog](#polish-backlog--not-instrument-prerequisites) (on-canvas convergence inspector/legend).

### Phase 9.3 — Organic and specialist formulas

- [x] Add Phoenix, then evaluate Magnet I/II and Lyapunov against a written formula-admission checklist: shared metric fit, interactive performance, discovery usefulness, visual distinction, and testability.
- [x] Treat IFS/Barnsley fern as a separately scoped sampling architecture, not a quick registry entry.

Phase 9.3 ships Julia-plane Phoenix with bounded complex c and real Orbit memory, double-single GPU orbit history, existing escape materials, Explore/Compare controls, Journey interpolation, persistence, and material-independent Discover. Curated Waypoints: Phoenix Feather, Phoenix Ember Lace, and Phoenix Tidal Wings. [Formula admission review](FORMULA_ADMISSION.md) records the checklist and defers Magnet I/II pending dual-stop metric contracts, Lyapunov pending stability-field semantics, and IFS pending a separate seeded sampling renderer. These candidates have been assessed, not implemented or locally benchmarked.

Follow-up moved to the [polish backlog](#polish-backlog--not-instrument-prerequisites): one-click Phoenix versus matching zero-memory Julia comparison.

Definition of done: each added formula advertises capabilities, has CPU/WGSL coverage, works through Explore/Discover/Compare/Journey/Waypoints, and ships with compelling curated destinations rather than just a dropdown entry.

### Phase 9 milestone — The first era closes

Multibrot tested variable powers and branch/precision limits; Newton/Nova tested convergence, singularities, and the distinction between polynomial-root identity and fixed-point convergence; Phoenix tested per-pixel previous-orbit state. Together they exercised the shared formula → metrics → material architecture through the explorer workflows.

The architecture concept survived; it is not finished or universally generic. Magnet exposed missing dual convergence/escape/singularity semantics, Lyapunov needs signed stability-field semantics, and IFS needs a separate sampling renderer. Extend existing contracts when the mathematics fits; introduce a new abstraction when it genuinely does not. Do not flatten unlike mathematical concepts to admit another dropdown option. [Formula admission review](FORMULA_ADMISSION.md) remains authoritative for these gates.

## Phase 10 — The Instrument

Goal: make Fractal Waypoints playable before making it externally connected. Preserve reusable mathematical and visual mechanisms, not just a catalogue of looks. Presets demonstrate the system; UI exposes the system; connections eventually compose the system. Artistic exploration and technical measurement are peers. Prefer expressive variable mechanisms over unnecessary coupling or arbitrary scripting; do not abstract everything in anticipation.

**One world, different benches.** Explore investigates and configures; Perform plays selected controls; future Patch configures relationships. They share the mathematical world, domain parameters, formula/metric/material/lens model, Waypoints, Journey, modulation, rendering, persistence, and analysis outputs. Switching benches must preserve that world, not clone configurations or create workspace-specific backends. Explicit user-created Compare views remain valid independent views.

The existing sidebar modes are focused workflows, not an already implemented Explore/Perform/Patch shell. Keep ordinary exploration usable without performance or external-control jargon. See [workspace architecture](ARCHITECTURE.md#workspace-direction--one-world-different-benches), ADR-028, and [the interoperability audit](INTEROPERABILITY.md) for current limitations; ADR-026 governs semantic boundaries.

### Phase 10.0 — UX and workspace architecture

Goal: decide information architecture and state responsibilities before implementing the performance surface. This is not an aesthetic redesign.

- [x] Define Explore/Perform/future Patch boundaries, navigation, and where Visual Lab, palette editing, Waypoints, Discover, Compare, and Journey live without losing existing workflows.
- [x] Separate shared mathematical/domain state, performance setup, and ephemeral UI state; identify global versus workspace-local ownership and lifecycle.
- [x] Decide what belongs in URLs, project files, session persistence, and Waypoints, including versioning/migration needs. Do not choose a new schema merely from this roadmap.
- [x] Specify base versus evaluated configuration ownership, Journey playback/recording, restoration, and what a workspace switch retains. Address current playback writing evaluated values into `mainConfig` and therefore URL state.
- [x] Define how an explicitly selected Compare side or Julia preview relates to Perform; do not silently collapse independent views or duplicate the world per bench.
- [x] Validate navigation and state flows with a small UX/state design, leaving room for future Patch without implementing a graph or general framework.

Acceptance flow: discover Phoenix → save a Waypoint → enter Perform on the same world → pin Orbit memory and palette controls → modulate and record → later replace the LFO with hardware through Patch without rebuilding the fractal configuration. The hardware/Patch portion is a design walkthrough only, not Phase 10 implementation.

Definition of done: documented workspace/navigation and ownership decisions, persistence responsibilities, and acceptance scenarios are specific enough for incremental runnable slices. No guessed schema or navigation redesign is required by this revision.

Status on September 15, 2026: design complete in [WORKSPACE_DESIGN.md](WORKSPACE_DESIGN.md), with ownership invariants recorded in ADR-029. Desk-checked acceptance scenarios specify later automated/browser tests; no new workspace, evaluator, or persistence runtime is claimed. Explore retains its six focused tools; Perform initially targets Primary, with explicit promotion from Compare/Julia. Base state is separate from evaluated output; shared transport survives workspace changes. Concrete versioned formats and visual layout are implementation work under these decided responsibilities.

### Phase 10.1 — Semantic parameter surface

- [ ] Expose stable semantic parameter identities incrementally, with domain owner, type (numeric/discrete/event/state), bounds, defaults, units, interpolation rules, modulation eligibility, and useful display metadata.
- [ ] Preserve existing persisted target IDs. Never address controls through slider order, DOM identifiers, React state paths, or shader uniform offsets; do not build a giant universal registry.
- [ ] Consolidate incomplete metadata and distributed validation where the first real consumers require it. Define inactive/incompatible-target behaviour and a final domain validation boundary.
- [ ] Resolve bounded positional trap-slot addressing before any reorderable target model; use stable instance identities and a migration only if reordering is introduced.
- [ ] Test semantic addressing, bounds/non-finite inputs, discrete behaviour, serialization compatibility, and shared use by editing, Journey, and modulation.

Definition of done: selected controls can be addressed independently of their UI or renderer, with domain-owned behaviour. Metric outputs remain the separate Phase 10.4 contract, not parameter metadata inferred from material textures.

### Phase 10.2 — First-class internal modulation

- [ ] Evolve existing deterministic modulation into a serialisable source → transform → mapping → semantic target model, separating source evaluation from target application without breaking saved targets.
- [ ] Support useful internal sine, triangle, saw, and deterministic noise sources, with explicit period/frequency, phase, amplitude, and offset semantics. Add cosine only if it improves the UX.
- [ ] Start with a small justified transform set: scale, offset, invert, clamp, curve, and smoothing. Defer quantisation, dead zones, sample/hold, combination, gates, and other transforms until concrete use cases justify them.
- [ ] Specify composition/order (including add/replace/priority), target units, inactive mappings, clocks, and smoothing/noise state. Keep continuous signals, discrete events, and persistent state distinct in evaluation, persistence, and replay; they are not all floats sampled at 60 Hz.
- [ ] Preserve base settings separately from effective values: base configuration → Journey interpolation → modulation/future external application → domain normalisation/validation → effective configuration → renderer. Never accumulate evaluated values into the base.
- [ ] Share explicit-time evaluation between live playback and deterministic Journey/export; test ordering, repeated evaluation, seeking, reset, bounds, and replay of stateful transforms.
- [ ] Implement the [10.0 base/transport/snapshot contract](WORKSPACE_DESIGN.md): stop playback writing effective frames into base/URL state, apply legacy modulation exactly once, and bake static captures without changing the active setup.

Definition of done: internal modulation is independently playable and reproducible. No MIDI, audio, synth, graph-editor, or feedback runtime is introduced.

### Phase 10.3 — Perform workspace

- [ ] Build a focused playing surface over the shared world: selected/pinned large immediate controls, clear active/effective values, modulation visibility, and purposeful triggers.
- [ ] Support macros with explicit inspectable mappings. Form, Energy, Glow, Surface, Colour, Chaos, and Motion are design hypotheses to test, not hardcoded universal mathematical meanings.
- [ ] Define and expose freeze, pause/resume, manual override, record, restore, and mapping reset behaviour, including what each action affects and how users recover their base settings.
- [ ] Verify workspace switching, keyboard/accessibility behaviour, incompatible formula targets, recording/replay, and the Phoenix acceptance flow from 10.0.
- [ ] Implement explicit Primary scope and Compare/Julia promotion, global activity/Stop visibility, and versioned setup/take save/load; do not claim reproducible performance recording from navigation capture alone. Follow [the design acceptance specifications](WORKSPACE_DESIGN.md#6-design-walkthrough-and-acceptance-specifications).

Definition of done: Perform feels like playing selected relationships, not Visual Lab with more sliders. Users need neither a graph nor knowledge of external protocols to play or return to Explore safely.

### Phase 10.4 — Observable fractal metrics

- [ ] Define a capability-aware analysis snapshot contract independent of the GPU material texture, colour output, and future consumers. Use the identity, sampling, precision, status, and scheduling requirements in [INTEROPERABILITY.md](INTEROPERABILITY.md#mathematical-outputs-not-material-outputs).
- [ ] Expose meaningful native measurements where supported: iteration histograms, escape ratios, iteration mean/variance, convergence distributions, verified root populations, and phase statistics. Distinguish unavailable, unresolved, singular, divergent, and converged results; never pretend Nova has Newton root identity.
- [ ] Prove usefulness internally first through Discover, diagnostics, Perform meters, or region comparison. Start with bounded, cancellable analysis and explicit cost/rate limits; do not require synchronous GPU readback every frame.
- [ ] Test deterministic fixtures, sampling/weighting and bin semantics, capability absence, cancellation/backpressure, and independence from visual styling.

Definition of done: users and internal systems can inspect mathematical behaviour, not only pixels. External publication and musical interpretation are not part of this slice.

## Phase 11 — Connections

**UNSCHEDULED until deliberately started.** Phase 10 must stand alone. Goal: validate semantic boundaries with a concrete physical device, not a speculative protocol framework.

- [ ] Select a physical synth/controller and a small useful interaction; evaluate Web MIDI if appropriate to that device and browser environment. Keep device/protocol knowledge outside formulas, materials, and rendering.
- [ ] Adapt external continuous signals, events, and state through the validated domain model; define permissions, connection loss, ordering, timestamps, recording, and reproducible replay/export.
- [ ] Let hardware and later software adapters be interchangeable consumers where practical, informed by the real first integration rather than hypothetical universality.
- [ ] Keep music generation separate from synthesis. An external generator may interpret fractal statistics as notes or rhythm; a synth consumes musical events. Neither interpretation belongs in fractal metrics.
- [ ] Consider guitar/audio experiments later: envelope, onset, pitch, spectral brightness, and possibly note/chord analysis as independent sources. Fractal code must not become guitar-aware; no audio implementation belongs in Phase 10.

Definition of done for the first slice: one intentionally selected hardware connection is useful, recoverable, and replayable through semantic boundaries. Additional protocols, synthesis, and audio analysis are not automatic scope.

## Phase 12 — Patch Bay

**UNSCHEDULED until deliberately started, after the interaction model is validated.** Goal: expose existing relationships visually, not invent the domain architecture inside a node editor.

- [ ] Build a Patch workspace over a validated serialisable source/transform/mapping/target/event/state model, sharing the same world and performance setup with Explore and Perform.
- [ ] Make mappings inspectable, editable, persistable, and safely replaceable, including replacing an internal source with a hardware source without rebuilding the fractal configuration.
- [ ] Keep graph editing optional during performance; maintain a useful standalone explorer and instrument without Patch.
- [ ] Gate any feedback behind explicit clocks, ordering, latency/delays, state ownership, deterministic replay, bounded scheduling, cycle safeguards, and recursion safety. Do not enable feedback as an accidental callback or render loop.

Definition of done: the editor composes already proven mechanisms; graph layout is not domain state, and feedback remains disabled until its scheduling semantics are deliberately designed and verified.

## Optional parallel research tracks

These preserve the former Phase 10 requirements; they are not cancelled and are not the next mandatory sequence. Schedule bounded experiments independently of Phases 10–12. Older Phase 7 deep-zoom/3D follow-ups route here; capability-gated distance estimation remains research rather than a promise made by Phase 9.

### Deep Space — Perturbation-assisted deep zoom

- [ ] Prototype reference-orbit perturbation rendering behind the existing diagnostics and renderer coordinator.
- [ ] Define precision/error thresholds, fallback behaviour, and Waypoint compatibility before exposing it as a quality mode.
- [ ] Test known deep-zoom reference views against deterministic images or metric fixtures.

### Third Dimension — Separate 3D ray-march renderer

- [ ] Define a separate 3D scene/camera configuration and renderer capability boundary; do not overload the 2D viewport or formula contracts.
- [ ] Prototype a Mandelbulb distance-estimator renderer with ray marching, normals, lighting, quality limits, and cancellation behaviour.
- [ ] Add 3D Waypoints only after camera, formula, material, and export configurations can be reproduced faithfully.
- [ ] Evaluate Mandelbox only after the Mandelbulb prototype meets interactive-performance and navigation criteria.

### Alternative Mathematics — Specialist admission

- [ ] Revisit Magnet I/II only after dual convergence/escape/singularity metric contracts and representative CPU/GPU performance tests are designed.
- [ ] Revisit Lyapunov only with signed stability-field semantics, sequence/burn-in configuration, sampling, materials, and deterministic test fixtures.
- [ ] Scope IFS/Barnsley fern as a separate seeded sampling/density-accumulation renderer with its own reproducibility and performance criteria.
- [ ] Explore free root placement/arbitrary polynomial coefficients and a separate Nova Julia view, with root-tracking rules before enabling continuous root-identity animation. (From Phase 9.2.)
- [ ] Apply the [formula admission checklist](FORMULA_ADMISSION.md) to future specialists: metric fit, interactive performance, Discover value, visual distinction, and testability. A new abstraction is appropriate when the mathematical contract requires it.

### Polish backlog — Not instrument prerequisites

- [ ] Add one-click paired power-sweep Compare and Journey templates so newcomers need not assemble keyframes manually. (From Phase 9.1.)
- [ ] Add an on-canvas convergence inspector/legend so diagnostics are available away from the viewport centre without opening advanced controls. (From Phase 9.2.)
- [ ] Add a one-click Phoenix versus matching zero-memory Julia comparison, so the recurrence relationship can be explored without manually copying the constant. (From Phase 9.3.)
- [ ] Add selectable post-process quality tiers; the first HDR slice intentionally uses a stable half-resolution bloom target. (From Phase 8.3.)
- [ ] Surface asynchronous GPU validation/device errors in renderer diagnostics so a failed frame cannot leave a misleading healthy WebGPU status. (From Phase 8.3 regression follow-up.)
- [ ] Verify first-Perform UX for focus-loss gesture cancellation, unavailable-pin cleanup, distinct freeze/pause indicators, and honest unsaved-take/recovery messaging. Safe scope and recording indicators are required in 10.3; further recovery convenience may follow explicit save/load. (Phase 10.0 UX review.)

These remain worthwhile independent improvements, not gates to starting the instrument work. Other unchecked historical items remain visible at their original phases: tutorial persistence/coverage, CPU/GPU visual parity and styled-Waypoint verification, sharing fallback, and capability-gated distance-estimate materials. Audit their remaining scope before claiming completion; this revision does not retroactively check them off. Phase 10.0's design addresses ambiguous recording/override/reset targets and base ownership; implementation verification belongs to 10.2/10.3.

## Historical implementation slice — Rendering foundation

The first coding session should produce a vertical slice: minimal app shell, WebGPU canvas, `RenderConfig`, reusable `RenderView`, double-single CPU/WGSL helpers, Mandelbrot shader, viewport pan/zoom, one palette, and tests for arithmetic and coordinate mapping.

Status on August 29, 2026: complete.

## Historical implementation slice — Navigation

The next navigation-focused slice should add:

- semantic navigation actions such as `moveUp`, `moveLeft`, `moveDown`, `moveRight`, `zoomIn`, `zoomOut`, `rotateLeft`, `rotateRight`, and `resetView`
- default keyboard bindings with a game-like profile using `WASD`
- configurable movement settings for speed, boost, and precision modifiers
- tests for keyboard action mapping and continuous viewport motion
- a simple controls UI for rebinding or at least inspecting the active navigation scheme

Status on August 29, 2026: complete.
