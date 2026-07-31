# A006 - Blender 5.2 sewn-cloth canary

**Date:** 2026-07-31
**Owner:** Codex
**Status:** Passed twice with identical metrics and pixels

## Purpose

Verify the exact Blender 5.2 APIs and production ordering required by D014
before relying on them inside the DN-M-AFR-01 character builder.

The standalone canary is `tools/blender/sewn_cloth_canary.py`. Generated
artifacts remain outside the repository under `C:\tmp`.

## Verified result

Two independent Blender 5.2.0 LTS runs produced identical numeric metrics and
zero differing decoded pixels across the 518,400-pixel review render.

- two quad pattern pieces
- 570 source vertices
- 504 source quads
- 38 loose sewing edges
- four shoulder pins and four waist pins
- one elliptical collision mannequin
- deterministic 48-frame point-cache bake
- cloth modifier applied before Solidify

The staged mean seam span reduced from 171.6 mm to 0.680 mm. The maximum
pre-weld gap was 3.745 mm, a 99.604 percent closure. Pins did not move and the
normalized minimum mannequin radius was 1.0318, so no deep penetration was
detected.

The seam cleanup reduced 570 vertices to 532. Solidify then produced 1,064
evaluated vertices.

## Blender 5.2 API findings

- `bpy.ops.ptcache.bake` must run inside
  `bpy.context.temp_override(point_cache=cloth.point_cache)`.
- The bake is accepted only when the operator returns `FINISHED` and
  `point_cache.is_baked` is true.
- The scene must be evaluated at the selected bake frame before
  `bpy.ops.object.modifier_apply`.
- The cloth modifier is applied before adding Solidify.
- Fully flat front and back pieces with a 780 mm seam span plateaued at 54 to
  70 mm mean gaps even when sewing force increased to 35 through 100.
- Shallow pre-wrapping around the collision mannequin is therefore a required
  staging technique. Sewing force may not be used to compensate for implausible
  starting geometry.

## Canary settings

- one Blender thread
- 24 frames per second
- frame range 1 through 48
- gravity -9.81 m/s²
- cloth quality 8
- mass 0.30 kg
- time scale 0.78
- air damping 3
- tension and compression stiffness 20
- shear stiffness 14
- bending stiffness 0.45
- sewing force 20
- collision distance 0.007 m
- collision quality 6
- collider outer thickness 0.012 m
- collider inner thickness 0.006 m

These are a verified starting profile, not universal constants. Production
garments may change them only with recorded seam, collision and convergence
evidence.

## Production gate consequence

Every garment solve must record:

- initial and final seam-gap statistics before any weld;
- pin movement;
- collision penetration or minimum normalized body radius;
- bake completion and selected frame;
- topology counts before and after cleanup;
- proof that cloth was applied before thickness;
- deterministic replay or an explicit reason when a solve is intentionally
  non-identical.

Cleanup may not hide a failed cloth solve. A garment that exceeds its pre-weld
seam-gap or collision gate is rejected before rendering.
