# D014 - Sewn cloth production workflow

**Date:** 2026-07-31
**Owner:** Codex
**Status:** Adopted
**Applies to:** All immersive character garments

## Decision

Soft character clothing will be constructed from clean two-dimensional sewing
patterns, assembled and draped with Blender cloth simulation, baked, cleaned,
weighted and optimized before browser export.

Cloth simulation is an authoring operation, not a website build operation. The
site build assembles approved baked garment assets and never reruns the cloth
solve.

D016 defines the binding physical dressing and attachment order. A cloth layer
is solved against the body plus every accepted lower layer that physically
supports it.

Analytically positioned flat panels are not an acceptable production garment.
The rejected DN-M-AFR-01 v1 through v6 proofs remain evidence of that failure
mode.

Rigid items remain conventionally modeled. This includes belts, buckles,
jewellery, medallions, pouches, rigid trim, sandal soles and footwear fittings.

## Production sequence

1. Create separate quad pattern pieces for the front, back, sleeves, tunic
   skirt, scarf or cowl, mantle and tabard.
2. Match paired seam edges by vertex count and deterministic seam identifiers.
3. Arrange the pieces around the neutral MPFB mannequin without intersections.
4. Configure the MPFB body and all accepted lower garment layers as collision
   surfaces. Use a low-distance body proxy where required for stable solves.
5. Pin only authored attachment areas such as shoulders, neck, cuffs and waist.
6. Sew and simulate one garment layer at a time:
   - base tunic and sleeves
   - base trousers or other required lower-body garment
   - mid-layer textiles required by the approved design
   - tabard and hanging textile details
   - scarf or cowl
   - mantle
   Start with a 90-frame convergence target. Extend the solve only when seam,
   collision or drape measurements prove that the garment is still changing.
7. Use the baked result as the garment source. Remove simulation-only geometry,
   repair topology, resolve intersections and preserve intentional folds.
8. Add controlled thickness, hem treatment, piping, fringe and border details.
9. Transfer skeletal weights from the continuous MPFB body, restrict each
   vertex to four normalized influences and add secondary garment bones only
   where baked deformation testing proves they are needed.
10. Test garments through neutral stance, walking, turning, pointing, jumping,
    landing and representative traversal-power poses.
11. Produce optimized LOD0 through LOD4 garment meshes. Runtime assets use
    skeletal animation and authored secondary motion, not live browser cloth
    simulation.

## Two-stage asset pipeline

The authoring stage produces immutable pattern, seam, pin, collision, cache,
bake and cleaned-mesh checkpoints. Once a garment passes its visual and
deformation gates, its cleaned baked mesh becomes the versioned source asset.

The deterministic production builder then:

- loads the accepted body, rig and baked garment meshes;
- adds approved rigid accessories and authored secondary controls;
- validates weights, geometry budgets, materials and transforms;
- builds LODs and the combined runtime package;
- renders review evidence without resimulating cloth.

Interactive Blender authoring is permitted for panel placement, seam pairing
and pin-group tuning. Every accepted change must still be represented by a
saved source asset and reproducible settings record.

## Layer-specific constraints

- Tunic patterns must wrap the torso and arms without visible body penetration.
- Base shirt, blouse, dress, tunic and lower-body patterns must be accepted
  before outer cloth or accessories are placed.
- The cowl must form irregular neck and shoulder folds without a torus or shelf
  silhouette.
- The mantle must cross the shoulders continuously, produce the approved rear
  triangular drape and preserve the broad front-right tail.
- The tabard begins beneath the belt, hangs from gravity and has no long rear
  plank unless a future approved design explicitly requires one.
- Simulated cloth may not become trapped beneath rigid belts or pouches.
- Collision and pin settings are documented per garment and are reproducible in
  background Blender 5.2.

## Acceptance gates

- Front, profile, back and three-quarter neutral renders match the approved
  character-board silhouette.
- The profile view demonstrates believable wrap around the ribcage and is a
  mandatory gate, not an optional review angle.
- No garment reads as a rigid board, floating plane, straight hanging strip or
  disconnected shell.
- Where the approved reference supports measurement, major cloth folds target
  approximately 20 to 35 mm depth and 30 to 47 mm spacing.
- Seams remain closed and folds remain plausible at character-selection scale.
- No visible clipping in the required locomotion, gesture, jump, landing and
  power-pose test set.
- Soles contact the ground and all footwear straps contact the foot and ankle.
- The combined runtime package meets the locked triangle, texture and draw-call
  budgets.
- The complete silhouette remains readable at the normal immersive camera
  target of approximately 14 to 20 percent of viewport height.
- Review includes a delivery-scale composition in addition to close character
  renders so effort is spent on silhouette and folds that remain visible in
  the final experience.

## Recovery

Every simulation layer is saved as a separate immutable run with pattern,
collision, cache, bake and cleaned-mesh checkpoints. A failed upper layer can
therefore be rebuilt without invalidating accepted lower garments or the MPFB
body and rig.
