# A002 - Desert Nomad canonical handoff audit

**Date:** 2026-07-31
**Lead:** Codex
**Independent inventory:** delegated for confirmation
**Source:** owner-supplied reference library, read-only

## Outcome

The reference library contains a complete Desert Nomad v3 documentation
handoff that was not represented in the earlier PNG-only character inventory.
It resolves the exact fifteen-character roster, presentation mapping, numeric
measurements, garment order, written outfit locks, material intent and source
page ranges.

It does not contain production 3D meshes, rigs, animation clips or runtime
textures. The handoff itself states that its flat A-pose drawings are proportion
and garment-layer blockouts rather than final production orthographics.

## Integrity

| Item | SHA-256 / result |
| --- | --- |
| `Desert_Nomad_Complete_Handoff_v3_Self_Contained.zip` | `7f18011f3778900ea96dcc3c3b00cdfec1d86e072a51bd047f3025237eab377f` |
| `Desert_Nomad_Complete_Handoff_v3_Lightweight.zip` | `25d097a2eeeea3b1d0fb53bdcd3a4f280027efa664556a2e6b3d7c6e883a06ff` |
| Canonical Reference Bible | `08bccb6fcc02db0c9e4b9e48b0567eb6bfde4e206d71be71db575dd926d17942` |
| Master Index | `d5ec1df3214d6d93f92091121b4809fba9a70160106bb00056536bc1cc02b4c8` |
| Internal package manifest | 32 of 32 entries verified, zero failures |
| Normalised roster JSON | `ef4ff602250585ee99338f19affbea8ab1157e2eb414437b20eddc7dd7783d3a` |

The self-contained archive has 37 ZIP entries because directories and three
source-reference wrapper records sit above the 32 hashed files. The lightweight
archive has the same 32 hashed deliverables without the two source PDFs.

The lightweight archive's copied manifest still names three deliberately
omitted `source_references` files. Its 29 present payloads hash correctly, but a
strict completeness verifier correctly fails it. Use the self-contained archive
as the archival authority and treat the lightweight package as transport-only.

## Canonical roster

The roster contains five representation families in each of three
presentations:

- `DN-M-*`: five male characters;
- `DN-F-*`: five female characters; and
- `DN-N-*`: five gender-neutral characters.

Every character has a canonical height, arm span, garment envelope, face and
hair description, family palette, pattern language, locked details and runtime
policy. The source explicitly preserves independent skin and clothing
customisation, prohibits default weapons and facial automation, and requires
`DN-M-AFR-01` to remain fully covered.

## Authority and conflicts

The handoff's own order is:

1. latest explicit owner decision;
2. written decisions and numeric measurements;
3. approved reconstructed orthographics and sculpt overlays;
4. technical A-pose blockouts;
5. garment and material pages; and
6. painterly references for surface mood.

D004 and all later owner camera corrections therefore supersede the package's
older rear-camera and chase-camera wording. No OTS configuration becomes valid
through this handoff.

## Production gate

Before final sculpt approval, the handoff requires:

- reconstructed front, profile and back boards;
- a neutral-light face landmark sheet;
- garment construction and collision boards;
- production hair, hand and footwear references;
- calibrated material spheres; and
- a signed 3D measurement overlay.

One pilot character must pass reconstruction, modelling, rig, LOD, animation,
camera, browser and performance gates before production scales to all fifteen.

## Repository integration

The verified canonical roster is retained byte-for-byte at
`source/private/immersive/canon/desert-nomad-character-canon.v3.json`. Its
hash, source archive and authority rules are recorded beside it in
`canon-provenance.json`. Both files are ignored by Git and excluded from the
public release.

Tracked schemas and synthetic unit-test fixtures enforce all fifteen identity
slots, presentation and representation coverage, independent customisation,
facial-animation exclusions, weapon exclusion and pilot coverage without
redistributing the raw handoff. The private source hash remains recorded in
this audit for local integrity verification.

## Remaining concerns

- The pack has no explicit licence text. It is treated as owner-supplied project
  material for internal reconstruction, raw reference files remain outside the
  public bundle and public derivatives remain gated on owner confirmation of
  ownership and derivative/redistribution rights.
- Production 3D assets still need to be created.
- The pilot reconstruction needs owner approval before its design choices scale
  across the complete roster.
