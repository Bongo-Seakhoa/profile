# A014: Sirwal gate code-coupling audit

**Date:** 2026-07-31
**Owner:** Codex
**Audit mode:** Read-only source and report inspection
**Status:** Audit complete; gate redesign pending canonical target derivation
**Audited builder SHA-256:**
`D257945550479C510EEA9CFD1FBB58C6C29BC111EDC4FEDCBE9F08918F38ABC6`

## Scope and safety

This audit traces every current trouser acceptance threshold in
`tools/blender/build_dn_m_afr_01_mpfb_production.py`, identifies where each
metric is computed, and maps the minimum code changes needed to replace the
fitted-garment acceptance model with a reference-derived loose-trouser or
sirwal model.

The audit inspected the v28 topology and smoke reports. It did not edit or run
the Blender builder, validator, tests or any Blender scene. Blender PID 21424
is the owner's protected interactive session and remained untouched.

No numeric sirwal target or acceptance range is proposed, inferred, approved
or authorised by this audit. New thresholds must be derived from the approved
canonical reference, recorded with provenance and independently reviewed
before implementation.

## Executive finding

Changing only `looseLegMaskWithin3To35mm` cannot correct the acceptance model.
The fitted-garment assumption is duplicated across four enforcement layers:

1. The v28 bounded cleanup treats body proximity as support and treats
   coherent volume away from the body as floating fit.
2. `validate_base_garment_fit` applies whole-garment and regional proximity
   limits designed for a tailored shell.
3. `build_garments` emits the same absolute-height masks and fitted contact
   contracts onto the trousers.
4. `dressing_stack_validator.py` independently requires and enforces the same
   D016 contract values.

The authored pattern is a fifth, upstream coupling. Its waist is drafted
directly from the body envelope and its leg ease schedule is only 12 mm to
4 mm. A corrected gate will reject that pattern, but it cannot create the
missing sirwal volume, waistband, rise or gathers.

## Audited evidence

The audited builder was:

`tools/blender/build_dn_m_afr_01_mpfb_production.py`

Its SHA-256 remained byte-identical throughout the read-only inspection:

`D257945550479C510EEA9CFD1FBB58C6C29BC111EDC4FEDCBE9F08918F38ABC6`

The principal negative-control report was:

`source/private/immersive/pilot/DN-M-AFR-01/mpfb-production-v28-bounded-cleanup-trousers-smoke-02/diagnostics/DN-M-AFR-01-build-report.json`

Related v28 runs were also inspected:

- `mpfb-production-v28-bounded-cleanup-topology-preflight-01`, which records
  `diagnostic-topology-passed`.
- `mpfb-production-v28-bounded-cleanup-trousers-smoke-01`, which failed because
  its v26 cloth state was not byte-identical to the frozen cleanup reference.
- `mpfb-production-v28-bounded-cleanup-trousers-smoke-02`, which records
  `candidate-machine-gates-passed` while the evidence input also records
  `skipRenders: true`.

## Current threshold inventory

### Shared pattern-topology gates

`create_pattern_object`, lines 1961-2085, is called for trousers at lines
6976-6989. It fails closed on:

- Any sewing edge shorter than 0.0005 m, computed at lines 2006-2017.
- Duplicate seam pairs, missing or face-replaced seam pairs, unexpected loose
  edges, or degenerate seam indices, enforced at lines 2075-2085.
- A maximum virtual seam-vertex degree above two, lines 2042-2046.
- More or fewer than one virtually sewn face component, lines 2047-2051.
- A boundary-loop count other than the trouser call's expected three, lines
  2052-2058 and 6988-6989.
- Boundary-degree anomalies, non-manifold virtual edges or mapped faces that
  collapse under seam union, lines 2059-2069.

These are construction-integrity gates, not silhouette gates. They should
remain fail-closed, although a new waistband or gusset will require the
expected topology contract to be re-derived.

### Shared cloth-solve gates

The shared constants at lines 47-51 are:

| Contract | Existing value | Computation and enforcement |
| --- | ---: | --- |
| Last-frame convergence | At most 0.008 m | Computed at lines 2634-2662; enforced at lines 2827-2832 |
| Pin displacement | At most 0.005 m | Computed at lines 2679-2686; enforced at lines 2833-2837 |
| Reliable-collider penetration | At most 0.008 m | Clearance computed by `measure_clearance_against_colliders`, lines 2112-2273; enforced at lines 2838-2846 |
| Contact relevance radius | 0.050 m | Selects contact samples at lines 2192-2195; this is a sampling boundary rather than an acceptance result |
| Lower-layer contact gap | At most 0.015 m | Computed at lines 2251-2272; enforced at lines 2847-2855 |
| Post-bake seam-pair gap | At most 0.025 m | Computed at lines 2688-2717; enforced at lines 2856-2859 |
| Pre-weld seam-union diameter | At most 0.025 m | Computed at lines 2718-2755; enforced at lines 2860-2865 |

`bake_sewn_cloth`, lines 2476-3005, also rejects a failed point-cache bake,
failed cloth modifier application, invalid seam indices, non-finite vertex
coordinates and coordinates with magnitude above 4 m. Those checks occur at
lines 2626-2630, 2669-2675, 2894-2903 and 2980-2984.

These physical and numerical checks are independent of whether a garment is
fitted or loose. They should not be weakened to admit a sirwal.

### Trouser drafting and preflight gates

`create_sewn_base_trousers`, lines 5736-7382, combines construction inputs and
hard preflight gates.

Shape-driving construction inputs are:

- Cloth contact distance 0.001 m, expected body-collider thickness 0.004 m,
  zero base waist ease and 0.004 m pinned waist ease, lines 5760-5767.
- A yoke drafted from p98 body-ring measurements within fitted clamps, lines
  5771-5821.
- A yoke-endpoint projection target of +0.00025 m, lines 5982-6032.
- A leg regional-ease schedule from 0.012 m at seat and thigh to 0.004 m at
  the ankle, lines 6373-6385.
- A 0.003 m second-panel seam-pattern offset, lines 6529-6539.
- Hard-coded `authoredFoldAmplitudeM=0.005`, line 7319. This is self-asserted
  metadata and is not a geometric fold measurement.

The trouser-specific preflight gates are:

| Gate | Existing threshold | Lines |
| --- | --- | ---: |
| Waist body-ring sampling | At least 40 ring, 10 front and 10 back samples | 5782-5789 |
| Waist ray radius | At least 0.015 m and at most 0.240 m | 5951-5963 |
| Yoke endpoint clearance | At least +0.00025 m after correction | 5982-6032 |
| Leg ring sampling | At least 18 ring, 5 front and 5 back samples | 6335-6371 |
| Leg ray radius | From 0.015 m through 0.180 m | 6442-6458 |
| Upper transition sample count | Exactly 36 | 6789-6835 |
| Upper transition signed clearance | At least 0.003 m | 6789-6835 |
| Upper transition unsigned clearance | At most 0.015 m | 6789-6835 |
| Directional leg evidence | Exactly 18 samples for every side and row | 6838-6850 |
| Initial seam-pair gap | At most 0.025 m | 6913-6974 |
| Initial seam-union diameter | At most 0.025 m | 6933-6974 |
| Authored-yoke sample count | Exactly `7 * 17 * 2` | 7050-7128 |
| Authored-yoke signed clearance | At least -0.000001 m | 7096-7128 |
| Authored-yoke unsigned clearance | At most 0.012 m | 7096-7128 |
| Crotch-bridge sample count | Exactly the authored bridge-key count | 7129-7210 |
| Crotch-bridge signed clearance | At least 0.003 m | 7181-7210 |
| Crotch-bridge unsigned clearance | At most 0.012 m | 7181-7210 |
| Six top-yoke pins | Minimum signed clearance at least 0.003 m | 7211-7260 |
| Body-collider thickness | 0.004 m within 0.000001 m | 7323-7348 |

Several values in this table are safety or sampling checks. Others, especially
the yoke, bridge and leg-body proximity checks, are coupled to the fitted
construction and must be classified carefully during redesign rather than
blindly retained or relaxed.

### Enforcement layer 1: frozen v28 cleanup

`apply_v28_bounded_trouser_post_drape_cleanup`, lines 4092-4962, is bound to a
specific v26 mesh and is not a reusable production garment gate.

It requires:

- Exactly 991 vertices, applied cloth and zero post-weld seam-union diameter,
  lines 4100-4120.
- Byte-identical v26 convergence, pin-displacement and seam metrics from
  `V28_CLOTH_REFERENCE`, lines 124-130 and 4122-4176.
- Exact pattern provenance attributes, lines 4178-4220.
- Exactly 19 waist-tail vertices and the exact eight seed identities from
  `V28_CLEANUP_SEEDS`, lines 135-144 and 4300-4348.

It then pulls selected waist vertices toward a 0.01175 m target, uses a
0.006 m safety floor, caps each correction at 0.008 m and applies one-ring
falloff, lines 4099-4101 and 4350-4407.

The central semantic defect is at lines 4447-4450: support coverage is the
fraction of all 991 vertices whose body distance is within 0.003 m to 0.035 m.
It is not restricted to the current `looseLeg` region. The gate then requires
exactly 100 percent support at line 4722.

The cleanup also treats any waist vertex farther than 0.012 m as residual tail
at lines 4590-4594. A connected residual component is labelled
`coherent-floating-fit` when it has at least four vertices or exceeds 0.050 m
world diameter, lines 4629-4649. Both conditions penalise coherent authored
volume.

All v28 acceptance gates are assembled at lines 4702-4763 and combined with
`all(gates.values())` at lines 4909-4929:

- Byte-identical v26 cloth state.
- Exactly 19 original waist-tail vertices.
- Exact eight cleanup seeds.
- Exactly 34 changed vertices and an exact declared changed set.
- No vertex outside the declared 34 changed and every declared vertex changed.
- Geometry hash changed.
- Maximum displacement at most 0.001192662 m.
- Waist p95 at most 0.0119 m.
- Maximum penetration exactly zero.
- Support coverage exactly 100 percent in the 0.003 m to 0.035 m band.
- Corrected-vertex minimum unsigned clearance at least 0.0059 m.
- Exactly 11 residual waist-tail vertices.
- Zero normal flips, new degenerate faces and new non-adjacent overlaps.
- Maximum relative edge-length change at most 6 percent.
- The original shared reliable-penetration and lower-layer-gap hard gates.
- No coherent residual or untouched residual component.
- Finite face-area and curvature deltas.

A separate waistband or gusset necessarily changes vertex count, panel codes,
seams and provenance. The v28 gate must be retired from the production sirwal
path rather than generalised.

### Enforcement layer 2: whole-garment and regional base fit

`validate_base_garment_fit`, lines 4965-5285, computes nearest-body unsigned
and signed distance at every raw garment vertex, lines 5016-5049.

For trousers, lines 5056-5060 define:

- Lower ease 0.003 m.
- Upper ease 0.035 m.
- Maximum ease 0.055 m.
- Minimum median ease 0.006 m.

Lines 5065-5069 count a vertex as supported only when it lies inside the
0.003 m to 0.035 m band. Lines 5108-5112 classify every vertex beyond
0.035 m as unsupported. The largest connected unsupported patch is therefore
also a fitted-proximity gate.

The regional masks at lines 5137-5163 use absolute height:

- Waist: `z >= 0.88`.
- Loose leg: `0.25 < z < 0.88`.
- Ankle: `z <= 0.25`.

The complete common and fitted gate set at lines 5165-5188 requires:

- Whole-garment p05 at least the lower ease.
- Whole-garment median at least the minimum median ease.
- Whole-garment p95 at most the upper ease.
- Whole-garment maximum at most the maximum ease.
- At least 85 percent distributed support.
- Maximum body penetration at most 0.002 m.
- Largest unsupported connected patch at most 5 percent of vertices.
- Largest penetration connected patch at most 1 percent of vertices.
- Solidify thickness at least 0.006 m.
- p95 minus p05 fit variation at least 0.0025 m.
- The hard-coded authored-fold property at least 0.004 m.
- For each foot anchor, a minimum surface distance at most 0.085 m and at least
  six vertices within 0.100 m.

The trouser regional gates at lines 5189-5199 additionally require:

- Waist p95 at most 0.012 m.
- Loose-leg p05 at least 0.003 m and p95 at most 0.035 m.
- Ankle p95 at most 0.010 m.

Acceptance is again `all(gates.values())`, lines 5251-5278.

### Enforcement layer 3: emitted masks and contact contracts

`build_garments` creates the same absolute-height waist, loose-leg and ankle
vertex groups at lines 7596-7610. It writes these contracts at lines
7611-7637:

| Zone | Existing emitted contract |
| --- | --- |
| `trousers-waist` | p95 at most 0.012 m; maximum gap 0.018 m |
| `trousers-loose-leg` | p05 at least 0.003 m; p95 at most 0.035 m; maximum gap 0.050 m |
| `trousers-ankle-taper` | p95 at most 0.010 m; maximum gap 0.015 m |

The function immediately calls `validate_base_garment_fit` at lines 7638-7643
and grants `accepted-sewn-pattern-cloth` at lines 7644-7650. It registers the
accepted trousers as a collision surface for all later dressing layers at
lines 7664-7665.

### Enforcement layer 4: D016 dressing validator

`tools/blender/dressing_stack_validator.py` independently requires all three
trouser zones at lines 200-206. Its authoritative zone requirements at lines
237-247 duplicate:

- Waist p95 at most 0.012 m.
- Loose-leg p05 at least 0.003 m and p95 at most 0.035 m.
- Ankle p95 at most 0.010 m.

Contract-strength validation at lines 900-935 rejects a builder declaration
that is missing or looser than these requirements. Actual geometry is checked
against the declared contact thresholds in `_contact_gate_failures`, lines
1641-1692. Updating only the builder would therefore make later combined-base
or full-stack validation fail.

The builder contact contract and D016 specification must change atomically.

## v28 negative-control measurements

The passing v28 smoke-02 report records one garment,
`DN-M-AFR-01_Sewn_Sand_Trousers`, and status
`candidate-machine-gates-passed`. Its old gate measurements are:

| Measurement | v28 result |
| --- | ---: |
| Whole-garment p05 | 0.005402176408097148 m |
| Whole-garment median | 0.008555760607123375 m |
| Whole-garment p95 | 0.01717457827180624 m |
| Whole-garment maximum | 0.02678489312529564 m |
| Old distributed-support coverage | 1.0 |
| Loose-leg p05 | 0.006031328765675426 m |
| Loose-leg p95 | 0.01919034216552972 m |
| Waist p95 | 0.01175408624112606 m |
| Ankle p95 | 0.008341696672141552 m |
| Maximum body penetration | 0.0 m |
| Solidify thickness | 0.009999999776482582 m |
| Hard-coded authored-fold value | 0.005 m |

Every old base-fit gate is true. The cleanup changed only 34 of 991 vertices,
with maximum displacement 0.0011926615312695503 m. The cleanup report also
records corrected-vertex minimum unsigned clearance
0.005999975372105837 m, zero penetration, 100 percent old support and maximum
relative edge-length change 0.057370041709336586.

These measurements explain the false machine pass. They prove that the
candidate is consistently close to the body, which is exactly the behaviour
the fitted gate rewards. They do not prove loose volume, a constructed
waistband, a correct rise, distributed gathers or an approved silhouette.

The v28 candidate must become an explicit negative-control fixture for the new
sirwal gate. A correct replacement gate is expected to reject it even though
the legacy evidence remains internally valid.

## Minimal implementation map

All new target values in this map remain pending canonical derivation.

### 1. Add a versioned reference contract

Create a structured sirwal-gate profile outside the builder. It should record:

- Canonical document identity, page or crop identifiers and source hashes.
- Character and body identity.
- Normalised anatomical stations and canonical view definitions.
- Required metric identifiers and threshold directions.
- Derivation method, uncertainty and reviewer decision.
- Gate-profile version and schema version.

The builder must fail closed when the profile, source hash, required metric or
review approval is absent or mismatched. New numeric values must not be added
ad hoc to Python.

### 2. Add pure sirwal geometry metrics

Add an importable geometry module, suggested as
`tools/blender/sirwal_shape_metrics.py`, with no `bpy` dependency. The Blender
builder should pass evaluated garment and body vertices and faces, anatomical
landmarks, component provenance and the reference profile.

The module should compute:

- Cross-sections from triangle-plane intersections at normalised pelvis,
  seat, thigh, knee, calf and ankle stations. Each closed contour should yield
  area, perimeter, frontal width, sagittal depth, garment-to-body ratios and
  independent left and right evidence.
- Canonical front, profile and three-quarter silhouette envelopes sampled by
  normalised leg height and compared to reference envelope ratios.
- A structural waistband contract proving a distinct waistband component and
  seam loop, followed by continuity, position, circumference, height and
  localised body-contact measurements.
- A crotch and rise contract proving a gusset or true curved rise through
  actual components and seam topology. It should measure front and back rise,
  central clearance and volume, cross-section width and area, and local
  concavity sufficient to detect the v28 front and back pinch.
- Geometric gathers based on excess perimeter, distributed curvature and fold
  extrema across multiple stations. The hard-coded fold property cannot count
  as evidence.

Contour and surface statistics must be area or arc-length weighted so that a
donor cannot change its result merely through denser tessellation.

### 3. Split fitted and sirwal validation

Retain common collision, penetration, topology, UV, weight, coverage and
numerical-stability checks. Retain the tailored proximity path for the tunic.
Route trousers through a new `validate_reference_sirwal_fit` path.

For trousers, remove the whole-leg p95, maximum, distributed-support and
unsupported-patch semantics that define distance from the body as failure.
Keep localised waistband and ankle anchoring, but prove leg volume through the
reference cross-section, silhouette and gather metrics.

### 4. Retire v28 from the production path

Remove the production call to `apply_v28_bounded_trouser_post_drape_cleanup`
at lines 7592-7595 when the new path is introduced. Keep the function and
evidence only as a labelled legacy diagnostic or frozen regression fixture
until repository cleanup is separately authorised.

Do not generalise its 991-vertex, byte-hash, seed, changed-set or residual-tail
contracts. A genuine waistband and gusset will invalidate every one of those
identities.

### 5. Replace masks and D016 atomically

Replace absolute world-height masks with regions derived from the armature and
normalised leg length. Update the builder-emitted contact contract and D016
zone requirements in the same change.

Waist and ankle remain local contact zones. The mid-leg zone must stop being a
maximum-nearness contract and instead reference the versioned sirwal shape
evidence. Report serialization at builder lines 9227-9240 should include the
gate-profile hash, station and view completeness, all measured values, every
gate result and the negative-control identity.

### 6. Redesign construction only after the new gate rejects v28

The corrected gate should first demonstrate that it rejects the known v28
false positive. The construction pass can then add a separate waistband,
gusset or true curved rise, reference-shaped leg panels and gathers.

`bake_sewn_cloth` currently applies one shared material profile at lines
2571-2594: tension and compression stiffness 20, shear stiffness 14, bending
stiffness 0.45, and self-collision disabled. Changing these globally risks all
garments. A sirwal should receive a separate woven-trouser cloth profile and
explicit self-intersection evidence after its reference targets are approved.

## Hidden coupling risks

1. **Raw versus evaluated geometry.** `validate_base_garment_fit` samples raw
   `garment.data` while the rendered garment includes Solidify and Subsurf.
   New silhouette and cross-section metrics must state which surface is
   authoritative. Evaluated neutral geometry should drive visible-shape
   evidence while raw geometry retains topology evidence.
2. **Vertex-density bias.** Existing percentiles and patch fractions count
   vertices. Donor and authored meshes can produce different results for the
   same surface merely through tessellation.
3. **Crotch signed-distance ambiguity.** Nearest polygon normals are unreliable
   inside concave crotch gaps. Use a closed-surface, winding or ray-consensus
   method for penetration and contour-based crotch evidence.
4. **Absolute-height masks.** Fixed z boundaries drift after rescaling, posing,
   rig changes, footwear changes or hem changes.
5. **Spoofable fold evidence.** `authoredFoldAmplitudeM` is a hard-coded object
   property rather than a measurement.
6. **Topology cascade.** A waistband or gusset changes piece count, boundary
   loops, panel codes, seam unions, welded vertex count, v28 provenance and
   report schema.
7. **Self-collision.** The current cloth solve disables self-collision. Genuine
   loose folds can intersect even when body-clearance gates pass.
8. **Downstream dressing layers.** Trousers become a collider for the tabard,
   belt, pouches and calf wraps. A larger silhouette changes every subsequent
   fit and collision result.
9. **Contact-budget semantics.** The full-body collider and contact budget are
   appropriate at anchors, but loose mid-leg volume must not be classified as
   missing lower-layer support.
10. **Shared cloth parameters.** Adjusting stiffness or damping in the common
    solver can silently change the tunic, mantle, cowl and tabard.
11. **Reference perspective and occlusion.** Painterly views contain perspective
    and overlap. Target derivation must use explicit canonical views or
    drawings, normalised measurements, recorded uncertainty and source hashes.
12. **Machine versus visual acceptance.** A geometric gate should block known
    false positives, but it cannot replace independent full-view Blender and
    browser visual review.

## Regression-test matrix

| Area | Required fixture or mutation | Expected result |
| --- | --- | --- |
| Known false positive | Frozen v28 candidate or extracted v28 mesh | Fails new cross-section, silhouette, gather and crotch requirements while remaining a valid legacy-machine-pass record |
| Positive control | Canonical-derived sirwal control | Passes every required station, view, structure and physical gate after targets are approved |
| Oversized floating shell | Loose volume with detached waist or ankles | Fails anchor/contact gates even if cross-section volume passes |
| Pinched crotch | Adequate leg volume with a collapsed front or back rise | Fails crotch and rise gates |
| Spoofed metadata | Tight mesh with a large `authoredFoldAmplitudeM` property | Fails geometric gather evidence |
| Missing waistband | Mesh renamed as waistband without a separate component or seam loop | Fails structural waistband evidence |
| Missing gusset or rise | Property claims a gusset without qualifying topology | Fails structural crotch evidence |
| Mesh-density invariance | Geometrically identical coarse and subdivided meshes | Produces equivalent area-weighted results |
| Mirror invariance | Left and right geometry mirrored | Produces equivalent metrics with side labels exchanged |
| Transform invariance | Same body and garment under global scale and transform | Produces equivalent normalised metrics |
| Station robustness | Small permitted station-sampling perturbations | Does not flip acceptance unless the surface is genuinely marginal |
| Open contour | Plane intersection with an incomplete or non-closed garment contour | Fails closed with explicit evidence |
| Missing leg | Only one valid leg contour | Fails station and side completeness |
| Penetration | Local body intersection that nearest-normal sampling could hide | Fails robust penetration evidence |
| Self-intersection | Loose fold crossing another trouser surface | Fails self-intersection evidence |
| Seam integrity | Duplicate, missing, non-manifold or collapsed seams | Existing topology gates continue to fail |
| Cloth stability | Non-converged, unbaked, non-finite or explosive simulation | Existing shared cloth gates continue to fail |
| UV and weights | Accepted shape with missing UVs or invalid deform weights | Fails production asset validation |
| Tunic isolation | Run unchanged tunic fixtures after trouser redesign | Tunic fitted thresholds and results remain unchanged |
| D016 legacy contract | Old 0.003 m to 0.035 m loose-leg declaration | Rejected or explicitly marked legacy under the new contract version |
| D016 reference profile | Missing or mismatched gate-profile hash | Fails closed |
| Builder/D016 parity | Builder and D016 use different sirwal schema versions | Fails contract validation |
| Neutral Blender integration | Candidate in the canonical neutral review pose | Complete station and view evidence, no clipping or invalid topology |
| Animated Blender integration | Walk, turn, point, jump and power-extreme poses | Waist and ankle retention, no body or self clipping, stable silhouette and valid full-body framing |
| Layer-stack integration | Add tabard, belt, pouches and calf wraps over accepted trousers | No floating layers, collision regressions or dressing-order violations |
| Report completeness | Remove one required station, view, component or source hash | Machine-pass status cannot be emitted |
| Status semantics | All safety, topology and calibrated shape gates pass without independent visual review | Status remains `candidate-safety-and-topology-gates-passed-visual-pending`, never machine-accepted or production-art approved |

## Decision boundary

This audit authorises no builder, validator or threshold change by itself. It
establishes the coupling map and the evidence required for the next decision.

Before implementation, the lead must approve a versioned canonical derivation
record for each new cross-section, silhouette, waistband, crotch, rise and
gather threshold. Donor A, donor B and the authored control must then be judged
by exactly the same gate and render protocol.

No numeric sirwal ranges are approved. Blender PID 21424 remained untouched.
