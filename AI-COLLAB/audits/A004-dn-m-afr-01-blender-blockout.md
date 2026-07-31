# A004 - DN-M-AFR-01 Blender measurement blockout

**Date:** 2026-07-31
**Blender:** 5.2.0 LTS
**Status:** Greybox passed; v2 silhouette approved; production pilot active

## Outcome

The first canonical pilot now has a reproducible Blender measurement blockout.
The tracked script builds the scene from written v3 measurements, saves a
private `.blend`, renders front/profile/back EEVEE views and writes a
machine-readable report.

The blockout is intentionally primitive. Its purpose is scale, silhouette,
garment envelope, accessory envelope and camera-bound validation before any
final anatomy or surface work.

## Result

| Check | Result |
| --- | --- |
| Blender execution | Passed in Blender 5.2.0 LTS |
| Canonical height | 1.84000 m |
| Measured blockout height | 1.84000 m |
| Height error | 0.0 mm |
| Full animated-envelope width in A-pose | 1.13137 m |
| Full depth including garment envelopes | 0.37600 m |
| Body blockout objects | 14 |
| Garment envelope objects | 14 |
| Accessory envelope objects | 9 |
| Measurement overlay objects | 5 |
| Front/profile/back renders | Passed and visually inspected |
| OTS configuration | None |

## Private evidence hashes

| File | SHA-256 |
| --- | --- |
| `.blend` | `8e837f15b489ddff98eeb1245b844934b0c16838093d6ce9344b40d33c94616d` |
| report | `aa73aba028e198814ace175833dd047186b31f1a1d9acdde14b8476cb1957cea` |
| front render | `2386830ce1bea1c887f99a4c0acdda1fae1b54cfe0f9dbf0db0e1c1346aa7f84` |
| profile render | `cda3bcfb081a34d4ffef9ccacba4fa16993f56634c4b9c391b2723891d358f42` |
| back render | `830f9cf6275e46dfaa542c609576e2c2419f4a7a5f361102d4fc2b019c4efdc5` |

The private files remain under `source/private/` and are excluded from Git.

## Visual review

- The complete blockout remains visible in every orthographic render.
- The full-coverage tunic, trousers, tabard, asymmetric mantle, belts, pouches,
  one right-side tassel, central bronze disc, hair envelope and footwear
  envelopes are represented as separate objects.
- The front view includes height, head and shoulder reference markers.
- Profile and back renders correctly hide the front-facing measurement overlay.
- The material colours now use sRGB-to-linear conversion and read as the
  canonical indigo, cream, rust, leather, skin, bronze and blue families.

## Remaining gates

- Replace primitives with an approved anatomical base and reconstructed face.
- Convert flat garment envelopes into construction meshes with collision
  margins and written asymmetry.
- Add the shared skeleton, sockets and deformation tests.
- Produce calibrated material spheres and recolour masks.
- Preserve the D010-approved silhouette and portfolio rights boundary.
- Run the D004 camera controller against post-skinning bounds, not this static
  blockout alone.
