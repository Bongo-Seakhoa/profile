# R004 — Animation Addendum review: answers logged, corrections to R003, six new findings

**Author:** Claude (review agent)
**Date:** 2026-07-31
**Source:** `Animation Addendum.md` (owner), plus owner ruling on DEP-CAM-002 in chat
**Supersedes:** R003 §4 (character budget), R003 §5 (no-crop definition), and the occupancy figures in `camera-framing-verification-spec.md` v1
**Scope:** Immersive mode only. Static View is unaffected; Release 1 (M0–M6) proceeds unchanged.

---

## 0. Summary

The addendum answers all three open camera questions and supplies a solution to the orbit conflict that I had not considered. My R003 §3 recommendation is withdrawn — see §2.

Six new findings, one of which is an internal contradiction in the addendum itself that will silently load the wrong LOD on high-DPI displays.

---

## 1. Open questions — now closed

| ID | Question | Answer |
| --- | --- | --- |
| **DEP-CAM-001** | Constrained arc or true wide orbit? | **True orbit, 160–180°**, resolved by using the previous location's cached plate as the reversed backdrop (§6). See §2 below. |
| **DEP-CAM-002** | Do detached power effects count inside the no-crop bounds? | **No.** Cropping is permitted only when caused by an active authored power effect. Temporary VFX particles are explicitly outside the bounds (§11). See §3 below. |
| **DEP-CAM-003** | Reduced character budget? | **Confirmed and specified more precisely than I proposed.** Five LOD tiers, §11. See §4 below. |

Two earlier gaps are also closed: reduced-motion behaviour is now specified for look-back, edge-lean and idle recovery (§6, §8, §9), and idle timers pause on hidden tab (§7).

---

## 2. Correction to R003 §3 — the orbit conflict is resolved

R003 §3 argued that a 160–180° look-back was incompatible with the single-plate architecture, because camera rotation moves the backdrop across frame in proportion to field of view regardless of depth, and there is only one plate per location painted from one direction.

The physics in that analysis holds. The conclusion does not, because the addendum supplies the backdrop I assumed did not exist: **§6 uses the previous location's cached plate as the reversed view.** Looking back along the route shows where the traveller came from. That is an elegant fit for both the architecture and the narrative, and it needs no new artwork, no outpainting and no 3D environment.

My option A recommendation (constrained arc plus avatar turn) is withdrawn. Codex should implement the 160–180° orbit as specified.

Three implementation consequences follow from it, in §5 below.

---

## 3. The no-crop rule, in its final testable form

Combining addendum §1, §11 and the owner's ruling:

**In bounds — must never crop while the explorer is visible:**
top of hair or headwear, hands and fingers, outer garment silhouette, scarves and mantle tails, pouches and jewellery, legs and footwear, and **power-related silhouette elements** attached to the character.

**Not in bounds:**
temporary VFX particles (§11 excludes them from budgets and they do not constrain the envelope) — sand spray, dust ribbons, trails, detached orbiting stones, glass fragments, light shafts, decals and shadows.

**Permitted disappearance:**
only an intentional authored power effect — sinking into sand, dissolving into a mirage, or leaving frame during Solar Propulsion. Never camera framing, at any time.

This makes the Stone Orbit Sling question concrete: the orbiting stones are detached VFX and do not expand the envelope, but if that power's authored sequence deliberately takes the character out of frame, that is sanctioned. The distinction is **cause**, not appearance — a crop caused by the camera fails, a departure authored into the power passes.

---

## 4. Character budget — superseded and now precise

R003 §4 recommended 25,000–60,000 triangles with 1K textures for the world view. The addendum is more precise and slightly more aggressive, which is the right outcome:

| Tier | Triangles | Use |
| --- | --- | --- |
| LOD 0 | 55,000–75,000 | Character selection only, 35–55% viewport |
| LOD 1 | 28,000–42,000 | High-end desktop navigation, 18–24% |
| LOD 2 | 14,000–24,000 | Laptop and ordinary desktop |
| LOD 3 | 7,000–12,000 | Mobile and low power |
| LOD 4 | 3,000–6,000 | Very distant or impostor |

Textures (§13): 2K primary atlases for high navigation, 1K–2K standard, 1K mobile, 4K **only** for the character-selection tier.

Against the brief's original Ultra tier of 150,000–250,000 triangles and 4K runtime textures, LOD 1 is roughly a **four-to-six-fold reduction** in the navigation case. This is the single largest cost reduction available to the project and it directly relieves **R-025** (8 GB RAM, no Cycles GPU).

§13 adds something equally significant for **DEP-ROSTER-001**: *"Only the selected explorer should remain loaded at its active quality tier. Do not keep all fifteen complete rigs resident. Character-selection thumbnails may be rendered images or lightweight previews."* Pre-rendered selection thumbnails mean the roster does not need fifteen live rigs at runtime. That changes the runtime cost of the roster substantially. It does not change the **production** cost of authoring fifteen characters, which remains the open scope question.

§12's construction rules are sound and worth protecting — manual retopology for LOD 0 and 1, decimation only as a starting point for lower tiers, and an explicit removal order that takes micro-charms first and identity-defining silhouette last. That ordering is what keeps representation intact under simplification.

---

## 5. New findings

### F1 — LOD selection contradicts itself on high-DPI displays

**Severity: high. Will silently load the wrong tier on common hardware.**

§11 states LOD 0 is 55,000–75,000 triangles, for character selection at 35–55% viewport, and *"Do not automatically load this tier for normal navigation."*

§12 gives selection thresholds by rendered pixel height: *"More than approximately 360 rendered pixels tall: LOD 0."*

These disagree whenever device pixel ratio is 2, which is most modern laptops and phones:

| Display | Occupancy | CSS px | Device px | §12 selects | §11 permits |
| --- | ---: | ---: | ---: | --- | --- |
| 1920×1080 @ dpr 1 | 24% | 259 | 259 | LOD 1 | LOD 1 ✓ |
| 1920×1080 @ dpr 2 | 24% | 259 | **518** | **LOD 0** | LOD 1 ✗ |
| 2560×1440 @ dpr 2 | 24% | 346 | **692** | **LOD 0** | LOD 1 ✗ |
| 2560×1440 @ dpr 2 | 18% | 259 | **518** | **LOD 0** | LOD 1 ✗ |

On any dpr-2 display in the normal occupancy band, the pixel-height rule selects the character-selection tier during ordinary navigation — exactly what §11 forbids, at roughly double the triangle budget.

**Recommended fix:** make presentation context the primary gate and pixel height the secondary selector within it. Navigation never exceeds LOD 1 regardless of pixel height; the pixel thresholds choose among LOD 1–4. Character selection is the only context that may load LOD 0. Additionally, state explicitly whether "rendered pixels" means CSS or device pixels — I recommend device pixels for the LOD 1–4 thresholds, since that is what actually determines perceived detail, with the §11 context gate above it.

Needs a one-line ruling from Bongo, or Codex may adopt the fix and record it.

### F2 — The mid-orbit backdrop gap

**Severity: medium. Determines whether look-back reads as polished or broken.**

Look-back sweeps 160–180° over 300–450 ms. The current plate covers the forward view; the cached previous plate covers the reversed view. **Neither covers the perpendicular**, and a swept orbit passes through it.

At roughly 90° of orbit there is no authored image for the direction the camera faces. Left unhandled this shows as a seam, a stretched edge or empty space, in the middle of a signature interaction.

**Recommended approach:** treat the orbit as a composited transition rather than a literal sweep through a continuous environment. The camera arcs while the backdrop cross-dissolves from current to previous plate, with the dissolve midpoint aligned to the perpendicular and covered by a short atmospheric veil — dust, heat haze or a light bloom consistent with the location. The brief already establishes veil-based occlusion for power transitions, so this is existing visual vocabulary rather than a new device. Motion blur alone is not sufficient at 300–450 ms on a static plate.

Worth prototyping early; it is cheap to test and expensive to discover late.

### F3 — Look-back creates a lighting mismatch on the avatar

**Severity: medium. This is the "pasted on" failure mode from R001 §12.**

The avatar is lit by the current location's lighting profile — key direction, colour temperature, ambient fill. During look-back, the visible backdrop becomes the **previous** location, which has a different lighting profile, and §6 notes the visitor will see the explorer's face and front silhouette at the end of the orbit. So the most scrutinised view of the character is the one where the character's lighting least matches what is behind them.

The Forge of Resolve (ember-lit, warm, high contrast) against the Garden of Origins (cool, bright, diffuse) is a visible mismatch, not a subtle one.

**Recommendation:** blend the avatar's lighting profile between the two locations across the orbit, in step with the backdrop dissolve. This depends on per-plate lighting profiles being authored, which is already recommended in R001 §12 and now has a second use case that makes it non-optional.

### F4 — Look-back has no previous location in two real cases

**Severity: medium. Both are ordinary user paths.**

§6 correctly requires disabling look-back when *"the camera cannot safely reveal a previous location."* Two cases need explicit handling and I will test both:

1. **First arrival at Threshold Dunes.** No previous location exists. Look-back must be disabled, and the compass control must communicate that state rather than appearing broken or unresponsive.
2. **Direct navigation.** The worldbuilding addendum §1.4 defines a "Direct seeker" mode where the visitor jumps straight to a location from the map or HTML navigation. "Previous location" is then either absent or the arbitrary one they jumped from, which may bear no spatial relationship to the current one. Showing an unrelated plate behind the explorer would misrepresent the world's geography.

**Recommendation:** define "previous location" as the last location actually traversed *from*, cleared on direct jumps and on first entry. Where undefined, disable look-back and reflect it in the control state and its accessible name.

### F5 — Zoom coverage differs from the WCAG requirement

**Severity: low. Avoid silently dropping a gate.**

§14 specifies zoom testing at 80%, 100%, 125% and 150%. My earlier spec used 200%, which is the WCAG 2.2 AA reflow requirement already in the R001 gates.

These serve different purposes and both should stay: 80–150% for immersive camera framing per the addendum, and 200% for HTML content reflow per WCAG. Immersive mode is opt-in and has a Static View fallback, so 200% need not hold the camera composition — but the underlying HTML content must still reflow at 200%, and the mode switch must remain reachable.

### F6 — The framing envelope is now per-character, not global

**Severity: low, but it shapes the controller's design.**

§2 requires preserving canonical world scale: *"Do not resize every character to an identical height."* Combined with the occupancy bands, this means camera distance must be calibrated **per selected character** — a taller character or one with a broader garment silhouette occupies more of the frame at identical camera distance.

The envelope therefore derives from the selected character's maximum animated bounds, not from a global constant, and §14 requires testing "different selected character heights and garment silhouettes." Worth designing in from the start rather than discovering when the second character is integrated.

---

## 6. Revised occupancy bands

Superseding R003 and verification spec v1:

| Context | Band | Hard ceiling |
| --- | --- | --- |
| Desktop and laptop navigation | 18–24% | ~28% |
| Ultrawide | 16–22% | ~28% |
| Tablet / compact immersive | 20–26% | ~28% |
| Character selection | 35–55% | exempt |

Vertical FOV 42–50°, starting at 46°. Safety envelope: 5–8% additional vertical padding, 4% horizontal each side, computed on complete animated bounds including cloth, hair, props and accessories — explicitly not from the armature root or body mesh alone.

Note the earlier figures I was working to (14–20%, 24% cap) are superseded upward. The character is intended to read slightly larger than the previous directive implied.

---

## 7. What the addendum adds beyond camera

The animation specification is substantial and largely new. Highlights that carry verification weight:

- **Compact library, not a clip zoo** (§3). Thirteen animation families with procedural head, spine, shoulder and arm targeting instead of baked clips per screen direction. This is the right call for both production cost and memory.
- **Non-blocking UI is explicit** (§5, §9, §10). Interface action must never wait on animation — not for clicks, route changes, keyboard focus, opening a project or submitting a form. This is testable as an input-to-response latency assertion independent of animation state, and it is exactly the kind of requirement that erodes quietly during implementation.
- **Explicit animation state machine and strict priority order** (§10), with events and prop attachment markers in a sidecar manifest rather than frame numbers scattered through application code. Directly verifiable.
- **Hourglass as a real prop** with belt and hand sockets, attachment events, no duplicate during transfer, and a lower-LOD version (§7).
- **Edge-lean constrained sensibly** (§8): minimum ~1100 CSS px viewport, not on mobile, reduced motion disables it, five-minute cooldown, stop 24–40 px inside the edge, layout manager must confirm a genuinely safe edge.

I have folded all of this into the verification specification. See `data/camera-framing-verification-spec.md` v2.

---

## 8. Items still needing Bongo

Only one, and it is small:

| ID | Question | Effect |
| --- | --- | --- |
| **DEP-CAM-004** | F1 — confirm that presentation context gates LOD (navigation never exceeds LOD 1), with pixel height selecting within tiers, and state whether thresholds are CSS or device pixels | Without it, dpr-2 displays load the character-selection tier during navigation at roughly double the triangle budget |

F2, F3, F4 and F6 are implementation decisions Codex can take, with my recommendations above. F5 needs no decision.

Nothing here blocks Release 1.
