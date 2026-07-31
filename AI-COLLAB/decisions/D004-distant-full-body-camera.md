# D004 — Immersive mode uses a distant full-body exploration camera

**Date:** 2026-07-30
**Owner:** Bongo Seakhoa
**Implementer:** Codex
**Independent verifier:** Claude Code
**Status:** Adopted; superseding authority

## Precedence

This decision supersedes every earlier camera-framing instruction that implies an over-the-shoulder view, upper-body framing, a close chase view, or a fixed-distance composition. In particular, prior phrases such as “low three-quarter chase,” “chase angle,” or any OTS variation are non-authoritative wherever they conflict with this decision.

The compatible world-plate movement constraints remain in force: camera travel must still stay within authored parallax and lighting tolerances. Those constraints may limit environmental movement, but they may never justify cropping the avatar.

### Superseded source clauses

The following historical requirements are explicitly reinterpreted and must not re-enter implementation through copied data, manifests or acceptance IDs:

- Loose brief §5.1 “low three-quarter chase view,” FOV-driven framing and “chase angle.”
- `Desert_Nomad_Complete_Handoff_v3_Lightweight.zip` → Complete Production Bible v3.0: fixed “behind and slightly above,” waypoint three-quarter framing, “low chase,” “avatar visible where the viewport allows,” and FOV-led framing.
- Decision register `DEC-004` and acceptance requirement `REQ-004`: `third-person rear` is replaced by `distant-full-body-exploration`; hold-to-look-back remains.
- `CAM-001`, `WRL-002` and destination `cameraAnchor` values: these become bounded composition hints only. They may suggest azimuth, elevation, preferred safe pocket and plate movement limits; they never set final target, radius or FOV.
- Worldbuilding permission for foreground occlusion: environmental foreground may add depth but may never fully hide the avatar outside a whitelisted authored traversal phase.

The later `Animation Addendum.md` is adopted for animation, runtime assets and authorised traversal effects. Its Solar Propulsion frame-exit is permitted only as a typed, duration-limited authored traversal phase; it may not be recreated by camera motion, crop, FOV or a generic visibility flag.

## Locked composition contract

1. Immersive mode uses a distant, full-body third-person exploration camera. No OTS preset, transition, fallback or cinematic variation may exist.
2. Whenever the avatar is visible, the complete animated silhouette remains inside the viewport: head or headwear, soles, hands, scarves, garment tails, pouches and power-relevant extensions.
3. Temporary disappearance is allowed only through an explicitly authored traversal effect, such as the fully submerged Sand Teleportation phase, a mirage dissolve or the authored Solar Propulsion exit phase. Camera framing may never make the avatar disappear.
4. On steady normal desktop and laptop viewports, the full animated bounds target approximately 14–20% of visual-viewport height. Pullback below 14% is allowed when containment requires it. The avatar never exceeds approximately 24% outside the dedicated character-selection view. These are browser-tested tuning ranges, not hard-coded camera distances.
5. The lower-third stage from the safe left edge to the safe right edge is the explorer’s home composition. Root movement, ordinary navigation, idles, steps, gestures and recoveries remain inside this stage and offset away from active HTML content. An authored traversal power may temporarily carry the complete figure through the middle or upper viewport, including crossover or hover phases, before returning to the lower third. Clear space is retained above the highest and below the lowest animated bound in every region.
6. Gestures remain fully visible inside the existing full-body frame. Pointing, presenting and turning never trigger an upper-body close-up. Deliberate zoom-in and zoom-out effects are allowed, but the tighter 24% non-selection ceiling remains the controlling intersection of the direct owner correction and the addendum.
7. Hold-to-look-back orbits around the avatar at approximately the same radius while preserving full-body containment throughout the orbit and return.
8. Traversal may increase the camera radius predictively during acceleration, turns, jumps, surfing, launches and landings. It may not crop the avatar or switch to OTS.
9. The long-idle edge lean may approach a safe edge only while the complete animated bounds remain visible. Any interaction immediately cancels the lean and restores the normal composition.

## Implementation architecture

### Complete animated bounds

`AnimatedBoundsTracker` owns one authoritative full-avatar envelope per rendered frame.

- Sample after animation blending, world-matrix update and secondary motion, then aggregate world-space bounds from every visible post-skinning mesh and attached accessory on every render frame.
- Include authored proxy volumes for deforming cloth, scarves, garment tails, hand-held objects and power silhouettes whose geometry is intermittent or GPU-deformed.
- Union both sides of LOD swaps, equipment changes and animation blends until the transition completes.
- Sample the active animation, transition blend and traversal pose. Never derive framing solely from the rest-pose skeleton or root transform.
- Expand the union by an authored world-space motion margin and a small screen-space containment margin.
- Mark a disappearance as legal only when its power ID, phase ID, start/end marker and maximum duration match a typed authored whitelist. A generic Boolean is prohibited. Missing geometry without an authorised phase is a test failure.
- Missing, empty or stale contributors activate their registered conservative maximum proxy and immediate pullback. If no conservative proxy exists, rendering fails closed instead of silently dropping the contributor.
- Expose the current envelope, predictive envelope, fallback IDs and contributing bound IDs for runtime diagnostics and automated tests.

### Responsive framing controller

`FullBodyFramingController` solves the camera target, radius and permitted elevation from the projected complete bounds and current safe-zone envelope.

- It is the only runtime authority allowed to produce a camera target or radius. Powers, destinations and animations submit composition hints only.
- The camera may not parent to or target a head, neck, clavicle or shoulder bone, use a shoulder-relative offset, or contain a fixed-radius fallback.
- Use a containment solve rather than a fixed radius.
- Fit both vertical and horizontal extents because accessories and gestures may be wider than the body.
- Use the complete projected envelope to choose the smallest radius that satisfies all safe insets, then add damped hysteresis to prevent breathing or jitter.
- Pull back immediately when containment is threatened; ease inward more slowly after the risk passes.
- Preserve the orbit azimuth and approximate radius during look-back, increasing the radius only if containment requires it.
- Never reduce the configured full-body margins to preserve a desired cinematic angle.
- Treat a projected bound touching or crossing a safe edge as a controller defect, not acceptable tolerance.

### Content-aware safe zones

`ViewportSafeZoneService` combines:

- browser viewport and visual-viewport dimensions;
- CSS safe-area insets;
- top and bottom full-body breathing room;
- active HTML content rectangles supplied by an explicit DOM bridge;
- breakpoint-specific composition preferences;
- the avatar’s current projected complete bounds.

It selects a lower-third target pocket with the least collision against active content. Generalised present/turn/step-aside responses may accompany a content opening, but the controller must preserve full-body containment and avoid a large library of content-specific animations.

If no preferred pocket can contain the avatar at the normal size, the controller first increases distance, then chooses the safest alternate pocket. It never crops the avatar to protect HTML content.

Only an authored traversal power may request a middle or upper safe pocket. The power supplies a vertical composition intent; the controller still solves the final target and radius. Ordinary navigation, gestures and idles are forced back to the lower-third home stage. Arrival or recovery must restore that stage.

Panels and menus provide their complete opening/closing sweep rectangle before animation begins. The DOM bridge unions previous, current and authored destination rectangles so a one-frame crop or overlap cannot occur during motion. If HTML consumes every viable pocket, layout reserves an avatar gutter or the avatar pulls farther back; it is never hidden.

### Traversal and idle behaviour

- A predictive envelope covers the current pose plus a short, speed-aware traversal horizon.
- Launches, jumps, surfing and high angular velocity request distance before the peak silhouette reaches an edge.
- Landings retain pullback until bounds and velocity settle.
- Edge lean uses a safe-pocket constraint evaluated against the complete lean-animation envelope, not the idle pose.
- Any pointer, keyboard, touch or controller input cancels long-idle mode immediately and restores the normal target pocket.
- Reduced-motion mode shortens or removes secondary movement but does not alter the full-body visibility contract.
- Camera collision re-solves outward, laterally or vertically, chooses a different composition hint or retains the prior safe result. It never falls back to a close camera.

### Required render-frame order

1. Apply traversal and animation state.
2. Update blends, skeletons and world matrices.
3. Update secondary motion and GPU-deformation proxies.
4. Build current and predictive complete-avatar envelopes.
5. Read `visualViewport`, safe-area insets and active DOM sweep exclusions.
6. Solve the camera composition.
7. Re-project and assert containment.
8. Render and capture independent silhouette-mask telemetry when verification is enabled.

The controller’s priority order is: prohibit close/shoulder framing; contain complete bounds; prohibit unauthorised disappearance; avoid active HTML; retain lower-third breathing room; approach the normal size target; then honour cinematic angle and plate preferences.

## Runtime invariants

The immersive build and tests must reject:

- source symbols, configuration keys or presets containing an OTS camera mode;
- a projected complete bound outside its safe viewport envelope while the avatar is intentionally visible;
- avatar height outside the reviewed tuning envelope without a recorded, permitted state reason;
- an upper-body zoom during any gesture;
- a look-back radius or target change that loses containment;
- a traversal frame that becomes invisible without an authored visibility-suppression state;
- an idle animation frame with any complete bound outside the viewport;
- a content opening that causes persistent avatar/content overlap when a valid safe pocket exists.
- a camera target derived from a head, neck, clavicle or shoulder node;
- a fixed final radius supplied by a destination or power;
- a non-selection projected height above 24%;
- foreground occlusion that hides the full avatar without an authorised traversal phase.

## Verification ownership

Codex implements the tracker, framing solve, DOM safe-zone bridge, diagnostics and automated test harness.

Claude Code independently verifies the result across:

- every shipped animation and blend transition;
- every traversal power and visibility effect;
- landscape, portrait, square, ultrawide and short-height viewports;
- all supported browser breakpoints and browser engines;
- each major HTML-content state, including open panels and resize transitions;
- look-back hold, full orbit and return;
- long-idle entry, edge lean and immediate interaction restore;
- reduced-motion and touch input modes.

Claude’s verification is adversarial and evidence-based: frame traces, projected-bound telemetry, screenshots or recordings, a signed pass/fail matrix and an independent avatar/accessory/power object-ID mask comparison. Controller telemetry may not certify itself. Silence never blocks Codex; after the three-hour heartbeat limit, Codex runs the same written matrix and Claude may audit it later.

## Acceptance

This decision is satisfied only when the complete animated bounds stay inside the responsive safe envelope for every tested visible frame, no OTS implementation exists structurally or behaviourally, steady desktop/laptop framing is browser-tuned near 14–20%, non-selection framing never exceeds 24%, and independent silhouette evidence finds no untracked pixel, unapproved disappearance, complete foreground occlusion or crop.
