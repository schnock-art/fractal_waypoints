# Performance takes

Phase 11.6 records a short controller performance as a separate, versioned local document. A take is not a Waypoint, controller setup, browser MIDI connection, or render configuration.

## Capture and replay

While Primary is playing, arm one or both controller mappings, open **Takes**, and choose **Record new take**. Capture records timestamped absolute samples only from the mappings that were armed at the start of recording. The workspace header and Live view keep recording visible and offer Stop without requiring navigation back to Takes. Stop saves the take locally under `fractal-explorer:performance-take:v1`.

A take stores a snapshot of those external relationships and an ordered logical sequence of `{ atMs, sourceId, value }` samples. It contains no browser input ID, permissions, live connection state, arming state, authored fractal configuration, URL, Waypoint, Journey, or Patch layout.

Choose **Replay saved take** while Primary is playing to run the recorded sequence through the snapshot's existing transforms and targets. The Hydrasynth can be disconnected or absent. Replay clears current live controller effects before it starts and restores the authored view when it completes. Stop, leaving Perform, input loss, or a controller-session release also stop an active recording safely; the already saved take remains available.

The logical clock begins at recording and stores integer milliseconds relative to that start. Samples are kept in nondecreasing timestamp order and capped at 4,096 entries. Capture keeps the raw absolute samples that reached an armed relationship; the existing frame coalescing continues to bound live rendering work. This makes source sequence and mapping evaluation reproducible without claiming audio-rate or frame-identical viewport motion across every browser.

## Ownership and compatibility

`PerformanceControlTake` schema 1 is validated before being loaded. Future schemas are reported as unsupported and left untouched. Takes and controller setups are stored separately: changing, clearing, importing, or exporting a setup does not change a take, and clearing a take does not change setup or world persistence.

Journey exports currently remain deterministic from their authored Journey data. They do not include opportunistic live controller samples. A future export integration must use a recorded take or another explicitly reproducible source.
