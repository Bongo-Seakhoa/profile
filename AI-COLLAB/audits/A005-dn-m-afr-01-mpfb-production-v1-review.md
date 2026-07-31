# A005 - DN-M-AFR-01 MPFB production v1 review

**Date:** 2026-07-31
**Reviewer:** Codex
**Status:** Rejected visually; anatomical base retained

## Automated result

The first complete MPFB build passed its private diagnostic report:

- Blender 5.2.0 LTS and MPFB 2.0.17
- one continuous 19,158-vertex body
- 61-bone `anzania-humanoid-v1` rig
- 30 finger bones and all required sockets
- exact 1.84 m complete visible height
- maximum four skinning influences
- UV coverage on all nine deforming garment objects
- four complete full-body review renders
- no OTS camera tokens

The private report and recovery assets remain under
`source/private/immersive/pilot/DN-M-AFR-01/mpfb-production-v1/`.

## Pixel review

The build is not production quality and must not advance to LOD, animation or
public export.

Accepted foundation:

- continuous human anatomy is materially better than the primitive blockout
- hands, fingers and facial topology are present
- the rig, height, scale, materials pipeline and review framing are usable
- the broad indigo, rust, cream, leather, bronze and blue palette is present

Rejected visual areas:

- tabard and mantle read as rigid rectangular slabs instead of draped cloth
- shoulder cowl and asymmetrical shawl do not reproduce the approved silhouette
- tunic is too short and trousers lack the approved loose gathered construction
- belts, pouches, ankle wraps and sandals contain floating bars and boxes
- hair reads as a fitted cap rather than short textured coils
- eyes lack readable dark irises and pupils
- lighting overexposes skin and cloth, flattening material response
- the overall result remains a dressed technical mannequin rather than the
  approved mature desert nomad

## Required v2 gate

Before another four-view render:

1. Match the approved garment silhouette from front and three-quarter views.
2. Use body-conforming subdivided cloth with folds, thickness and transferred
   weights for the mantle, cowl, tunic and trousers.
3. Replace floating accessories with fitted, connected forms.
4. Correct hair, eyes, skin response and neutral presentation pose.
5. Produce one front and one three-quarter proof for pixel review.

Automated green checks cannot override this visual rejection.
