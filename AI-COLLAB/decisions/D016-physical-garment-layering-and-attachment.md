# D016 - Physical garment layering and attachment

**Date:** 2026-07-31
**Owner:** Codex
**Status:** Adopted
**Applies to:** Every immersive character

## Correction

Layer-by-layer production means physical dressing order as well as cloth
simulation order.

No outer garment, belt, pouch, jewellery item, footwear fitting or decorative
element may be positioned against the naked body when an accepted garment is
physically between that item and the body. Every layer is fitted to the actual
accepted surface beneath it.

This corrects the earlier pilot behavior that allowed outer cloth and rigid
accessories to retain body-space positions after garment silhouettes changed,
creating floating or intersecting elements.

## Required dependency graph

Each character has an explicit directed layer and attachment graph.

1. Anatomical body and conservative collision proxy.
2. Foundation garments:
   - shirt, blouse, bodice, dress or long base garment;
   - trousers, skirt, leggings or other lower-body foundation;
   - sleeves drafted to the required coverage.
3. Mid-layer textiles such as tunics, robes, vests and sashes.
4. Hanging textile pieces such as tabards, aprons and waist panels.
5. Outer soft garments such as scarves, cowls, mantles, cloaks and shawls.
6. Retaining structures such as belts, harnesses and rigid closures, placed
   only after the layers they physically retain or encircle exist.
7. Attached rigid accessories such as pouches, buckles, medallions, bracers,
   footwear fittings and weapon or power sockets.
8. Surface-resting details such as jewellery, cords and necklaces, fitted
   against the topmost chest or neck layer.
9. Garment-owned trim such as fringe, tassels and border hardware, attached to
   the final baked garment edge rather than world space.

The exact order of layers 3 through 6 is reference-specific. A belt may sit
under one outer drape and over another only when the approved design shows that
relationship. That local ordering must be recorded explicitly.

## DN-M-AFR-01 stack

The approved pilot uses this initial physical order:

1. MPFB body and collision proxy.
2. Indigo-grey long-sleeved base tunic.
3. Sand-brown loose trousers, fitted over the accepted tunic where the tunic
   enters or overlaps the waistband.
4. Cream front tabard, attached beneath the waist retaining line.
5. Waist belt fitted around the dressed waist and retaining the tabard.
6. Simplified belt, pouch and hardware collision proxies placed where the
   approved mantle must drape over or around them.
7. Ochre cowl followed by the asymmetric mantle, solved against the accepted
   base garments, belt line and relevant accessory proxies. The long mantle
   tail must overlap the belt where shown by the approved board.
8. Final belt hardware, pouches and the single right-side blue tassel aligned
   to the accepted collision proxies and belt surface.
9. Forearm bracers fitted over the accepted sleeves.
10. Sandal soles and foot straps fitted to the feet, followed by calf wraps over
   the accepted trouser taper.
11. Necklace, cords and medallion settled against the topmost accepted chest
    layer.
12. Mantle, tabard and accessory fringe or border trim attached to their final
    baked edges.

## Binding DN-M-AFR-01 dependency DAG

Dependency order and visual occlusion order are related but are not the same
thing. `A -> B` below means that `B` may not be authored or accepted until
`A` is accepted. It does not mean that `B` must be visible in front of `A` at
every point.

```text
00-body
`-- 10-base-tunic-sleeves-and-skirt
    `-- 11-base-trousers

11
`-- 20-front-tabard

10 + 11 + 20
`-- 30-fitted-waist-belt
    |-- 31-belt-collision-proxy
    |-- 32-right-pouch-collision-proxy
    `-- 33-left-pouch-collision-proxy

accepted base stack + 30 + relevant proxies
`-- 40-cowl
    `-- 50-asymmetric-mantle
        `-- 60-final-belt-hardware-and-pouches

60 + 30-primary-belt
`-- 63-single-right-blue-tassel

60 + 63 + 10-sleeves
`-- 64-left-and-right-bracers

64 + 00-body-feet
`-- 70-sandal-soles

70 + 00-body-feet
`-- 71-foot-straps

71 + 11-trouser-taper
`-- 72-calf-wraps

72 + 10-tunic + 40-cowl + 50-mantle
`-- 74-three-strand-necklace-and-disc

74 + 20-tabard / 50-mantle / 63-tassel
`-- 80-owner-specific-fringe-border-and-tassel-trim
```

`dependsOn` records this authoring DAG. `collisionTargets` contains only the
accepted surfaces that can physically support or contact the active cloth.
For example, the cowl depends on completion of the lower stack but normally
collides only with the body, tunic and named shoulder or neck support surfaces.
The mantle additionally targets the cowl, tabard, belt and relevant pouch
proxies wherever its approved drape reaches them. An unrelated lower object may
not be added merely to make a broad collision collection appear complete.

## Binding local occlusion rules

- The body is beneath the tunic and trousers.
- The tabard is in front of the foundation garments. Its entire upper edge is
  hidden and retained by the fitted belt.
- The cowl is over the tunic. The mantle is over the cowl where they cross.
- The long mantle tail is outside the tabard and belt wherever the approved
  board shows their overlap. The belt remains visible elsewhere.
- Final pouches occupy the volumes represented by their accepted proxies. A
  later creation step may not force a pouch visually in front of mantle cloth
  that was authored to cover or wrap around that proxy.
- Bracers are outside the accepted sleeves, never fitted to naked forearms.
- Foot straps are outside the feet and attached to the soles. Calf wraps are
  outside the accepted trouser taper.
- Necklace strands and the disc are outside the piecewise topmost chest
  surface, which may change between tunic, cowl and mantle along one strand.
- Fringe, borders and tassel strands are outside and bound to their owning
  final garment or accessory edge.
- The back view contains no tabard panel. It shows the base garments, belt and
  pouches, cowl and outer triangular mantle in that local order.

## Simulation and authoring rule

After a cloth layer passes its seam, collision, silhouette and topology gates,
its baked cleaned mesh is added to the collision collection for the next soft
layer. Active cloth may never collide with itself through an incorrectly broad
collection, and an upper layer may not be solved against a future accessory.

Rigid accessories are placed only after all surfaces they depend on are
accepted. Attachment transforms use a named target surface, socket, raycast or
nearest-surface result. Hardcoded naked-body offsets are not an acceptable
final placement method.

## Gates

- Every garment and accessory declares `layerId`, `dependsOn` and either
  `collisionTargets` or `attachmentTarget`.
- The base garment set must pass before any outer garment proof is rendered.
- Every upper cloth layer records clearance against the body and all accepted
  lower layers.
- Every rigid or surface-resting accessory records minimum and maximum contact
  gap against its declared target.
- No item may float, penetrate, z-fight or change physical order in front,
  profile, back or three-quarter review.
- Layer order is retested in neutral stance, walking, turning, pointing,
  jumping, landing and representative power poses.
- A visual proof that omits the base garments cannot pass even if its outer
  silhouette appears plausible.

All distance gates are measured on evaluated meshes after modifiers,
armature deformation and the current test pose. Contact tests sample the full
declared support or attachment mask. A single nearest vertex is not evidence
of fit. `p05` and `p95` below are the fifth and ninety-fifth percentiles of the
signed surface-gap samples in that mask.

Universal hard limits are:

- static cloth penetration no deeper than 2 mm;
- static rigid or surface-resting penetration no deeper than 1 mm;
- dynamic cloth penetration no deeper than 3 mm and never for more than two
  consecutive sampled frames;
- no connected penetration patch larger than 25 square millimetres may be
  deeper than 1 mm;
- attachment or socket roots remain within 2 mm of their named target; and
- cleaned seams and welded or barycentric trim roots remain within 0.5 mm.

| Item | Binding contact and float gate |
| --- | --- |
| Base tunic | Body gap across torso and arms: `p05 >= 2 mm`, `p95 <= 20 mm`; continuous wrist coverage; no connected support-zone float longer than 25 mm. |
| Base trousers | D019 controls the DN-M-AFR-01 construction, region-aware ease and fail-closed visual gate. Waistband support retains `p95 <= 12 mm`; ankle taper retains `p95 <= 10 mm`. The former whole-leg `3 to 35 mm` band is withdrawn and may not approve any loose trouser. |
| Tabard | Upper 20 mm attachment strip `p95 <= 3 mm`, maximum 5 mm; the belt captures the complete top edge by at least 10 mm; no rear-tabard faces. |
| Belt | Inward surface to the dressed waist `p95 <= 3 mm`, maximum 5 mm; no more than 1 mm penetration; the tabard top is fully hidden and retained. |
| Belt and pouch proxies | Back or anchor surface to the belt `p95 <= 3 mm`, maximum 5 mm; final garment-facing surface differs from its proxy by no more than 5 mm one-sided Hausdorff distance. |
| Cowl | Neck and shoulder support gap from 2 to 8 mm at `p95`, maximum 12 mm; authored target pins within 3 mm; pre-weld seam gap at most 3 mm and cleaned seam gap at most 0.5 mm. |
| Mantle | Yoke support gap from 2 to 8 mm at `p95`, maximum 12 mm; belt or pouch-proxy clearance from 2 to 10 mm at `p95`, maximum 15 mm; left-shoulder root within 3 mm; mantle sits 2 to 8 mm outside the belt in the approved overlap mask with zero wrong-order samples. |
| Final pouches and hardware | Named belt or proxy anchor within 2 mm; proxy parity within 5 mm; no mantle penetration or local order reversal. |
| Bracers | Inner surface to sleeve `p95 <= 3 mm`, maximum 5 mm; sleeve protrusion through the exterior no deeper than 1 mm. |
| Sandal soles | Bottom-to-ground gap from 0 to 1 mm and no more than 0.5 mm below ground; plantar foot to insole `p95 <= 3 mm`, maximum 5 mm. |
| Foot straps | Foot or sole gap `p95 <= 3 mm`, maximum 5 mm; strap root to sole within 1 mm. |
| Calf wraps | Accepted trouser-taper gap `p95 <= 3 mm`, maximum 5 mm; penetration no deeper than 1 mm. |
| Right blue tassel | Exactly one instance on the anatomical right; primary-belt socket root within 2 mm; no world-space or pelvis-only attachment. |
| Necklace | Three strand anchors within 2 mm; resting samples `p95 <= 5 mm`, maximum 8 mm; pendant back gap from 1 to 5 mm; no strand run longer than 20 mm may remain more than 8 mm off its target. |
| Trim | Every root is welded or barycentrically bound to a named final baked edge; maximum root gap 0.5 mm; no ownerless world-space trim. |

The cowl and mantle also retain D014's reference-supported target of 20 to
35 mm major-fold depth and 30 to 47 mm spacing.

## Minimum evidence matrix

The neutral 28-degree A-pose proof contains these four views:

1. front at 0 degrees;
2. anatomical-right true profile at 90 degrees, exposing the required right
   tassel, pouch and fore-aft stack;
3. back at 180 degrees, proving the rear mantle and absence of a rear tabard;
4. anatomical-left front three-quarter at -45 degrees, exposing the mantle's
   left-shoulder origin and mantle, belt and tabard relationship.

| Pose | Minimum review views |
| --- | --- |
| Neutral A-pose | Front, profile, back and three-quarter |
| Maximum-stride walk | Profile and three-quarter |
| Turn with at least 45 degrees of pelvis-to-chest separation | Front, back and three-quarter |
| Pointing or raised arm | Front and three-quarter |
| Jump apex | Front and profile |
| Maximum-compression landing | Front, profile and three-quarter |
| Representative maximum-excursion power pose | Front, profile, back and three-quarter |

Numeric gates run over every item in every listed pose, even when fewer views
are rendered. If a required asymmetric item is hidden in the selected profile
or three-quarter view, the opposite-side angle is mandatory; correctness may
not be inferred from an occluded item.

## Recovery

Because each accepted layer is saved as an immutable authoring checkpoint, a
failed upper layer is rebuilt from the latest accepted lower-layer stack.
Lower garments are not resimulated unless their own geometry or fit changes.
