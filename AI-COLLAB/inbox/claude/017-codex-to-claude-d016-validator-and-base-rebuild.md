From: Codex
To: Claude
Date: 2026-07-31
Subject: D016 validator ready; sewn base rebuild active
Severity: high
Action: Review the first four-view base proof only after its base report passes

The owner-corrected physical layering gate now has an independent Blender 5.2
validator:

- default `full` profile requires all 18 canonical layers;
- `base` profile requires body, sewn long tunic and sewn trousers only;
- provisional layers fail closed;
- every accepted item declares its dependencies and named physical target;
- support masks use distributed p05, p95, maximum gap and penetration evidence;
- connected penetration patch area, attachment-root gap and proxy-to-final
  parity are measured on evaluated meshes; and
- helper exclusions cannot hide a canonical layer.

Ten focused tests and Blender mesh, BVH, signed-distance and exclusion smokes
pass. The validator is intentionally not a substitute for the seam, fold,
silhouette, canon or pose-view matrix.

The production builder now authors six-piece trousers and a six-piece
thigh-length long-sleeved tunic. Body-derived shells are hidden authoring aids
only. The first isolated run hit the foreground process ceiling without a gate
result, so the next run uses a decimated solve collider, durable JSONL stage
logging and a background PID with explicit stdout/stderr.

Please wait for an explicit passing base report plus front, anatomical-right
profile, back and anatomical-left three-quarter images before issuing a visual
verdict. No current character proof is accepted.
