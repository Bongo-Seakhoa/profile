# D001 — Anzania asset linkage is re-established from disk, not from the shipped registry

**Date:** 2026-07-30
**Author:** Claude (review agent)
**Status:** Adopted for implementation. Threshold Dunes candidate independently verified during the requested workbook correction.
**Supersedes:** `Anzania_Actual_Asset_Registry_v1.0.json` / `.csv`, and the mapping table in `Anzania_Worldbuilding_Addendum_v1.0.md` §4.2

## Context

The worldbuilding addendum §4 requires assets to be ingested by exact filename or SHA-256, and explicitly forbids guessing from upload order. Verification showed neither identifier works: of the 19 registry entries, **0 hashes and 0 filenames** resolve against the 27 PNGs in the reference library.

Causes are independent and both confirmed:

1. Registry filenames carry a spurious `(1)` duplicate suffix (`...08_21_20 PM (1)(1).png` vs the actual `...08_21_20 PM (1).png`).
2. Registry hashes and byte sizes describe a differently-encoded copy of the same artwork (e.g. 3,211,581 bytes recorded vs 2,131,457 on disk), so hash matching cannot succeed even with corrected names.

## Decision

1. `AI-COLLAB/data/anzania-asset-registry-verified.json` is the authoritative ingestion source. Registry v1.0 is not used.
2. Linkage is established by **visual identification** of each plate against the location descriptions in worldbuilding addendum §5. Each entry records its `visual_evidence`.
3. SHA-256, byte size and pixel dimensions are computed from the files on disk and are authoritative going forward.
4. `AI-COLLAB/data/verify_anzania_assets.py` regenerates the registry and is the reproducible check.

## Resolution of ANZ-ASSET-001

The reference library holds **16** plates at 1672×941, not the 15 the registry verified. `ChatGPT Image Jul 30, 2026, 07_59_39 PM (2).png` appears in no mapping table in any supplied document. Inspection shows a desert camp and waystation: large red and cream ceremonial tent, palm cluster, banner poles, route markers, foreground stone ledge with water vessels.

That matches the Threshold Dunes inner composition described in §5.1, and the file sits in the same `07_59_39/40` series as the five other inner plates.

**Proposed:** adopt it as the canonical Threshold Dunes inner plate.
**Resolution:** Codex independently inspected the plate, confirmed the camp/waystation match and applied Bongo's explicit request to correct filename deviations in the linkage workbook. The original workbook remains archived, so this decision is reversible if Bongo later selects a different approved plate.

The addendum's warning stands and is honoured: the environmental props board is **not** used as a substitute, and is classified as a support asset.

## Verified mapping

Journey order, with the addendum's atlas numbering confirmed against the atlas artwork.

| # | Location | Role | Source file (`ChatGPT Image Jul 30, 2026, …`) | Runtime alias |
|---|---|---|---|---|
| 1 | Threshold Dunes | outer | `08_21_20 PM (1).png` | `anzania-threshold-dunes-outer-v01` |
| 1 | Threshold Dunes | inner | `07_59_39 PM (2).png` | `anzania-threshold-dunes-inner-v01` |
| 2 | Stone Pass of Names | outer | `08_21_21 PM (4).png` | `anzania-stone-pass-names-outer-v01` |
| 2 | Stone Pass of Names | inner | `07_59_39 PM (3).png` | `anzania-stone-pass-names-inner-v01` |
| 3 | Garden of Origins | outer | `08_21_22 PM (8).png` | `anzania-garden-origins-outer-v01` |
| 3 | Garden of Origins | inner | `08_21_21 PM (6).png` | `anzania-garden-origins-inner-v01` |
| 4 | Archive of Echoes | outer | `08_21_22 PM (7).png` | `anzania-archive-echoes-outer-v01` |
| 4 | Archive of Echoes | inner | `07_59_40 PM (4).png` | `anzania-archive-echoes-inner-v01` |
| 5 | Forge of Resolve | outer | `08_21_21 PM (5).png` | `anzania-forge-resolve-outer-v01` |
| 5 | Forge of Resolve | inner | `08_21_21 PM (3).png` | `anzania-forge-resolve-inner-v01` |
| 6 | Bazaar of Skill | outer | `08_21_22 PM (10).png` | `anzania-bazaar-skill-outer-v01` |
| 6 | Bazaar of Skill | inner | `07_59_40 PM (5).png` | `anzania-bazaar-skill-inner-v01` |
| 7 | Observatory of Horizons | outer | `08_21_23 PM (11).png` | `anzania-observatory-horizons-outer-v01` |
| 7 | Observatory of Horizons | inner | `08_21_22 PM (9).png` | `anzania-observatory-horizons-inner-v01` |
| 8 | Oasis of Audience | outer | `08_21_20 PM (2).png` | `anzania-oasis-audience-outer-v01` |
| 8 | Oasis of Audience | inner | `07_59_40 PM (6).png` | `anzania-oasis-audience-inner-v01` |

### Support assets

| Asset | Source file | Role |
|---|---|---|
| Anzania atlas | `08_21_23 PM (12).png` | World overview, Living Desert Map, interstitial |
| Environmental props board | `07_43_36 PM (4).png` | Selective prop vocabulary. **Not a location plate.** |
| Meta artefacts board | `07_43_36 PM (3).png` | Navigation and section-symbol vocabulary. **Not a location plate.** |

### Character concept sheets — `PRESENT_NOT_CANONICAL`

`05_48_14 PM (1)`, `(2)`, `(3)` and `05_48_15 PM (4)`, `(5)`, `(6)` — three lineup posters and three orthographic avatar sets with skin, fabric and metal swatches.

Design reference only. Brief §8.1 and §24 require the canonical reference pack before character production is finalised (DN-CHAR-001). Brief §5.1 also notes the posters are mood references, not modelling blueprints.

### Superseded — `SUPERSEDED_DO_NOT_SHIP`

| Source file | Why |
|---|---|
| `07_43_36 PM (1).png` | "The Sands of Zahir" world map. The country is Anzania; the atlas is `08_21_23 PM (12)`. |
| `07_43_36 PM (2).png` | Eight-panel "Desert Nomad Worlds" board, superseded by the individual full-resolution plates. |

## Consequences

- Codex can ingest immediately; no new artwork is required for the environment.
- All 27 PNGs are classified. Nothing is unaccounted for.
- Two superseded concepts are explicitly fenced off, removing the risk of shipping pre-rename "Zahir" artwork.
- Source masters stay untouched. Runtime derivatives are written to new filenames only, per §8.1.
- Plates are 1672×941. See R001 §5 — this caps full-bleed hero fidelity and should shape the layout choices.
