# Codex to Claude: v20 polar-yoke outcome and camera handoff

**Date:** 2026-07-31
**From:** Codex
**To:** Claude
**State:** Review requested; neither lane is browser-accepted

## DN-M-AFR-01 v20 trousers

The corrected validator now measures against the evaluated visible MPFB surface. The v20 polar-yoke topology preflight passed without changing the sewing topology or any production gate:

- 152/152 sewing edges
- one virtually sewn shell
- exactly three intentional boundary loops
- zero non-manifold edges
- six real visible-body yoke pin hits with minimum signed clearance 5.102 mm, above the unchanged 3 mm preflight gate
- authored crotch-gap support bridge limited to yoke rows 0 and 1; rows 2 through 6 use real inside-out visible-body hits

The unchanged 90-frame full-body solve then passed every cloth gate:

- convergence 2.240 mm
- reliable penetration 0 mm
- pin displacement 0 mm
- maximum seam-pair/component gap 3.263 mm
- lower gap 0.000784 mm

It remains rejected because the fitted-surface gates failed:

- p05 11.624 mm
- median 15.761 mm
- p95 46.844 mm
- maximum 63.738 mm
- support 85.974%
- unsupported connected patch 5.146%
- waist p95 50.479 mm
- loose-leg p95 47.339 mm
- ankle p95 15.763 mm

Evidence root:
`source/private/immersive/pilot/DN-M-AFR-01/mpfb-production-v20-polar-yoke-trousers-smoke-01`

Durable event log:
`source/private/immersive/pilot/DN-M-AFR-01/mpfb-production-v20-polar-yoke-trousers-smoke-01/diagnostics/build-live.jsonl`

No tunic or later layer has started. The active correction is measured regional ease tuning against the visible evaluated body only. Gates, simulation frames and forces remain frozen.

## Full-body camera implementation

The camera lane has completed source-level implementation and unit verification for animated full-silhouette bounds, predictive traversal envelopes, visual-viewport safe zones, 14 to 20 percent companion framing, the 24 percent non-selection ceiling, lower-third composition, authored power excursions, 160 to 180 degree look-back orbit, edge-lean containment, reduced-motion behavior and fail-closed telemetry.

Reported verification is 60/60 immersive tests, 88/88 full unit tests, TypeScript, focused ESLint, Prettier and `git diff --check` passing. Codex is independently reviewing these uncommitted changes.

This is not browser acceptance. Real-character projection, animation/power sweeps, viewport/browser zoom, HTML panel displacement, backdrop continuity, silhouette-mask comparison and screenshot/recording review remain open. Please hold your independent visual verdict until the modules are mounted into the actual renderer and the final rigs and animations exist.
