# Fractal Explorer: Codex Project Guidance

Read `docs/PRODUCT_BRIEF.md`, `docs/ARCHITECTURE.md`, and `docs/ROADMAP.md` before making substantial changes.

## Mission

Build a GPU-accelerated browser application for exploring, comparing, discovering, and recording fractals. It should feel like an interactive mathematical landscape: users navigate through regions, save Waypoints, customise palettes, compare formulas, and create animated journeys.

## Non-negotiable decisions

- WebGPU is the primary renderer.
- Use double-single arithmetic from the first rendering implementation.
- Keep formula evaluation, coordinate mapping, colouring, palette editing, navigation, animation, persistence, and UI modular.
- Treat the palette curve editor as core functionality; visual styles are presets.
- Use serialisable render configurations for rendering, URLs, Waypoints, comparisons, keyframes, and exports.
- Keep a CPU fallback behind the same renderer interface, but implement it later.
- Add schema/version fields to persisted data from the beginning.

## Engineering principles

- Prefer small pure functions for mathematics and state transformations.
- Keep WebGPU resource management inside rendering modules.
- Do not put formula or shader details inside UI components.
- Add tests for double-single arithmetic, coordinate mapping, interpolation, URL encoding, and animation interpolation.
- Record architectural decisions in `docs/DECISIONS.md`.

## Delivery hygiene

- Update the relevant documentation when changing architecture, persistence formats, terminology, workflows, or user-facing behaviour.
- Keep each completed task in a clean, focused, commit-ready state. Prefer one coherent change per task and avoid mixing unrelated refactors with feature work.
- After each completed task, check the live app state when feasible, not just the code or tests, so obvious behaviour and presentation issues are caught before handoff.
- Add or update automated tests whenever behaviour, mathematical correctness, serialization, or regressions could be affected.
- Run the relevant tests for the area you changed before considering a task complete. If something cannot be verified, note that explicitly.
- Do a brief UX analysis after each user-facing task. If you notice a meaningful UX issue or follow-up improvement that is not already captured, add it to `docs/ROADMAP.md` rather than leaving it as implicit future work.
- Preserve clear module boundaries: UI components orchestrate, domain modules transform data, and rendering modules talk to GPU resources.
- Prefer incremental slices that leave the app runnable over broad partially-finished rewrites.
- Use the project's product language consistently: `Waypoints`, `Explore`, `Discover`, `Compare`, and `Journey`.
- When making a cross-cutting or hard-to-reverse decision, add or update an ADR in `docs/DECISIONS.md`.

## Initial task

Start with Phase 1 in `docs/ROADMAP.md`: scaffold the TypeScript application, define domain types, implement and test double-single arithmetic, initialise WebGPU, and render Mandelbrot through the planned interfaces.
