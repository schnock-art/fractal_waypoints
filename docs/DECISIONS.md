# Architecture Decision Records

## ADR-001: WebGPU is the primary renderer

**Status:** Accepted

The application targets GPU-heavy interactive exploration. WebGPU is the main rendering path; CPU and WebGL fallbacks are later adapters.

## ADR-002: Double-single arithmetic from the beginning

**Status:** Accepted

Viewport centres and complex coordinates use a pair-of-floats representation from the first implementation. This avoids coupling navigation to single precision and reduces the cost of deeper zoom support later.

## ADR-003: Render configuration is the application interchange format

**Status:** Accepted

Rendering, URLs, Waypoints, comparison views, animation keyframes, discovery, and export all consume or produce serialisable render configurations.

## ADR-004: Palette editing is independent of fractal formulas

**Status:** Accepted

Palettes and interpolation are general visual tools. Fractal-specific looks are presets that combine palette and colouring configurations.

## ADR-005: Discovery outputs Waypoints

**Status:** Accepted

Automatic discovery produces the same Waypoint type that users create manually, allowing reuse of thumbnails, navigation, tagging, sharing, and animation.

## ADR-006: Animation operates on configurations, not UI events

**Status:** Accepted

Animations are keyframed state transformations. Playback and export remain deterministic and independent of pointer events or display refresh timing.

## ADR-007: RenderView is the reusable view composition unit

**Status:** Accepted

Explore, Julia preview, and comparison layouts should all compose the same `RenderView` building block. Each view renders a single `RenderConfig` and exposes interaction hooks, while higher-level layout code decides whether the view appears alone, beside a Julia panel, or inside a comparison mode. This avoids splitting the codebase into separate rendering paths for closely related experiences.

## ADR-008: Vite, React, and TypeScript provide the application shell

**Status:** Accepted

The project uses Vite for local development and builds, React for UI composition, and TypeScript throughout the app and tests. Rendering, math, palettes, navigation, and persistence remain framework-agnostic modules so the UI layer can stay thin while still supporting richer product features such as Waypoints, comparison layouts, discovery controls, and animation tooling.

## ADR-009: Navigation actions are semantic and bindings are configurable

**Status:** Accepted

Keyboard movement is a first-class exploration feature. The navigation system should expose semantic actions such as movement, zoom, rotation, reset, and view toggles rather than hardcoding physical keys inside `RenderView` or UI components. Default bindings may use a game-like `WASD` profile, but bindings and movement settings should remain configurable and serialisable so preferences can evolve without rewriting navigation logic.

## ADR-010: Local exploration state persists through URLs and browser storage

**Status:** Accepted

The active `RenderConfig` is encoded into the browser URL so a single view can be shared or revisited through history navigation. User-created Waypoints and navigation preferences persist in browser storage, while curated Waypoints remain application-provided starter content. This keeps sharing lightweight and local-first without introducing accounts or server-side state in the early phases.

## ADR-011: Discovery starts as a local heuristic beam search over render configurations

**Status:** Accepted

The first discovery implementation samples nested subregions of the active `RenderConfig` on the CPU, ranks them with lightweight heuristics such as boundary transitions and iteration variance, deduplicates nearby hits, and emits standard discovered Waypoints. This keeps discovery modular, deterministic, and easy to evolve later toward GPU-assisted or background scanning without changing the waypoint flow.

## ADR-012: Comparison composes ordinary RenderView instances with layout policies

**Status:** Accepted

Comparison mode should not introduce a renderer-specific branch. Split, wipe, overlay, and difference presentations are all assembled from two standard `RenderView` instances plus comparison state that controls shared viewport behavior, active interaction side, and visual layering. This keeps interaction, diagnostics, and rendering capabilities consistent across explore, Julia, and comparison experiences.

## ADR-013: Animation exports are generated from deterministic sampled configurations

**Status:** Accepted

Journeys are authored as keyframed render configurations. Playback, image-sequence export, and WebM export all derive their frames from the same deterministic sampled configuration list at a target FPS, while optional semantic-navigation recording is only used to generate or preview those clips rather than becoming the export format itself.

## ADR-014: The shell separates Explore essentials, workflow panels, and global settings

**Status:** Accepted

The main sidebar should not permanently expose every subsystem at once. The product now keeps a compact Explore layer always visible, routes heavier authoring flows through one focused workspace panel at a time, and moves low-frequency global controls into a dedicated settings portal. This preserves canvas priority, reduces cognitive load, and keeps future workflows extensible without reworking the rendering architecture or `RenderView` composition.

## ADR-015: Deep-zoom diagnostics report iteration headroom before perturbation rendering exists

**Status:** Accepted

The current renderer uses a double-single realtime path but does not yet implement perturbation rendering. The application should therefore expose live deep-zoom diagnostics derived from the active `RenderConfig`, including zoom-depth classification and iteration recommendations, so users can understand whether loss of detail is likely due to iteration limits or to the current architecture's deeper-zoom ceiling.

## ADR-016: Orbit traps are colouring algorithms, not separate formulas

**Status:** Accepted

Orbit traps alter how escape behaviour is visualized, not how the complex iteration itself is defined. The first orbit-trap slice therefore lives in the modular colouring layer and reuses the existing formula, palette, comparison, Waypoint, and Journey infrastructure. This keeps advanced looks composable and avoids multiplying the formula registry with what are really shading variants.

## ADR-017: WebGPU failures should fall back to an interactive CPU renderer

**Status:** Accepted

WebGPU remains the primary renderer, but unsupported browser contexts or GPU startup failures should not collapse the experience into a static placeholder when a 2D canvas path is still available. The renderer-selection layer therefore falls back to a slower interactive CPU renderer behind the same `RenderCoordinator` interface and reports that state explicitly through diagnostics.

## ADR-018: Formula evaluation, visual materials, and lens effects are separate stages

**Status:** Accepted

2D formulas produce an extensible orbit-metrics record rather than directly owning a visual style. Materials turn compatible metrics—such as smooth iteration, final complex value, trap distances, derivatives, and distance estimates—into colour and surface-like shading. Lens effects then adjust the completed image without altering formula evaluation. All material and lens parameters remain serialisable parts of the render configuration so a Waypoint, URL, comparison, Journey, and export reproduce the same look. Coordinate-distorting effects are explicitly distinct because they change the sampling space, not merely the presentation.

This protects the mathematical renderer from a collection of formula-specific shader branches while allowing palette, orbit-trap, topographic, neon, and lighting looks to compose across formulas. The CPU fallback may declare an approximation or unavailable expensive post-process, but it must preserve the saved scene rather than silently replace its meaning.

## ADR-019: Orbit-trap fields are structured transformed SDF sets

**Status:** Accepted

Orbit-trap shape and transform data are not represented as opaque numeric material parameters. A serialisable `OrbitTrapSetConfig` stores up to two named SDF traps with shape, position, rotation, and scale, plus an explicit composition rule. This makes trap geometry editable, shareable, and interpolable by Journey while keeping CPU and WGSL implementations aligned. The two-trap limit is intentional for the initial interactive WebGPU uniform layout; future larger/composite fields require a separately reviewed resource strategy.

Version 3 migration maps legacy orbit-trap configurations to the equivalent circle-plus-cross minimum composition so existing Waypoints and URLs preserve their original appearance.

## ADR-020: Orbit-trap appearance is a serialisable material layer

**Status:** Accepted

Trap geometry and trap appearance are separate concerns. Geometry selects the SDF field, while `OrbitTrapAppearanceConfig` selects the orbit metric (closest approach or final orbit point), palette mapping (proximity signal or distance bands), exterior and interior blend strengths, and a capped emissive accent. The default appearance exactly preserves the earlier boundary-readable orbit-trap blend; Classic Escape remains available as the immediate neutral baseline.

Discovery ranks formula/viewport geometry using a neutral classic-material analysis configuration. It deliberately ignores palettes, lens treatment, trap geometry, and appearance parameters, while preserving the user-selected visual configuration in resulting Waypoints. This makes a discovery result a property of the mathematical region rather than whichever look happened to be active during the scan.

## ADR-021: 2D visual pipeline hardening uses declared seams, not a render graph

**Status:** Accepted

Current formulas advertise only the metrics they genuinely produce. Materials declare their required metrics, local versus neighbourhood sampling requirement, defaults, validation, and editor identity; formula/material compatibility is resolved from that metadata. The generated WGSL source is composed from contract, coordinate, field/material, formula-metric, and presentation modules, while simple point-metric materials remain one optimised pass.

The first neighbourhood material will trigger a reusable metric-field texture rather than re-running a fractal iteration for each normal sample. Until then, no intermediate texture or general render graph is created. Lens treatment is an ordered serialisable effect list. Journey samples base/keyframed state first and then applies a bounded set of deterministic waveform modulations, with no user-authored code or shader expressions. This keeps video export reproducible and creates a natural path to perfectly looping material animation.
