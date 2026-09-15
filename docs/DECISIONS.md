# Architecture Decision Records

## ADR-031: One explicit-time internal evaluator, separate from authored state

**Status:** Accepted — Phase 10.2, existing internal targets only.

Separate Journey interpolation from modulation evaluation and final typed-frame validation. App preview time and a cloned playback clip are distinct from `mainConfig`; evaluated frames do not update authored state or URL history. View resize is presentation-local during preview and surface callbacks cannot copy formula/palette/effects back into the base. Live sampling and exports use the same path once.

An optional independently versioned `modulationProgram` holds sources and ordered mappings; legacy entries adapt into this model in memory. Reject configurations containing both a program and nonempty legacy entries. Keep the outer schema and existing saved target IDs; future-version portability beyond this optional extension must be reviewed before project-level promises. No new targets are admitted, including Phoenix memory.

Mapping order is priority, with explicit add/replace and existing target-local bounds. Disabled/inactive mappings are no-ops with inactive reasons; invalid signals are skipped with issues. Sources are internal waveforms/seeded held noise. Smoothing is a bounded 16-point trailing mean rather than hidden frame-history state, giving reproducible seeks without a scheduler or general signal graph. There are no discrete/event/state, external-control or feedback semantics.

Final evaluation rejects non-finite data before repair, composes current domain validation/normalisers and resolves compatibility only in effective output. Static capture bakes output without motion definitions; explicit base saves preserve them. Full Perform controls, overrides, freeze and take persistence are deferred to 10.3. [MODULATION_EVALUATION.md](MODULATION_EVALUATION.md) records limits, migration policy and review questions rather than claiming a universal architecture.

## ADR-030: Domain-owned numeric targets, tested with two owners

**Status:** Accepted — limited Phase 10.1 pressure test.

Use a closed semantic dispatcher over domain-owned accessors for `formula.phoenix.memory` and `palette.offset`. The first address qualifies the formula owner without changing the persisted `memory` field; the second preserves an existing persisted modulation ID. Do not traverse arbitrary object paths or derive addresses from UI/GPU layout. Callers supply an explicit configuration, not an implicit focused view.

Memory is continuous and clamped to Phoenix's domain range; it is inactive for other formulas. Palette offset is finite, unbounded and linearly interpolated, not wrapped; its slider range is not a mathematical limit. Metadata distinguishes display hints and modulation eligibility from actual waveform-runtime support. Phoenix is not added to that runtime in this slice.

Interactive writes reject non-finite input and return unknown/inactive/invalid reasons without mutation; imports retain their domain-default repair policy. Descriptor reads normalize selected values without mutating the document. A final evaluated-frame validator, discrete/event/state semantics, trap instance identities, and new persisted mapping formats are not inferred from this experiment. [SEMANTIC_PARAMETERS.md](SEMANTIC_PARAMETERS.md) records evidence and review gates before broadening.

## ADR-029: Separate authored world state from performance evaluation

**Status:** Accepted — Phase 10.0 design; runtime implementation follows in 10.2/10.3.

The application owns authored base configurations separately from effective render values. A shared explicit-time evaluator consumes base/Journey data and semantic modulation/overrides; its output never becomes the next base or an automatic URL update. Existing modulation must be applied once, not again after `sampleAnimationClip`. Renderer and workspace panels do not own the transport or authoritative performance data.

Workspace switching preserves domain state and transport. The first Perform workspace targets Primary only; Compare selection and Julia focus cannot implicitly retarget controls or recording. User-directed promotion copies a named source into Primary without modifying the source. This bounds the first implementation and avoids introducing multi-view recording semantics before a concrete need.

Static visible-frame captures bake evaluated values and exclude their already-applied modulation; authored-base saves retain behaviour definitions. Performance setup is separate from the mathematical view and references one canonical set of domain mappings. New setup/take/project formats require versioned persistence and compatibility tests when implemented; no schema changes are made by this ADR. Reload/import starts stopped, not with automatically resumed motion or recording.

The consequence is an app-level ownership/evaluation change before live modulation ships, not another renderer or a required state-management framework. Navigation, action semantics, persistence responsibilities, acceptance specifications, alternatives to implicit multi-view targeting, and staged implementation are recorded in [WORKSPACE_DESIGN.md](WORKSPACE_DESIGN.md). ADR-026's external-source and feedback constraints remain unchanged; Phase 11/12 are still unscheduled.

## ADR-028: Workspaces share one mathematical world

**Status:** Accepted — ownership boundary; Phase 10.0 design is now recorded in WORKSPACE_DESIGN.md and ADR-029; workspace implementation remains future work.

Explore, Perform, and future Patch are different benches over the same mathematical world. They share semantic domain parameters, rendering and analysis contracts, and reusable Waypoint/Journey/modulation/persistence mechanisms. Workspace switching must preserve the current world; it must not implicitly clone configurations, create separate application models, or introduce per-workspace renderer backends. Explicit user-directed multi-view configurations such as Compare remain valid.

This prevents performance controls and future graph editing from becoming parallel applications with incompatible saved state. Workspaces orchestrate domain operations; their UI identities do not become parameter addresses. ADR-026 continues to govern semantic controls, evaluation order, external adapters, and feedback safeguards.

This decision itself does not select navigation, assign every state field, prescribe a new schema, or implement Perform/Patch. The subsequent [Phase 10.0 design](WORKSPACE_DESIGN.md) resolves global/local UI state, base/effective ownership, performance-setup persistence responsibilities, workflow placement, and active-view semantics. Phase numbering and feature sequencing remain roadmap matters, not new architectural abstractions.

## ADR-027: Admit Phoenix through existing escape metrics; gate specialist families

**Status:** Accepted

Phase 9.3 implements Julia-plane Phoenix as `z[n+1] = z[n]^2 + c + memory*z[n-1]`, starting at the pixel with zero earlier history. c is complex, memory real; bounded semantic parameters and defaults are owned by `fractals/phoenix.ts`, not UI or GPU offsets. Zero memory is Julia. CPU and WGSL iteration reuse escape/orbit metrics and current materials; GPU keeps both orbit states and c/memory packing double-single. The previous value is local iteration state, unrelated to external-control feedback. Quadratic smooth-escape colouring does not imply a derivative/distance-estimate capability. Schema 5's parameter map remains sufficient.

The [admission review](FORMULA_ADMISSION.md) assesses metric fit, cost, Discover value, visual distinction, and testability. Magnet I/II remain deferred until combined convergence/escape/singularity semantics are designed and benchmarked. Lyapunov needs a signed stability statistic and sequence/burn-in contract. IFS/Barnsley fern needs deterministic seeded sampling and density accumulation, not an escape-kernel branch. These decisions preserve the formula → metrics → material boundary and do not introduce speculative signal, audio, or graph abstractions.

## ADR-026: External control and generative interoperability

**Status:** Accepted — architectural constraints only; no integration runtime is implemented.

Fractal Waypoints remains a standalone fractal instrument. It may later become a peer in a Schnock Generative Instrument, alongside independent music generators, physical or software synths, controllers, and other visual instruments. Components connect through explicit domain interfaces, not knowledge of one another's implementation.

Control targets are stable semantic domain parameters, never React state paths, DOM identifiers, slider order, or shader uniform offsets. UI, presets, Journey, internal modulation, and future external controllers operate on the same serialisable configuration model. Preserve existing typed structures and persisted target IDs; do not introduce a general parameter registry or migrate names just for a hypothetical integration.

The intended evaluation order is base configuration → Journey interpolation → modulation/external input application → domain normalisation and validation → effective configuration → renderer. Preserve the base separately from evaluated output. The present implementation has this ordering in parts, with distributed normalisation rather than one complete final validation boundary; see the implementation audit in [INTEROPERABILITY.md](INTEROPERABILITY.md). Future adapters must use domain transformations, never mutate GPU state.

Sources must be independent of origin: internal waveforms, hardware controls, software-synth state, audio analysis, generative events, protocols, and fractal-derived metrics must not leak source-specific dependencies into formulas, materials, or renderers. Continuous signals, discrete events, and persistent state are distinct concepts; do not reduce them to one float sampled every frame. A future node graph is an editor over a serialisable source → transforms → mapping → target model, not the model itself. Neither the graph nor its transforms is implemented now.

Mathematical metrics may later be outputs with no knowledge of consumers. Iteration histograms, convergence distributions, root populations, and complexity statistics belong to fractal analysis; their interpretation as notes, scales, rhythm, or Markov transition probabilities belongs to a separate music generator. A synth consumes musical events; it must not contain that generator. Prefer a physical MIDI synth/control surface for the first eventual integration, then let a software adapter implement the interaction model informed by real hardware.

Do not assume flow is permanently one-way. Feedback requires explicit event ordering, clocks/update rates, state ownership, deterministic replay/export rules, and delayed/bounded scheduling that prevents unstable synchronous recursion. These semantics must be designed before feedback is enabled, not inferred from React renders or GPU frame completion.

No MIDI, audio, OSC, synth, DAW, node-editor, graph-runtime, or feedback-scheduler dependencies are authorised by this decision. Phase 9.3 continued through the existing formula → metrics → material architecture. The post-Phase-9 roadmap now develops internal instrument capabilities in Phase 10; Connections (11) and Patch Bay (12) remain unscheduled until deliberately started. Revisit concrete integration contracts before the first hardware integration; do not build a framework in anticipation.

## ADR-025: Convergence formulas use explicit status and verified root identity

**Status:** Accepted

Phase 9.2 selects the bounded polynomial family `p(z) = z^n - (r exp(iθ))^n`, with 2–6 evenly spaced roots, radius 0.5–2, rotation ±π, and real relaxation 0.2–1.8. Newton uses the pixel as its initial z and iterates `z - relaxation * p(z)/p'(z)`. Nova uses the first polynomial root as its initial z and adds the pixel coordinate at every iteration. This is the parameter-plane Nova variant, not a Nova Julia view. References: [Newton's method](https://mathworld.wolfram.com/NewtonsMethod.html) and [Nova implementation notes](https://hpdz.net/StillImages/Nova.htm).

Newton convergence requires polynomial residual ≤ tolerance; Nova requires step size ≤ tolerance. Tolerance ranges from 1e-4 to 1e-7. Zero/near-zero derivatives (squared magnitude < 1e-20), a safety radius of 1000, and iteration exhaustion have distinct diagnostic statuses. The safety bound is not a claim of escape-set membership. Newton verifies a unique nearby analytic root before assigning a root ID. Nova fixed points generally are not roots of p, so Nova advertises convergence but not root identity. Unknown identities fall back to convergence-speed colouring, never invented basin labels. Unresolved, singular, and divergent pixels have neutral diagnostic colours.

Polynomial iteration and complex division retain double-single arithmetic on WebGPU; scalar convergence tests and visual metrics use f32. CPU/GPU comparisons use stable fixtures and tolerances, not pixel-identical boundary guarantees. The derivative is used internally; no orbit derivative or distance-estimate capability is advertised. Escape-only materials are incompatible and render through a compatible fallback while saved state is retained. New parameters and material IDs fit schema 5; imports and Journey frames normalise bounded/discrete parameters. Arbitrary polynomials, free root placement, and Nova Julia variants remain follow-up work rather than implicit supported inputs.

## ADR-024: Multibrot powers are bounded and branch-aware

**Status:** Accepted

Multibrot evaluates `z^power + c` from zero with finite power in [2, 8], default 3. It uses the existing serialisable formula-parameter map, so schema 5 remains compatible; loading normalises invalid values. Journey parameter interpolation animates power continuously.

Whole powers use repeated complex multiplication (double-single on WebGPU). Fractional powers use the principal complex argument, choosing +pi on the negative real axis, and return zero explicitly at the origin. GPU fractional exponentiation uses f32 transcendental operations; its reduced precision and branch seam are disclosed in the UI. Smooth iteration uses the formula power. Multibrot advertises escape/orbit metrics, not derivative or distance-estimate capabilities. CPU/GPU parity is tolerance-based at stable points, not a promise of identical boundary pixels.

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

Lens treatment is an ordered serialisable effect list. Journey samples base/keyframed state first and then applies a bounded set of deterministic waveform modulations, with no user-authored code or shader expressions. This keeps video export reproducible and creates a natural path to perfectly looping material animation.

## ADR-022: Neighbourhood materials use a compact metric-field texture

**Status:** Accepted

Topographic and Lit Surface are the first materials to require neighbouring values. WebGPU therefore renders a compact `rgba16float` metric field in one pass (smooth height, phase, logarithmic magnitude, escape state), then samples it in a material pass for contour responsiveness and screen-space normals. Local materials retain the direct one-pass path. Field-pass selection is derived from each material definition’s `sampling` metadata, not a renderer-side list of material IDs. The field is allocated only on first use, resized with the canvas once it exists, and lives wholly in the renderer coordinator; React only selects a serialisable material configuration.

`rgba8unorm` used 4 bytes per pixel but quantised the height differences that drive normals, creating visible stair-stepping and unstable tight specular highlights. `rgba16float` costs 8 bytes per pixel—roughly 15.8 MiB at 1920×1080 versus 7.9 MiB—but provides a meaningful improvement in contour continuity and normal stability. It is the selected format; `rgba32float` has no demonstrated need. The uniform packer now defines explicit topography, surface, domain, and material-detail vectors so HDR work cannot accidentally reuse a parameter slot.

The field stores no invented distance estimate. Distance-estimate height remains gated on a formula truthfully advertising derivative/distance-estimate capability. The CPU fallback preserves the material configuration with documented approximations, while Visual Lab communicates that full field detail requires WebGPU.

## ADR-023: HDR presentation is a bounded post-material pipeline

**Status:** Accepted

WebGPU materials now render to a linear `rgba16float` scene texture before display. A half-resolution threshold pass extracts bloom candidates, and the final pass applies exposure, ACES tone mapping, capped bloom, vignette, and optional grain, colour grade, sharpen, or chromatic aberration. Only tone mapping is enabled by default; bloom and stylisation remain off. This keeps fractal and material kernels free from display transforms while avoiding a general render graph.

The CPU fallback retains the existing exposure/vignette subset and preserves all saved HDR effect settings without claiming a pixel-identical post-process result. Coordinate-distorting effects remain outside this lens pipeline because they change fractal sampling, not presentation.
