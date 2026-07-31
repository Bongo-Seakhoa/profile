import { describe, expect, it } from "vitest";

import {
  CHARACTER_PRODUCTION_EXPORT_BUDGETS,
  validateCharacterProductionAsset,
} from "../../../src/immersive/characters";
import {
  REQUIRED_COMPACT_ANIMATION_FAMILIES,
  type CompactAnimationFamily,
} from "../../../src/immersive/animation";

const DURATION_BY_FAMILY: Readonly<Record<CompactAnimationFamily, number>> = {
  "base-idle": 10_000,
  "weight-shift-idle": 2_000,
  "garment-adjustment": 2_000,
  "present-open-hand": 800,
  point: 1_000,
  "hourglass-draw": 750,
  "hourglass-inspect": 6_000,
  "hourglass-stow": 650,
  "short-local-step": 600,
  "edge-lean-enter": 550,
  "edge-lean-hold": 3_000,
  "edge-lean-exit": 550,
  "sand-recall-recovery": 650,
};

function makeSyntheticClip(family: CompactAnimationFamily, index: number) {
  const markers =
    family === "hourglass-draw"
      ? [
          {
            id: "attach-hand",
            timeMs: 400,
            event: "hourglass-attach-hand" as const,
          },
        ]
      : family === "hourglass-stow"
        ? [
            {
              id: "attach-belt",
              timeMs: 400,
              event: "hourglass-attach-belt" as const,
            },
          ]
        : [];

  return {
    id: `clip-${index}-${family}`,
    family,
    durationMs: DURATION_BY_FAMILY[family],
    loop:
      family === "base-idle" ||
      family === "hourglass-inspect" ||
      family === "edge-lean-hold",
    additiveUpperBody: family === "present-open-hand" || family === "point",
    rootMotion: "in-place" as const,
    blendInMs: 200,
    blendOutMs: 200,
    markers,
  };
}

function makeSyntheticProductionManifest() {
  const clips = REQUIRED_COMPACT_ANIMATION_FAMILIES.map(makeSyntheticClip);
  const totalDurationMs = clips.reduce(
    (total, clip) => total + clip.durationMs,
    0,
  );

  return {
    schemaVersion: "1.0.0",
    manifestRevision: 1,
    assetId: "dn-m-afr-01-production-r1",
    characterId: "DN-M-AFR-01",
    generatedAtUtc: "2026-07-31T00:00:00Z",
    contentFingerprint: "0".repeat(64),
    file: {
      uri: "assets/immersive/characters/dn-m-afr-01-lods.glb",
      format: "glb",
      mimeType: "model/gltf-binary",
      byteLength: 6 * 1024 * 1024,
      sha256: "1".repeat(64),
      resources: [] as Array<{
        kind: string;
        uri: string;
        mimeType: string;
        byteLength: number;
        sha256: string;
      }>,
    },
    export: {
      tool: "Blender",
      toolVersion: "5.2.0",
      exporter: "Synthetic glTF exporter fixture",
      exporterVersion: "1.0.0",
      coordinateSystem: "right-handed-y-up",
      unitScaleMeters: 1,
    },
    rig: {
      convention: "anzania-humanoid-v1",
      skeletonRoot: "anzania-root",
      jointCount: 96,
      maximumSkinInfluences: 4,
      completeRigCount: 1,
    },
    lods: [
      {
        lod: 0,
        meshCount: 1,
        visibleTriangles: 65_000,
        drawCalls: 1,
        materialIds: ["mat-character"],
      },
      {
        lod: 1,
        meshCount: 1,
        visibleTriangles: 35_000,
        drawCalls: 1,
        materialIds: ["mat-character"],
      },
      {
        lod: 2,
        meshCount: 1,
        visibleTriangles: 19_000,
        drawCalls: 1,
        materialIds: ["mat-character"],
      },
      {
        lod: 3,
        meshCount: 1,
        visibleTriangles: 9_000,
        drawCalls: 1,
        materialIds: ["mat-character"],
      },
      {
        lod: 4,
        meshCount: 1,
        visibleTriangles: 4_500,
        drawCalls: 1,
        materialIds: ["mat-character"],
      },
    ],
    materials: [
      {
        id: "mat-character",
        shader: "pbr-metallic-roughness",
        alphaMode: "OPAQUE",
        textureIds: ["tex-character"],
      },
    ],
    textures: [
      {
        id: "tex-character",
        role: "base-color",
        mimeType: "image/ktx2",
        edgePx: 1_024,
        byteLength: 512 * 1024,
        source: { storage: "embedded" },
      },
    ],
    animations: {
      manifest: {
        version: 1,
        rigConvention: "anzania-humanoid-v1",
        clips,
      },
      clipCount: clips.length,
      totalDurationMs,
      binaryByteLength: 2 * 1024 * 1024,
      sampleRateHz: 30,
      maximumKeyframesPerTrack: 300,
    },
    bounds: {
      coordinateSpace: "character-local-y-up",
      unit: "metre",
      groundPlaneY: 0,
      rest: {
        min: [-0.5, 0, -0.3],
        max: [0.5, 1.86, 0.3],
      },
      animatedEnvelope: {
        min: [-0.9, -0.02, -0.65],
        max: [0.9, 2.2, 0.75],
      },
      safePaddingMeters: 0.1,
      includes: {
        headwear: true,
        hands: true,
        footwear: true,
        garmentTails: true,
        pouches: true,
        accessories: true,
        powerRelevantSilhouette: true,
      },
      sampledClipIds: clips.map(({ id }) => id),
    },
    cameraContract: {
      mode: "distant-full-body-third-person",
      animatedEnvelopeDriven: true,
      completeCharacterVisible: true,
      primaryScreenRegion: "lower-third",
      authoredPowerExcursionsAllowed: true,
      normalViewportHeightPercent: {
        minimum: 14,
        maximum: 20,
        hardMaximum: 24,
      },
    },
    provenance: {
      classification: "approved-public-derivative",
      sourceAssetIds: ["src-0123456789ab"],
      sourceDigests: ["2".repeat(64)],
      approvalDigest: "3".repeat(64),
      derivativeOnly: true,
      metadataSanitised: true,
      redistributionApproved: true,
    },
  };
}

function issueCodes(input: unknown): string[] {
  const result = validateCharacterProductionAsset(input);
  return result.ok ? [] : result.issues.map(({ code }) => code);
}

describe("character glTF/GLB production asset gate", () => {
  it("accepts a complete synthetic GLB export contract", () => {
    const result = validateCharacterProductionAsset(
      makeSyntheticProductionManifest(),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.lods.map(({ lod }) => lod)).toEqual([
        0, 1, 2, 3, 4,
      ]);
      expect(result.metadata.bounds.includes.powerRelevantSilhouette).toBe(
        true,
      );
    }
  });

  it("accepts a complete synthetic glTF export with a declared buffer", () => {
    const manifest = makeSyntheticProductionManifest();
    manifest.file.uri = "assets/immersive/characters/dn-m-afr-01-lods.gltf";
    manifest.file.format = "gltf";
    manifest.file.mimeType = "model/gltf+json";
    manifest.file.resources = [
      {
        kind: "buffer",
        uri: "assets/immersive/characters/dn-m-afr-01-lods.bin",
        mimeType: "application/octet-stream",
        byteLength: 4 * 1024 * 1024,
        sha256: "4".repeat(64),
      },
    ];

    expect(validateCharacterProductionAsset(manifest).ok).toBe(true);
  });

  it("rejects OTS values and fields even when injected outside the schema", () => {
    const manifest = makeSyntheticProductionManifest() as Record<
      string,
      unknown
    >;
    manifest.cameraHint = "over-the-shoulder";

    expect(issueCodes(manifest)).toContain("unsafe-camera-metadata");
  });

  it("rejects incomplete required metadata", () => {
    const manifest = makeSyntheticProductionManifest() as Record<
      string,
      unknown
    >;
    delete manifest.bounds;
    const result = validateCharacterProductionAsset(manifest);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "schema-invalid",
          path: "$.bounds",
        }),
      );
    }
  });

  it("applies deterministic LOD, material and animation budgets", () => {
    const manifest = makeSyntheticProductionManifest();
    manifest.lods[2]!.visibleTriangles = 25_000;
    manifest.lods[2]!.drawCalls = 8;
    manifest.textures[0]!.edgePx = 4_096;
    manifest.materials = [
      manifest.materials[0]!,
      ...Array.from(
        {
          length: CHARACTER_PRODUCTION_EXPORT_BUDGETS.maximumMaterials,
        },
        (_, index) => ({
          id: `mat-synthetic-${index}`,
          shader: "pbr-metallic-roughness",
          alphaMode: "OPAQUE",
          textureIds: ["tex-character"],
        }),
      ),
    ];
    manifest.animations.binaryByteLength =
      CHARACTER_PRODUCTION_EXPORT_BUDGETS.maximumAnimationBytes + 1;
    manifest.animations.sampleRateHz = 60;
    manifest.animations.totalDurationMs += 1;

    const first = validateCharacterProductionAsset(manifest);
    const second = validateCharacterProductionAsset(manifest);

    expect(first).toEqual(second);
    expect(issueCodes(manifest)).toEqual(
      expect.arrayContaining([
        "animation-byte-ceiling",
        "animation-duration-mismatch",
        "animation-sample-rate",
        "lod-draw-call-ceiling",
        "lod-texture-ceiling",
        "lod-triangle-ceiling",
        "material-count-ceiling",
      ]),
    );
  });

  it("rejects animated bounds that can crop the body or omit clips", () => {
    const manifest = makeSyntheticProductionManifest();
    manifest.bounds.animatedEnvelope.max[1] = 1.7;
    manifest.bounds.sampledClipIds.pop();

    expect(issueCodes(manifest)).toEqual(
      expect.arrayContaining([
        "bounds-animation-coverage",
        "bounds-rest-outside-animated-envelope",
      ]),
    );
  });

  it("rejects synthetic raw/private provenance fields and local source paths", () => {
    const manifest = makeSyntheticProductionManifest();
    const provenance = manifest.provenance as Record<string, unknown>;
    provenance.sourceArchive = "C:\\synthetic-private\\character-source.blend";

    expect(issueCodes(manifest)).toContain("unsafe-provenance-metadata");
  });
});
