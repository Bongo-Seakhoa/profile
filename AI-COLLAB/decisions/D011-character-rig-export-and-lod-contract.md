# D011 - Character rig, export and LOD contract

**Date:** 2026-07-31
**Owner:** Codex
**Status:** Adopted with D012 amendments for the DN-M-AFR-01 production pilot
**Supersedes:** No prior rig or export naming contract

## Reason

The approved DN-M-AFR-01 measurement blockout has no armature, sockets,
animation actions, vertex groups, texture maps, LODs or browser export. The
pilot cannot become a reusable production template until those interfaces are
deterministic.

## Coordinate and scale contract

- Blender source uses metres with unit scale `1.0`.
- Blender uses positive Z as up.
- The character faces negative Y in the authored rest pose.
- Anatomical left is positive X and uses the `.L` suffix.
- Anatomical right is negative X and uses the `.R` suffix.
- The rest pose is the canonical 28-degree A-pose.
- The glTF exporter performs the standard Blender-to-glTF axis conversion.
- Runtime transforms must not apply an additional axis flip or non-uniform
  scale.
- The complete rest-pose asset, including hair, footwear, garments and
  accessories, remains 1.84 m tall within a 5 mm tolerance.

## Required deform bones

The rig convention identifier is exactly `anzania-humanoid-v1`. The pilot
skeleton uses these exact names:

- `root`
- `pelvis`
- `spine_01`
- `spine_02`
- `chest`
- `neck`
- `head`
- `clavicle.L`, `upper_arm.L`, `forearm.L`, `hand.L`
- `clavicle.R`, `upper_arm.R`, `forearm.R`, `hand.R`
- `thigh.L`, `shin.L`, `foot.L`, `toe.L`
- `thigh.R`, `shin.R`, `foot.R`, `toe.R`

Every exported skinned vertex may use no more than four influences. D012
requires continuous deformation for the body and deforming garments. Rigid
one-bone assignments are limited to genuinely rigid accessories.

## Required sockets

The armature includes non-deforming socket bones with these exact names:

- `socket_present.R`, parented to `hand.R`
- `socket_present.L`, parented to `hand.L`
- `socket_power_solar`, parented to `chest`
- `socket_power_sand`, parented to `root`
- `socket_accessory_back`, parented to `chest`
- `socket_accessory_hip.L`, parented to `pelvis`
- `socket_accessory_hip.R`, parented to `pelvis`
- `socket_bounds`, parented to `root`

## Action naming

The production pilot contains one action for every compact animation family:

- `base-idle`
- `weight-shift-idle`
- `garment-adjustment`
- `present-open-hand`
- `point`
- `hourglass-draw`
- `hourglass-inspect`
- `hourglass-stow`
- `short-local-step`
- `edge-lean-enter`
- `edge-lean-hold`
- `edge-lean-exit`
- `sand-recall-recovery`

The hold-to-look-back camera orbit is implemented by the camera controller and
does not require an OTS animation or camera asset. Power and traversal actions
may be added later, but they may not replace the compact set or introduce an
OTS dependency.

## Material naming

Materials use the prefix `M_DN_M_AFR_01_` followed by one of:

- `Skin`
- `Hair`
- `Eye`
- `Tunic`
- `Trouser`
- `Tabard`
- `Mantle`
- `Leather`
- `Bronze`
- `Accent`

The target runtime asset uses a maximum of ten material slots. Source objects
may share materials, and LODs must not invent new material names.

## Texture contract

- Authoring texture filenames use
  `DN-M-AFR-01_<surface>_<channel>_<resolution>.png`.
- Supported channels are `albedo`, `normal`, `roughness` and packed `orm`.
- Pilot authoring resolution is 1024 px unless a measured close-up need
  justifies 2048 px.
- Public runtime metadata declares embedded WebP or KTX2 textures only.
- LOD exports share the same approved texture set.
- Raw reference images and reconstruction boards never become runtime
  textures.

## LOD and file contract

D012 amends the packaging form below. The triangle, draw-call and texture
budgets remain authoritative, but the canonical browser resource is one
self-contained GLB with named LOD0 through LOD4 nodes.

The production pilot exports exactly LOD0 through LOD4:

| File | Evaluated triangle range | Maximum draw calls | Maximum texture edge |
| --- | ---: | ---: | ---: |
| `DN-M-AFR-01_LOD0.glb` | 55,000 to 75,000 | 12 | 4096 px |
| `DN-M-AFR-01_LOD1.glb` | 28,000 to 42,000 | 10 | 2048 px |
| `DN-M-AFR-01_LOD2.glb` | 14,000 to 24,000 | 7 | 2048 px |
| `DN-M-AFR-01_LOD3.glb` | 7,000 to 12,000 | 5 | 1024 px |
| `DN-M-AFR-01_LOD4.glb` | 3,000 to 6,000 | 3 | 1024 px |

All five LOD nodes use the same skeleton, required sockets, compact actions,
canonical scale and approved material family. Small fringe, facial and
jewellery details may be simplified progressively, but the approved
silhouette, one right-side blue tassel, open-toe footwear, three-strand
necklace and full-coverage torso remain readable.

## Camera and bounds metadata

- Export metadata declares `cameraContract:
  D004-distant-full-body-no-OTS`.
- Bounds include every visible skinned mesh, accessory, garment tail and
  power-relevant socket.
- Bounds are sampled across every exported action, not only the rest pose.
- No asset, action, camera marker or metadata field may enable an OTS path.

## Pilot exit

The D011 contract passes only when Blender 5.2 can rebuild the source scene,
export all five GLBs, report the required bones, sockets, materials, actions
and budgets, and render the complete character without cropping. Browser
validation remains required before the same pipeline scales to the other
fourteen characters.
