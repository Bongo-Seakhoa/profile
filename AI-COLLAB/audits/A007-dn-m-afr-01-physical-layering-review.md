# A007 - DN-M-AFR-01 physical layering review

**Date:** 2026-07-31
**Reviewer:** Codex independent review
**Status:** Current builder and physical stack rejected
**Authority:** Owner layering correction, D014, D016 and the D010-approved v2
silhouette

## Scope

This review compares:

- the approved private
  `source/private/immersive/pilot/DN-M-AFR-01/reconstruction/orthographic-review-v2.png`
  silhouette board;
- D014's sewn-cloth authoring workflow;
- D016's binding physical dressing rule;
- `tools/blender/build_dn_m_afr_01_mpfb_production.py`; and
- the v10 and v11 physical-stack smoke diagnostics.

No current asset is accepted by this review. The last complete v8b images
remain rejected visual evidence, while the newer v10 and v11 builds terminate
at the tabard before producing an accepted outer stack.

## Verdict

The current builder has begun to construct the correct lower-to-upper order,
but it does not enforce the owner's central requirement: an accepted base
tunic and trousers must exist before any outer cloth or accessory is fitted.
The current base objects are explicitly provisional and are nevertheless
registered as collision surfaces for the tabard, cowl and mantle.

The physical layer gate therefore fails independently of render quality.
Outer-layer rendering, accessory polishing, LOD work, animation acceptance and
public packaging remain blocked.

## Required dependency and occlusion contract

D016 now contains the canonical dependency DAG, local occlusion rules,
distance thresholds and evidence matrix. The essential order is:

```text
body
-> accepted long-sleeved tunic and accepted loose trousers
-> front tabard
-> fitted retaining belt
-> belt and pouch proxies
-> cowl
-> mantle
-> final belt hardware, pouches and right blue tassel
-> bracers over sleeves
-> sole and foot straps, then calf wraps over trousers
-> necklace on the topmost chest surface
-> trim bound to final baked edges
```

The mantle is authored after the belt and may visually occlude the belt where
its long tail crosses it. Final pouches occupy their earlier proxy volumes;
their later creation does not grant them a global visual-over-mantle order.

## Current builder findings

| Finding | Evidence | Result |
| --- | --- | --- |
| Base acceptance is bypassed | Tunic, trousers and tunic skirt use `provisional-*` gate states, then `register_collider` immediately adds them to the cloth stack. | Hard failure |
| Simulation metadata disagrees with execution | Execution is tabard, cowl, mantle; `simulationLayerOrder` is tabard 4, cowl 2, mantle 3. | Hard metadata failure |
| No fitted retaining belt precedes outer cloth | A hardcoded ellipsoid proxy is created before the cowl and mantle; final belt objects are created later in `build_accessories`. | D016 order failure |
| Belt dependency is incomplete | The proxy depends on tabard and tunic but omits trousers and tunic skirt at the dressed waist. | Dependency failure |
| Required target metadata is absent | The builder contains no `collisionTargets` or `attachmentTarget` declarations. | Hard contract failure |
| Accessories are outside validation | Final accessories receive no `dressingLayerId` or `dependsOn`; `gather_validation` scans only body and garments for dressing layers. | Validation blind spot |
| Bracers are absent | The only forearm rings are tunic-coloured `tunic-cuff` objects. | Canon and layer failure |
| Required garment trim is absent | Existing fringe objects belong only to the blue tassel; mantle and tabard edge trim are not built. | Canon failure |
| Footwear sequence is reversed | Each side builds sole, ankle helix and then forefoot straps. D016 requires sole and foot straps before calf wraps over trousers. | Order failure |
| Surface-resting items are world-space | Necklace paths, disc, tassel and footwear use fixed coordinates or one-bone placement rather than named dressed targets. | Attachment failure |
| Tassel visibly cannot contact its belt | The tassel root is about 95.2 mm from the belt centreline and retains about 82.7 mm of air after belt and cord radii. | Float failure |
| Proxy-to-final pouch parity is not gated | Final pouch half-extents retreat from the proxy by 6.0 mm in X, 9.9 mm in Y and 12.35 mm in Z. | Mantle-float risk |
| Contact evidence is not distributed | `minimumActiveUnsignedClearanceM <= 15 mm` can pass from one near vertex against any collider. | False-positive fit gate |
| Lower-garment penetration is not fully signed | Body and attachment proxies are marked signed-clearance reliable; the accepted-lower-garment path is not. | Collision blind spot |

## Latest run evidence

- v10 failed because the sewn tabard had no contact-relevant body samples.
- v11 failed before cowl construction because the tabard reached 8.557 mm
  last-frame motion against an 8 mm limit and 10.841 mm penetration against an
  8 mm limit.
- v13 was a smoke-only diagnostic after the tabard bake/apply cleanup repair.
  It stopped correctly at the cowl before mantle, accessories or rendering:
  last-frame convergence was 96.187 mm, reliable-collider penetration was
  23.426 mm and the pre-weld seam gap was 269.919 mm.
- There is no accepted current front, profile, back and three-quarter stack.
- The existing 8 mm penetration and 15 mm single-minimum contact limits are
  not the canonical acceptance limits. D016 now uses distributed target-mask
  measurements and tighter static limits.

## Binding gate summary

All evaluated static cloth must remain within 2 mm maximum penetration;
rigid and surface-resting parts remain within 1 mm. Attachments remain within
2 mm of their named target. Distributed contact bands, proxy parity, seams,
folds, ground contact, trim ownership and item-specific thresholds are defined
in D016.

The neutral evidence set is front, anatomical-right profile, back and
anatomical-left front three-quarter. Walking, turning, pointing, jumping,
landing and maximum-excursion power poses use the minimum view matrix in D016,
with numeric checks executed over every item at every pose.

## Blockers and exit

The current pilot remains rejected until all of the following are true:

1. Sewn or otherwise production-valid base tunic, sleeves and trousers pass
   their fit, coverage, topology and collision gates.
2. Tabard, fitted belt and proxies pass in dependency order.
3. Cowl and mantle pass against the accepted lower stack with the approved
   left-shoulder asymmetry and local belt occlusion.
4. Final accessories declare their layer, dependencies and named targets and
   pass distributed contact tests.
5. Bracers, correctly ordered footwear, necklace, tassel and garment-owned
   trim are present and fitted to dressed surfaces.
6. The complete neutral and dynamic evidence matrix passes without float,
   penetration, z-fighting or local order reversal.

Only the latest accepted lower-layer checkpoint may be used to rebuild a
failed upper layer. No rejected smoke run may enter LOD, animation or public
runtime packaging.
