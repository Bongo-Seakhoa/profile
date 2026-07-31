# D019 - DN-M-AFR-01 loose-trouser construction and acceptance

**Date:** 2026-07-31
**Owner:** Codex
**Status:** Adopted for peer review before geometry resumes
**Applies to:** `DN-M-AFR-01` base trousers and their control or donor studies

## Decision

The v28 `3 to 35 mm` thigh-and-calf gap band is withdrawn as an acceptance
criterion. It describes a close-fitting garment and allowed tight leggings to
receive a machine pass. It must not be copied to another character or garment
family.

The required garment is a pair of sand-brown, loose woven trousers with a
constructed waist, a believable front and back rise, relaxed volume through
the seat and legs, and narrow gathered ankles. Machine measurements may reject
a candidate, but they may not approve its silhouette without the complete
visual evidence and reviewer decisions defined here.

## Canonical evidence

The controlling reference set is:

1. `Desert_Nomad_Canonical_Reference_Bible.pdf`, DN-M-AFR-01 pages 1 to 4;
2. the owner-approved `orthographic-review-v2.png` reconstruction recorded in
   A003 and D010;
3. D014's sewn-cloth workflow;
4. D016's physical dressing order; and
5. D017's evaluated-visible-surface measurement contract.

The canonical written decisions require:

- `sand-brown loose trousers with narrow ankle gathers`;
- a long-sleeved under-tunic before trousers in the local layer order;
- trousers as a separate production group;
- medium-weight woven secondary cloth with controlled fold memory;
- wrapped footwear over the accepted ankle taper; and
- a final silhouette that remains readable at navigation scale.

The canonical A-pose drawings are blockouts, not precision garment
orthographics. Their straight diagram legs do not cancel the written `loose`
and `narrow ankle gathers` requirements. The owner-approved v2 reconstruction
is the visual silhouette anchor, but it is not a source of invented millimetre
measurements where upper trousers are hidden by the tunic, tabard or mantle.

## Corrected local dressing order

For this character, the foundation stack is sequential:

```text
00 anatomical body and conservative collision proxy
`-- 10 accepted indigo-grey long-sleeved base tunic
    `-- 11 accepted sand-brown loose trousers
        `-- 20 front tabard and every later layer in D016
```

The trousers collide with the body over the legs and with the accepted tunic
where the tunic enters or overlaps the waistband. A naked-body trouser study
may be retained only as rejected diagnostic evidence. It cannot become the
accepted collider for the tabard, belt, footwear wraps or any later layer.

## Required construction

The finished trousers must contain identifiable construction for all of the
following:

1. A separate, continuous waistband pattern piece or an equivalently modelled
   double-layer band with finished top and lower edges. A raw open mesh edge is
   not a waistband.
2. Mirrored leg assemblies with named front rise, back rise, inseam and
   outseam paths.
3. Either a sewn crotch gusset or a genuinely curved front and back rise that
   creates seated depth without a narrow V-shaped cavity.
4. Deliberate pattern ease through the seat, upper thigh, knee and upper calf.
5. Narrow ankle cuffs or gather channels with cloth volume feeding into them.
6. Finished seam, cuff and waistband edges before thickness and weight
   transfer.

Soft trouser parts follow D014. Rigid fasteners, if any are later approved,
remain conventionally modelled. A donor may supply lawful topology, but its
source waistband, texture, material and silhouette are not presumed correct.

## Measurement model

All geometry measurements use the evaluated visible garment and evaluated
accepted lower surfaces at the same frame and transform, as required by D017.
The report must retain the prior safety, seam and topology measurements and add
the following region-aware measurements:

| Region | Required evidence |
| --- | --- |
| Waistband | Finished band height, closed-loop continuity, support-mask gap against the body or accepted tunic, and top-edge plus lower-edge length |
| Rise and seat | Front-rise length, back-rise length, lowest suspended crotch point, sagittal depth, and signed clearance heat map |
| Each leg | Garment and body cross-section perimeter, area, lateral width and fore-aft depth at upper thigh, mid-thigh, knee, upper calf and pre-cuff landmarks |
| Taper and gathers | Pre-cuff circumference, cuff circumference, reduction ratio, fold count and fold-depth distribution |
| Silhouette | Body-normalised front and profile widths at the same landmarks plus a contour-tracking score that detects copying of quadriceps, knee and calf anatomy |
| Dynamics | The same measurements at neutral, maximum stride, turn, point, jump apex, landing compression and representative power excursion |

Aggregate nearest-surface clearance alone is forbidden as an ease metric. A
loose garment contains intentional support and contact regions alongside large
free volumes, so one whole-garment percentile can misclassify both leggings and
floating cloth.

## Binding hard limits

The following limits remain active while the new silhouette bands are
calibrated:

- static cloth penetration is no deeper than 2 mm;
- dynamic cloth penetration is no deeper than 3 mm and never lasts more than
  two consecutive sampled frames;
- no connected penetration patch larger than 25 square millimetres is deeper
  than 1 mm;
- cleaned seams remain within 0.5 mm;
- the waistband support mask retains `p95 <= 12 mm` without a floating run
  longer than 25 mm;
- the cuff-to-wrap target retains `p95 <= 10 mm`; and
- topology, UV, weight, normal, degeneracy and overlap gates remain fail-closed.

These are collision, support and structural limits. They are not proof that
the trousers are loose enough.

## Reference calibration and fail-closed acceptance

No numeric ease or volume band is adopted from memory, garment terminology or
a donor thumbnail. Calibration uses three locked controls under one camera,
lighting, material and pose setup:

1. v28 as the known tight-legging rejection;
2. the owner-approved v2 silhouette as the visible-shape target; and
3. the quarantined CC0 `toigo_harem_pants` only as a lawful topology and shape
   study after it is fitted to the accepted lower stack.

Because the approved reconstruction hides parts of the upper trousers, only
visible trouser zones may produce direct silhouette bands. Hidden zones use
construction logic, cross-section continuity, collision evidence and the
required multi-view human review. A value inferred from an occluded image must
be labelled an estimate and cannot become a hard production threshold.

Until the calibration evidence is reviewed, candidate status is limited to:

```text
candidate-safety-and-topology-gates-passed-visual-pending
```

The statuses `candidate-machine-gates-passed`, `accepted` and
`accepted-sewn-base-garment` are forbidden for the trousers. The builder must
fail closed if a required region, control render, metric, provenance record or
review verdict is absent.

## Visual rejection rules

A candidate is rejected if any required view shows:

- quadriceps, knee or calf anatomy traced as a second skin;
- a pinched, dark or sharply concave front or rear crotch;
- a raw, flat or paper-thin upper edge instead of a waistband;
- a straight tube entering the ankle without gathered volume;
- identical smooth inflation with no gravity-led fold hierarchy;
- horizontal banding, moire or a stretched texture that disguises fit;
- an unsupported floating waist, seat or cuff;
- left-right asymmetry not caused by the approved pose or cloth response; or
- any omission of the accepted tunic beneath the waistband overlap.

Close review uses clay and production-material passes. Delivery-scale review
uses the normal 14 to 20 percent viewport-height camera target. Both must pass.

## Required evidence and reviewer separation

Every candidate includes:

- front, anatomical-right profile, back and anatomical-left three-quarter
  neutral renders;
- waistband and front/rear rise close-ups;
- clay and production-material passes;
- region-labelled heat maps and cross-section plots;
- pattern, seam, pin, collision, cloth, cleanup and weight manifests;
- exact source and result hashes;
- the D016 dynamic pose matrix; and
- an explicit Codex verdict followed by an independent Claude verdict.

Owner review remains the authority for a material change to the approved
silhouette. A donor cannot win because it is easier to fit, has more polygons
or passes a narrower machine gate.

## Recovery and next bounded work

1. Freeze v28 as rejected diagnostic evidence.
2. Run the owner-directed balloon-relaxation canary on a copy of v28. Raise the
   upper pattern to the measured natural waist, correct the rise, add a real
   waistband, close the pressure volume only with named simulation helpers,
   apply gentle cloth pressure, bake the fuller evaluated shape, remove all
   pressure helpers, then run a separate pressure-free gravity settle. This is
   a shape study only and cannot receive an accepted status.
3. Complete and accept the base tunic before a production trouser acceptance
   run. If the canary succeeds visually, reproduce its authored construction
   against that accepted lower stack rather than promoting the naked-body
   study.
4. Implement the region-aware report fields without changing production
   garment geometry.
5. Produce non-accepting authored and donor calibration studies against the
   accepted lower stack.
6. Publish the measured comparison and proposed numeric bands for independent
   review.
7. Only then run the selected trouser construction through cloth, cleanup,
   weighting, dynamics, LOD and browser export gates.

The pressure stage requires a closed simulation volume in Blender 5.2. Any cap
or closure created only for pressure is a named helper, is excluded from
render and export, and is absent from the frozen garment before the gravity
settle. Pressure is not used in the accepted runtime asset. If the canary
inflates the crotch, erases woven folds, creates a sausage-like tube or depends
on a retained cap, it is rejected without weakening the visual rules.

No tabard, mantle, belt, pouch, jewellery or footwear-wrap production work may
begin until the corrected foundation stack is accepted.
