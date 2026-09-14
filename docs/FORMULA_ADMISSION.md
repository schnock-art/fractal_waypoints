# Phase 9.3 — Formula admission review

This review admits Phoenix and assesses Magnet I, Magnet II, and Lyapunov; it does not promise implementation of every candidate. Conclusions for unimplemented formulas are architectural assessments, not local performance measurements. ADR-026's external-control boundary remains unchanged.

## Admission checklist

1. **Mathematical definition:** specify recurrence, initial state, parameter plane versus starting-point plane, valid parameters, stopping rules, and unresolved/singular states.
2. **Shared metric fit:** declare only produced capabilities. Reuse materials when their requirements are met; never call a convergence value an escape metric or infer statistics from colour.
3. **Interactive cost:** bound iterations/state, preserve cancellation and double-single coordinate/orbit arithmetic where applicable, and verify real GPU output. Record representative timings before making frame-rate promises.
4. **Discover usefulness:** use formula-native boundaries/variation independently of material; preserve formula parameters in resulting Waypoints.
5. **Visual distinction:** supply curated destinations, inspect actual rendered detail, and ensure existing controls/materials leave a usable starting view.
6. **Testability and persistence:** analytic/reduction cases, CPU/WGSL metric fixtures, parameter bounds, URL/Waypoint/Journey round trips, and browser tests for controls, fallback compatibility, and visible GPU frames.

## Decisions

| Candidate | Metric fit | Interactive cost assessment | Discover and visual value | Test requirements | Decision |
| --- | --- | --- | --- | --- | --- |
| Phoenix | Existing escape/orbit metrics; one prior complex value; no new material pass | One extra memory multiply/add per iteration. Bounded parameters and iterations. Real GPU control/material/Compare checks pass; no FPS claim | Existing escape-boundary/iteration-variance search applies. Three inspected destinations show distinct lobes, fine branches and asymmetry | Zero-memory Julia equivalence, two-step recurrence, per-pixel reset, positive/negative memory GPU readback, persistence and Journey | **Admit now**, Julia-plane form with real memory coefficient |
| Magnet I | Needs combined escape/convergence/pole status; current escape-only and convergence-only material contracts cannot simply be relabelled | Rational division and stopping criteria need a dedicated benchmark. Not measured in this app | Parameter/Julia planes and miniature structures are promising; search must distinguish convergence basins from escaping regions | Denominator singularity, convergence/escape thresholds, stable reference views, dual-stop CPU/GPU parity | **Defer implementation** until dual-stop metric/material semantics are specified; first Magnet prototype candidate |
| Magnet II | Same dual-stop requirements as I, with a more complex recurrence | Greater arithmetic complexity than I; no local benchmark | Richer patterns may justify cost, but should be compared with I using matched views | All I cases plus recurrence-specific poles and numerical stress tests | **Defer** until I demonstrates a useful, tested shared contract |
| Lyapunov | Requires signed finite-time Lyapunov exponent and stability classification, not final complex orbit phase or escape smoothing | Transient burn-in plus repeated log-derivative accumulation; fixed iteration work and singular logs need policy and measurement | Stability boundaries and exponent gradients offer a distinct landscape; existing escape ratios are unsuitable search signals | Constant-sequence reference cases, sequence persistence, burn-in sensitivity, log-zero treatment, finite-time CPU/GPU tolerance | **Defer** as a dedicated stability-field slice with its own metric capability and material |

Phoenix evidence lives in `tests/phoenix.test.ts`, the combined escape-family GPU readback test in `tests/e2e/multibrot.spec.ts`, and `tests/e2e/phoenix.spec.ts`. The browser checks cover classic, orbit-trap, topographic, and surface paths; all three curated configurations are loaded via their serialised URLs and checked for actual WebGPU detail. Readiness checks are not a sustained GPU benchmark. CPU fallback remains resolution-capped and approximate for neighbourhood materials, as before.

## Phoenix definition and limits

Use `z[n+1] = z[n]^2 + c + memory*z[n-1]`, with `z[0] = pixel` and `z[-1] = 0`. Defaults are `c = 0.56667 + 0i`, `memory = -0.5`. Real/imaginary c are bounded to [-2, 2]; real memory to [-1, 1]. Zero memory reduces to the matching Julia set. We keep the application's usual real-horizontal/imaginary-vertical mapping; reference images that swap axes can therefore have a different orientation. This slice does not add a parameter-plane variant, complex memory coefficient, or higher powers.

The previous orbit value is per-pixel transient state, not persisted history and not an external signal feedback loop. It is updated only after computing the next value. CPU and WGSL share the usual radius cutoff/iteration budget and quadratic smooth-escape colouring convention. Smooth escape is a visual continuation, not a derivative or distance estimate. Boundary pixels remain sensitive to precision and iteration budget.

Parameter definitions, defaults, ranges, and normalisation live in `fractals/phoenix.ts`; Explore/Compare consume that metadata. URL migration and Journey interpolation normalise those same semantic parameters. WebGPU keeps both orbit states and the packed c/memory values in double-single form. Its uniform layout gains one named Phoenix vec4, taking it to 20 vec4s / 320 bytes. Existing c slots now preserve the low component instead of discarding it. Schema 5 remains valid because formula parameters already form a serialisable numeric map.

## IFS/Barnsley fern: separate sampling architecture

An IFS is not another per-pixel escape formula. Scope it separately around a serialisable set of affine transforms and probabilities, a deterministic random seed, transient burn-in, sample budget, and density accumulation. Specify GPU accumulation/normalisation, precision, cancellation, resize/reset behaviour, CPU fallback, and deterministic Journey/export sampling. Materials should consume density or other genuine sampling statistics; Discover needs density/occupancy/structure measures rather than escape-boundary heuristics. Preserve the shared view/configuration orchestration where appropriate, but do not force it through `iterate_formula` or pretend its samples are orbit-escape metrics. No IFS renderer is implemented here.

## Primary references

- [Phoenix implementation and parameter examples](https://www.mitchr.me/SS/phoenix/index.html): use the executable recurrence in the code section; the introductory displayed equation has a transcription error. This app uses a real memory coefficient and its own coordinate orientation.
- [Ultra Fractal Magnet I/II documentation](https://www.ultrafractal.com/help/formulas/standard/magnet.html): both escaping and converging stopping rules and the difference between types.
- [Lyapunov generator implementation](https://github.com/RokerHRO/lyapunov): sequence-driven parameter fields and explicit sample budgets; [Oliver Knill's logistic-map Lyapunov notes](https://abel.math.harvard.edu/archive/118r_spring_05/handouts/lyapunov.pdf) describe the log-derivative statistic.
