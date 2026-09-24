# External control boundary

Phase 11.4 introduces a deliberately small runtime boundary proven with the Hydrasynth Explorer. It is not a universal event bus, graph runtime, saved setup, or take format.

## Relationship model

The layers are explicit:

`physical profile → Web MIDI adapter → ExternalControlSourceIdentity → shared SignalTransform[] → ExternalControlMapping → semantic value or navigation intent → effective world`

`ExternalControlSourceIdentity` is serialisable and contains a stable profile/control identity, protocol-neutral `ControlAddress`, channel, and documented absolute range. Browser MIDI input IDs, permission state, ports, callbacks, and connection status are runtime-only. An `ExternalControlRelationship` currently pairs one source with one mapping; Phase 11.5 may persist collections of these in a separately versioned performance setup, never in a Waypoint or `RenderConfig`.

Internal modulation and external control share validated stateless transforms: scale, offset, invert, clamp, and signed power curve. Internal explicit-time smoothing remains internal because its deterministic trailing window is not equivalent to live frame history. The controller UI builds Palette range/inversion/curve behaviour from the shared transform list instead of a MIDI-specific range function.

## Runtime semantics

The MIDI adapter decodes complete absolute CC/NRPN values and timestamps them. The external frame buffer keeps at most one latest absolute sample per source for the next animation frame, accepts at most 32 distinct pending sources, rejects older timestamps, and reports received, emitted, coalesced, stale, and overflow counts. This bounds UI/render work during dense LFO traffic while retaining the latest absolute state. It is not an audio-rate transport.

Palette output is an absolute semantic value applied through the existing temporary Perform override and final configuration normalisation. Zoom remains a navigation target, never a numeric render parameter. Continuous mode produces a signed zoom-rate intent; turn mode quantises the absolute position before deriving a relative navigation intent from successive samples. The first turn-mode sample establishes a baseline.

Disconnect, input change, Stop, workspace exit, and disarm release effective values. Session relationships survive an input disconnect or manual rebind but return disarmed, so reconnect cannot resume movement without explicit arming. Decoder state, timestamp baselines, pending samples, zoom rate, and relative baselines reset on rebind. No browser input ID is stored in the relationship.

## Current limits

- One session relationship per proven target: Zoom and Palette offset.
- Sources are absolute continuous controls only. Discrete events, switches, notes, pressure, clocks, mutable state, and feedback are not modelled.
- Relationships are not persisted, recorded, replayed, exported, or added to `RenderConfig`.
- Live smoothing is not implemented; frame coalescing is load control, not signal smoothing.
- The renderer, formulas, materials, lenses, palette domain, and navigation engine do not import MIDI or Hydrasynth modules.

These limits keep Phase 11.5 persistence and 11.6 take/replay semantics explicit rather than accidentally deriving them from React callbacks.
