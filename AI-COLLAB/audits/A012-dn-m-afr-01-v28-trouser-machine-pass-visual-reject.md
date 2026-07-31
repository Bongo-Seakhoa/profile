# A012: DN-M-AFR-01 v28 trouser machine-pass and visual rejection

**Date:** 2026-07-31
**Owner:** Codex
**Independent reviewer:** Claude, evidence sent in message 029
**Status:** Rejected for production art; donor A/B authorised

## Scope

This audit evaluates the bounded v28 post-drape topology-cleanup experiment for
`DN-M-AFR-01_Sewn_Sand_Trousers`. It does not approve a tunic, any outer layer,
animation, LOD or public runtime asset.

## Reproducibility and machine evidence

Candidate:

`source/private/immersive/pilot/DN-M-AFR-01/mpfb-production-v28-bounded-cleanup-trousers-smoke-02/DN-M-AFR-01-trousers-candidate.blend`

Candidate SHA-256:
`62625ac4334a2b5b4a7a58e68f12bb17d939d2af58f670c0353c7309b9fed68c`

The report records `candidate-machine-gates-passed`. Every declared cleanup
gate is true:

| Measurement | Result | Gate |
| --- | ---: | ---: |
| v26 cloth state | Byte-identical | Required |
| Changed vertices | 34 exact | 34 exact |
| Maximum displacement | 1.192662 mm | At most 1.192662 mm |
| Corrected-vertex minimum clearance | 5.999975 mm | At least 5.9 mm |
| Waist p95 | 11.754086 mm | At most 11.9 mm |
| Waist samples above 12 mm | 19 to 11 | Improvement required |
| Maximum penetration | 0 mm | 0 mm |
| Support coverage | 100 percent | 100 percent |
| Maximum relative edge change | 5.737004 percent | At most 6 percent |
| Normal flips | 0 | 0 |
| New degenerate faces | 0 | 0 |
| New non-adjacent overlaps | 0 | 0 |

The report now derives its garment stage from the scene and truthfully records
one garment, `DN-M-AFR-01_Sewn_Sand_Trousers`. It no longer claims that a tunic
exists.

## Visual evidence

Evidence directory:

`source/private/immersive/pilot/DN-M-AFR-01/mpfb-production-v28-bounded-cleanup-trousers-smoke-02/review/`

The evidence includes v26 and v28 waist close-ups, v28 front, anatomical-right
profile, back and anatomical-left three-quarter full-body renders, JSON render
manifests and SHA-256 sidecars. The v26 and v28 setup-contract hash is identical:
`e2c6f42a609615246a2e5509932375c9ed116f17a1bad8d0cc3d6635297070bf`.

The complete body is visible and authoring helpers are absent. The bounded v28
cleanup does not create a new localized dent. The inherited garment still
fails the production-quality visual gate:

1. It reads as tight leggings through the seat, thigh, knee and calf rather
   than loose sand trousers.
2. The front and back crotch form a deep pinched cavity.
3. The upper edge reads as a flat cut sheet rather than a constructed
   waistband.
4. The silhouette lacks the authored volume and fold language required by the
   approved Desert Nomad canon.
5. Fine horizontal material banding exaggerates the stretched, body-hugging
   result.

## Verdict and recovery

v28 is retained as valid diagnostic evidence but is rejected as production
art. A machine pass cannot waive silhouette, construction or visual-quality
requirements. D016 continues to block the tunic and every outer layer.

The next bounded experiment is a licensed native-MPFB donor A/B beginning with
the CC0 `toigo_harem_pants` candidate. The donor must retain exact provenance,
licence and file hashes; pass topology, UV, material, weighting, evaluated-body
fit and export inspection; receive culturally appropriate silhouette redesign;
and outperform the authored v28 control under the identical render setup. No
donor is admitted to production by this decision.

Blender PID 21424 is the owner's protected interactive session and remained
untouched.
