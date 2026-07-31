import { describe, expect, it } from "vitest";

import {
  CHARACTER_PRESENTATIONS,
  CHARACTER_REPRESENTATIONS,
  canonProvenanceSchema,
  desertNomadCanonSchema,
  locomotionPresentationForCharacter,
} from "../../../src/immersive/characters";

type Presentation = (typeof CHARACTER_PRESENTATIONS)[number];
type Representation = (typeof CHARACTER_REPRESENTATIONS)[number];

const PRESENTATION_CODE: Record<Presentation, string> = {
  Male: "M",
  Female: "F",
  "Gender-neutral": "N",
};

const REPRESENTATION_CODE: Record<Representation, string> = {
  "African-inspired": "AFR",
  "East Asian-inspired": "EAS",
  "South Asian-inspired": "SAS",
  "Middle Eastern / North African-inspired": "MENA",
  "European / Caucasian-inspired": "EUR",
};

function makeSyntheticCharacter(
  presentation: Presentation,
  representation: Representation,
) {
  return {
    id: `DN-${PRESENTATION_CODE[presentation]}-${REPRESENTATION_CODE[representation]}-01`,
    presentation,
    representation,
    canonical_reference_bible_pages: "1-2",
    measurements_cm: {
      height: 180,
      head_height: 23,
      shoulder: 45,
      chest: 92,
      waist: 78,
      hip: 94,
      depth: 20,
      armspan: 180,
      inseam: 82,
      hand: 19,
      foot: 27,
      outer: 68,
      hem: 74,
    },
    head_count: 8,
    a_pose_arm_angle_degrees: 30,
    pattern_language:
      "Synthetic geometric pattern language used only for schema validation.",
    default_palette: {
      skin: "#805A48",
      hair: "#241C1A",
      inner: "#F2E6CE",
      outer: "#253457",
      secondary: "#A64F3D",
      leather: "#5A3A28",
      metal: "#A67C3C",
      accent: "#277CA8",
    },
    outfit_family:
      "Synthetic long-sleeved layered outfit used only for contract validation.",
    face_canon: "Synthetic face description used only for contract validation.",
    hair_canon: "Synthetic hair description used only for contract validation.",
    locked_details: [
      "Torso is fully covered by the synthetic validation garment.",
      "Synthetic head silhouette remains readable.",
      "Synthetic hands remain inside the tracked bounds.",
      "Synthetic footwear remains inside the tracked bounds.",
      "Synthetic accessories contribute to the tracked bounds.",
    ],
    runtime_policy: {
      default_weapon: false,
      eye_tracking: false,
      blinking: false,
      lip_sync: false,
      skin_tone_is_material_variant: true,
      clothing_colour_is_material_variant: true,
    },
  };
}

function makeSyntheticCanon() {
  return {
    schema_version: "3.0.0",
    generated: "2026-07-31",
    source_scope: Array.from(
      { length: 8 },
      (_, index) => `synthetic-scope-${index + 1}`,
    ),
    source_files: ["private-source-a", "private-source-b"],
    authority_order: Array.from(
      { length: 6 },
      (_, index) => `synthetic-authority-${index + 1}`,
    ),
    production_caveat:
      "Synthetic fixture only. The private owner-supplied canonical payload is intentionally excluded from the public repository and release artifact.",
    characters: CHARACTER_PRESENTATIONS.flatMap((presentation) =>
      CHARACTER_REPRESENTATIONS.map((representation) =>
        makeSyntheticCharacter(presentation, representation),
      ),
    ),
  };
}

describe("Desert Nomad canonical roster contract", () => {
  it("accepts a 15-character, three-presentation contract fixture", () => {
    const canon = desertNomadCanonSchema.parse(makeSyntheticCanon());

    expect(canon.characters).toHaveLength(15);
    expect(new Set(canon.characters.map(({ id }) => id)).size).toBe(15);
    expect(
      new Set(canon.characters.map(({ presentation }) => presentation)),
    ).toEqual(new Set(CHARACTER_PRESENTATIONS));
    expect(
      new Set(canon.characters.map(({ representation }) => representation)),
    ).toEqual(new Set(CHARACTER_REPRESENTATIONS));
  });

  it("preserves independent customisation and prohibits baseline facial automation and weapons", () => {
    const canon = desertNomadCanonSchema.parse(makeSyntheticCanon());

    for (const character of canon.characters) {
      expect(character.runtime_policy).toEqual({
        default_weapon: false,
        eye_tracking: false,
        blinking: false,
        lip_sync: false,
        skin_tone_is_material_variant: true,
        clothing_colour_is_material_variant: true,
      });
    }
  });

  it("maps the three canonical presentations to the shared locomotion families", () => {
    const canon = desertNomadCanonSchema.parse(makeSyntheticCanon());
    const mapping = new Map(
      canon.characters.map((character) => [
        character.presentation,
        locomotionPresentationForCharacter(character),
      ]),
    );

    expect(mapping).toEqual(
      new Map([
        ["Male", "male"],
        ["Female", "female"],
        ["Gender-neutral", "nonbinary"],
      ]),
    );
  });

  it("enforces a fully covered pilot torso", () => {
    const canon = desertNomadCanonSchema.parse(makeSyntheticCanon());
    const pilot = canon.characters.find(({ id }) => id === "DN-M-AFR-01");

    expect(pilot).toBeDefined();
    expect(
      pilot?.locked_details.some((detail) =>
        detail.toLowerCase().includes("torso is fully covered"),
      ),
    ).toBe(true);
    expect(pilot?.outfit_family.toLowerCase()).toContain("long-sleeved");
  });

  it("validates provenance metadata without redistributing the raw handoff", () => {
    const provenance = canonProvenanceSchema.parse({
      schemaVersion: 1,
      verifiedUtc: "2026-07-31T00:00:00Z",
      canonicalHandoff: {
        name: "Desert Nomad Complete Handoff v3.0",
        sourceArchive: "Desert_Nomad_Complete_Handoff_v3_Self_Contained.zip",
        sha256: "0".repeat(64),
        manifestEntriesVerified: 32,
        manifestFailures: 0,
      },
      canonicalRoster: {
        source: "Desert_Nomad_Character_Canon_v3.0.json",
        localCopy: "desert-nomad-character-canon.v3.json",
        sha256: "1".repeat(64),
        characterCount: 15,
      },
      sourceReferences: [
        { name: "private-source-a", sha256: "2".repeat(64) },
        { name: "private-source-b", sha256: "3".repeat(64) },
      ],
      authority: Array.from(
        { length: 6 },
        (_, index) => `synthetic-authority-${index + 1}`,
      ),
      productionGate:
        "Final modelling requires reconstructed front, profile and back boards plus explicit owner approval before public derivative assets ship.",
      cameraOverride:
        "D004 remains the only camera authority and prohibits every OTS variation.",
    });

    expect(provenance.canonicalHandoff.manifestFailures).toBe(0);
    expect(provenance.canonicalHandoff.manifestEntriesVerified).toBe(32);
    expect(provenance.productionGate).toContain(
      "reconstructed front, profile and back boards",
    );
    expect(provenance.cameraOverride).toContain("D004");
  });

  it("rejects a roster with a missing identity or enabled weapon policy", () => {
    const source = desertNomadCanonSchema.parse(makeSyntheticCanon());
    const invalid = structuredClone(source);
    invalid.characters.pop();
    invalid.characters[0]!.runtime_policy.default_weapon =
      true as unknown as false;

    expect(desertNomadCanonSchema.safeParse(invalid).success).toBe(false);
  });
});
