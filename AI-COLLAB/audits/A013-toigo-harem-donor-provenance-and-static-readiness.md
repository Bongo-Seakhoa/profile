# A013: Toigo harem-pants provenance and static-readiness audit

**Date:** 2026-07-31
**Owner:** Codex
**Status:** Source and static structure verified; rigged-export readiness false
**Production admission:** Blocked pending the revised reference-derived sirwal contract

## Scope and pause compliance

This audit covers only primary-source acquisition, licence evidence, exact file
identity, static OBJ topology, UVs, material payload, MHCLO mappings and the
native-weight path. It does not evaluate body fit, garment ease, silhouette,
deformation, simulation, LOD or browser export.

After Claude message 025 identified the v28 legging-biased fit thresholds, no
MPFB human was created for this donor; no donor vertex was fitted, simulated or
modified; no weights were interpolated; no Blend file was saved; and no A/B
acceptance comparison was made. The v28 candidate, tunic and outer layers were
not touched. Owner Blender PID 21424 remained running and responsive and was
not controlled or stopped.

## Primary-source provenance

| Field | Verified value |
| --- | --- |
| MakeHuman pack page | https://static.makehumancommunity.org/assets/assetpacks/pants01.html |
| Asset repository record | https://www.makehumancommunity.org/node/1728 |
| Authoritative archive | https://files.makehumancommunity.org/asset_packs/pants01/pants01_cc0.zip |
| Pack classification | `pants01`, mesh assets shared under CC0 |
| Asset identity | `toigo_harem_pants` |
| Author on pack page | MargaretToigo |
| Author in MHCLO header | `MRT` |
| MHCLO UUID | `0a9bdba7-cd5b-4270-8a9b-f7d6ef2abaac` |
| MHCLO basemesh | `hm08` |
| MHCLO licence assertion | `CC0` |
| Canonical CC0 deed | https://creativecommons.org/publicdomain/zero/1.0/ |
| Canonical legal text | https://creativecommons.org/publicdomain/zero/1.0/legalcode.txt |

The archive does not publish a semantic version or an internal release
manifest. Its exact acquired version is therefore identified by the primary
URL plus the following server and byte evidence:

| Exact-version field | Value |
| --- | --- |
| Retrieved | 2026-07-31 |
| HTTP Content-Length | 21,908,723 bytes |
| HTTP Last-Modified | Sun, 14 Apr 2024 13:27:39 GMT |
| HTTP ETag | `"14e4cf3-6160e780978d0"` |
| Archive entries | 29 |
| Archive SHA-256 | `E4E0EC60DB34F279BE291A83CFD7B342A7C5CF09BB7676682A5F39F4F6AC4AD9` |

The complete primary download is quarantined as
`source/private/immersive/donors/makehuman-pants01/pants01_cc0.authoritative.zip`.
A 1,535,892-byte timeout fragment from the secondary mirror is retained only
as `pants01_cc0.secondary.incomplete`; it is not a source and must never be
used. All donor bytes remain private and ignored by Git.

The canonical CC0 1.0 Universal legal text is preserved beside the archive as
`CC0-1.0-legalcode.txt`, 7,048 bytes, SHA-256
`A2010F343487D3F7618AFFE54F789F5487602331C0A8D03F49E9A7C547CF0499`.
The source pack page and the MHCLO header independently assert CC0.

## Donor file identity

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `toigo_harem_pants.mhclo` | 375,603 | `9CDFB91852C9D3952EF621D58AEB0B73F1BE98B5448C84BB621DC45F3B828287` |
| `pants_harem.obj` | 476,836 | `5B3AE43D2A2E52C9BF825E4C56F4AED69EF8221CFA3FA0D1C86E721CC6C7E57D` |
| `HaremPants.png` | 5,787,123 | `75067B13C0D28293E99FDA8B5156E80496622BF42C5ABD32491A5456DA4DD04C` |
| `pants_harem.mhmat` | 500 | `BDA009F2D77CD3D0C3AF6268026D08F1E294F0C0806B1679B4BDD3DC0C96DE9C` |
| `toigo_harem_pants.thumb` | 63,796 | `DB1852811099423CDA26143A69FBD6B0864C5B1DB6C1E48ECC32377419CD4DF9` |

## Static topology and UV inspection

The donor was imported into an isolated, factory-clean Blender 5.2.0 LTS
background process for read-only parsing. The import created one mesh object
and preserved the raw OBJ vertex and polygon counts.

| Measurement | Result |
| --- | ---: |
| Vertices | 5,527 |
| Faces | 5,456, all quads |
| Edges | 10,984 |
| Connected mesh components | 1 |
| Boundary edges | 144 |
| Closed boundary loops | 3 |
| Boundary-loop vertices | Waist 72; ankle A 36; ankle B 36 |
| Non-manifold edges | 0 |
| Degenerate faces | 0 |
| Exact duplicate-position clusters | 0 |
| OBJ object or group declarations | 0 |
| OBJ normal records | 0 |
| UV coordinates | 7,030 |
| UV coverage | Complete on every face loop |
| UV islands | 14 |
| UV coordinates outside 0 to 1 | 0 |

The single connected quad surface and three expected openings make the donor
structurally coherent and separable as one trouser garment. It does not provide
a separate waistband object, waistband group or material slot. A real authored
waistband and the required rise or crotch-gusset construction remain redesign
work, not properties that may be inferred from the donor thumbnail.

The MHCLO contains exactly 5,527 barycentric vertex-to-basemesh mappings, one
for every OBJ vertex, and 1,272 basemesh delete-mask vertices. Mapping sums are
within 0.00001 of one. The source material resolves to one 2,048 by 2,048 RGBA
sRGB floral diffuse texture. It has no normal, bump, displacement, roughness or
specular texture map and is not production-ready Anzania surface art.

## Native weights and export readiness

The donor archive contains no `.mhw` file, the MHCLO declares no
`vertexboneweights` file, and a raw Blender import has zero vertex groups and
zero armature modifiers. MPFB 2.0.17's `ClothesService.interpolate_weights`
must derive garment weights from the rigged basemesh through the MHCLO
three-vertex mappings. That operation is intentionally paused and has not been
treated as evidence.

Consequently:

- static OBJ import readiness is true;
- licence and source identity are verified;
- native rig-weight availability is false;
- evaluated-body fit is unevaluated;
- deformation and browser-export suitability are unevaluated; and
- rigged-export readiness is false.

## Evidence and verdict

Machine-readable evidence:

`source/private/immersive/donors/makehuman-pants01/diagnostics/toigo-harem-static-inspection.json`

Report SHA-256:
`E6F2D8D553006669E5025344A292E2FC5B5C4FCC5755A75E71BA70B1F7F3B633`

The donor is a lawful, technically coherent source candidate. It is not an
accepted DN-M-AFR-01 garment and must not replace v28 or enter export. It
remains unevaluated until the lead approves a revised reference-derived sirwal
contract covering ease and volume masks, a constructed waistband, rise or
gusset geometry, woven-cloth behaviour and fail-closed visual acceptance. Only
then may a separate donor candidate proceed to fit, weight, simulation and the
controlled v28 A/B render set.

This audit clarifies A009 after A012's visual rejection of v28. A009's earlier
comparison against the then-machine-passing sewn garment is not a production
approval for either garment.
