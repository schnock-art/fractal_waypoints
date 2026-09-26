# Explore workspace UX

Explore keeps the fractal as the primary workspace. Its desktop sidebar has three layers: a compact authored-world inspector (formula, formula controls, iterations, reset, and Julia visibility), a balanced six-tool selector, and one scrollable active-tool region.

The selector is intentionally a 3 × 2 button grid: **Visual Lab**, **Palette**, **Waypoints**, **Discover**, **Compare**, and **Journey**. It identifies the active tool with both styling and `aria-pressed`; panels therefore render their controls directly instead of repeating a second large collapsible title.

Palette leads with the active look, compact preset previews, gradient, stops, offset/scale, and selected-stop editing. RGB sliders remain available under **Fine colour controls**. Waypoints lead with Quick save; custom title and description are under **Save with details**. Visual Lab leaves lens explanations in **About lens effects**. Compare presents comparison mode first, then exactly one selected editor through **Edit Left** / **Edit Right**; this is distinct from the comparison stage's interactive-side setting.

On wide screens, an unseeded Julia invitation uses a smaller secondary column than a live linked Julia render. It remains visible and the Show/Hide Julia control still owns whether the secondary view is displayed. The Julia panel chrome owns **Collapse Julia panel**. Collapse removes the secondary column entirely and leaves a docked **Julia** handle over the Primary edge; Primary therefore recovers the full render width. Clicking the handle restores the panel. On narrow stacked layouts the handle becomes a compact full-width row beneath Primary. Selecting a new Mandelbrot point or showing Julia again expands the render.

When the active primary formula is not Mandelbrot, Julia automatically stays in its compact rail: those formula surfaces do not offer the main-surface point → linked-Julia relationship. Returning to Mandelbrot expands the panel so its linking invitation is immediately available.

This is presentation-only: world state, rendering, palette documents, Waypoints, discovery scoring, comparison configurations, Journey clips, URLs, and controller persistence remain unchanged.
