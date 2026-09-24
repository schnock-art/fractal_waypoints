# Hydrasynth Explorer controls

## Hardware setup

Use the Explorer USB MIDI input, or the input on the interface connected to its MIDI OUT. In System Setup, MIDI page 10, set **Param TX = CC** for the complete named CC catalogue. Set MIDI TX to the channel selected in the app. Param TX = Off prevents parameter edits from being transmitted. System controls such as modulation and volume are independent of Param TX.

The Explorer has four context-dependent Control encoders. On HOME these control Macros 1–4 or 5–8 using PAGE. On module pages the same encoders edit that module's parameters. A Macro shown as a dash is empty; an engaged Macro button temporarily locks out its knob. The app cannot infer the hardware page or patch's custom Macro names from CC input.

## App workflow

In Perform, open Hydrasynth controls and connect. Choose a module or search the catalogue, select a control, choose Zoom or Palette offset, choose CC/NRPN and channel, then assign it. Alternatively turn the hardware control and use **Select last touched control** to populate these fields. The Configured mappings area always shows both target relationships. Arm either or both while stopped, close the editor, then press Play once; pre-armed mappings become live without reopening the editor.

**Continuous — knob controls speed** is the default zoom behaviour. A fresh input above midpoint keeps zooming in; below midpoint keeps zooming out. A small centre dead zone stops motion, and distance from centre sets speed. Motion continues without further MIDI messages, even at the knob's endpoint. This removes the MIDI range limit on zoom duration, not the renderer's numerical precision limits.

**Hold zoom**, available both in the editor and the compact Perform card while armed, stops motion without resetting the current view. Turn the knob again to restart. Pause, browser focus loss or hiding the page also holds continuous zoom; resuming requires fresh knob input. Arming and changing modes start held. **Zoom while turning** retains the original bounded-input behaviour: the first input establishes a baseline and subsequent value changes zoom.

Release restores the authored view. Closing the editor keeps the connection. Stop, changing inputs, disconnecting or leaving Perform releases the temporary view. No automatic input failover occurs after disconnection.

This supports two simultaneous session-only assignments: one control source for Zoom and one for Palette offset. Assigning a new source replaces only that target. Each target has separate arm/disarm/release controls, while Stop, input loss and leaving Perform release both. Palette offset maps the full documented control range to a temporary, user-chosen finite range (default −1…1), with optional inversion; it does not impose a bound on the palette domain or alter the saved palette. The full 117-entry CC chart is named; switch/system entries are inspectable but cannot drive live targets. Unknown ordinary CCs can still be deliberately assigned in the advanced monitor. Incoming activity distinguishes parameter values from other MIDI traffic so notes arriving alone do not imply working parameter transmission.

### Hydrasynth LFO as a continuous Palette source

The LFO gain and rate entries in the catalogue are *parameter settings*. Param TX sends a CC when you edit one, but it does not transmit the running LFO waveform as a stream of CC values. This is expected behaviour, not a broken Palette mapping: ASM describes Param TX as parameter-edit transmission, while the Mod Matrix can route LFOs to MIDI CC destinations.

For a continuous LFO-driven Palette offset, create a Mod Matrix route with the desired LFO as source and an unused MIDI CC as destination on the selected MIDI channel. In the app, turn/play the route until the incoming-activity line shows that CC, select **Palette offset**, set the desired range/inversion, then choose **Assign last received CC to Palette offset** and arm it. The application follows incoming values; it does not synthesize the LFO locally. Prefer an unused CC that is not also being sent by another controller or Hydrasynth parameter.

## NRPN support and limits

The input adapter assembles address CC 99/98 and data CC 6/38 independently per channel, emitting only complete 14-bit values. Transport bytes cannot be accidentally assigned as knobs. It resets on input changes and invalidates NRPN selection on RPN/reset messages. Increment/decrement and incomplete packets are not interpreted as absolute values.

Named NRPN aliases cover Macro panel values (8152–8159, range 0–1024) and Filters (documented range 0–8192). The shared-family aliases come from ASM's legacy Keyboard/Desktop MIDI spec, cross-checked against the Explorer CC chart; physical Explorer verification remains necessary. Other NRPNs appear as complete diagnostic values but cannot yet be assigned. ASM packs sub-parameter identity into some data bytes, so guessing every NRPN to be an independent continuous knob would conflate controls. Use CC for the wider named catalogue. Pitch bend, notes, pressure, clock and SysEx are outside this zoom input slice. Selecting the input again resets the decoder if changing hardware transmission modes mid-session.

## Sources and verification

- [ASM current downloads](https://www.ashunsoundmachines.com/downloads), checked 2026-09-24.
- [Explorer manual 2.2.0](https://www.mecldata.com/download/asm/Hydrasynth_Explorer_Owners_Manual_2.2.0.pdf): printed pp. 17, 20, 66, 83, 94–96. Param TX is parameter-edit transmission (p. 83); the Mod Matrix admits LFO sources and MIDI CC destinations (p. 20). CC identities and hardware workflow are based on this Explorer-specific manual.
- [ASM MIDI spec 1.5.0](https://www.mecldata.com/download/asm/legacy/Hydrasynth_KB_DR_MIDI_Spec_1.5.0.pdf), linked from ASM's legacy downloads: filter aliases pp. 8–9, Macro panel values p. 23. This older family specification is not a claim of complete current Explorer NRPN coverage.

Tests cover address uniqueness, representative chart values, NRPN framing/channel separation/null selection, invalid bytes, range conversion and browser simulation of CC/NRPN assignment, baseline, wrong-channel rejection, viewport restoration and disconnect. Continuous zoom tests cover sustained endpoint motion without new messages, centre hold, reversal, Hold zoom and pause/resume requiring fresh input. Palette tests cover custom range mapping, URL/base preservation and release restoration. Hardware output and patch-specific behaviour cannot be established by simulated MIDI tests.
