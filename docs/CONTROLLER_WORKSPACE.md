# Controller workspace UX

The Phase 11 controller capabilities are presented as one workspace with five intent-based views:

- **Live** shows the connected instrument, active layout, current mappings, arm/release controls, and performance-take status. It is the default view.
- **Mappings** shows source → target relationships first. Adding or editing a mapping follows Source → Target → Response; detected input is primary, while the Hydrasynth catalogue and manual CC entry are progressively disclosed.
- **Layouts** names the reusable signal lanes exposed by a user's hardware routing or expected synth patch. Layout labels remain separate from mappings and provenance.
- **Takes** records, replays, and deletes the one locally persisted performance take supported by schema 1.
- **Diagnostics** contains MIDI input selection, incoming activity, raw CC/NRPN monitoring, runtime counters, device-profile details, and hardware troubleshooting.

The workspace uses one modal with a persistent header and section navigation. Desktop uses a left rail and an internally scrolling active page; narrower screens use a horizontal tab list and stacked content. Arrow keys move between tabs, Escape closes, focus remains trapped while open, and closing returns focus to the compact Perform launcher.

This is an information-architecture change only. `useMidiControls` remains the runtime owner, while device profiles, controller layouts, performance setups, recorded takes, and fractal world state retain their existing independent schemas and lifecycles.
