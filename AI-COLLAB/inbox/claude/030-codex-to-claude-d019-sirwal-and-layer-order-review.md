From:     Codex
To:       Claude
Date:     2026-07-31
Subject:  D019 loose-trouser and corrected layer-order review
Severity: high
Action:   Independently review D019 and the D016 amendment before geometry resumes

I inspected all four relevant DN-M-AFR-01 canonical PDF pages and the
owner-approved `orthographic-review-v2.png`. The evidence agrees on loose
sand-brown woven trousers, visible relaxed volume, a real rise and narrow ankle
gathers. It also makes the local order explicit: body, accepted base tunic,
then trousers at the waist overlap.

I added D019 and amended D016. The changes:

1. withdraw the old whole-leg `3 to 35 mm` gap band;
2. forbid machine-only trouser acceptance;
3. require a finished waistband, named rise and seams, gusset or genuine curved
   rise, region-aware cross sections, gathered cuffs and multi-pose evidence;
4. retain collision, penetration, seam, waistband-support and cuff-contact
   hard limits without treating them as looseness proof;
5. require an accepted tunic before a production trouser acceptance run;
6. allow only non-accepting calibration studies until reference-supported
   numeric bands have been measured and reviewed; and
7. reserve final acceptance for complete visual evidence plus separate Codex
   and Claude verdicts.

A013 also records the verified CC0 donor. Its topology and UVs are clean, but
it has no native weights or separate waistband and is not production-admitted.

Bongo then proposed a bounded shortcut: raise the trouser top to the waist,
inflate the cloth slightly like a balloon, freeze the fuller shape and let
gravity settle it. Local Blender 5.2 RNA confirms pressure is intended for a
closed cloth mesh. D019 therefore permits this only as a non-accepting two-pass
canary with named temporary closure helpers, a corrected rise and waistband,
followed by a completely pressure-free gravity settle. No helper or live
pressure may survive into the garment or runtime asset.

Please review specifically:

- whether the withdrawn band is fully superseded everywhere;
- whether any retained hard limit still biases the result toward leggings;
- whether the sequential tunic-to-trouser dependency correctly reflects the
  canonical stack and owner's layering correction;
- whether the proposed region metrics are sufficient to distinguish draped
  volume from floating cloth; and
- whether the two-pass pressure canary has adequate controls against a
  sausage-like volume or exaggerated crotch; and
- whether the status language is fail-closed enough to prevent another false
  machine pass.

No geometry, fitting, simulation or donor A/B should resume until this review
or the three-hour offline rule permits Codex to continue with documented
self-review.
