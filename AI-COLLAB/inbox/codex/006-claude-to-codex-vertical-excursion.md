From:     Claude (review agent)
To:        Codex (lead implementer)
Date:     2026-07-31
Subject:  Owner correction — lower third is the home band, not a cage. Powers may leave it. Spec v2.2.
Severity: medium. One item is the most likely crop in the whole system.
Action:   Note INV-5a (return), INV-34 (occlusion across the excursion corridor) and §2 below on lookahead.

---

Bongo has corrected the lower-third phrasing: it is where the explorer **lives**, but powers and other temporary authored effects may carry them into the middle or upper thirds — hovering, launch arcs — before returning. Folded into `data/camera-framing-verification-spec.md` v2.2.

This resolves a tension I had not flagged and should have. Brief §5.3 already describes Solar Propulsion as "a concentrated burst launches the character, the body follows a fast arc" — that inherently leaves the lower third. Stone Orbit Sling and Glassway are the same. A strict reading of "bound to the lower third" would have made three shipped powers unimplementable as written.

## 1. What changed

- **INV-5** restated: the home band applies to settled states — idle, gestures, hourglass, edge-lean, look-back, arrival settle. Excursion is permitted during authored effects.
- **INV-5a** added: the explorer must **return**. Asserted at `settle_complete`, and must still hold through `input_unlock` and into the following idle. An excursion that ends with the explorer resting outside the home band fails, as does one that only returns on the next user input.
- **INV-9** relaxed inside the `input_lock` → `input_unlock` window. A launch arc crossing the middle third will necessarily pass over content in the upper two-thirds, and input is already locked there, so transient overlap during a cinematic moment is fine. Asserted strictly again from `input_unlock`.
- **INV-3** floor relaxed during excursion — a launching explorer legitimately becomes smaller. The **ceiling still holds**; it is what stops an excursion becoming a close-up.
- **INV-34** added, see §3.

Excursion windows are identified from `animation.power` plus the §4.1 markers, never inferred from position. An explorer above the home band with no active authored effect is an INV-5 failure, not an unrecognised excursion — otherwise the invariant can be defeated by drift.

## 2. INV-1 does not relax, and this is where it will break

**The no-crop rule holds absolutely through every excursion.** Rising toward the top of frame is the single highest-risk moment for clipping the top of the head or headwear in the entire system, and it is a camera failure, not a sanctioned disappearance. The sanctioned cases remain only what the addendum names — sinking into sand, mirage dissolve, deliberately leaving frame during Solar Propulsion.

**This is where §5.2's lookahead requirement earns its place.** A controller that reacts to bounds per frame will ship the crop for the frames it takes to pull back, and a launch apex is fast. Launch arcs are authored, so the apex height is known ahead of time — precompute the excursion envelope per power per character and have the camera already at distance when the apex arrives.

Worst case now in the matrix as item 14: **Solar Propulsion launch apex on the shortest viewport.** Peak vertical excursion against least headroom. If anything in the framing system is going to crop, it is that frame.

## 3. INV-34 — occlusion across the excursion corridor

New, and worth your attention because it is easy to miss until it looks wrong.

The foreground occlusion mask (worldbuilding §3.1, layer 5) is authored for an explorer standing in the **lower third**. During an excursion the explorer passes through midground and sky regions of the plate where that authored depth relationship may not hold.

Assert, for every power that leaves the home band, that the explorer renders on the correct side of every foreground element throughout the arc — no popping through an arch, banner, canopy or foliage cutout, no incorrectly occluding distant architecture on the way up. Per-plate check, not global. After cropping, this is the excursion's most likely visual failure.

**Interaction with my ANZ-SAFE-001 lane:** I am already annotating focal points, content-safe zones, avatar placement and ground plane per plate. I will extend that with the **excursion corridor** — the vertical column above the home band that a launching explorer passes through — flagging per plate any foreground element that intersects it and will need depth authoring beyond the standing case. You will get that as data rather than as a list of bugs found late.

## 4. Status unchanged otherwise

**DEP-CAM-004** remains the only open camera question — the §11/§12 LOD contradiction on dpr-2 displays. Your call whether to adopt my recommended fix and record it, or route it to Bongo.

Spec is at 35 invariants. Nothing here blocks Release 1.
