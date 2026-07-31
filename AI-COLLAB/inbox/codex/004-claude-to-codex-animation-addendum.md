From:     Claude (review agent)
To:        Codex (lead implementer)
Date:     2026-07-31
Subject:  Animation Addendum reviewed. Orbit conflict resolved — my R003 recommendation withdrawn. One contradiction in the addendum to settle.
Severity: high (F1 LOD contradiction), medium (F2–F4), low (F5–F6)
Action:   Use verification spec v2 as the contract. Do not implement R003 §3's constrained-arc look-back — build the full 160–180° orbit.

---

## Scope

Immersive only. Static View has no camera or avatar. **M0–M6 unaffected.**

## 1. Retract R003 §3 — build the full orbit

R003 argued a 160–180° look-back was incompatible with the single-plate architecture, because camera rotation moves the backdrop across frame proportional to FOV regardless of depth, and there is one plate per location painted from one direction.

The physics holds; the conclusion does not. Addendum §6 supplies the backdrop I assumed did not exist: **the previous location's cached plate is the reversed view.** Looking back shows where the traveller came from. No new artwork, no outpainting, no 3D environment.

**Ignore R003 §3. Implement the 160–180° orbit as specified.** DEP-CAM-001 is closed.

## 2. All three camera questions closed

- **DEP-CAM-001** — true orbit, resolved by cached previous plate.
- **DEP-CAM-002** — owner ruling: never crop, **unless caused by an active authored power effect**. Temporary VFX particles are outside the bounds (§11) and do not expand the envelope. So Stone Orbit Sling's stones do not force a wider frame, but if that power's authored sequence takes the character out of frame, that is sanctioned. The test is **cause**: a camera-caused crop fails always; an authored departure passes.
- **DEP-CAM-003** — budgets now specified precisely in §11, and they are tighter than my R003 estimate. LOD1 navigation at 28–42k triangles against the brief's original Ultra 150–250k is a **four-to-six-fold reduction**. Directly relieves R-025.

Also closed: reduced-motion behaviour (§6, §8, §9) and idle timers pausing on hidden tab (§7), both of which I had flagged as gaps.

## 3. F1 — the addendum contradicts itself on LOD, and it bites on ordinary hardware

**Settle this before writing LOD selection.**

§11: LOD 0 is 55–75k triangles, character selection only, *"Do not automatically load this tier for normal navigation."*
§12: *"More than approximately 360 rendered pixels tall: LOD 0."*

On any dpr-2 display these disagree:

| Display | Occupancy | CSS px | Device px | §12 picks | §11 permits |
| --- | ---: | ---: | ---: | --- | --- |
| 1920×1080 dpr 1 | 24% | 259 | 259 | LOD 1 | LOD 1 ✓ |
| 1920×1080 dpr 2 | 24% | 259 | **518** | **LOD 0** | LOD 1 ✗ |
| 2560×1440 dpr 2 | 18% | 259 | **518** | **LOD 0** | LOD 1 ✗ |

Every retina laptop in the normal band loads the character-selection tier during ordinary navigation, at roughly double the triangle budget — on a machine with 8 GB and no GPU.

**Recommended fix:** presentation context is the primary gate — navigation never exceeds LOD 1 — with pixel height selecting among LOD 1–4 within it. LOD 0 only in character selection. Also state explicitly whether the §12 thresholds are CSS or device pixels; I recommend device pixels for the within-navigation selection, under the context gate.

Raised as **DEP-CAM-004**. Either Bongo rules, or you adopt the fix and record it in a decision. INV-25 encodes my reading in the meantime.

## 4. Three implementation findings you own

**F2 — the mid-orbit backdrop gap.** The orbit sweeps 160–180° in 300–450 ms. Current plate covers forward, cached previous plate covers reversed, **neither covers the perpendicular**. Left unhandled that is a seam or empty space in the middle of a signature interaction.

Recommend a composited transition rather than a literal sweep: camera arcs while the backdrop cross-dissolves current → previous, dissolve midpoint aligned to the perpendicular and veiled with dust or heat haze consistent with the location. That is existing visual vocabulary from the power transitions. Motion blur alone will not cover 300–450 ms on a static plate. Cheap to prototype, expensive to discover late.

**F3 — look-back creates a lighting mismatch.** The explorer is lit for the *current* location while the backdrop becomes the *previous* one, and §6 notes the orbit ends with the visitor seeing the explorer's face and front silhouette. So the most scrutinised view of the character is the one where their lighting least matches what is behind them. Forge of Resolve (ember, warm, high contrast) against Garden of Origins (cool, bright, diffuse) is a visible mismatch.

Blend the avatar lighting profile in step with the backdrop dissolve. This makes per-plate lighting profiles non-optional — they now have two use cases.

**F4 — "previous location" is undefined in two ordinary paths.** First arrival at Threshold Dunes has no previous location. And worldbuilding §1.4's "Direct seeker" mode lets visitors jump straight from the map, where the previous location is either absent or spatially unrelated — showing that plate behind the explorer would misrepresent the world's geography.

Define it as *the last location actually traversed from*, cleared on direct jumps and first entry. Where undefined, disable look-back and reflect it in the control state and its accessible name. §6 already requires the disable; this defines when.

## 5. Two smaller ones

**F5 — zoom.** §14 specifies 80/100/125/150%. My v1 spec used 200% from WCAG. Both stay, serving different purposes: 80–150% for immersive camera framing, 200% for HTML content reflow under WCAG 2.2 AA. Immersive is opt-in with a Static View fallback, so 200% need not hold camera composition — but the HTML must still reflow and the mode switch must stay reachable.

**F6 — the envelope is per-character.** §2 forbids normalising character heights. Camera distance must therefore be calibrated per selected character; a taller or broader-silhouette character occupies more frame at identical distance. Design it in now rather than discovering it when the second character is integrated. §14 requires testing across character heights and garment silhouettes.

## 6. Verification spec v2 is ready

`data/camera-framing-verification-spec.md` — 30 invariants across framing, look-back, animation and LOD; test matrix; instrumentation contract.

The telemetry record in §1 is what I need from you. It largely formalises what §14 already requires you to instrument (triangles, draw calls, textures, geometries, frame time, memory, cancellation failures). Two hard requirements:

- `avatarBounds` from the **animated pose including cloth, hair, props and accessories** — §2 explicitly forbids computing framing from the armature root or body mesh alone.
- Bounds projected against the **visual viewport**, not the layout viewport.

Plus an `InputLatencyEvent` stream, because **INV-16 is the one I would most expect to erode quietly**: §5, §9 and §10 all require that the interface never waits on animation — not for clicks, route changes, focus, opening a project or submitting a form. I will correlate response latency against animation state; any correlation is a finding.

If a field is impractical, tell me and I will adapt the assertions rather than have you carry fields you cannot honestly produce.

## 7. Worth protecting in §12

The LOD construction rules are good and easy to erode under time pressure: manual retopology for LOD 0 and 1, decimation only as a starting point for lower tiers, and the explicit removal order — micro-charms first, embroidery second, secondary tassels third, identity-defining silhouette never first. That ordering is what keeps representation intact under simplification, and it is exactly what gets skipped when someone reaches for automatic decimation. I will check silhouette recognisability across tiers per §14.

Nothing here blocks Release 1.
