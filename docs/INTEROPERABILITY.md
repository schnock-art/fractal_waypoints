# Interoperability seams — Phase 9 audit and second-era direction

This is architecture guidance, not a general external-control API. ADR-026 records the semantic boundaries; ADR-028 adds shared-world workspace ownership. The [Phase 10.0 design](WORKSPACE_DESIGN.md) and ADR-029 specify ownership and persistence responsibilities. Phase 10.1 implements the [two-target semantic seam](SEMANTIC_PARAMETERS.md); 10.2 implements [internal explicit-time evaluation](MODULATION_EVALUATION.md) under ADR-031. Phase 11.1 now has a deliberately narrow Hydrasynth Explorer Web MIDI CC-learn session override under ADR-033; a persisted, replayable external-input runtime does not exist yet.

## Current configuration and modulation flow

- The first [Perform slice](PERFORM_FINDINGS.md) exposes Primary-only internal transport and an ordered editor without expanding targets. Two session-only continuous overrides use the existing semantic writers after modulation and before final validation. The Hydrasynth Explorer adapter supports bounded absolute control relationships and a separate recorded-take document; a take snapshots armed relationships and logical samples for replay without its source device. Diagnostic mapping statuses are not an event/state signal protocol.
- `types/config.ts` defines serialisable domain configurations and a closed union of semantic modulation targets. It contains no DOM, React, or GPU addresses.
- `animation/interpolation.ts` separates base interpolation from `evaluateConfiguration`, which applies internal modulation once and performs final typed-frame validation. Frame generation and `animation/export.ts` share that path. Ordinary Explore remains stopped; Journey preview has independent logical time and does not overwrite authored `mainConfig` or its URL mirror.
- `visuals/modulation/runtime.ts` evaluates internal sources, ordered transforms and add/replace mappings through the six existing targets. Legacy entries adapt into the same path once. List order is priority; target-local clamping remains observable. Seeded held noise and bounded trailing smoothing do not depend on frame history. This is not a general signal/event bus; Phoenix is not added to the waveform target union.
- `RenderView` handles interaction and surface lifecycle and passes configurations to `RenderSurface.render`. GPU layout and resource management remain in rendering modules. `webgpu/uniforms.ts` is the packing boundary, not a parameter-address catalogue for controllers.
- Import migration, formula normalisers, Journey interpolation, lens helpers, modulation setters, and renderer preparation each enforce parts of the domain rules. `resolveCompatibleRenderConfig` resolves material compatibility without overwriting saved looks; it is not comprehensive validation of every numeric input.

The current evaluator accepts only internal serialisable sources. Hydrasynth CC/NRPN zoom is intentionally an adjacent temporary override, not an evaluator source or stored configuration. Continuous speed and turn-delta modes both emit navigation intents; Hold preserves the temporary viewport while Release restores the base. The named catalogue and direct assignment do not imply a general external-source runtime. `parameters/validateRenderConfig.ts` supplies the final boundary for current typed evaluated frames: reject non-finite data, compose domain normalisers/validators, and resolve material compatibility without modifying authored state. It is not a universal JSON validator or an external-source contract. Discrete changes, controller input lifetimes and replay of external data require their own later decisions. See [the implementation findings](MODULATION_EVALUATION.md) for program versioning, mapping issues and remaining limits.

## External control direction — profile to semantic world

Phase 11 first makes the Hydrasynth understandable as a physical instrument, then lets real use pressure-test the source boundary. The intended relationship is:

```text
physical device profile → external input adapter → source → transforms → mapping
  → semantic target or navigation intent → validated effective world
```

A device profile is adapter/UI knowledge: stable device-local control identity, readable label/kind, protocol-neutral `ControlAddress`, and visual placement. Its coordinates are presentation data; its protocol addresses are device knowledge. Neither belongs in fractal semantic targets. The adapter translates the browser/device protocol into bounded live input. The source, transforms, mapping, and semantic target describe the relationship that future Perform and Patch views share. A Hydrasynth map must not create a second mapping model, mutate React parameter state, write GPU uniforms, or traverse arbitrary configuration paths.

`ControlAddress` is deliberately protocol-neutral. The initial 11.1 slice admitted MIDI CC; the current adapter also assembles complete NRPN values and permits assignment of profiled Macro/Filter aliases. Unprofiled NRPNs remain diagnostic-only. Pitch bend, pressure, notes, OSC, audio-derived and sensor-derived sources remain future possibilities, not authorised scope or a universal source/event framework. The first external source must determine the smallest useful generalisation of today's waveform-coupled `InternalSource`.

Zoom remains a navigation/control intent: the 11.1 gesture uses the double-single viewport path and must not be forced into the numeric `ModulationTarget` union for visual uniformity. Phase 11.3/11.4 must instead prove both a relative navigation intent and one existing continuous semantic target. Discrete state and events remain separate future semantics.

Live connection/device IDs, armed state, latest values, and adapter handles are session runtime. Device profiles are hardware knowledge; Phase 11.7 controller layouts will be user-owned reusable declarations of named address/channel lanes; controller assignments belong to versioned performance/control setup; recorded gestures belong to take/Journey input data; graph positions/layout are Patch presentation state. Waypoints remain fractal/world snapshots and never mean a particular Hydrasynth must be connected. Deterministic export must replay recorded or otherwise reproducible input, never sample live hardware opportunistically.

The intended ownership chain is `device profile → controller layout → performance setup → performance take → fractal world`. It does not imply execution identity: a layout provides presentation and deliberate user interpretation, while a setup retains raw endpoint identity and a take snapshots relationships for replay. Future import/export must leave mappings inspectable when a referenced layout is absent.

## Semantic addressing convention

Retain existing IDs and typed configuration ownership. New mappings should identify the owning formula/material/effect when necessary, plus its domain parameter key. Examples grounded in today's model:

| Domain target | Addressing meaning |
| --- | --- |
| Multibrot power | formula `multibrot`, `fractal.parameters.power` |
| Newton relaxation | formula `newton`, `fractal.parameters.relaxation` |
| Surface specular | material `surface`, `material.parameters.specular` |
| Topographic relief | material `topographic`, `material.parameters.relief` |
| Palette phase | existing `palette.offset` (do not silently rename it) |
| Bloom amount | effect ID `bloom`, parameter `amount` in `lens.effects` |
| View rotation | `viewport.rotation` |

These are addressing conventions, not newly supported modulation targets. Today's supported targets remain exactly the `ModulationTarget` union. Existing IDs such as `lens.effects.exposure.amount` resolve an effect by ID, not its position in the array. Future labels like “palette phase” may be UI aliases without changing saved `palette.offset`.

Phase 10.1 concretely implements semantic `formula.phoenix.memory` and existing `palette.offset` with domain-owned descriptors/read/write helpers. The Phoenix address is qualified independently of its stored `memory` key, and is inactive outside Phoenix. Both are continuous and modulation-eligible, but only palette offset is in today's waveform union. Palette offset remains finite/unbounded; its slider limits are display hints. Explicit semantic writes reject non-finite input, including overflowed palette modulation, without changing the selected configuration. This selected-write boundary does not replace whole-frame validation or import repair.

Use domain accessors, capability checks, units, bounds, and continuous/discrete semantics rather than generic traversal of arbitrary object paths. Formula/material parameter maps contain numeric values, but not every value is continuously meaningful: Newton degree is integral, material/formula selection is state, and a Waypoint-entered notification is an event. Unsupported targets need an explicit policy rather than writing a value into an inactive material.

Current positional trap IDs (`material.orbitTraps[0/1].rotation`) refer to bounded domain slots, not slider order. If traps become reorderable graph entities, introduce stable instance identities with a persistence migration. Formula metadata currently lists only some parameters (Newton/Nova list degree); bounds and defaults also live in domain helpers and editor ranges. Do not infer an external parameter catalogue from UI inspection or assume registry completeness. Consolidate metadata incrementally when a real new consumer requires it.

## Mathematical outputs, not material outputs

`fractals/runtime.ts` exposes detailed CPU orbit samples and `webgpu/mandelbrotShader.ts` declares GPU orbit metrics. Capabilities distinguish escape families from convergence families. Newton supplies verified root identity; Nova supplies fixed-point convergence, not polynomial-root identity. Preserve those distinctions and represent unavailable values explicitly in any future output contract.

An eventual analysis/output component can request formula metrics for a defined sampling region and aggregate iteration histograms, settled/unsettled ratios, convergence-step distributions, Newton root populations, phase statistics, or complexity measures. It must not derive these statistics from RGB output, palette bands, tone mapping, or the compact `rgba16float` material field. That field stores transformed/limited channels and does not retain an exact iteration histogram or all convergence states. No aggregate GPU readback/subscription API exists today.

Before implementing outputs, define snapshot/config identity, region/resolution, sample count, sampling/weighting policy, bin definitions, capability/status metadata, precision, timestamp, and treatment of unresolved/singular/divergent orbits. Label estimates versus exact counts and provide cancellation, rate limits, and backpressure; avoid synchronous per-frame readback that stalls rendering. GPU completion order must not become application event order accidentally.

Discovery already samples formula geometry independently of palette/lens styling. Its legacy `escapeRatio` field is used as a settled ratio for convergence families, and its compact `basin` value is a ranking code; neither should be published as a universal statistical schema. Escape runtime also reads trap geometry from material configuration when trap tracking is requested. Future metric requests should state that geometry explicitly, or disable optional trap tracking, rather than let an active visual preset silently change an analytical measurement.

Fractal analysis may expose a histogram and its normalised probabilities. An external music generator decides whether that distribution controls scale degrees, intervals, rhythm, or Markov transitions. Synths consume musical events; neither musical rules nor synth/device dependencies belong in fractal code.

## Sequencing after Phase 9.3

1. **Phase 10.0 — design complete:** [WORKSPACE_DESIGN.md](WORKSPACE_DESIGN.md) specifies Explore/Perform hierarchy, base/effective ownership and persistence responsibilities. Phase 10.2 now implements non-destructive Journey preview; Perform promotion and setup/take persistence remain 10.3.
2. **Phase 10.1 — scoped pressure test complete:** Phoenix Orbit memory and palette offset have domain-owned metadata and guarded writes. Existing IDs remain intact. Discrete/event/state semantics, trap instance identities if reordering is needed, and the 10.2 final-frame validator remain explicit review gates; see [the findings](SEMANTIC_PARAMETERS.md).
3. **Phase 10.2 — complete:** internal source/transform/mapping evaluation, ordered add/replace, seekable smoothing/noise, a shared final-frame boundary and static snapshots are implemented. Review UI presentation of ordering, smoothing and mapping failures before 10.3 exposes the mechanisms through Perform. Events/state remain outside this continuous internal model.
4. **Phase 10.4:** implement the metric snapshot contract and aggregation budget separately from material textures and consumer interpretations. Validate internal Discover/diagnostic/Perform-meter/region-comparison uses before external consumers.
5. **Phase 11.1 — delivered:** browser permission, input selection (including a Focusrite MIDI-port label), CC learn, arming, and safe temporary double-single zoom release are implemented. The raw monitor is a valid diagnostic, not the intended primary UX.
6. **Phase 11.2/11.3:** introduce a minimal Hydrasynth device profile and visual control map with touch-to-identify, then visual assignment to Zoom and one admitted continuous target. Keep the monitor advanced, the target set small, and the relationship canonical.
7. **Phase 11.4:** use those mappings to pressure-test a bounded/timestamped external source through the serialisable source/transform/mapping direction. Define reconnect, rate bounds, relative-versus-absolute semantics, and diagnostics before treating live input as part of a Journey.
8. **Phase 11.5/11.6:** controller setup and version-1 takes are separate from profiles, session runtime, Waypoints, and graph layout. Take replay uses its own recorded relationship snapshot. Deterministic Journey export must use recorded or otherwise reproducible inputs, not live hardware sampled opportunistically.
9. **Phase 12 — unscheduled until deliberately started:** Patch edits a validated domain model through a different view, never defines the model. Before permitting feedback, define delayed edges, update rates, event ordering, bounded processing, state transitions, replay behaviour, latency, and cycle safeguards. Do not recursively render or dispatch events synchronously through consumers.

Original audit outcome: no concrete UI/GPU addressing dependency required an immediate code change. The subsequent Phase 10.1 pressure test implements only the two selected domain targets and rejects non-finite palette-modulation writes; persisted formats and dependencies remain unchanged. The remaining gaps are integration prerequisites, not reasons to build speculative infrastructure.
