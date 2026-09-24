# Performance controller setup

Phase 11.5 persists useful controller relationships without making fractal documents depend on hardware.

## Ownership

`PerformanceControlSetup` is an independently versioned document (`schemaVersion: 1`) stored under `fractal-explorer:performance-setup:v1`. It owns:

- a setup name;
- referenced device-profile identities;
- at most one binding for each currently proven target, Zoom and Palette offset;
- each binding's external source identity, transforms, semantic/navigation target, and editor settings.

It does **not** own browser MIDI input IDs, permission/connection state, armed state, live values, transport state, authored `RenderConfig`, URLs, Waypoints, Journey data, recorded takes, or future Patch layout. Clearing a controller setup leaves all fractal/world persistence untouched. Loading or importing a setup never changes an authored or effective fractal value.

## Profiled and learned controls

Named Explorer controls reference `asm-hydrasynth-explorer-2.2`. A custom received CC uses the explicit `learned-midi-control` profile identity and retains its `ControlAddress` and channel. This avoids pretending a user-routed Mod Matrix destination is part of ASM's documented control catalogue.

The browser's transient port ID is never stored. After reload or device absence, the relationships remain visible but unarmed. The user connects any equivalent input that emits the saved control address/channel, inspects the mapping, and arms it explicitly. Rebinding a target to another named or learned control replaces only that source while retaining the target workflow.

## Validation and compatibility

Validation checks the setup version, unique binding/target IDs, declared profile references, complete external relationships, matching target kinds, finite range/curve settings, and exact transforms generated from those settings. This prevents editor metadata and runtime transforms from disagreeing.

JSON import is all-or-nothing. Invalid JSON or invalid version-1 data does not replace the current setup. A future schema version is reported as unsupported and left untouched in local storage; this build never guesses a downgrade. Export produces a portable JSON document named `fractal-waypoints-controller-setup.json`.

This is setup persistence, not performance capture. Arming and live samples deliberately restart empty. [PERFORMANCE_TAKES.md](PERFORMANCE_TAKES.md) describes the separate Phase 11.6 capture document.

The [performance recipe catalogue](PERFORMANCE_PRESET_IDEAS.md) records possible future starter setups and pressure tests. It is creative research, not part of this persistence schema.
