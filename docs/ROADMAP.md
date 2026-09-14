# Fractal Explorer — Roadmap

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

Status on September 13, 2026: core material pass complete. Distance-estimate height is deliberately deferred until Phase 9 introduces a formula with a real derivative capability.

## Phase 8.3 — HDR lens pipeline

Goal: add cinematic finish while ensuring the fractal remains the subject.

- [ ] Render materials into an HDR-capable intermediate target and add exposure plus tone mapping before presentation.
- [ ] Add thresholded, downsampled bloom with an intensity cap and sensible dark-scene defaults.
- [ ] Add subtle optional vignette, grain, colour grading, sharpening, and chromatic aberration; keep all disabled unless a preset explicitly enables them.
- [ ] Add post-process quality tiers, resize/resource lifecycle tests, and deterministic export coverage.
- [ ] Treat coordinate-distorting effects as an experimental, separately labelled category with direct comparison and reset affordances.

Definition of done: lens presets enhance bright local detail without washing out exploration, and recorded journeys match the on-screen material/lens look.

## Phase 9 — 2D formula families

Goal: broaden discovery and comparison with formulas that reuse the new metric/material architecture instead of creating unrelated visual branches.

### Phase 9.1 — Multibrot

- [ ] Add `z^n + c` with a validated, animatable power parameter and stable defaults.
- [ ] Implement CPU/WGSL iteration and metric parity, formula-specific curated Waypoints, and discovery coverage.
- [ ] Make Compare especially useful for power sweeps with synchronized viewport and animated power journeys.

### Phase 9.2 — Newton and Nova

- [ ] Add polynomial/root configuration, derivative-based iteration, convergence diagnostics, and root-basin metrics.
- [ ] Add root identity and convergence speed materials, with a useful fallback when roots are numerically ambiguous.
- [ ] Add Newton/Nova curated Waypoints, discovery heuristics, and test coverage for convergence and persistence.

### Phase 9.3 — Organic and specialist formulas

- [ ] Add Phoenix, then evaluate Magnet I/II and Lyapunov against a written formula-admission checklist: shared metric fit, interactive performance, discovery usefulness, visual distinction, and testability.
- [ ] Treat IFS/Barnsley fern as a separately scoped sampling architecture, not a quick registry entry.

Definition of done: each added formula advertises capabilities, has CPU/WGSL coverage, works through Explore/Discover/Compare/Journey/Waypoints, and ships with compelling curated destinations rather than just a dropdown entry.

## Phase 10 — Deep zoom and 3D research tracks

These are deliberate research tracks rather than prerequisites for the Visual Lab.

### Phase 10.1 — Perturbation-assisted deep zoom

- [ ] Prototype reference-orbit perturbation rendering behind the existing diagnostics and renderer coordinator.
- [ ] Define precision/error thresholds, fallback behaviour, and Waypoint compatibility before exposing it as a quality mode.
- [ ] Test known deep-zoom reference views against deterministic images or metric fixtures.

### Phase 10.2 — Separate 3D ray-march renderer

- [ ] Define a separate 3D scene/camera configuration and renderer capability boundary; do not overload the 2D viewport or formula contracts.
- [ ] Prototype a Mandelbulb distance-estimator renderer with ray marching, normals, lighting, quality limits, and cancellation behaviour.
- [ ] Add 3D Waypoints only after camera, formula, material, and export configurations can be reproduced faithfully.
- [ ] Evaluate Mandelbox only after the Mandelbulb prototype meets interactive-performance and navigation criteria.

## First implementation slice

The first coding session should produce a vertical slice: minimal app shell, WebGPU canvas, `RenderConfig`, reusable `RenderView`, double-single CPU/WGSL helpers, Mandelbrot shader, viewport pan/zoom, one palette, and tests for arithmetic and coordinate mapping.

Status on August 29, 2026: complete.

## Next implementation slice

The next navigation-focused slice should add:

- semantic navigation actions such as `moveUp`, `moveLeft`, `moveDown`, `moveRight`, `zoomIn`, `zoomOut`, `rotateLeft`, `rotateRight`, and `resetView`
- default keyboard bindings with a game-like profile using `WASD`
- configurable movement settings for speed, boost, and precision modifiers
- tests for keyboard action mapping and continuous viewport motion
- a simple controls UI for rebinding or at least inspecting the active navigation scheme

Status on August 29, 2026: complete.
