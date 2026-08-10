import { z } from "zod";

import type { LocomotionPresentation } from "../animation";

// Archival source-handoff canon retained for provenance and future expansion.
// The current browser journey publishes a separate six-guide, 24-pose roster.

export const CHARACTER_PRESENTATIONS = [
  "Male",
  "Female",
  "Gender-neutral",
] as const;

export const CHARACTER_REPRESENTATIONS = [
  "African-inspired",
  "East Asian-inspired",
  "South Asian-inspired",
  "Middle Eastern / North African-inspired",
  "European / Caucasian-inspired",
] as const;

const PRESENTATION_CODE = {
  Male: "M",
  Female: "F",
  "Gender-neutral": "N",
} as const;

const REPRESENTATION_CODE = {
  "African-inspired": "AFR",
  "East Asian-inspired": "EAS",
  "South Asian-inspired": "SAS",
  "Middle Eastern / North African-inspired": "MENA",
  "European / Caucasian-inspired": "EUR",
} as const;

const hexColourSchema = z.string().regex(/^#[0-9A-F]{6}$/);

const measurementsSchema = z
  .object({
    height: z.number().min(150).max(210),
    head_height: z.number().min(18).max(30),
    shoulder: z.number().min(30).max(65),
    chest: z.number().min(65).max(130),
    waist: z.number().min(50).max(115),
    hip: z.number().min(65).max(125),
    depth: z.number().min(12).max(30),
    armspan: z.number().min(145).max(220),
    inseam: z.number().min(65).max(105),
    hand: z.number().min(14).max(25),
    foot: z.number().min(20).max(34),
    outer: z.number().min(40).max(90),
    hem: z.number().min(45).max(100),
  })
  .strict();

const paletteSchema = z
  .object({
    skin: hexColourSchema,
    hair: hexColourSchema,
    inner: hexColourSchema,
    outer: hexColourSchema,
    secondary: hexColourSchema,
    leather: hexColourSchema,
    metal: hexColourSchema,
    accent: hexColourSchema,
  })
  .strict();

const runtimePolicySchema = z
  .object({
    default_weapon: z.literal(false),
    eye_tracking: z.literal(false),
    blinking: z.literal(false),
    lip_sync: z.literal(false),
    skin_tone_is_material_variant: z.literal(true),
    clothing_colour_is_material_variant: z.literal(true),
  })
  .strict();

export const desertNomadCharacterSchema = z
  .object({
    id: z.string().regex(/^DN-[MFN]-(AFR|EAS|SAS|MENA|EUR)-01$/),
    presentation: z.enum(CHARACTER_PRESENTATIONS),
    representation: z.enum(CHARACTER_REPRESENTATIONS),
    canonical_reference_bible_pages: z.string().regex(/^\d{1,2}-\d{1,2}$/),
    measurements_cm: measurementsSchema,
    head_count: z.number().min(7).max(9),
    a_pose_arm_angle_degrees: z.number().min(20).max(40),
    pattern_language: z.string().trim().min(20),
    default_palette: paletteSchema,
    outfit_family: z.string().trim().min(40),
    face_canon: z.string().trim().min(30),
    hair_canon: z.string().trim().min(25),
    locked_details: z.array(z.string().trim().min(10)).min(5),
    runtime_policy: runtimePolicySchema,
  })
  .strict()
  .superRefine((character, context) => {
    const expectedId = `DN-${PRESENTATION_CODE[character.presentation]}-${REPRESENTATION_CODE[character.representation]}-01`;
    if (character.id !== expectedId) {
      context.addIssue({
        code: "custom",
        message: `Character identity fields require ID "${expectedId}".`,
        path: ["id"],
      });
    }

    const armspanDifference = Math.abs(
      character.measurements_cm.armspan - character.measurements_cm.height,
    );
    if (armspanDifference > 5) {
      context.addIssue({
        code: "custom",
        message: "Armspan must remain within 5 cm of canonical height.",
        path: ["measurements_cm", "armspan"],
      });
    }
  });

export const desertNomadCanonSchema = z
  .object({
    schema_version: z.literal("3.0.0"),
    generated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    source_scope: z.array(z.string().trim().min(1)).min(8),
    source_files: z.array(z.string().trim().min(1)).length(2),
    authority_order: z.array(z.string().trim().min(1)).min(6),
    production_caveat: z.string().trim().min(80),
    characters: z.array(desertNomadCharacterSchema).length(15),
  })
  .strict()
  .superRefine((canon, context) => {
    const ids = new Set<string>();
    for (const [index, character] of canon.characters.entries()) {
      if (ids.has(character.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate canonical character ID "${character.id}".`,
          path: ["characters", index, "id"],
        });
      }
      ids.add(character.id);
    }

    for (const presentation of CHARACTER_PRESENTATIONS) {
      for (const representation of CHARACTER_REPRESENTATIONS) {
        const expectedId = `DN-${PRESENTATION_CODE[presentation]}-${REPRESENTATION_CODE[representation]}-01`;
        if (!ids.has(expectedId)) {
          context.addIssue({
            code: "custom",
            message: `Missing canonical roster member "${expectedId}".`,
            path: ["characters"],
          });
        }
      }
    }

    const coveredPilot = canon.characters.find(
      (character) => character.id === "DN-M-AFR-01",
    );
    if (
      coveredPilot === undefined ||
      !coveredPilot.locked_details.some((detail) =>
        detail.toLowerCase().includes("torso is fully covered"),
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "DN-M-AFR-01 must retain the explicit fully covered torso lock.",
        path: ["characters"],
      });
    }
  });

export const canonProvenanceSchema = z
  .object({
    schemaVersion: z.literal(1),
    verifiedUtc: z.iso.datetime({ offset: true }),
    canonicalHandoff: z
      .object({
        name: z.literal("Desert Nomad Complete Handoff v3.0"),
        sourceArchive: z.literal(
          "Desert_Nomad_Complete_Handoff_v3_Self_Contained.zip",
        ),
        sha256: z.string().regex(/^[0-9a-f]{64}$/),
        manifestEntriesVerified: z.literal(32),
        manifestFailures: z.literal(0),
      })
      .strict(),
    canonicalRoster: z
      .object({
        source: z.literal("Desert_Nomad_Character_Canon_v3.0.json"),
        localCopy: z.literal("desert-nomad-character-canon.v3.json"),
        sha256: z.string().regex(/^[0-9a-f]{64}$/),
        characterCount: z.literal(15),
      })
      .strict(),
    sourceReferences: z
      .array(
        z
          .object({
            name: z.string().trim().min(1),
            sha256: z.string().regex(/^[0-9a-f]{64}$/),
          })
          .strict(),
      )
      .length(2),
    authority: z.array(z.string().trim().min(1)).min(6),
    productionGate: z.string().trim().min(80),
    cameraOverride: z.string().trim().min(40),
  })
  .strict();

export type DesertNomadCharacter = z.infer<typeof desertNomadCharacterSchema>;
export type DesertNomadCanon = z.infer<typeof desertNomadCanonSchema>;
export type CanonProvenance = z.infer<typeof canonProvenanceSchema>;

export function locomotionPresentationForCharacter(
  character: Pick<DesertNomadCharacter, "presentation">,
): LocomotionPresentation {
  switch (character.presentation) {
    case "Male":
      return "male";
    case "Female":
      return "female";
    case "Gender-neutral":
      return "nonbinary";
  }
}
