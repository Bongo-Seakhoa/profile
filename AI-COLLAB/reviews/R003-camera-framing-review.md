# R003 — Camera specification correction: supersession map, conflicts and consequences

**Author:** Claude (review agent)
**Date:** 2026-07-31
**Source:** Owner directive, 2026-07-31. Supersedes all previous camera-framing language.
**Applies to:** Immersive Anzania mode only. Static View has no camera (§16.5 forbids all movement), so nothing in Static View or Release 1 changes.
**Division of work:** Codex implements the framing controller, animated-bound tracking and responsive safe zones. Claude verifies complete-avatar visibility across every animation, power, viewport ratio, content layout and breakpoint.

---

## 0. Summary

The directive is clear and I can verify it. Three consequences are worth surfacing before Codex builds against it:

1. **True camera orbit is architecturally incompatible with the single-plate mixed-dimensional design.** The look-back requirement collides with the plate overscan budget, and not marginally — by roughly an order of magnitude. §3 proposes a resolution that keeps the owner's intent.
2. **The 14–20% framing figure is a large and favourable cost signal for character production.** At this size the brief's Ultra tier is over-specified by roughly 4–8×. This is good news, and it points the same direction as the 8 GB / no-GPU constraint in R-025.
3. **"Never crop" needs a precise definition to be testable**, particularly around what counts as part of the avatar. §5 proposes one and flags the one genuine ambiguity.

---

## 1. Supersession map

Exact list of superseded language, so nothing is implemented from a stale line.

### Master production brief — `desert_nomad_avatar_master_production_brief.md`

| Line | Superseded text | Replaced by |
| --- | --- | --- |
| 231 | "The camera should ease into a **low three-quarter chase view**, then return to the destination framing." (Dune Surfing) | Distant full-body third-person. Dynamic distance increase during traversal; no chase framing that crops. |
| 336 | "The camera **may pull back** during the charge, accelerate with the launch." (Solar Propulsion) | Pull-back retained and now mandatory where needed to preserve full-body visibility. |
| 392 | "The camera should remain largely anchored." (Reality Bending) | Retained, subject to the no-crop invariant. |
| 778 | "The camera should feel authored, not like a generic orbit controller." | Retained in spirit. Look-back orbit is authored and constrained, not free orbit. |
| 791 | "Each destination should define a camera anchor and a safe composition. The avatar should not block important page controls." | Strengthened: responsive screen-space framing envelope, lower-third placement, offset from active HTML content. |
| 793 | "Dune Surfing **may use a chase angle**. Solar Propulsion may use a launch pullback. Sand Teleportation may use a stable framing." | Chase angle removed. All powers use the distant full-body composition. |

**No over-the-shoulder framing exists anywhere in the current documents**, so nothing needs removing on that count. The prohibition is now explicit and I will test for it as a negative assertion.

### Worldbuilding addendum — `Anzania_Worldbuilding_Addendum_v1.0.md`

§3.3 "Camera limits" is **not** superseded and is now in direct tension with the new directive. See §3 below.

| Line | Constraint | Status |
| --- | --- | --- |
| 214 | "The camera must not move far enough to expose missing image edges or reveal that architecture is flat." | **Still binding. Conflicts with orbit.** |
| 215 | "Use overscan, safe crop zones and plate-specific limits." | Still binding |
| 794–795 | `parallaxLimitPx: 24`, `overscan: 1.06` | Still binding, and quantitatively incompatible with orbit |
| 216, 931 | No camera drift while reading or completing a form | Still binding; interacts with the idle edge-lean |

### Static View addendum

Unaffected. §16.5 and §18.2 forbid all camera movement, parallax and animation. Release 1 is untouched by this directive.

---

## 2. What the directive adds that did not exist before

These are new requirements with no prior coverage, and each needs a test:

- A hard no-crop invariant on the complete animated character bounds, including accessories.
- A screen-space framing **envelope** driven by animated bounds, rather than a fixed camera distance.
- A normal occupancy band of approximately 14–20% of viewport height, with a soft ceiling near 24% outside character selection.
- Lower-third placement with clear space above the head and below the feet.
- Content-aware lateral offset — the avatar moves away from active HTML content.
- Hold-to-look-back preserving composition and approximately constant camera radius.
- Dynamic distance increase during acceleration, turns, jumps, surfing, launches and landings.
- A long-idle edge-lean that may approach a viewport edge but must not cross it.
- Interaction gestures readable at full-body distance, with zooming to upper body prohibited.

---

## 3. Conflict — camera orbit versus the single-plate architecture

**Severity: high. Needs Bongo's decision. Cheap to settle now, expensive after the framing controller is written.**

The directive requires hold-to-look-back to "orbit around the avatar" at approximately constant radius. The worldbuilding addendum requires the camera never to move far enough to reveal that the architecture is flat, and pins `overscan: 1.06` with `parallaxLimitPx: 24`.

These cannot both hold, and the gap is not small.

**The governing fact:** camera *rotation* moves the background across the frame in proportion to field of view, **independent of depth**. Translation parallax depends on distance; rotation does not. Orbiting the camera around the avatar necessarily rotates the view direction, so the backdrop must have image coverage in the direction you turn toward. Putting the plate far away does not help.

**The arithmetic.** At a 50° horizontal field of view, an overscan of 1.06 provides 6% additional image width, 3% on each side. That is about **±1.5° of yaw** before the frame runs off the edge of the plate. Even a generous overscan of 1.3 buys only about ±7.5°. A look-back worth the name — say ±30° — needs roughly 2.2× overscan, meaning less than half the plate's 1672 px width spans the viewport. That collapses to roughly 760 px of real image across a desktop viewport, which fails the fidelity finding already recorded in R001 §5 and R-008.

A true 180° look-back has no backdrop at all. There is exactly one plate per location state, painted from one direction.

**Three honest options:**

| Option | What it delivers | Cost |
| --- | --- | --- |
| **A. Constrained-yaw look-back (recommended)** | Camera arcs a few degrees within the plate's overscan budget. The *avatar* turns and looks back; camera contributes a small authored arc and slight elevation change. Reads as looking back, preserves full-body framing and composition. | None. Works with assets in hand. |
| **B. Panoramic plates** | True orbit | Every location needs 360° or wide-arc coverage. The plates are single-view 16:9 paintings. Outpainting requires owner approval under §8.1 and risks visible seams and quality loss. ANZ-ASSET-001 already showed asset supply is fragile. |
| **C. Real 3D local environment** | True orbit near the avatar, plate as distant backdrop | Contradicts the mixed-dimensional decision, which is the strongest technical decision in the brief. Also collides directly with R-025 hardware limits. |

**Recommendation: Option A.** It preserves the owner's intent — the visitor holds a key, the character turns and the view arcs to look back along the route — while keeping the architecture that makes this project feasible. The perceived motion is carried by character animation and a small camera arc, not by rotating a flat painting past the frame edge.

**Decision needed from Bongo:** confirm that "orbit" may be delivered as a constrained arc plus avatar turn, or state that a true wide orbit is required, in which case option B or C must be scoped and the mixed-dimensional decision revisited.

---

## 4. Consequence — the framing figure substantially reduces the character budget

**This is favourable, and it is the most useful number in this directive.**

Avatar height in CSS pixels at the specified occupancy:

| Viewport | 14% | 20% | 24% cap |
| --- | ---: | ---: | ---: |
| 1920 × 1080 desktop | 151 | 216 | 259 |
| 1536 × 864 laptop | 121 | 173 | 207 |
| 2560 × 1440 | 202 | 288 | 346 |
| 3840 × 2160 | 302 | 432 | 518 |
| 390 × 844 mobile portrait | 118 | 169 | 203 |
| 844 × 390 mobile landscape | 55 | 78 | 94 |
| 1920 × 1080 at 200% zoom | 76 | 108 | 130 |

Worst realistic desktop case for detail is a 2560 × 1440 display at device pixel ratio 2 and 20% occupancy: **288 CSS px, 576 device px tall**. A clothed standing figure at that height occupies roughly 576 × 200 device px of bounding box, and perhaps 60% of that as actual silhouette — on the order of **70,000 device pixels**.

Set that against the brief's §8.5 tiers:

| Tier | Brief target | Triangles per covered device pixel at worst desktop case |
| --- | ---: | ---: |
| Ultra | 150,000–250,000 | **2.1 – 3.6** |
| Standard | 80,000–150,000 | 1.1 – 2.1 |
| Mobile | 35,000–80,000 | 0.5 – 1.1 |

Two to three and a half triangles per pixel is heavy over-tessellation. Nothing is visible below roughly one triangle per pixel, and good silhouette quality needs considerably less.

Texture is starker. On a 288 CSS px figure the head is roughly 38 px and the face roughly 25 px. The brief specifies 4K runtime textures for Ultra and 8K source. A 4096 px face texture resolves into about 25 px of screen.

**Recommendation for the world view:**

- Geometry: approximately **25,000–60,000 triangles** for the in-world character. Below the brief's Mobile tier, and visually indistinguishable at this framing.
- Textures: **1K body and 1K face** for the world view. 512 px is defensible for body on smaller viewports.
- Keep a genuine high-detail LOD0 and 2K textures **only for the character-selection view**, which the directive explicitly exempts from the 24% ceiling and where the user actually inspects the character.

This is not a quality compromise. The pixels are not there to receive the detail. It cuts character memory and production cost by roughly four to eight times, and it directly relieves R-025 (8 GB RAM, no Cycles GPU).

### Representation consequence, stated carefully

Brief §2.1 requires fifteen distinct face and body designs, "not one face with five skin colours". That commitment is right and should be kept.

At 25–38 px of head height in the world view, **facial archetype is not perceptible**. What actually distinguishes characters at this scale is silhouette, body proportion, garment cut and layering, headwear shape, palette and posture.

So the commitment is best delivered by spending differentiation budget where it registers:

- **World view:** silhouette, proportion, garment cut, headwear, palette, idle posture.
- **Character-selection view:** face, material detail, texture fidelity — shown large, at low frame cost, where the user is actually choosing.

This preserves the representation principle rather than diluting it. It also means facial sculpt work should not gate a character appearing in the world, which changes the shape of DEP-ROSTER-001 and is worth putting in front of Bongo alongside R-025.

---

## 5. Making "never crop" testable

The invariant needs a precise definition or verification becomes an opinion.

**Proposed definition.** For every rendered frame outside a sanctioned occlusion window, the projected screen-space axis-aligned bounding box of the *avatar set* must lie strictly inside the visible viewport, with a non-zero margin on all four sides.

**Avatar set — in bounds, must never crop:**
body, head, headwear, hair, hands, footwear, and all worn or attached items: garments, garment tails, scarves, cloaks, belts, pouches, jewellery, and any emissive power markings on the body or clothing.

**Not in bounds — effects, may extend beyond frame:**
detached particle systems, sand spray, dust ribbons, trails, glass fragments, light shafts, orbiting stones, ground decals and shadows.

**One genuine ambiguity for Bongo.** The directive says "power-relevant silhouette elements". Stone Orbit Sling raises stones into orbit *around* the character. If those count as avatar bounds, the framing envelope must expand substantially for that power alone, pushing the character well below 14% occupancy during the effect. My recommendation is that detached orbiting stones are an effect, not avatar bounds — but this is the owner's call and it materially changes the envelope.

**Bounds must be animated, not rest-pose.** A rest-pose bounding box is useless here. Scarves and garment tails under wind and acceleration can extend far beyond the body, and the worst cases are exactly the moments the directive names: acceleration, turns, jumps, launches and landings. The envelope must be computed from the current skinned pose plus accessory simulation each frame, with a lookahead margin so the camera is already at distance when the extreme pose arrives, rather than reacting after the crop.

**Sanctioned occlusion windows.** The directive permits disappearance only from an authored traversal effect. The brief already defines the exact markers to key this to: `character_occluded` through `destination_visible` (§4.1). The harness allowlists invisibility strictly between those markers and fails it anywhere else. No new vocabulary needed.

---

## 6. Verification plan

Full specification, including the harness design and the complete case matrix, is in `data/camera-framing-verification-spec.md`. Summary of what I will test:

| Dimension | Coverage |
| --- | --- |
| Powers | All shipped powers, full lifecycle through every timing marker, plus cancellation and failure paths |
| Animations | Every idle variant, edge-lean, gestures, turns, and all traversal clips |
| Viewports | 320, 360, 390, 768, 1024, 1440, 1920, 2560 wide; portrait and landscape; 21:9 and 32:9; 200% zoom |
| Dynamic viewport | Mobile toolbar shown and hidden — see §7 |
| Content layouts | Panels open, closed, expanded `<details>`, long content reflow, mobile menu open |
| Negative assertions | No OTS framing; occupancy stays within band; no crop outside sanctioned windows |

Method: instrument the framing controller to emit per-frame projected bounds and occupancy, then assert over recorded runs rather than eyeballing screenshots. Screenshot review supplements it at the named breakpoints; it does not replace it. A crop that occurs for three frames during a launch will never be caught by hand.

---

## 7. Edge cases most likely to produce real crops

Ranked by how likely they are to ship unnoticed.

1. **Mobile dynamic viewport.** iOS Safari and Android Chrome resize the visual viewport as the URL bar hides and shows. A framing envelope bound to `100vh` computes against the *large* viewport while the *small* viewport is actually visible, so the feet are cropped by browser chrome while the renderer believes the avatar is fully framed. This is the single most likely source of a real, shipped crop. Bind to `dvh` / visual viewport and re-solve on `resize` and `visualViewport` events. I will test with the toolbar in both states.

2. **Mobile landscape.** At 844 × 390, 20% occupancy is 78 CSS px, and lower-third placement with clear space above and below leaves very little room once HTML content is present. The band may simply not be satisfiable here. Likely resolutions: raise the percentage for short viewports, or accept that the avatar is decorative and repositioned. Needs a tuning decision once measurable.

3. **200% zoom.** Required by WCAG 2.2 AA and already in the R001 gates. Effective viewport halves; the envelope must re-solve rather than assume layout viewport.

4. **Content-aware offset as a constraint solver.** "Offset away from active HTML content" couples the 3D camera to live DOM layout. When a `<details>` expands or content reflows, a previously safe avatar position can become covered. This must re-solve on layout change, not compute once. It also needs a defined interface — HTML panels publish their screen rectangles; the framing controller subtracts them from the safe area. Worth specifying before it is written, because retrofitting a solver onto a fixed offset is a rewrite.

5. **Extreme aspect ratios.** 32:9 leaves the avatar tiny and far from content; 4:5 portrait tablets compress vertical space against the lower-third rule.

6. **Reduced motion.** The directive does not mention it. Under `prefers-reduced-motion`, the edge-lean, content-dodging and camera arcs should be reduced or disabled — but **the no-crop invariant must still hold with camera motion disabled**, which is a distinct code path and a classic place for this kind of bug to hide. I will test it as its own case.

7. **Idle edge-lean.** By design it approaches the frame edge, so it has the least margin of any state. Combined with a wind gust on a scarf, it is the most likely idle-state crop.

---

## 8. Items needing Bongo

| ID | Question | Why it matters now |
| --- | --- | --- |
| **DEP-CAM-001** | May look-back be a constrained arc plus avatar turn (option A), or is a true wide orbit required? | Determines whether the mixed-dimensional architecture survives. Cheap now, a rewrite later. |
| **DEP-CAM-002** | Do detached power effects such as orbiting stones count inside the no-crop bounds? | Materially changes the framing envelope for at least one power. |
| **DEP-CAM-003** | Confirm the reduced character budget: 25k–60k triangles and 1K textures in world, high detail reserved for character selection. | Cuts production cost four to eight times and relieves R-025. Changes what DEP-ROSTER-001 costs. |

Nothing here blocks Release 1. Static View has no camera, so M0 through M6 proceed unchanged. These land before M7.
