# R006 — DN-M-AFR-01 MPFB production pilot: independent render verification

**Author:** Claude (independent verifier)
**Date:** 2026-07-31
**Requested by:** `inbox/claude/010` — *"Verify that the first production render is materially beyond the old blockout before accepting any export evidence."*
**Reviewed:** D012, D013, `mpfb-production-v1` build report and all four review renders, against the v1 blockout renders
**Method:** direct pixel comparison of rendered output, read against the build report's own metrics. Codex's telemetry was not accepted on its own terms.

---

## 0. Answer to the question asked

**Materially beyond the old blockout: yes, unambiguously.** The v1 blockout is boxes and cylinders with a cone for a tabard. The v2 MPFB result is a continuous anatomical human with a real head, hair, hands with individual fingers, and feet with toes. There is no honest reading in which these are comparable. The owner's rejection of v1 was right and the change of approach in D012 was the correct response.

**Ready to accept as export evidence: no.** Three of the requirements it is meant to satisfy are not met in the pixels, and the build report cannot see that — its validation flags test structure, not appearance.

Recommendation: treat `mpfb-production-v1` as an accepted **base and rig milestone**, and hold garment, coverage and packaging approval to a v2 pass.

---

## 1. F1 — The garments still read as paper panels, which is what D012 exists to prevent

**Severity: high. Blocks acceptance as export evidence.**

D012 states the reason for the whole approach change: *"its disconnected primitives, rigid one-bone weights and paper-like garment panels cannot reproduce the approved silhouette at production quality."* It then requires *"Tabard and mantle use subdivided quad construction, explicit UVs, real thickness and transferred deformation weights"* and warns that *"Subdivision cannot be used to disguise unsupported single-polygon panels."*

In the rendered output the tabard and mantle still read as flat, rigid sheets:

- The front view shows the tabard as a hard-edged triangular plane standing off the chest, not a garment hanging on a body.
- The profile view shows tabard and mantle as two thin boards on either side of the torso, parallel to each other, with no wrap around the ribcage.
- Edges are dead straight with no visible thickness at the silhouette.
- Nothing responds to the shoulder or the chest volume beneath it.

The body underneath is genuinely continuous and correct. The cloth is not. This is the same class of failure D012 was written to eliminate, carried forward into the new base.

## 2. F2 — Validation flags certify structure, not appearance

**Severity: high. This is the reason the report cannot answer your question.**

`allRequiredFlagsPass: true`, with sixteen flags including `coiledHair`, `openToeWraps`, `pbrTextureTriplets` and `allGarmentsUvMapped`.

Every one of those is a structural assertion — an object exists, a UV set is present, a texture triplet is bound. None can distinguish "hair asset is loaded" from "reads as coiled hair". In the renders:

| Flag | What the pixels show |
| --- | --- |
| `coiledHair: true` | Reads as a flat cap, especially in profile. No coil structure at silhouette. |
| `openToeWraps: true` | Reads as three or four stacked floating hoops at the ankle, not wraps on a foot. |
| `allGarmentsUvMapped: true` | True, and irrelevant to whether the garment reads as cloth. |
| `pbrTextureTriplets: true` | Materials are bound; surfaces still read as flat untextured plastic at this render scale. |

You asked me specifically not to accept controller telemetry without checking pixels. Applying that same standard here: **the flags are accurate and the conclusion they imply is not.**

**Recommendation:** rename these to structural terms — `hairAssetBound`, `toeWrapGeometryPresent`, `garmentUvPresent` — so no reader mistakes them for visual approval, and keep visual sign-off explicitly with the owner. A flag named `coiledHair` passing while the render shows a cap is how a project talks itself into shipping.

## 3. F3 — Clothing coverage is below a LOCKED requirement

**Severity: high. Owner decision, not implementer judgement.**

Master brief §2.3 is a locked creative decision:

> The African-inspired male must remain fully clothed. His torso and chest must be covered by layered robes, wraps, tunics or scarves in the same design spirit and coverage level as the other characters.

In the render:

- Arms are bare skin from shoulder to wrist, in all four views.
- The torso layer is skin-tight and dark, reading closer to body paint than to a tunic.
- Actual fabric coverage comes from two flat panels front and back.
- Legs are bare from mid-calf down.

Against the concept lineup posters, where the African-inspired male wears heavy layered robes, this is materially less coverage than the other characters — which is the specific comparison §2.3 makes.

This is not a bug to fix silently. §2.3 is locked, so either the build moves toward the concept coverage, or the owner explicitly revises §2.3. Flagging rather than assuming.

## 4. F4 — Draw-call budget is far outside D005 and Addendum §13

**Severity: medium. No packaging step exists yet to close it.**

From the build report's own metrics: `accessoryObjects: 35`, `garmentObjects: 9`, plus body, hair and eyes — **46+ separate objects**.

Addendum §13 ceilings: **LOD0 ≤ 12 draw calls, LOD1 ≤ 10, LOD2 ≤ 7, LOD3 ≤ 5.** Also §13: *"Do not create more than three independent dangling accessory groups for a normal navigation avatar."*

D012 correctly requires that *"Each LOD remains independently measurable against the D011 triangle, draw-call and texture-edge budgets"* — but no merge, atlas or LOD-authoring stage exists in the pipeline yet. At 46 objects the pilot is roughly 4× over the LOD1 ceiling before any runtime work begins.

Not a defect in an authoring source. It is a defect if this object count reaches a runtime package, and there is currently no gate that would catch it.

## 5. F5 — Polygons are being reported where the budgets are in triangles

**Severity: medium. Risks a silent 2× budget error.**

The report gives `bodyPolygons: 18486`, `bodyVertices: 19158`, on an object named `DN-M-AFR-01_Body_LOD0`.

MPFB base topology is quad-dominant, so 18,486 polygons is approximately **37,000 triangles** for the body alone. Every budget in Addendum §11 is expressed in triangles: LOD1 is 28,000–42,000 **total**, LOD0 is 55,000–75,000.

So the body by itself roughly exhausts the LOD1 allowance before garments, hair, eyes and 35 accessories are counted — while being labelled LOD0, whose budget it does not obviously exceed. Reading polygons as triangles would make this look comfortable when it is not.

**Recommendation:** report `triangles` explicitly and separately from `polygons`, and validate the sum across every visible object, not the body alone.

## 6. F6 — Pose is a default rest pose, not an authored A-pose

**Severity: low, but it compounds later.**

Brief §8.4 requires a *"Neutral A-pose for source and export."* The renders show arms held straight out near horizontal with fingers splayed wide — the MPFB default. Splayed fingers bake awkward deformation into every retargeted clip and make the shared-locomotion retargeting in INV-32 harder to evaluate.

Cheap to fix now, expensive after clips are authored against it.

## 7. Smaller observations

- `diagnostics/DN-M-AFR-01-FAILED-RECOVERY.blend` (2.4 MB) sits beside the build report with no explanation in it. Worth a line in the report saying what failed and whether the recovery path was used, otherwise it reads as an unexplained failure artefact next to a report claiming all stages passed.
- The report I first read recorded `skipRenders: true` and `renders: skipped`; it was rewritten minutes later to `renders: passed — Four complete full-body review renders written`. Both states are legitimate in sequence, but a report that mutates in place cannot serve as an audit record. Consider writing per-run reports with a run id.
- v1 blockout produced front/back/profile; v2 produces front/back/profile/threequarter. Good, and worth keeping the same four views for every future comparison.

## 8. What is genuinely right

- **The base change is correct and correctly reasoned.** D012's diagnosis of the primitive builder is accurate, and moving to a continuous skinned base was the right call rather than iterating on primitives.
- **Continuous single-component body** — `visibleTopologyComponents: 1`, confirmed in the render silhouette.
- **Finger rig present**, 61 bones, which is what makes the pointing and hourglass gestures in the Animation Addendum authorable at all.
- **`maxFourWeights: true`** — matches brief §8.4 and Addendum §13.
- **Licensing handled carefully.** D012 separates CC0 graphical assets from GPL program code and keeps the MPFB installation out of the public portfolio. That is the right instinct and easy to get wrong.
- **`forbiddenOTSTokens: []`** and `noOTS: true` — the camera contract is being carried into character tooling.
- **D012's release boundary is correct**: private authoring sources, public GLB only after export, re-import, metadata, containment, performance and visual approval.

## 9. Verdict

| Question | Answer |
| --- | --- |
| Materially beyond the v1 blockout? | **Yes, unambiguously** |
| Meets D012's own garment requirement? | **No** — F1 |
| Meets locked coverage requirement §2.3? | **No** — F3, owner decision needed |
| Within runtime draw-call budget? | **No** — F4, ~4× over LOD1 |
| Can the build report certify visual quality? | **No** — F2, flags are structural |
| Accept as export evidence? | **Not yet** |

Recommend accepting `mpfb-production-v1` as a **base and rig milestone** — a real and substantial step — and holding export evidence until garments read as cloth, coverage is reconciled against §2.3, and a packaging stage brings object count within budget.
