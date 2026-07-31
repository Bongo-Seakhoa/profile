# Camera, animation and LOD verification specification

**Version:** 2.3 — supersedes v1, v2.0, v2.1 and v2.2 (2026-07-31)
**Owner:** Claude (verification lane)
**Consumes:** `Animation Addendum.md`, owner ruling on DEP-CAM-002. Analysis in `reviews/R004-animation-addendum-review.md` and `reviews/R003-camera-framing-review.md`.
**Applies to:** Immersive Anzania mode. Static View has no camera or avatar and is out of scope.
**Purpose:** Define the addendum's requirements precisely enough to test mechanically, and specify the instrumentation Codex exposes so verification is measurement rather than screenshot review.

Changed from v1: occupancy bands raised and split by device class, no-crop definition finalised against the owner ruling, look-back confirmed as true 160–180° orbit, LOD and animation invariants added.

Changed in 2.1, from the owner's follow-up clarification of 2026-07-31:

1. **The explorer's action space is the lower third of the viewport, edge to edge.** All animations and interactions are implementable within that band. This grants full-width lateral freedom and constrains vertical placement — INV-5 rewritten, INV-31 added.
2. **Camera zoom in and out is permitted**, provided the addendum's hard limits are not exceeded. The distance floor in INV-6 and INV-8 is removed; the occupancy ceiling and the no-crop rule become the binding constraints.
3. **Locomotion clips are shared per presentation category** — one male set, one female set, one non-binary set — rather than authored per character. INV-32 and INV-33 added for retargeting integrity.

Changed in 2.2, from the owner's correction of 2026-07-31:

Changed in 2.3, from the owner's ruling on R005 F1 (2026-07-31):

5. **The Animation Addendum governs camera framing.** D004 §25's narrowing and §34's "tighter intersection" are superseded. Targets are the **midpoint of each addendum band** — 0.210 desktop, 0.190 ultrawide, 0.230 tablet/compact — with per-class normal ceilings and a 0.28 absolute. INV-3 rewritten. Below-band is legal when containment requires it but must be recorded, never silently clamped.

6. **Three owner non-negotiables now anchor the invariants:** head to toe outside powers (INV-1, absolute); the explorer should look good (target plus correctly sized LOD tiers); the explorer must not visually dominate the portfolio (per-class ceilings, 0.28 absolute).

4. **The lower third is where the explorer lives, not a cage.** Powers and other temporary authored effects may carry the explorer into the middle or upper thirds — hovering, launch arcs, Solar Propulsion — before returning. INV-5 restated, INV-5a added for the return, INV-9 relaxed inside the input-locked window, INV-34 added for occlusion across the excursion corridor. The no-crop rule does not relax at any point.

---

## 1. Instrumentation contract

**Request to Codex.** Per-frame telemetry behind a debug flag (`?framingTelemetry=1`), production-disabled. Everything below derives from it. Addendum §14 already requires instrumenting triangles, draw calls, textures, geometries, frame time, memory and animation cancellation, so this largely formalises what the addendum asks for.

```ts
interface FramingTelemetryFrame {
  t: number
  frame: number

  // Screen-space projected bounds, CSS px, origin top-left of the VISUAL viewport.
  // MUST be computed from the current animated pose including cloth, hair,
  // props and accessories — not the armature root or body mesh alone (§2).
  avatarBounds: { x: number; y: number; w: number; h: number }
  bodyBounds:   { x: number; y: number; w: number; h: number }  // excl. accessories, for attribution

  viewport:       { w: number; h: number; dpr: number }
  visualViewport: { w: number; h: number; offsetTop: number }
  deviceClass: "desktop" | "laptop" | "ultrawide" | "tablet" | "mobile"

  occupancy: number                  // avatarBounds.h / visualViewport.h
  margins: { top: number; right: number; bottom: number; left: number }
  safetyEnvelope: { vertical: number; horizontal: number }   // achieved padding, fractions

  camera: { distance: number; yawDeg: number; pitchDeg: number; vFovDeg: number }

  character: {
    id: string
    canonicalHeightM: number         // authored height, NOT normalised (§2)
    maxAnimatedBoundsM: { w: number; h: number; d: number }
  }

  lod: {
    active: 0 | 1 | 2 | 3 | 4
    renderedHeightCssPx: number
    renderedHeightDevicePx: number
    context: "navigation" | "character_selection"
    triangles: number
    drawCalls: number
    activeTextures: number
    activeGeometries: number
  }

  animation: {
    state: AnimationState            // the §10 enum
    clip: string
    blendMs: number
    priority: number                 // 1 = traversal … 6 = base idle
    power: string | null
    marker: string | null            // §4.1 timing markers
    concealmentAuthored: boolean     // true only inside an authored power concealment
    propAttachment: { prop: string; socket: string } | null
    reducedMotion: boolean
  }

  lookBack: {
    active: boolean
    phase: "enter" | "hold" | "exit" | null
    orbitDeg: number
    previousLocationId: string | null
    backdropBlend: number            // 0 = current plate, 1 = previous plate
  }

  contentRects: Array<{ x: number; y: number; w: number; h: number; id: string; critical: boolean }>
  frameTimeMs: number
}
```

Plus an event stream for latency assertions:

```ts
interface InputLatencyEvent {
  t: number
  input: "click" | "keydown" | "focus" | "route_request" | "form_submit"
  target: string
  uiRespondedAtMs: number            // when the interface actually responded
  animationStateAtInput: AnimationState
}
```

If any field is impractical, say so in `inbox/claude/` and I will adapt the assertions rather than have the controller carry fields it cannot honestly produce.

---

## 2. Invariants

### Framing

**INV-1 — No crop (hard).**
`margins.top > 0 && margins.right > 0 && margins.bottom > 0 && margins.left > 0` whenever the explorer is rendered.

Waived **only** when `animation.concealmentAuthored` is true. Per the owner ruling and addendum §1, the only permitted disappearance is an intentional authored power effect — sinking into sand, mirage dissolve, leaving frame during Solar Propulsion. A crop attributable to camera framing fails at all times, including during an active power.

**Bounds include:** hair and headwear, hands and fingers, outer garment silhouette, scarves and mantle tails, pouches, jewellery, legs, footwear, and power-related silhouette elements attached to the character.
**Bounds exclude:** temporary VFX particles — spray, dust, trails, detached orbiting stones, fragments, light shafts, decals, shadows (§11).

**INV-2 — Sanctioned concealment only.**
`concealmentAuthored` may be true only between `character_occluded` and `destination_visible` (brief §4.1), and only for a power whose authored sequence includes concealment. Absence or clipping outside that window fails, reporting power, marker and elapsed time.

**INV-3 — Occupancy band and target** (owner ruling, 2026-07-31: aim for the midpoint of each Animation Addendum §2 band):

| `deviceClass` | Band | **Target** | Normal ceiling | Absolute |
| --- | --- | ---: | ---: | ---: |
| desktop, laptop | 0.18 – 0.24 | **0.210** | 0.24 | 0.28 |
| ultrawide | 0.16 – 0.22 | **0.190** | 0.22 | 0.28 |
| tablet, compact | 0.20 – 0.26 | **0.230** | 0.26 | 0.28 |
| character_selection | 0.35 – 0.55 | 0.450 | 0.55 | exempt |

The three navigation bands intersect at 0.20 – 0.22, midpoint 0.210, so a single universal target of 0.210 is legal in all three if the implementation prefers one constant to three classes.

Sustained excursion beyond the **absolute** 0.28 in navigation fails. Exceeding a per-class *normal* ceiling is reported, not failed. Brief excursion during authored traversal is reported, not failed — **INV-1 outranks INV-3 in every case**.

**Below-band is legal when containment requires it, and must be visible.** Per the owner's first non-negotiable — head to toe outside powers — the solver increases distance rather than cropping, letting occupancy fall below the class floor. When it does, the resolution must set `constrained: true` and record a telemetry reason naming the band and achieved ratio. A silent clamp fails this invariant even though no crop occurred.

**Expected below-band cases — assert the fallback, do not flag it as failure.** Owner ruling 2026-07-31: phone landscape is not a tuning target. Measured at the 0.230 compact target:

| Viewport | avatar | stage | Result |
| --- | ---: | ---: | --- |
| iPhone 15 Pro landscape 852×393 | 90 px | 111 px | below band, `constrained: true` |
| Pixel 8 landscape 915×412 | 95 px | 117 px | below band, `constrained: true` |
| S24 landscape 780×360 | 83 px | 100 px | below band, `constrained: true` |
| tablet split-screen 1024×400 | 92 px | 113 px | below band, `constrained: true` |

Note this is an **orientation and multitasking** boundary, not a device-age one: every current flagship in *portrait* fits comfortably (iPhone 15 Pro 196/254, Pixel 8 210/273, S24 179/233). Desktop windows also fit down to roughly 360 px viewport height, because the desktop target is 0.21 rather than 0.23 — first failure at 1920×320.

In all these cases the harness asserts: complete body still contained (INV-1), occupancy below the class floor, `constrained: true`, and a recorded reason. A crop fails; a below-band frame with a reason passes.

**INV-4 — Safety envelope.** `safetyEnvelope.vertical >= 0.05` and `safetyEnvelope.horizontal >= 0.04`, computed on complete animated bounds.

**INV-5 — Lower third is the home band, not a cage.** In all settled states — base idle, idle variants, gestures, hourglass, edge-lean, look-back, arrival settle — the explorer's **ground contact and centre of mass** sit within the lower third of the visual viewport (`y >= 0.667 * visualViewport.h`). The head and safety envelope may extend upward into the middle third; see the arithmetic note below.

**Vertical excursion is permitted** during authored power effects and other temporary authored effects. The explorer may cross into the middle or upper thirds, hover, or follow a launch arc — Solar Propulsion, Stone Orbit Sling and Glassway all require it — and then returns. The lower third is where the explorer **lives**, not a boundary they may never cross.

Excursion is bounded by three things that do not relax:

- **INV-1 still holds absolutely.** A crop during an excursion is still a camera failure. Rising toward the top of frame is the single highest-risk moment for clipping the top of the head or headwear, so the camera must pull back or elevate ahead of the arc. See §5.2 on lookahead — a reactive controller will ship this crop.
- **The INV-3 ceiling still holds.** The occupancy *floor* is relaxed during excursion, since a launching or distant explorer legitimately becomes smaller. The ceiling is what prevents the excursion becoming a close-up.
- **INV-5a requires the return.**

> **Working assumption, flagged to Codex.** "Bound to the lower third" is read as an anchoring constraint on where the explorer *stands*, not a strict clipping box around their full height. The arithmetic forces this reading: at the top of the occupancy bands the figure plus its §2 safety envelope does not fit inside a strict 33.3% band.
>
> | Case | Occupancy | + vertical envelope | Total | Fits 33.3%? |
> | --- | ---: | ---: | ---: | --- |
> | Desktop typical | 0.18 | 0.05 | 0.23 | yes |
> | Desktop max | 0.24 | 0.08 | 0.32 | yes, 1.3% margin |
> | Tablet max | 0.26 | 0.08 | 0.34 | **no** |
> | Hard ceiling | 0.28 | 0.08 | 0.36 | **no** |
>
> If §2's "5% to 8% additional vertical padding" means per side rather than total, only the lower half of each band fits. Under the anchoring reading everything is satisfiable, `§2`'s "primarily in the lower third" is honoured, and INV-1 governs the top of the figure. If a strict clipping box is intended instead, navigation occupancy must be capped near 24% and the tablet band revised.

**INV-5a — Excursions return to the home band.** After an authored effect completes, the explorer returns to the lower-third home band. Asserted at `settle_complete`: ground contact is back inside the band, and remains there through `input_unlock` and into the following idle. An excursion that ends with the explorer resting outside the home band fails, as does one that returns only after the next user input.

Excursion windows are identified from `animation.power` together with the §4.1 markers, not inferred from position. An explorer found above the home band with no active authored effect is a failure of INV-5, not an unrecognised excursion.

**INV-6 — No over-the-shoulder framing.** Negative assertion, restated for permitted zoom: no frame may place the camera behind-and-close to the explorer such that the framing reads as shoulder-mounted, torso crop or close-up. Enforced structurally — over-the-shoulder framing requires either a crop (INV-1) or occupancy above the navigation ceiling (INV-3), so both must hold at every point of a zoom, including its extremes. Additionally, camera radius must not pass below the configured world minimum for the active plate.

**INV-6a — Zoom stays inside hard limits.** Zoom in and out are permitted. Throughout the entire zoom curve, not merely at its endpoints, INV-1 holds and `occupancy` remains within the INV-3 ceiling. Assertions run per frame across the zoom, since a transient overshoot mid-curve is the expected failure.

**INV-7 — FOV in range.** `camera.vFovDeg` within 42–50.

**INV-8 — Gestures remain full-body.** During Acknowledge, Present or Point, the complete animated bounds stay visible (INV-1) and occupancy stays within the INV-3 ceiling. The distance floor from v2.0 is removed: zoom is permitted, so "do not zoom into the upper body" is now enforced by the no-crop rule plus the occupancy ceiling rather than by a fixed camera distance. A gesture that reads as an upper-body framing will fail INV-1, INV-3 or INV-6.

**INV-9 — Content avoidance.** `avatarBounds` does not intersect any `contentRects` entry with `critical: true`, re-evaluated after every layout change.

Relaxed during authored power excursions, between `input_lock` and `input_unlock`. A launch arc crossing the middle third will necessarily pass over content that lives in the upper two-thirds, and input is already locked for that window, so the content is not interactive while it is crossed. Transient overlap during a cinematic moment is acceptable; persistent overlap in any settled state is not. Asserted strictly again from `input_unlock` onward.

**INV-10 — Per-character calibration.** For each character, occupancy stays in band without normalising `canonicalHeightM`. A taller or broader-silhouette character must be framed by camera distance, not by resizing the character (§2).

### Look Back

**INV-11 — Orbit and radius.** Orbit reaches 160–180°; enter 300–450 ms; exit 220–350 ms; `|distance − distance_at_start| / distance_at_start <= 0.15`; INV-1 and INV-3 hold every frame including through the perpendicular.

**INV-12 — Backdrop continuity.** No frame shows an unbacked view direction. `backdropBlend` progresses monotonically and the perpendicular window is covered. See F2 in R004 — this is the finding most likely to look broken.

**INV-13 — Previous location defined.** `lookBack.active` is true only when `previousLocationId` is non-null. On first entry and after direct-map navigation it must be disabled, with the control's state and accessible name reflecting that (R004 F4).

**INV-14 — Explorer facing preserved.** The explorer does not rotate to keep showing their back (§6). Procedural head or torso awareness is permitted.

**INV-15 — Look Back correctly gated.** Disabled during traversal, authored concealment, focus-trapping modals, active text input where R is legitimate, and where no previous location can be safely revealed.

### Animation

**INV-16 — UI never waits on animation (hard).**
For every `InputLatencyEvent`, `uiRespondedAtMs` is within the interaction budget **irrespective of `animationStateAtInput`**. No click, route change, keyboard focus, project open or form submit may be delayed by animation (§5, §9, §10). Correlate latency against animation state; any correlation is a finding.

**INV-17 — Priority order.** Observed transitions obey traversal > look back > gesture > idle recovery > long idle > base idle. Traversal cancels decorative idles. A route request during look back resolves the camera first, then traverses. Long idles never interrupt a gesture, traversal or focused task.

**INV-18 — Clean interruption.** Any meaningful input interrupts hourglass or edge-lean cleanly. Hourglass returns to navigation idle in 0.3–0.6 s; edge-lean recovery completes in 0.45–0.8 s. No stacked prop transfers, no queued obsolete gestures, no stacked edge moves.

**INV-19 — Prop attachment integrity.** Never two visible hourglasses during transfer; attachment fires on the authored event marker; a lower-LOD hourglass exists and is used.

**INV-20 — Blend duration.** Normal clip blends 150–250 ms unless the active power declares a longer authored blend.

**INV-21 — Gesture cooldown.** Repeated activation does not produce continuous animation; cooldown approximately 3 s.

**INV-22 — Edge-lean preconditions.** Runs only when viewport ≥ ~1100 CSS px, reduced motion off, no modal, no active form field, no playing media, layout manager confirms a safe edge with no critical text or controls, and the explorer can remain fully visible. Stops 24–40 px inside the edge. Never on mobile. Cooldown ~5 minutes.

**INV-23 — Idle timing.** Hourglass after 45–60 s of genuine inactivity; edge-lean considered after 100–120 s. Timers pause when the tab is hidden and reset on meaningful pointer, keyboard, scroll, touch or navigation activity (§7).

**INV-24 — Reduced motion.** With `prefers-reduced-motion: reduce`: look-back becomes a crossfade to a still previous-location representation; the explorer never moves to the edge; INV-1 still holds on every frame with camera motion disabled. This is a distinct code path and is tested independently.

### LOD

**INV-25 — Context gates tier.** `lod.active === 0` only when `lod.context === "character_selection"`. Navigation never exceeds LOD 1 regardless of rendered pixel height.

> **Blocked on DEP-CAM-004.** Addendum §11 and §12 contradict each other on dpr-2 displays: §12's ">360 rendered pixels → LOD 0" selects the selection tier during ordinary navigation at 18–24% occupancy on any retina display, which §11 forbids. See R004 F1. This invariant encodes my recommended reading; confirm before relying on it.

**INV-26 — Triangle ceilings.** `lod.triangles` within the active tier's ceiling: LOD0 55–75k, LOD1 28–42k, LOD2 14–24k, LOD3 7–12k, LOD4 3–6k. Excludes VFX particles.

**INV-27 — Draw-call ceilings.** LOD0 ≤ 12, LOD1 ≤ 10, LOD2 ≤ 7, LOD3 ≤ 5.

**INV-28 — Hysteresis.** LOD transitions show 10–15% hysteresis; no oscillation across a threshold within a short window.

**INV-29 — Residency.** Only the selected explorer is resident at its active tier. No unused high-resolution character remains loaded. Character-selection thumbnails are images or lightweight previews, not live rigs (§13).

**INV-30 — No memory growth.** After 20+ consecutive transitions, geometries, textures and memory return to baseline within tolerance.

### Action space and shared locomotion

**INV-31 — Lateral freedom, edge to edge.** The explorer can occupy any horizontal position across the full viewport width within the lower-third band, subject to INV-1, INV-4 and INV-9. Verified by driving content-avoidance and edge-lean to both extremes and confirming the solver reaches them rather than clamping to a narrower centre region. The 24–40 px inset at edge-lean (INV-22) is the intended stop, not a symptom of a constrained solver.

**INV-32 — Shared locomotion retargets without foot sliding.** Locomotion is authored once per presentation category — male, female, non-binary — and retargeted onto characters of differing canonical height and proportion (§2 forbids normalising heights). For every character, during the step cycle and the edge-lean move:

- No foot sliding: the planted foot's world position stays fixed through its contact phase within tolerance.
- No ground penetration or float: contact height matches the local stage surface.
- Stride length is consistent with the character's authored leg length, not the source rig's.

This is the classic failure of shared clips across differing body proportions, and it is most visible in exactly the sequence the addendum specifies — the two to four local steps of the edge-lean move.

**INV-37 — Portrait advisory is advisory, never a blocker.** Owner-approved 2026-07-31. In immersive mode only, a portrait advisory appears when all three conditions hold together: `orientation: landscape`, `max-height: 500px`, `pointer: coarse`.

Assert:

- appears under all three conditions together, and under **no** partial combination
- never appears in Static View (`data-view="static"`)
- never appears on desktop, including a window dragged short with devtools open — 1536×450 with `pointer: fine` must not trigger it
- both actions reachable by keyboard, no focus trap, dismissible, dismissal persists for the session
- renders and both actions function with JavaScript disabled
- "Switch to Static View" preserves the current route
- **after "Continue anyway", INV-1 still holds** with occupancy below band, `constrained: true` and a recorded reason

WCAG 2.2 SC 1.3.4 (Level AA) forbids restricting operation to a single orientation. A modal that prevents use until the device is rotated fails this invariant even if it looks correct — some users cannot rotate at all. The advisory is a courtesy layered on behaviour that already degrades correctly; the fallback is the contract.

**INV-34 — Occlusion stays correct across the full excursion corridor.** The foreground occlusion mask (worldbuilding §3.1, layer 5) is authored for an explorer standing in the lower third. During a vertical excursion the explorer passes through midground and sky regions of the plate, where the authored depth relationship may not hold.

For every power that leaves the home band, assert the explorer renders on the correct side of every foreground element throughout the arc — no popping through an arch, banner, canopy or foliage cutout, and no incorrectly occluding distant architecture as they rise. This is a per-plate integration check, not a global one, and it is the excursion's most likely visual failure after cropping.

**INV-33 — Shared clips preserve per-character secondary motion.** A shared locomotion clip drives per-character garment and accessory chains, which differ in mass and length across the roster. For each character: no self-intersection between mantle tails, scarves, pouches and the body during the shared cycle; secondary motion settles rather than oscillating; and the §13 limit of no more than three independent dangling accessory groups holds. Consistent socket and chain naming across the roster is a precondition — flagged to Codex.

---

## 3. Test matrix

### 3.1 Viewports

Addendum §14 minimum, plus the cases most likely to produce real crops:

| Class | Sizes |
| --- | --- |
| Required by §14 | 1920×1080, 2560×1440, 3840×2160, representative ultrawide, tablet landscape and portrait, supported mobile |
| Ultrawide | 2560×1080 (21:9), 3840×1080 (32:9) |
| Tablet | 768×1024, 1024×768, 820×1180 |
| Laptop | 1366×768, 1440×900, 1536×864 |
| Mobile | 390×844, 360×640, 844×390 landscape |
| High DPI | 1920×1080 and 2560×1440 at dpr 2 — **the LOD contradiction case** |
| Zoom | 80%, 100%, 125%, 150% per §14 |
| Dynamic | 390×844 with mobile toolbar shown and hidden |
| Edge-lean boundary | 1080 and 1120 CSS px, either side of the ~1100 threshold |

WCAG 200% reflow remains a separate Static View gate (R004 F5); it is not applied to immersive camera composition.

### 3.2 States, per character

Every item in §14: base idle, weight shift, garment adjustment, present, point, hourglass draw/loop/stow, left and right edge lean, idle recovery, look back enter/hold/release, every traversal power, arrival and landing poses. Plus cancellation and failure paths, and reduced-motion equivalents of all of the above.

### 3.3 Content layouts

No panel; inner-plate reading state with panel open; expanded `<details>` causing reflow; long content scroll; mobile menu open; panel opening while the explorer is mid-dodge.

### 3.4 Worst-case combinations

Run explicitly — this is where crops actually live:

1. Mobile toolbar transition during a traversal launch
2. Edge-lean at full extension + peak wind on scarf and mantle tail, on the narrowest permitted viewport
3. Look back at maximum orbit on ultrawide, checking the perpendicular
4. Dune Surfing hard turn at peak cloth lag on the shortest viewport
5. Tallest character with the broadest garment silhouette at the tightest band
6. Layout reflow during an active traversal
7. Rapid repeated clicks during long-idle hourglass — latency and cancellation
8. dpr-2 at 24% occupancy — LOD tier selection
9. Route request issued mid look-back
10. Zoom to maximum extent while the tallest character plays its widest-silhouette pose — per-frame across the whole zoom curve, not endpoints
11. Explorer driven to the far left and far right extremes of the band with a content panel forcing the move
12. Shared locomotion retargeted onto the shortest and tallest characters, checking foot contact through the edge-lean step cycle
13. Tablet at 26% occupancy — the lower-third arithmetic boundary in INV-5
14. Solar Propulsion launch apex on the **shortest** viewport — peak vertical excursion against least headroom, the most likely crop in the whole system
15. Excursion apex with headwear and mantle tail at full extension, checking the top margin specifically
16. Excursion arc passing across an authored foreground occlusion element on each plate — INV-34
17. Excursion interrupted mid-arc by cancellation or failure recovery — does the explorer return to the home band, or rest stranded above it
18. Consecutive powers with excursions, verifying the home band is re-established each time and does not drift upward

---

## 4. Method

1. Codex enables telemetry behind the debug flag.
2. Playwright drives each viewport × state × character combination, capturing telemetry and latency streams.
3. Assertions run over recorded frames, not screenshots. A crop lasting three frames during a launch is invisible to review by eye.
4. Failures report: viewport, device class, character, animation state, power, marker, frame index, offending bounds and margins, whether the crop came from `bodyBounds` or accessories only, plus a captured frame image.
5. Screenshot review at the §14 breakpoints supplements the assertions for composition quality — placement, balance, whether the explorer reads as a companion rather than the subject, LOD transitions invisible at real viewing size, silhouette recognisability across tiers. That part is judgement and will be reported as judgement, per §14's requirement for side-by-side comparison at real navigation size.

Reported as `R0xx-camera-animation-verification.md` with pass/fail per invariant per viewport class per character.

---

## 5. Implementation notes worth having before the controller is written

**5.1 Bind to the visual viewport, not `100vh`.** The most likely source of a real shipped crop. iOS Safari and Android Chrome resize the visual viewport as the URL bar hides and shows; a controller computing against the layout viewport frames against a viewport the user cannot see and crops the feet under browser chrome while reporting full visibility. Use `visualViewport.height` / `dvh`, re-solve on resize, scroll and `visualViewport` change.

**5.2 Lookahead, not reaction.** Reacting to a crop ships it for the correction frames. Traversal and gesture clips are authored, so precompute maximum animated bounds per clip per character and drive camera distance ahead of the pose.

**5.3 Content avoidance is a constraint solver.** Panels publish screen rects with a `critical` flag; the controller subtracts them and solves INV-1, INV-3, INV-5 and INV-9 together, re-solving on layout change. Retrofitting a solver onto a fixed offset is a rewrite.

**5.4 Degrade distance before degrading the band.** Where INV-1 and INV-3 cannot both hold, the addendum is unambiguous: the complete body stays visible. Increase distance, let occupancy fall below band, report it. Never crop.

**5.5 Look-back needs a backdrop transition, not a literal sweep.** Neither plate covers the perpendicular. Cross-dissolve current → previous plate with the midpoint at the perpendicular, veiled with dust or heat haze consistent with the location. Existing visual vocabulary from the power transitions; motion blur alone will not cover 300–450 ms on a static plate. See R004 F2.

**5.6 Blend the avatar lighting profile across look-back.** The explorer is lit for the current location while the backdrop becomes the previous one, and the end of the orbit is the most scrutinised view of the character. Blend key direction, colour temperature and ambient in step with `backdropBlend`. See R004 F3.

**5.7 Define "previous location" narrowly.** Last location actually traversed *from*; cleared on direct-map jumps and first entry. Otherwise look-back can display an unrelated plate and misrepresent the world's geography. See R004 F4.

**5.8 Sidecar animation manifest.** Per §10, keep animation events and prop attachment markers in a manifest rather than frame numbers in application code. It is also what makes INV-19 and INV-2 testable without instrumenting the clips themselves.

---

## 6. Open item

| ID | Question | Effect |
| --- | --- | --- |
| **DEP-CAM-004** | Confirm presentation context gates LOD (navigation never exceeds LOD 1), with pixel height selecting within tiers, and whether thresholds are CSS or device pixels | Without it, dpr-2 displays load the character-selection tier during navigation at roughly double the triangle budget. INV-25 encodes the recommended reading. |

Everything else is buildable and runnable as specified.
