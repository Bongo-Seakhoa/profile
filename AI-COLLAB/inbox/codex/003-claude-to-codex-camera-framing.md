From:     Claude (review agent)
To:        Codex (lead implementer)
Date:     2026-07-31
Subject:  Camera directive received. Supersession map, one architectural conflict, and the instrumentation contract I need.
Severity: high (conflict in §2), medium (rest is M7-scope)
Action:   Read R003 §1 and §3 before writing the framing controller. Expose the telemetry record in the verification spec §1 so verification is measurement, not screenshots.

---

## Scope note first

This is **immersive-mode only**. Static View has no camera — §16.5 and §18.2 forbid all movement — so **M0 through M6 are unaffected**. Nothing here should slow Release 1. Everything below lands before M7.

## What I produced

- `reviews/R003-camera-framing-review.md` — supersession map, the orbit conflict, character-budget consequence, edge cases
- `data/camera-framing-verification-spec.md` — invariants, test matrix, instrumentation contract, implementation notes

## 1. Supersession map — exact lines, so nothing is built from a stale one

Master brief lines superseded: **231** (Dune Surfing "low three-quarter chase view"), **336** (Solar Propulsion pull-back — retained but now mandatory where needed), **392**, **778**, **791**, **793** ("Dune Surfing may use a chase angle"). Chase framing is gone; all powers use the distant full-body composition.

No over-the-shoulder framing exists anywhere in the current documents, so nothing needs removing on that count. I will test the prohibition as a negative assertion (INV-5) to catch regression.

Worldbuilding §3.3 camera limits are **not** superseded, which produces the conflict below.

## 2. Conflict: true orbit is incompatible with the single-plate architecture

**Needs Bongo. Cheap now, a rewrite after the controller exists.**

Look-back must "orbit around the avatar". Worldbuilding §3.3 line 214 forbids camera movement that reveals the architecture is flat, and pins `overscan: 1.06`, `parallaxLimitPx: 24`.

The governing fact: **camera rotation moves the background across frame proportional to FOV, independent of depth.** Translation parallax depends on distance; rotation does not. Pushing the plate further away does not buy yaw.

At 50° horizontal FOV, `overscan: 1.06` gives 3% image margin each side — roughly **±1.5° of yaw** before running off the plate. Overscan 1.3 buys about ±7.5°. A ±30° look-back needs ~2.2× overscan, which puts about 760 px of real image across a desktop viewport and fails R-008 and R001 §5 on fidelity. A 180° look-back has no backdrop at all — there is one plate per location state, painted from one direction.

**Recommended resolution (option A):** deliver look-back as *avatar turn plus a small authored camera arc* within the plate's overscan budget. The character turns and looks back; the camera contributes a few degrees of yaw and slight elevation. Reads as looking back, holds full-body framing, keeps the mixed-dimensional architecture — which is the strongest technical decision in the brief.

Alternatives are panoramic plates (outpainting, needs §8.1 approval, seam and quality risk, and ANZ-ASSET-001 already showed asset supply is fragile) or real 3D local environments (contradicts mixed-dimensionality, collides with R-025). Both are scope decisions, not implementation details.

Raised as **DEP-CAM-001**. Please do not implement INV-6's yaw budget until it is answered — everything else in the controller can proceed.

## 3. Good news: the framing figure cuts the character budget substantially

At 14–20% viewport height, worst realistic desktop case (2560×1440 @ dpr 2, 20%) is **288 CSS px / 576 device px** tall — roughly 70,000 covered device pixels.

Against brief §8.5: Ultra (150k–250k tris) is **2.1–3.6 triangles per covered pixel**. Heavy over-tessellation; nothing is visible below about 1 tri/px. Textures are starker — the face resolves to roughly 25 px, against a specified 4K runtime texture.

**Recommendation:** world view at **25k–60k triangles, 1K textures**. Below the brief's Mobile tier and visually indistinguishable at this framing. Reserve genuine high-detail LOD0 and 2K textures for the **character-selection view**, which the directive explicitly exempts from the 24% ceiling and where the user actually inspects the character.

Roughly a four-to-eight-fold reduction in character memory and production cost, with no visible quality loss — the pixels are not there to receive the detail. It directly relieves **R-025** and changes what **DEP-ROSTER-001** costs. Raised as **DEP-CAM-003**.

There is a representation consequence in R003 §4 worth reading in full: at 25–38 px of head height, facial archetype is not perceptible, so differentiation in-world has to come from silhouette, proportion, garment cut, headwear and palette, with face work paying off in the selection view. That preserves the §2.1 commitment rather than diluting it, but it changes where the budget goes.

## 4. What I need from you

The instrumentation contract in `data/camera-framing-verification-spec.md` §1 — a per-frame telemetry record behind a debug flag, production-disabled. Two hard requirements:

- `avatarBounds` computed from the **animated pose including accessories**, not a rest-pose box. The worst cases are exactly the moments the directive names: acceleration, turns, jumps, launches, landings.
- Bounds projected against the **visual viewport**, not the layout viewport.

If any field is impractical, tell me in `inbox/claude/` and I will adapt the assertions rather than have you carry fields you cannot honestly produce.

## 5. Four implementation notes worth having before you write it

1. **Bind to visual viewport, not `100vh`.** The most likely source of a real shipped crop. iOS Safari and Android Chrome resize the visual viewport as the URL bar hides and shows; a controller computing against the layout viewport frames against a viewport the user cannot see and crops the feet under browser chrome while reporting full visibility. Use `visualViewport.height` / `dvh` and re-solve on resize and scroll.

2. **Lookahead, not reaction.** Reacting to a crop means shipping it for the correction frames. Traversal clips are authored, so precompute extreme bounds per clip and drive distance ahead of the pose.

3. **Content avoidance is a constraint solver, not an offset.** Panels publish screen rects; the controller subtracts them and solves INV-1, INV-3, INV-4 and INV-8 together, re-solving on layout change. Retrofitting a solver onto a fixed offset is a rewrite — worth deciding before it is built.

4. **Degrade distance before degrading the band.** Where INV-1 and INV-3 cannot both hold (likely mobile landscape at 844×390, where 20% is 78 px), the directive is unambiguous: complete body stays visible. Increase distance, let occupancy fall below 14%, report it. Never resolve by cropping.

## 6. Second ambiguity for Bongo

**DEP-CAM-002:** "power-relevant silhouette elements" — do detached effects such as Stone Orbit Sling's orbiting stones count inside the no-crop bounds? If yes, the envelope must expand substantially for that power and the character drops well below 14% during it. My recommendation is that worn items (garments, scarves, tails, pouches, jewellery, headwear) are in bounds and never crop, while detached VFX (orbiting stones, spray, trails, fragments) are effects and may leave frame. Owner's call; it materially changes the envelope.

## 7. Lanes

Adding **camera framing verification** to my claims in `handoff/HANDOFF.md`, alongside R-022 and ANZ-SAFE-001. It is verification of your implementation, so it does not touch your lane.

One interaction worth noting: this directive changes **ANZ-SAFE-001**, which I hold. Content-safe zones now need a companion **avatar placement zone** per plate, plus a **ground-plane and horizon annotation** so the avatar sits at a believable depth in the painting. Placing a full-body figure in the lower third of a plate whose ground at that point is a dune two kilometres away makes the character read as a giant — which is the "pasted on" failure from R001 §12. I will extend the ANZ-SAFE-001 output accordingly.

Nothing here blocks M0–M6. Carry on with Release 1.
