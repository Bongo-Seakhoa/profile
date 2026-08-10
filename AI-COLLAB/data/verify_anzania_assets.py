"""Regenerate the Anzania asset registry from the files actually on disk.

The shipped registry (Anzania_Actual_Asset_Registry_v1.0.json) cannot be used:
none of its 19 SHA-256 values and none of its filenames resolve against the
reference library. Mapping below is re-established by visual identification of
every plate, cross-checked against the location descriptions in
Anzania_Worldbuilding_Addendum_v1.0.md section 5.
"""

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

REFERENCE_ROOT = os.environ.get("ANZANIA_REFERENCE_ROOT")
if not REFERENCE_ROOT:
    raise SystemExit("Set ANZANIA_REFERENCE_ROOT to the private reference library.")

REF = Path(REFERENCE_ROOT)
OUT = Path(__file__).with_name("anzania-asset-registry-verified.json")

P = "ChatGPT Image Jul 30, 2026, {}.png".format

# location_id, role, atlas_order, journey_order, portfolio_section, source file, visual evidence
PLATES = [
    ("threshold_dunes", "outer", 1, 1, "Overview / home",
     P("08_21_20 PM (1)"), "Dune sea, mounted caravan on ridge, distant mesa city, foreground blue and gold banners, route markers, low golden sun."),
    ("threshold_dunes", "inner", 1, 1, "Overview / home",
     P("07_59_39 PM (2)"), "Desert camp and waystation: large red and cream ceremonial tent, palm cluster, banner poles, route markers, foreground stone ledge with water vessels."),
    ("stone_pass_names", "outer", 2, 2, "About / identity",
     P("08_21_21 PM (4)"), "Carved canyon pass with monumental central arch, blue banners on tall poles, stelae, small figures on the road."),
    ("stone_pass_names", "inner", 2, 2, "About / identity",
     P("07_59_39 PM (3)"), "Narrow monolith canyon, carved tower, hanging banners, travellers in the passage."),
    ("archive_echoes", "outer", 3, 4, "Work / experience / evidence",
     P("08_21_22 PM (7)"), "Cliff archive city, monumental stairs, blue and gold domes, colonnades, figures at the base."),
    ("archive_echoes", "inner", 3, 4, "Work / experience / evidence",
     P("07_59_40 PM (4)"), "Archive hall with large armillary sphere, arched portal, scroll shelving, lanterns, sun shafts."),
    ("bazaar_skill", "outer", 4, 6, "Capabilities / services",
     P("08_21_22 PM (10)"), "Broad market avenue, awnings and pennants, domed civic buildings, crowd at distance."),
    ("bazaar_skill", "inner", 4, 6, "Capabilities / services",
     P("07_59_40 PM (5)"), "Market court in detail: canopies, rugs, brass vessels, crates, foreground drapery."),
    ("oasis_audience", "outer", 5, 8, "Contact / call to action",
     P("08_21_20 PM (2)"), "Lagoon city, turquoise water, white domes, bridges, palms, boats."),
    ("oasis_audience", "inner", 5, 8, "Contact / call to action",
     P("07_59_40 PM (6)"), "Lantern-lit waterside pavilion at dusk, fire bowls, rugs, reflections, palms."),
    ("forge_resolve", "outer", 6, 5, "Process / delivery",
     P("08_21_21 PM (5)"), "Foundry citadel on rock, smokestacks and smoke plumes, industrial terraces, banners."),
    ("forge_resolve", "inner", 6, 5, "Process / delivery",
     P("08_21_21 PM (3)"), "Forge hall interior, furnace glow, suspended apparatus and chains, work surfaces."),
    ("garden_origins", "outer", 7, 3, "Story / values / education",
     P("08_21_22 PM (8)"), "Terraced garden city, white architecture, turquoise cascades, pale cliffs, heavy greenery."),
    ("garden_origins", "inner", 7, 3, "Story / values / education",
     P("08_21_21 PM (6)"), "White courtyard, sheer curtains between columns, reflecting pool, vines, domed pavilion."),
    ("observatory_horizons", "outer", 8, 7, "Research / strategy",
     P("08_21_23 PM (11)"), "Mountaintop observatory above cloud, tower and circular platform, open horizon at dusk."),
    ("observatory_horizons", "inner", 8, 7, "Research / strategy",
     P("08_21_22 PM (9)"), "Celestial chamber in deep blue, central armillary instrument, charting tables, lanterns, night sky."),
]

SUPPORT = [
    ("world_atlas", P("08_21_23 PM (12)"), "support_atlas",
     "ANZANIA atlas, nine panels, compass rose, eight numbered locations.",
     "World overview, Living Desert Map, direct-navigation overlay, interstitial."),
    ("environmental_props_board", P("07_43_36 PM (4)"), "support_reference_board",
     "DESERT NOMAD Environmental Props and Artefacts board: tents, banners, waystones, braziers, lanterns, vessels, crates, rugs, bridges, ruins.",
     "Selective prop vocabulary. Not a location plate."),
    ("meta_artefacts_board", P("07_43_36 PM (3)"), "support_reference_board",
     "META ARTEFACTS board: Wayfinder Compass, Living Desert Map, Sun and Sand Medallion, Relic Hourglass, Signet Seal, Ceremonial Key, Memory Vessel, Star Chart Tablet, Navigation Charms, emblem tokens.",
     "Navigation, loading and section-symbol vocabulary. Not a location plate."),
]

CHARACTER = [
    (P("05_48_14 PM (1)"), "Male lineup poster, five representation archetypes."),
    (P("05_48_14 PM (2)"), "Male avatar set: front, side, back, top orthographic plus skin, fabric and metal swatches."),
    (P("05_48_14 PM (3)"), "Female lineup poster, five representation archetypes."),
    (P("05_48_15 PM (4)"), "Female avatar set: orthographic views plus swatches."),
    (P("05_48_15 PM (5)"), "Gender-neutral lineup poster, five representation archetypes."),
    (P("05_48_15 PM (6)"), "Gender-neutral avatar set: orthographic views plus swatches."),
]

SUPERSEDED = [
    (P("07_43_36 PM (1)"), "THE SANDS OF ZAHIR world map. Superseded: the country is Anzania and the atlas is 08_21_23 PM (12)."),
    (P("07_43_36 PM (2)"), "DESERT NOMAD WORLDS eight-panel location board. Superseded by the individual full-resolution plates."),
]


def probe(name):
    path = REF / name
    if not path.exists():
        return None
    data = path.read_bytes()
    with Image.open(path) as im:
        w, h = im.size
    return {
        "source_filename": name,
        "sha256": hashlib.sha256(data).hexdigest(),
        "file_size_bytes": len(data),
        "width_px": w,
        "height_px": h,
    }


def main():
    assets, unresolved = [], []

    for loc, role, atlas, journey, section, src, evidence in PLATES:
        info = probe(src)
        if info is None:
            unresolved.append(src)
            continue
        assets.append({
            "asset_id": f"{loc.replace('_', '-')}-{role}",
            "asset_type": "location_plate",
            "scene_id": f"anzania.{loc}",
            "location_id": loc,
            "role": role,
            "atlas_order": atlas,
            "journey_order": journey,
            "portfolio_section": section,
            "runtime_alias": f"anzania-{loc.replace('_', '-')}-{role}-v01",
            "match_status": "VERIFIED_BY_VISUAL_IDENTIFICATION",
            "visual_evidence": evidence,
            **info,
        })

    for aid, src, atype, evidence, use in SUPPORT:
        info = probe(src)
        if info is None:
            unresolved.append(src)
            continue
        assets.append({
            "asset_id": aid.replace("_", "-"),
            "asset_type": atype,
            "runtime_alias": f"anzania-{aid.replace('_', '-')}-v01",
            "match_status": "VERIFIED_BY_VISUAL_IDENTIFICATION",
            "visual_evidence": evidence,
            "primary_use": use,
            **info,
        })

    for src, evidence in CHARACTER:
        info = probe(src)
        if info is None:
            unresolved.append(src)
            continue
        assets.append({
            "asset_id": "character-" + info["sha256"][:8],
            "asset_type": "character_concept_sheet",
            "match_status": "PRESENT_NOT_CANONICAL",
            "visual_evidence": evidence,
            "primary_use": "Concept and design reference only. The canonical character pack is still an open dependency (see DN-CHAR-001).",
            **info,
        })

    for src, evidence in SUPERSEDED:
        info = probe(src)
        if info is None:
            unresolved.append(src)
            continue
        assets.append({
            "asset_id": "superseded-" + info["sha256"][:8],
            "asset_type": "superseded_concept",
            "match_status": "SUPERSEDED_DO_NOT_SHIP",
            "visual_evidence": evidence,
            **info,
        })

    mapped = {a["source_filename"] for a in assets}
    on_disk = {p.name for p in REF.glob("*.png")}

    registry = {
        "document": "Anzania Verified Asset Registry",
        "version": "2.0",
        "supersedes": "Anzania_Actual_Asset_Registry_v1.0.json",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_by": "Claude (review agent), independent verification",
        "reference_library": str(REF),
        "method": (
            "Every PNG in the reference library was hashed. None of the 19 SHA-256 values in "
            "registry v1.0 matched any file, and none of its filenames exist on disk, so v1.0 "
            "cannot be used for ingestion. Linkage was re-established by visual identification of "
            "each plate against the location descriptions in Anzania_Worldbuilding_Addendum_v1.0.md "
            "section 5. Hashes and dimensions below are computed from the files on disk."
        ),
        "critical_corrections": [
            "ANZ-ASSET-001 is RESOLVED. The Threshold Dunes inner plate is present on disk as "
            "'ChatGPT Image Jul 30, 2026, 07_59_39 PM (2).png' (desert camp and waystation). "
            "Registry v1.0 listed no candidate for it. Requires Bongo's sign-off to become canonical.",
            "Registry v1.0 filenames carry a spurious '(1)' duplicate suffix, for example "
            "'08_21_20 PM (1)(1).png'. Stripping that suffix yields the correct file in every case.",
            "Registry v1.0 SHA-256 values and file sizes correspond to a different copy of the "
            "artwork than the files in the reference library. Do not ingest by v1.0 hash.",
        ],
        "summary": {
            "location_plates_expected": 16,
            "location_plates_resolved": sum(1 for a in assets if a["asset_type"] == "location_plate"),
            "support_assets_resolved": sum(1 for a in assets if a["asset_type"].startswith("support")),
            "character_sheets": sum(1 for a in assets if a["asset_type"] == "character_concept_sheet"),
            "superseded_assets": sum(1 for a in assets if a["asset_type"] == "superseded_concept"),
            "png_files_on_disk": len(on_disk),
            "png_files_unmapped": sorted(on_disk - mapped),
            "expected_files_not_found": unresolved,
        },
        "assets": assets,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(registry, indent=2), encoding="utf-8")
    print(f"wrote {OUT}")
    print(json.dumps(registry["summary"], indent=2))


if __name__ == "__main__":
    main()
