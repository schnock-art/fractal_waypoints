# Interoperability seams — post-Phase 9.2 audit

This is architecture guidance, not an implemented external-control API. ADR-026 records the decision. Phase 9.3 remains the next formula task; nothing here adds integration dependencies or changes rendering behaviour.

## Current configuration and modulation flow

- `types/config.ts` defines serialisable domain configurations and a closed union of semantic modulation targets. It contains no DOM, React, or GPU addresses.
- `animation/interpolation.ts` samples base/keyframed configuration, then calls `applyModulations` using explicit animation time. Frame generation and `animation/export.ts` share that sampling path. Ordinary Explore renders its current configuration; it does not run an independent live modulation clock.
- `visuals/modulation/runtime.ts` evaluates deterministic waveforms and applies additive target values through domain setters. It has no UI or WebGPU dependency. List order and target-local clamping currently affect composition. It is a waveform implementation, not a general signal/event bus.
- `RenderView` handles interaction and surface lifecycle and passes configurations to `RenderSurface.render`. GPU layout and resource management remain in rendering modules. `webgpu/uniforms.ts` is the packing boundary, not a parameter-address catalogue for controllers.
- Import migration, formula normalisers, Journey interpolation, lens helpers, modulation setters, and renderer preparation each enforce parts of the domain rules. `resolveCompatibleRenderConfig` resolves material compatibility without overwriting saved looks; it is not comprehensive validation of every numeric input.

The existing separation is suitable for future sources. A future application-level evaluator can accept source-independent inputs between interpolation and rendering without teaching the renderer about their origin. Do not describe the current system as already accepting arbitrary external sources. Before adding such sources, define one reliable final domain-normalisation/validation boundary shared by live and exported evaluation, reject non-finite inputs, and specify bounds and discrete changes. Keep persisted/base state distinct from effective output to avoid accidentally accumulating modulation frame after frame.

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

Use domain accessors, capability checks, units, bounds, and continuous/discrete semantics rather than generic traversal of arbitrary object paths. Formula/material parameter maps contain numeric values, but not every value is continuously meaningful: Newton degree is integral, material/formula selection is state, and a Waypoint-entered notification is an event. Unsupported targets need an explicit policy rather than writing a value into an inactive material.

Current positional trap IDs (`material.orbitTraps[0/1].rotation`) refer to bounded domain slots, not slider order. If traps become reorderable graph entities, introduce stable instance identities with a persistence migration. Formula metadata currently lists only some parameters (Newton/Nova list degree); bounds and defaults also live in domain helpers and editor ranges. Do not infer an external parameter catalogue from UI inspection or assume registry completeness. Consolidate metadata incrementally when a real new consumer requires it.

## Mathematical outputs, not material outputs

`fractals/runtime.ts` exposes detailed CPU orbit samples and `webgpu/mandelbrotShader.ts` declares GPU orbit metrics. Capabilities distinguish escape families from convergence families. Newton supplies verified root identity; Nova supplies fixed-point convergence, not polynomial-root identity. Preserve those distinctions and represent unavailable values explicitly in any future output contract.

An eventual analysis/output component can request formula metrics for a defined sampling region and aggregate iteration histograms, settled/unsettled ratios, convergence-step distributions, Newton root populations, phase statistics, or complexity measures. It must not derive these statistics from RGB output, palette bands, tone mapping, or the compact `rgba16float` material field. That field stores transformed/limited channels and does not retain an exact iteration histogram or all convergence states. No aggregate GPU readback/subscription API exists today.

Before implementing outputs, define snapshot/config identity, region/resolution, sample count, sampling/weighting policy, bin definitions, capability/status metadata, precision, timestamp, and treatment of unresolved/singular/divergent orbits. Label estimates versus exact counts and provide cancellation, rate limits, and backpressure; avoid synchronous per-frame readback that stalls rendering. GPU completion order must not become application event order accidentally.

Discovery already samples formula geometry independently of palette/lens styling. Its legacy `escapeRatio` field is used as a settled ratio for convergence families, and its compact `basin` value is a ranking code; neither should be published as a universal statistical schema. Escape runtime also reads trap geometry from material configuration when trap tracking is requested. Future metric requests should state that geometry explicitly, or disable optional trap tracking, rather than let an active visual preset silently change an analytical measurement.

Fractal analysis may expose a histogram and its normalised probabilities. An external music generator decides whether that distribution controls scale degrees, intervals, rhythm, or Markov transitions. Synths consume musical events; neither musical rules nor synth/device dependencies belong in fractal code.

## Revisit after Phase 9.3, before external integration

1. Choose a concrete physical synth/controller and its first useful mappings. Keep adapters replaceable; a later software synth uses the same proven domain interaction model.
2. Separate source evaluation from target application when a second source type actually exists. Define composition (add/replace/priority), units, bounds, inactive-target behaviour, and final validation. Do not model events or persistent state as waveform samples.
3. Specify clocks, timestamps, ordering, source lifetime, and base/effective state ownership. Deterministic Journey export must use recorded or otherwise reproducible inputs, not live hardware sampled opportunistically.
4. Design the metric snapshot contract and aggregation budget separately from material textures and consumer interpretations.
5. Model any signal graph independently of its node editor. Scale, offset, clamp, invert, smoothing, curves, quantisation, and sample/hold are possible future transforms, not a runtime being promised now.
6. Before permitting feedback, define delayed edges, update rates, event ordering, bounded processing, state transitions, replay behaviour, and cycle safeguards. Do not recursively render or dispatch events synchronously through consumers.

Audit outcome: no concrete UI/GPU addressing dependency requires a code change for this task. The gaps above are real integration prerequisites, not reasons to build speculative infrastructure now. Documentation only; existing runtime behaviour, persisted data, and dependencies remain unchanged.
