# Immersive production and evaluation matrix

**Authority:** MASTER-EXECUTION-PLAN M7 to M12, D004, D005, D007 and
`Animation Addendum.md`
**Owner:** Codex
**Independent reviewer:** Claude when available
**Status:** Required release contract; character rows await `DN-CHAR-001`

## 1. Purpose

This matrix makes character, set, lighting, background, animation, power and
runtime production visible as testable work. Static View completion cannot close
these rows. A row passes only when its source, implementation, rendered evidence,
runtime export and review result are traceable.

## 2. Input gates

| Input | Required state | Failure action |
| --- | --- | --- |
| Canonical character pack | Owner-approved roster, turnarounds, presentation and accessory references | Keep character rows blocked; never substitute the six noncanonical sheets |
| Location registry | Sixteen verified plate records with source hashes and corrected actual filenames | Reject any unregistered source or mismatched hash |
| Animation authority | Addendum, D004 camera contract, D005 clip/runtime contract and owner clarifications | Reject conflicting legacy framing or OTS language |
| Blender toolchain | Blender 5.2 LTS project template, colour management, unit scale and export preset recorded | Stop asset export until reproducible |
| Browser toolchain | Runtime manifest, telemetry schema, deterministic matrix generator and supported browser versions recorded | Stop release evidence capture until reproducible |

## 3. Character production matrix

The canonical pack supplies the row IDs. No name, appearance, gender
presentation, accessory or power may be inferred.

Every approved character must pass:

| Area | Required evaluation |
| --- | --- |
| Canon match | Front, three-quarter, side and rear turntable comparison against approved reference |
| Silhouette | Headwear, hair, scarves, garment tails, pouches, footwear, carried tools and power-relevant shapes remain recognisable |
| Geometry | Manifold/intentional boundaries, normals, topology flow, scale, transforms, origin and naming |
| UV/material | UV integrity, texel-density policy, material count, colour-space use and KTX2-ready texture set |
| Rig | Shared humanoid contract, named sockets, four-influence ceiling, scale/orientation and retarget test |
| Deformation | Crouch, reach, turn, jump, landing, extreme arm/leg poses and representative power poses |
| Secondary motion | Garment/accessory clearance, conservative motion proxies and bounded cloth or bone behaviour |
| Face | Only the approved minimal shape set; no unnecessary dialogue or eye system |
| LOD | Selection LOD0 plus navigation LOD1 to LOD4/impostor where approved, with outgoing/incoming bound union |
| Export | Versioned `.blend`, glTF, textures, hashes, validator log and browser inspection |

Required character cross-product:

- every canonical character;
- its explicitly declared locomotion presentation;
- every approved LOD;
- every required base, gesture, idle, traversal, recovery and selection clip;
- neutral light, high-contrast rim light and low-contrast fog checks;
- the shortest, tallest, widest-garment and largest-accessory roster members as
  camera-envelope extremes.

## 4. Location set matrix

All sixteen verified plate roles remain in scope:

1. `threshold-dunes-outer`
2. `threshold-dunes-inner`
3. `stone-pass-names-outer`
4. `stone-pass-names-inner`
5. `archive-echoes-outer`
6. `archive-echoes-inner`
7. `bazaar-skill-outer`
8. `bazaar-skill-inner`
9. `oasis-audience-outer`
10. `oasis-audience-inner`
11. `forge-resolve-outer`
12. `forge-resolve-inner`
13. `garden-origins-outer`
14. `garden-origins-inner`
15. `observatory-horizons-outer`
16. `observatory-horizons-inner`

Each role receives:

| Pass | Evidence |
| --- | --- |
| Plate analysis | Horizon, focal area, light direction, colour temperature, depth bands, moving elements and HTML-safe regions |
| Set construction | Foreground anchors, walk surface, proxy collision, camera-safe corridor, depth partition and occlusion masks |
| Lighting | Key/fill/rim values, contact shadow, fog/volume treatment and plate-to-avatar grade |
| Background enhancement | Authored atmosphere, particles, water, dust, cloth, light shafts or environmental movement with a still fallback |
| Interaction | Entry, exit, arrival, local navigation, content-presenting position and traversal launch/landing zones |
| Quality tiers | High, standard, low-power and reduced-motion captures with essential composition preserved |
| Blender review | EEVEE render, object-ID mask, depth/occlusion pass and scene dependency report |
| Browser review | Representative character capture, HTML open-state capture, performance trace and fallback capture |

No set passes if enhancement obscures content, changes factual meaning, hides a
camera crop, breaks the source composition or requires an unapproved master in
the public bundle.

## 5. Animation and power matrix

### Shared locomotion and ordinary interaction

- `walk-male-shared`
- `walk-female-shared`
- `walk-nonbinary-shared`
- base idle and weight shift
- garment adjustment
- present/open hand
- point left, centre and right
- short local step
- turn and full-body look-back enter, hold and exit
- hourglass draw, inspect and stow
- edge move, lean enter, hold and exit
- idle and route recovery

### Traversal and powers

- traversal anticipation, acceleration, active travel, turn, deceleration,
  landing and recovery;
- Solar Propulsion launch, ascent, hover/crossover, descent and landing;
- Sand Teleportation anticipation, named visibility-suppression phase,
  reappearance and sand-recall recovery;
- surfing start, steady travel, turn, launch, landing and cancellation; and
- every additional power named by the canonical pack or approved traversal
  manifest.

Every clip or authored phase must record:

| Field | Requirement |
| --- | --- |
| Identity | Stable clip/state ID, rig version and source action |
| Playback | Loop policy, duration, normalised speed range and root-motion policy |
| Blending | Entry/exit duration, cancellation target and interruption priority |
| Events | Named sockets, prop transfers, effect markers, audio hooks and visibility markers |
| Bounds | Frame-sampled body/accessory bounds plus conservative power-silhouette proxies |
| Accessibility | Reduced-motion substitute and optional-audio behaviour |
| Review | Foot contact, limb pop, deformation, garment collision, effect occlusion and return-to-home result |

## 6. Camera containment matrix

No OTS preset, shoulder-relative target or head/neck/clavicle/shoulder camera
target may exist in configuration, code, scene objects or fallbacks.

### Viewports

- 320 x 568
- 360 x 800
- 390 x 844
- 768 x 1024
- 1024 x 768
- 1280 x 720
- 1366 x 768
- 1440 x 900
- 1920 x 1080
- 2560 x 1080
- 1080 x 1920

The final matrix also includes browser zoom at 80, 100, 125, 150 and 200 percent
where the browser/device combination supports it.

### Content and browser states

- content closed;
- content opening, including its complete sweep rectangle;
- content open;
- content closing;
- viewport resize and orientation change;
- safe-area insets;
- browser UI expansion/collapse on mobile;
- keyboard, pointer and touch input;
- reduced motion;
- background-tab return;
- WebGL context loss and recovery;
- low-power tier selection; and
- offline or failed asset recovery to Static View.

### Per-frame assertions

Each intentionally visible frame records and tests:

- full post-skinning animated bounds;
- accessory, outgoing/incoming LOD and power-proxy contributors;
- visual viewport and safe-area insets;
- active HTML rectangle and complete transition sweep rectangle;
- chosen composition pocket;
- projected head, hand, garment, pouch and footwear extrema;
- containment margin on all four edges;
- projected full-character height ratio;
- camera target, radius, elevation and orbit state;
- authored suppression ID and remaining maximum duration, if present; and
- deterministic return to the lower-third home stage.

Ordinary desktop/laptop tuning targets approximately 14 to 20 percent of the
visual viewport, with the stricter D005 preferred ranges used where possible.
Containment may pull farther away. Every non-selection state stays below 24
percent. Character selection alone uses its dedicated 35 to 55 percent envelope.

## 7. Browser and performance matrix

| Axis | Required coverage |
| --- | --- |
| Browser engine | Chrome stable, supported Firefox and supported WebKit |
| Device tier | Integrated-GPU laptop baseline, standard desktop, compact/tablet, mobile/low-power |
| Network | Warm cache, cold cache, constrained connection, interrupted chunk and offline revisit |
| Quality | High, standard, low-power, reduced-motion and emergency fallback |
| Residency | One selected character active; complete roster never resident |
| LOD thresholds | D005 projected-height thresholds with 10 to 15 percent hysteresis |
| Runtime failure | WebGL loss, stale/missing bound contributor, failed glTF/texture/clip and route interruption |

For every tested destination, record first interaction, asset transfer, decode,
GPU upload, steady frame time, worst traversal frame time, memory pressure, draw
calls, triangles, resident textures and recovery result. Budgets are release
gates, not descriptive targets.

## 8. Evidence package

Every matrix run produces:

- immutable run ID, commit SHA, browser/Blender version and device profile;
- source asset hashes and export hashes;
- machine-readable pass/fail rows;
- Blender turntables, EEVEE frames, object-ID masks and dependency reports;
- animation contact sheets and blend/cancellation recordings;
- browser screenshots or video for failed and boundary cases;
- camera telemetry and independent silhouette-mask comparison;
- performance traces and transfer/residency reports;
- reviewer, timestamp, defect ID and retest link; and
- explicit waivers only when the owner approves a bounded, documented exception.

## 9. Release rule

M12 cannot pass with an unevaluated character, location, animation, power,
viewport class, content state or quality tier. A missing canonical pack keeps the
affected rows blocked and named. It never converts them into optional or
future-only work.
