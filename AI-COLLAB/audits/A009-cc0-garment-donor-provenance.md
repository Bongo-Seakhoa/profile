# A009: CC0 garment-donor provenance and quarantine audit

**Date:** 2026-07-31
**Owner:** Codex
**Scope:** Candidate donor geometry only; no production admission

## Finding

The MPFB-compatible garment route is broader than the 19 Western assets bundled with MPFB and mirrored in the narrow GitHub `base/clothes` path. Official MakeHuman Community asset packs include additional CC0 MHCLO clothes. Three candidates are traceable, but none is accepted as finished Anzania art.

## Primary sources

| Candidate | Primary page | License and format evidence | Current disposition |
| --- | --- | --- | --- |
| `toigo_harem_pants`, MargaretToigo | https://static.makehumancommunity.org/assets/assetpacks/pants01.html | Item listed as a separate clothes asset under CC0 in the 20 MB `pants01` pack | Quarantined archive inspected; donor/reference only |
| `donitz_monk_robe` and three hood states, Donitz | https://static.makehumancommunity.org/assets/assetpacks/suits02.html | Pack and named separate clothes assets listed as CC0; 183 MB | Not downloaded; inspect only if the sewn tunic or mantle lane needs an A/B donor |
| British shemagh in `WW2 headwear`, Britdawgmasterfunk | https://blendswap.com/blend/30667 | Page states CC0, Blender 3.0x/Cycles, 2.13 MB, unapplied modifiers and some curve parts | Login-gated; not downloaded or admitted |

The MPFB documentation states that MHCLO clothes are mesh objects with vertex-to-basemesh fitting instructions and can be refit after basemesh changes:
https://static.makehumancommunity.org/mpfb/docs/assets/concept_clothes_hair_bodyparts.html

## Quarantined `pants01` evidence

- Source URL: `https://files2.makehumancommunity.org/asset_packs/pants01/pants01_cc0.zip`
- Local quarantine: `C:\tmp\profile-upgrade-asset-candidates\pants01_cc0.zip`
- Size: 21,908,723 bytes
- SHA-256: `E4E0EC60DB34F279BE291A83CFD7B342A7C5CF09BB7676682A5F39F4F6AC4AD9`
- ZIP integrity: opened successfully with 29 entries
- Candidate files:
  - `toigo_harem_pants.mhclo`, 375,603 bytes
  - `pants_harem.obj`, 476,836 bytes
  - `HaremPants.png`, 5,787,123 bytes
  - `pants_harem.mhmat`, 500 bytes
  - `toigo_harem_pants.thumb`, 63,796 bytes
- MHCLO header: author `MRT`, license `CC0`, UUID `0a9bdba7-cd5b-4270-8a9b-f7d6ef2abaac`, basemesh `hm08`
- OBJ: 5,527 vertices, 7,030 UV coordinates and 5,456 faces; no authored OBJ object or group declarations
- Material: one diffuse texture, no normal, bump, displacement or specular texture maps
- Visual thumbnail: loose gathered harem-trouser silhouette with elastic-looking waist and ankle cuffs

## Production decision

The owned v24 sewn trousers are substantially lighter at 991 welded raw vertices and are within 0.437 mm of the final waist p95 gate while all other cloth and fit gates pass. Switching to the donor now would discard stronger measured construction evidence and introduce new refit, topology, material and deformation work.

`toigo_harem_pants` is therefore retained only as a lawful shape and topology reference or recovery donor. It may enter production only through a recorded A/B gate proving a better canon silhouette, fit, deformation, LOD and browser-export result than the owned sewn garment. The robe and shemagh candidates remain subject to the same gate. Raw downloads stay outside the repository until admitted through provenance review.
