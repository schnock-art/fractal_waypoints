# Controller layouts

Phase 11.7 adds `ControllerLayoutsDocument` schema 1, stored separately at `fractal-explorer:controller-layouts:v1`. It is a reusable, user-owned collection of named layouts, each with optional device-profile and expected-patch metadata plus unique labelled MIDI address/channel lanes.

A layout is presentation and deliberate human interpretation, not transport provenance. The app therefore displays an active lane label first, a genuine vendor-profile label second, and the raw address otherwise. Every mapping still retains its raw address/channel; a layout can be absent, changed, or removed without invalidating a setup.

Layouts do not own Fractal Waypoints targets or signal transforms. A lane simply supplies an endpoint to the existing setup editor, which creates the normal raw external relationship. Recorded takes continue to snapshot those relationships and never resolve mutable layout names during replay.

Create or select a named layout in **Perform → Open controller → Layouts**. Choose **Add lane**, move or generate the signal, name the received endpoint, and save it; manual CC/channel entry remains available for preconfigured Mod Matrix routes. Use the lane as a source later in **Mappings**. Layouts save automatically; import, export, and the explicitly labelled delete action live under **Manage layouts**. Invalid or newer documents never replace saved data.
