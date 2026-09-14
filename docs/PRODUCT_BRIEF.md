# Fractal Explorer — Product Brief

## Vision

Fractal Explorer is an interactive browser laboratory for exploring mathematical landscapes. It should combine the immediacy of a visual toy, the depth of a scientific instrument, and the feeling of travelling through an infinite world.

> Change a mathematical rule or parameter and discover how an entire visual world changes.

## Primary experiences

### Explore

Smoothly pan and zoom through Mandelbrot and Julia sets, adjust iterations, bailout, formula parameters, colouring, and palettes, and export still images. Clicking a Mandelbrot point should reveal the corresponding Julia set. The first implementation should prefer a secondary Julia panel, while keeping the view system flexible enough to support future split and comparison layouts without changing the underlying rendering model.

Exploration controls should also support game-like movement. Users should be able to move through fractal space with configurable keyboard bindings such as `WASD`, optional modifier keys for slower or faster travel, and remappable actions for zooming, rotating, resetting, and toggling linked views. Keyboard navigation should feel smooth and continuous rather than like discrete menu shortcuts.

The default shell should keep Explore lightweight. Core camera and formula controls stay always visible, while heavier tasks such as palette editing, Waypoint management, discovery, comparison, and journey authoring should appear as focused workspaces rather than one long stacked inspector.

Formula exploration should grow beyond the initial pair. Early Phase 7 additions should include `Burning Ship` and `Tricorn`, with the same navigation, Waypoint, discovery, comparison, and journey tooling that the Mandelbrot and Julia workflows already use.

Deep zoom should stay explorable even before perturbation rendering exists. The app should warn users when the current viewport is entering a range where extra iterations or future precision upgrades are likely to matter, instead of silently failing or leaving them guessing.

The app should also remain usable when WebGPU is unavailable. A slower CPU fallback is acceptable in those cases as long as it preserves the same exploration model, formulas, palettes, and saved state rather than dropping users into a dead-end placeholder.

### Palette creation

The palette curve editor is independent of every fractal. Users can add, move, delete, and edit colour stops; choose interpolation; reverse, repeat, mirror, and remap palettes; and save custom palettes. Fractal visual styles are presets composed from colouring and palette configurations.

The editor should feel closer to a lightweight color grading or color picker tool than a raw form. Selecting a stop should reveal direct colour controls, quick stop management, and immediate visual feedback without making palette work feel like spreadsheet editing.

Preset browsing should feel visual rather than administrative. Users should be able to scan palette looks from compact previews, see when they are still on a preset versus a custom variation, and duplicate or nudge stops quickly while staying inside the same focused workspace.

Colouring should also expand beyond classic escape-time shading. Orbit traps should be available as a first-class colouring mode so users can explore more sculptural internal structure without switching away from the shared palette and workflow system.

The next visual frontier is a composable Visual Lab. Formula evaluation should expose reusable orbit metrics—such as smooth iteration, final complex value, derivative, distance estimate, and trap distances—to a separate material layer. Materials decide how those metrics become colour, contours, or a lit height field; lens effects such as bloom, exposure, and tone mapping run afterward. This separation lets users apply a saved look such as topographic, neon, or metallic glass across compatible formulas without changing the mathematics itself.

The first rich 2D material work should remain legible during exploration: use bloom as a restrained accent rather than a global blur, keep coordinate-distorting effects explicitly separate, and make all visual settings serialisable in Waypoints, comparison views, journeys, URLs, and exports. Full 3D ray-marched fractals remain a later, distinct renderer rather than an extension of the 2D escape-time shader.

### Waypoints

Waypoints are saved navigable locations in fractal space, similar to portals or fast-travel destinations in a game. Each stores formula, parameters, viewport, colouring, palette, and quality settings so the view can be recreated exactly.

The Waypoint workspace should support fast capture during exploration, clearer grouping between saved, discovered, and curated destinations, and quick follow-up actions such as keeping discovered finds, refreshing a saved capture from the current view, and copying a shareable portal link without breaking flow.

### Discover

Search for visually interesting regions using heuristics such as boundary complexity, iteration variance, local entropy, gradients, and symmetry. Discovery outputs ordinary Waypoints so it can reuse thumbnails, navigation, tagging, and sharing.

The Discover workspace should help users reason about scan cost and search intent before they run it. Scan depth, breadth, and result count should read like a lightweight search profile, while discovered regions should be easy to rank, skim, and load back into Explore without feeling like raw debug output.

### Compare

Compare two formulas or configurations using the same screen-to-complex-coordinate mapping. Initial modes are split view, draggable wipe, difference image, and overlay/crossfade. Each side can have independent formula, colouring, palette, and quality settings. Comparison should grow from the same reusable render-view foundation used by Explore and the Julia panel rather than becoming a separate rendering stack.

The Compare workspace should feel decision-oriented rather than inspector-driven. Users should be able to understand the active comparison mode quickly, switch between visual comparison strategies from compact previews, and make side-level choices without digging through a long stack of controls.

### Animate and record

Create journeys between Waypoints or animate zoom, Julia parameters, formula parameters, iterations, palettes, and comparison transitions. Animations are keyframed render configurations, not UI recordings. Support PNG, image sequences, and browser-native WebM initially.

The Journey workspace should balance authoring power with legibility. Users should get a quick read on clip duration, frame count, and recording state, then choose whether they are building from Waypoints, shaping keyframes manually, or converting live navigation into a draft path.

## Non-goals for the first release

### Future generative interoperability (guidance, not current scope)

Fractal Waypoints may eventually be one standalone peer in a larger Schnock Generative Instrument. Keep music generation separate from synthesis, and both separate from fractal rendering. Future connections may carry continuous signals, discrete events, persistent state, and mathematical statistics in either direction. Music-specific interpretation of fractal metrics belongs outside this application.

When external control is deliberately scheduled, prefer a physical MIDI synth/control surface as the first integration; real hardware should inform a shared model that a later software-synth adapter can also use. A future node graph should expose that model, not define it. No MIDI, audio, synth, OSC, node editor, or feedback implementation is part of current Phase 9 work; see ADR-026.

### Current exclusions

Full 3D rendering, mobile-first optimisation, perturbation theory, machine-learning discovery, collaboration, accounts, and cloud persistence.

## Design language

The interface should feel calm, exploratory, and slightly game-like. Use “Waypoints”, “Explore”, “Discover”, “Compare”, and “Journey” as the main mental model. Technical detail should be available without making the default experience feel like a debugging console.

Controls should reinforce that feeling. Pointer interaction can stay intuitive and direct, while keyboard controls should feel closer to navigating a vehicle, flight camera, or game world than triggering traditional application shortcuts.

That also means the shell should practice progressive disclosure. Frequent controls belong near the canvas, authoring workflows should feel mode-like and intentional, and low-frequency global settings such as bindings, diagnostics, and quality tuning should live behind a dedicated settings surface instead of competing with everyday exploration.
