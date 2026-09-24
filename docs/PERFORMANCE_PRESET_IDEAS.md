# Performance preset and mapping recipe ideas

This is a catalogue of creative performance recipes for later actual-use testing. These ideas are hypotheses, **not a canonical preset schema**, persistence format, runtime commitment, or promise that every named source and target will be admitted.

The recipes should inform controller-setup evaluation, future starter presets, transform ergonomics, and the eventual Patch workspace. Implementation still requires the relevant source, target, composition, lifecycle, and replay semantics to be validated independently.

## Pressure Bloom

- **Expressive intent:** Pressing deeper into the keys moves progressively further through the colour palette, from subtle tint motion to a more dramatic bloom.
- **Source:** MIDI channel pressure / aftertouch.
- **Target:** Palette offset.
- **Suggested transforms:** Scale the continuous pressure value to a modest palette range, apply a nonlinear response curve that preserves light-pressure nuance, then clamp to the chosen performance range.
- **Status / implementation notes:** Recipe only. Start with channel pressure because its single continuous value is simpler than polyphonic aftertouch. Phase 11.4 currently admits absolute CC/NRPN controls, not pressure messages; palette and rendering semantics need no change.
- **What it should teach us:** Whether a second continuous MIDI source kind fits the external-source boundary cleanly, whether the curve feels expressive, and whether pressure needs source-specific pickup or smoothing behaviour.

## Chromatic Drift

- **Expressive intent:** Let the hardware synth drive autonomous colour evolution.
- **Source:** A Hydrasynth LFO routed through the Mod Matrix to an outgoing MIDI CC endpoint.
- **Target:** Palette offset.
- **Suggested transforms:** Tune the palette range and response curve; clamp to the intended performance window. Existing frame coalescing bounds dense updates.
- **Status / implementation notes:** Manually demonstrated with the Hydrasynth and supported by the current learned-CC mapping path. Fractal Waypoints observes the outgoing MIDI endpoint; it must not claim that the upstream source is an LFO.
- **What it should teach us:** Dense-update behaviour, coalescing, curve/range feel, and whether the UI communicates endpoint identity without inventing upstream provenance.

## Pressure + Drift

- **Expressive intent:** Layer autonomous movement with human expressive intervention.
- **Sources:** Hydrasynth LFO-routed CC → Palette offset; aftertouch → another compatible colour/material parameter, or additive palette expression after composition is validated.
- **Targets:** Palette offset plus a future validated colour/material target, or one composed Palette target.
- **Suggested transforms:** Independently scale and curve each source; define explicit add/replace order and safe target bounds before combining them.
- **Status / implementation notes:** Recipe only. Do not implement multi-source composition merely to satisfy this idea.
- **What it should teach us:** Whether multiple sources can combine safely on one target, how autonomous and expressive layers should be ordered, and what effective-value feedback a performer needs.

## Macro Dive

- **Expressive intent:** Use a physical Macro as a flight control into and out of the fractal.
- **Source:** Hydrasynth Macro.
- **Target:** Zoom navigation.
- **Suggested transforms:** Either signed continuous zoom velocity with centre hold, or quantised turn-to-zoom relative intent.
- **Status / implementation notes:** Largely validated by Phases 11.3–11.4 and a strong candidate for a future starter preset.
- **What it should teach us:** Whether a saved starter relationship can remain immediately understandable, safe to arm, and useful across fractal worlds.

## Mod Strip Flight

- **Expressive intent:** Tactile navigation where finger position controls signed or unidirectional flight speed.
- **Source:** Hydrasynth modulation strip.
- **Target:** Zoom rate.
- **Suggested transforms:** Map the absolute strip position to signed speed with an intentional centre/rest region, or to unidirectional speed with a clear release policy.
- **Status / implementation notes:** Recipe only. The device profile exposes the Mod strip's CC endpoint, but its physical interaction differs from a rotary knob and needs hardware testing.
- **What it should teach us:** Pickup, centre, rest and release semantics for a touch surface, and whether target behaviour should account for a control's physical affordance without coupling navigation to Hydrasynth code.

## Pitch Bend Rotation

- **Expressive intent:** Use a spring-centred bipolar gesture for immediately visible rotational motion.
- **Source:** MIDI pitch bend.
- **Target:** A genuinely compatible validated rotational semantic target.
- **Suggested transforms:** Convert the bipolar source to signed displacement or rate, preserve the spring-centred rest position, curve if useful, and clamp to safe motion.
- **Status / implementation notes:** Recipe only. Pitch bend is not currently admitted as a source, and no arbitrary object-path target should be introduced to satisfy the recipe.
- **What it should teach us:** Whether spring-centred controls naturally express rotational rate or displacement and which existing or newly justified semantic rotation target is actually useful.

## Envelope Light

- **Expressive intent:** Make visual brightness or depth breathe with an envelope.
- **Source:** A Hydrasynth envelope routed to an outgoing MIDI CC, or a future explicitly admitted envelope source.
- **Target:** Exposure or vignette.
- **Suggested transforms:** Envelope → exposure, inverse envelope → vignette, or two related mappings after one-source-to-many-target composition is validated.
- **Status / implementation notes:** Recipe only. With a routed CC, Fractal Waypoints observes the endpoint rather than the synth-internal envelope provenance. Exposure and vignette require deliberate admission through the semantic external-target boundary.
- **What it should teach us:** One-source-to-many-target usefulness, inverse/paired transforms, and whether lighting motion remains readable without overwhelming the fractal material.

## Macro Performance Bank

- **Expressive intent:** Turn the Hydrasynth into a compact live fractal performance surface.
- **Sources and conceptual targets:**

  ```text
  Macro 1 → Zoom
  Macro 2 → Palette offset
  Macro 3 → Orbit emission
  Macro 4 → Trap rotation
  ```

- **Suggested transforms:** Give each relationship a target-appropriate range and curve; keep navigation intent distinct from semantic numeric targets.
- **Status / implementation notes:** Zoom and Palette offset are proven. Orbit emission and trap rotation are existing internal modulation targets but are not automatically admitted as external semantic targets. This is an acceptance recipe, not an instruction to broaden the registry immediately.
- **What it should teach us:** Whether a multi-control setup can be reloaded, rebound, inspected and explicitly armed as one coherent performance surface without putting hardware requirements into Waypoints.

## Identity, endpoint and provenance

The Hydrasynth experiments exposed an important distinction:

```text
physical control identity
        ≠
external signal endpoint
        ≠
upstream signal provenance
```

For example, a profile may label CC 16 as the Hydrasynth Macro 1 lane, while its values could have originated from:

```text
finger → Macro 1 → CC16
LFO → Mod Matrix → CC16
aftertouch → Mod Matrix → CC16
```

Fractal Waypoints can reliably observe `Hydrasynth / channel / CC16`. It cannot infer the internal Hydrasynth graph unless a future mechanism supplies that provenance explicitly.

Future Patch labels may use friendly device-profile names, but must distinguish a documented endpoint label from asserted physical or synth-internal provenance. A graph must never claim an upstream source it cannot observe.

## Questions for later actual-use testing

Use these recipes to evaluate:

- performance setup persistence and starter-preset value;
- multi-source and multi-target composition;
- expressive versus autonomous modulation;
- channel pressure, pitch bend and other new external source kinds;
- transform ergonomics and effective-value feedback;
- honest Patch representation;
- one source feeding several targets;
- several sources combining safely on one target.

Do not convert this list into implementation commitments solely because an idea appears here. Preserve interesting musical/visual experiments now; let repeated actual use determine which ones deserve first-class preset support later.

This initial collection emerged from real Hydrasynth experiments during Phase 11. Add to it whenever a mapping produces a particularly useful or expressive interaction.
