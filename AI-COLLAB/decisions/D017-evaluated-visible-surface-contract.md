# D017 - Evaluated visible surface contract

**Status:** Accepted  
**Date:** 2026-07-31  
**Owner:** Codex  
**Applies to:** Blender cloth, fit, collision, layering, attachment and rendered
acceptance evidence

## Decision

Every physical surface measurement that claims visible fit, clearance,
penetration, contact, occlusion or layer order must use the fully evaluated
visible mesh at the exact evidence frame.

An indexed or raw mesh snapshot may be used only for a task that genuinely
requires original vertex correspondence, such as deform-weight transfer. It
must not be reused as the visible collision or fit surface unless a separate
parity proof establishes that it contains exactly the same visible geometry.

## Required surface states

| Purpose | Authoritative geometry |
| --- | --- |
| Cloth collision and post-bake clearance | Fully evaluated visible lower-layer surface at the bake frame |
| Base and outer garment fit | Fully evaluated visible accepted lower-layer surface at the validation frame |
| Layer-order and attachment validation | Fully evaluated visible source and target surfaces at each sampled pose |
| Browser export silhouette and camera bounds | Exported, skinned, visible runtime meshes plus required accessories and effects |
| Deform-weight correspondence | Original-index snapshot, isolated from all physical surface gates |

## Evidence requirements

Each Blender gate records:

- scene frame;
- object world matrix;
- evaluated visible vertex and face counts;
- evaluated visible world bounds;
- raw vertex and face counts when a raw snapshot is also used;
- signed minimum clearance and maximum penetration;
- unsigned regional ease statistics where applicable;
- the worst sample vertex, nearest surface point and surface polygon; and
- modifier visibility or a stable surface-contract identifier.

If a raw and evaluated surface differ, the report must name the difference and
must not silently substitute one for the other.

## Hidden helper rule

MPFB helper geometry, authoring forms, collision proxies and other non-rendered
surfaces are excluded from visible-fit acceptance unless a decision explicitly
names them as the intended lower-layer collider for a simulation-only stage.
Their use must be declared as authoring evidence and cannot prove final visible
fit.

The MPFB `Hide helpers` mask is therefore part of the accepted visible-surface
state. Disabling it for original-index access must be scoped to that operation
and must never leak into fit or penetration validation.

## Recovery rule

When two gates disagree by more than 1 mm on the same garment and body, stop
acceptance work and capture identical raw and evaluated geometry diagnostics at
every intervening state. Do not change thresholds or pattern geometry until
the surface-state discrepancy is resolved.

## Evidence behind this decision

The v18 sewn-trouser cloth gate measured 0.000945 mm penetration against the
evaluated visible body. The original downstream fit validator disabled all
body modifiers and exposed hidden helper-skirt geometry, reporting an apparent
45.108 mm penetration. A controlled modifier ablation and a five-stage
instrumented rerun proved:

- the `Hide helpers` mask alone accounts for the discrepancy;
- frames 1 and 90 are identical for the tested body and garment;
- seam centroid placement, welding and loose-edge cleanup preserve the visible
  clearance;
- weight transfer preserves the raw garment surface; and
- solidify and subdivision move the evaluated garment surface outward without
  penetration.

The corrected validator retains all D016 thresholds and now rejects the v18
pattern only for its true excessive ease and coverage failures.
