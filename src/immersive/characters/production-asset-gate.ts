import { z } from "zod";

import {
  CHARACTER_LOD_BUDGETS,
  REQUIRED_COMPACT_ANIMATION_FAMILIES,
  animationManifestSchema,
  type CharacterLod,
} from "../animation";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CHARACTER_ID_PATTERN = /^DN-[MFN]-(AFR|EAS|SAS|MENA|EUR)-01$/;
const SAFE_ID_PATTERN = /^[a-z][a-z0-9-]{2,63}$/;
const SAFE_SOURCE_ID_PATTERN = /^src-[0-9a-f]{12}$/;
const PRIMARY_ASSET_URI_PATTERN =
  /^assets\/immersive\/characters\/[a-z0-9][a-z0-9/_-]*\.(?:glb|gltf)$/;
const RESOURCE_URI_PATTERN =
  /^assets\/immersive\/characters\/[a-z0-9][a-z0-9/_.-]*\.(?:bin|ktx2|webp)$/;

const OTS_METADATA_PATTERN =
  /(?:^|[^a-z0-9])ots(?:$|[^a-z0-9])|over[\s_-]*the[\s_-]*shoulder|overShoulder|shoulder[\s_-]*camera/i;
const PRIVATE_VALUE_PATTERN =
  /(?:^|[^a-z0-9])(?:raw|private)(?:$|[^a-z0-9])|(?:^|[\\/])(?:Users|home)[\\/]|^[a-z]:[\\/]|^file:|^\\\\|(?:\.blend\d*|\.fbx|\.obj|\.psd|\.zip|\.7z|\.rar)(?:$|[?#\s])/i;

const VECTOR_AXES = ["x", "y", "z"] as const;
const REQUIRED_LODS = [
  0, 1, 2, 3, 4,
] as const satisfies readonly CharacterLod[];

export const CHARACTER_PRODUCTION_EXPORT_BUDGETS = {
  maximumPrimaryAssetBytes: 16 * 1024 * 1024,
  maximumTotalAssetBytes: 24 * 1024 * 1024,
  maximumMaterials: 12,
  maximumTextures: 20,
  maximumTextureBytes: 12 * 1024 * 1024,
  maximumAnimationBytes: 5 * 1024 * 1024,
  maximumAnimationDurationMs: 40_000,
  maximumKeyframesPerTrack: 1_024,
  animationSampleRateHz: 30,
  maximumJoints: 160,
  minimumRestHeightMeters: 1.2,
  maximumFootToGroundDistanceMeters: 0.03,
} as const;

const safeIdSchema = z.string().regex(SAFE_ID_PATTERN);
const sha256Schema = z.string().regex(SHA256_PATTERN);
const vector3Schema = z.tuple([z.number(), z.number(), z.number()]);

const boundsBoxSchema = z
  .object({
    min: vector3Schema,
    max: vector3Schema,
  })
  .strict();

const fileResourceSchema = z
  .object({
    kind: z.enum(["buffer", "texture"]),
    uri: z.string().regex(RESOURCE_URI_PATTERN),
    mimeType: z.enum(["application/octet-stream", "image/ktx2", "image/webp"]),
    byteLength: z.number().int().positive(),
    sha256: sha256Schema,
  })
  .strict();

const primaryFileSchema = z
  .object({
    uri: z.string().regex(PRIMARY_ASSET_URI_PATTERN),
    format: z.enum(["glb", "gltf"]),
    mimeType: z.enum(["model/gltf-binary", "model/gltf+json"]),
    byteLength: z.number().int().positive(),
    sha256: sha256Schema,
    resources: z.array(fileResourceSchema).max(32),
  })
  .strict();

const textureSourceSchema = z.discriminatedUnion("storage", [
  z
    .object({
      storage: z.literal("embedded"),
    })
    .strict(),
  z
    .object({
      storage: z.literal("external"),
      uri: z.string().regex(RESOURCE_URI_PATTERN),
    })
    .strict(),
]);

const textureSchema = z
  .object({
    id: safeIdSchema,
    role: z.enum([
      "base-color",
      "normal",
      "metallic-roughness",
      "occlusion",
      "emissive",
    ]),
    mimeType: z.enum(["image/ktx2", "image/webp"]),
    edgePx: z.number().int().positive(),
    byteLength: z.number().int().positive(),
    source: textureSourceSchema,
  })
  .strict();

const materialSchema = z
  .object({
    id: safeIdSchema,
    shader: z.literal("pbr-metallic-roughness"),
    alphaMode: z.enum(["OPAQUE", "MASK", "BLEND"]),
    textureIds: z.array(safeIdSchema).min(1).max(5),
  })
  .strict();

const lodSchema = z
  .object({
    lod: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
    meshCount: z.number().int().positive(),
    visibleTriangles: z.number().int().positive(),
    drawCalls: z.number().int().positive(),
    materialIds: z.array(safeIdSchema).min(1),
  })
  .strict();

const animatedBoundsSchema = z
  .object({
    coordinateSpace: z.literal("character-local-y-up"),
    unit: z.literal("metre"),
    groundPlaneY: z.number(),
    rest: boundsBoxSchema,
    animatedEnvelope: boundsBoxSchema,
    safePaddingMeters: z.number().min(0.05).max(0.5),
    includes: z
      .object({
        headwear: z.literal(true),
        hands: z.literal(true),
        footwear: z.literal(true),
        garmentTails: z.literal(true),
        pouches: z.literal(true),
        accessories: z.literal(true),
        powerRelevantSilhouette: z.literal(true),
      })
      .strict(),
    sampledClipIds: z.array(safeIdSchema).min(1),
  })
  .strict();

const cameraContractSchema = z
  .object({
    mode: z.literal("distant-full-body-third-person"),
    animatedEnvelopeDriven: z.literal(true),
    completeCharacterVisible: z.literal(true),
    primaryScreenRegion: z.literal("lower-third"),
    authoredPowerExcursionsAllowed: z.literal(true),
    normalViewportHeightPercent: z
      .object({
        minimum: z.literal(14),
        maximum: z.literal(20),
        hardMaximum: z.literal(24),
      })
      .strict(),
  })
  .strict();

const provenanceSchema = z
  .object({
    classification: z.literal("approved-public-derivative"),
    sourceAssetIds: z
      .array(z.string().regex(SAFE_SOURCE_ID_PATTERN))
      .min(1)
      .max(8),
    sourceDigests: z.array(sha256Schema).min(1).max(8),
    approvalDigest: sha256Schema,
    derivativeOnly: z.literal(true),
    metadataSanitised: z.literal(true),
    redistributionApproved: z.literal(true),
  })
  .strict();

export const characterProductionAssetMetadataSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    manifestRevision: z.number().int().positive(),
    assetId: safeIdSchema,
    characterId: z.string().regex(CHARACTER_ID_PATTERN),
    generatedAtUtc: z.iso.datetime({ offset: true }),
    contentFingerprint: sha256Schema,
    file: primaryFileSchema,
    export: z
      .object({
        tool: z.literal("Blender"),
        toolVersion: z.string().regex(/^5\.2(?:\.\d+)?$/),
        exporter: z.string().trim().min(3).max(80),
        exporterVersion: z.string().trim().min(1).max(40),
        coordinateSystem: z.literal("right-handed-y-up"),
        unitScaleMeters: z.literal(1),
      })
      .strict(),
    rig: z
      .object({
        convention: z.literal("anzania-humanoid-v1"),
        skeletonRoot: safeIdSchema,
        jointCount: z.number().int().positive(),
        maximumSkinInfluences: z.literal(4),
        completeRigCount: z.literal(1),
      })
      .strict(),
    lods: z.array(lodSchema).min(1).max(REQUIRED_LODS.length),
    materials: z.array(materialSchema).min(1),
    textures: z.array(textureSchema).min(1),
    animations: z
      .object({
        manifest: animationManifestSchema,
        clipCount: z.number().int().positive(),
        totalDurationMs: z.number().int().positive(),
        binaryByteLength: z.number().int().positive(),
        sampleRateHz: z.number().int().positive(),
        maximumKeyframesPerTrack: z.number().int().positive(),
      })
      .strict(),
    bounds: animatedBoundsSchema,
    cameraContract: cameraContractSchema,
    provenance: provenanceSchema,
  })
  .strict();

export type CharacterProductionAssetMetadata = z.infer<
  typeof characterProductionAssetMetadataSchema
>;

export type CharacterProductionAssetGateCode =
  | "animation-byte-ceiling"
  | "animation-clip-count"
  | "animation-duration-ceiling"
  | "animation-duration-mismatch"
  | "animation-family-count"
  | "animation-keyframe-ceiling"
  | "animation-rig-mismatch"
  | "animation-sample-rate"
  | "asset-byte-ceiling"
  | "asset-id-mismatch"
  | "bounds-animation-coverage"
  | "bounds-box-invalid"
  | "bounds-foot-ground-alignment"
  | "bounds-rest-height"
  | "bounds-rest-outside-animated-envelope"
  | "duplicate-file-resource"
  | "duplicate-lod"
  | "duplicate-material"
  | "duplicate-material-reference"
  | "duplicate-provenance-reference"
  | "duplicate-texture"
  | "duplicate-texture-reference"
  | "file-format-mismatch"
  | "file-resource-policy"
  | "lod-draw-call-ceiling"
  | "lod-material-reference"
  | "lod-order"
  | "lod-set-incomplete"
  | "lod-texture-ceiling"
  | "lod-triangle-ceiling"
  | "lod-triangle-floor"
  | "lod-triangle-order"
  | "material-count-ceiling"
  | "material-draw-call-mismatch"
  | "material-texture-reference"
  | "provenance-reference-count"
  | "rig-joint-ceiling"
  | "schema-invalid"
  | "texture-byte-ceiling"
  | "texture-count-ceiling"
  | "texture-resource-reference"
  | "texture-size-invalid"
  | "total-byte-ceiling"
  | "unsafe-camera-metadata"
  | "unsafe-provenance-metadata"
  | "unused-file-resource"
  | "unused-material"
  | "unused-texture";

export interface CharacterProductionAssetGateIssue {
  readonly code: CharacterProductionAssetGateCode;
  readonly path: string;
  readonly message: string;
}

export type CharacterProductionAssetGateResult =
  | {
      readonly ok: true;
      readonly metadata: CharacterProductionAssetMetadata;
      readonly issues: readonly [];
    }
  | {
      readonly ok: false;
      readonly issues: readonly CharacterProductionAssetGateIssue[];
    };

function appendPath(path: string, part: string | number): string {
  return typeof part === "number" ? `${path}[${part}]` : `${path}.${part}`;
}

function zodPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>(
    (current, part) => appendPath(current, String(part)),
    "$",
  );
}

function normaliseKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();
}

function isUnsafeProvenanceKey(key: string): boolean {
  const normalised = normaliseKey(key);
  const tokens = normalised.split("-").filter(Boolean);
  if (tokens.includes("raw") || tokens.includes("private")) return true;

  return /^(?:source|local)-(?:file|files|filename|filenames|path|paths|archive|archives)$/.test(
    normalised,
  );
}

function collectUnsafeMetadataIssues(
  value: unknown,
  addIssue: (issue: CharacterProductionAssetGateIssue) => void,
  path = "$",
): void {
  if (typeof value === "string") {
    if (OTS_METADATA_PATTERN.test(value)) {
      addIssue({
        code: "unsafe-camera-metadata",
        path,
        message:
          "Character export metadata must not contain an OTS camera mode.",
      });
    }
    if (PRIVATE_VALUE_PATTERN.test(value)) {
      addIssue({
        code: "unsafe-provenance-metadata",
        path,
        message:
          "Character export metadata must not expose raw/private labels, local paths, archives or source-file formats.",
      });
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      collectUnsafeMetadataIssues(item, addIssue, appendPath(path, index));
    }
    return;
  }

  if (value === null || typeof value !== "object") return;

  for (const [key, item] of Object.entries(value)) {
    const itemPath = appendPath(path, key);
    if (OTS_METADATA_PATTERN.test(key)) {
      addIssue({
        code: "unsafe-camera-metadata",
        path: itemPath,
        message:
          "Character export metadata must not declare an OTS camera field.",
      });
    }
    if (isUnsafeProvenanceKey(key)) {
      addIssue({
        code: "unsafe-provenance-metadata",
        path: itemPath,
        message:
          "Character export metadata must use opaque source IDs and digests instead of raw/private provenance fields.",
      });
    }
    collectUnsafeMetadataIssues(item, addIssue, itemPath);
  }
}

function sameOrderedValues<T>(
  actual: readonly T[],
  expected: readonly T[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function sameValueSet<T>(
  actual: readonly T[],
  expected: readonly T[],
): boolean {
  return (
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    expected.every((value) => actual.includes(value))
  );
}

function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

function validateBoundsBox(
  box: { readonly min: readonly number[]; readonly max: readonly number[] },
  path: string,
  addIssue: (issue: CharacterProductionAssetGateIssue) => void,
): boolean {
  let valid = true;
  for (const [axisIndex, axis] of VECTOR_AXES.entries()) {
    if (box.min[axisIndex]! >= box.max[axisIndex]!) {
      valid = false;
      addIssue({
        code: "bounds-box-invalid",
        path: `${path}.${axis}`,
        message: `Bounds minimum must be below maximum on the ${axis}-axis.`,
      });
    }
  }
  return valid;
}

function collectSemanticIssues(
  metadata: CharacterProductionAssetMetadata,
  addIssue: (issue: CharacterProductionAssetGateIssue) => void,
): void {
  const expectedFormat = metadata.file.uri.endsWith(".glb") ? "glb" : "gltf";
  const expectedMimeType =
    expectedFormat === "glb" ? "model/gltf-binary" : "model/gltf+json";
  if (
    metadata.file.format !== expectedFormat ||
    metadata.file.mimeType !== expectedMimeType
  ) {
    addIssue({
      code: "file-format-mismatch",
      path: "$.file",
      message:
        "File extension, declared glTF format and MIME type must describe the same export.",
    });
  }

  const expectedAssetToken = metadata.characterId.toLowerCase();
  if (
    !metadata.assetId.includes(expectedAssetToken) ||
    !metadata.file.uri.includes(expectedAssetToken)
  ) {
    addIssue({
      code: "asset-id-mismatch",
      path: "$.assetId",
      message:
        "Asset ID and public URI must both include the canonical character ID.",
    });
  }

  if (
    metadata.file.byteLength >
    CHARACTER_PRODUCTION_EXPORT_BUDGETS.maximumPrimaryAssetBytes
  ) {
    addIssue({
      code: "asset-byte-ceiling",
      path: "$.file.byteLength",
      message: "Primary character export exceeds its byte budget.",
    });
  }

  const resourceUris = new Set<string>();
  for (const [index, resource] of metadata.file.resources.entries()) {
    if (resourceUris.has(resource.uri)) {
      addIssue({
        code: "duplicate-file-resource",
        path: `$.file.resources[${index}].uri`,
        message: `Duplicate external resource URI "${resource.uri}".`,
      });
    }
    resourceUris.add(resource.uri);
  }

  if (
    (metadata.file.format === "glb" && metadata.file.resources.length > 0) ||
    (metadata.file.format === "gltf" &&
      !metadata.file.resources.some(({ kind }) => kind === "buffer"))
  ) {
    addIssue({
      code: "file-resource-policy",
      path: "$.file.resources",
      message:
        "GLB exports must be self-contained; glTF exports require a declared external buffer.",
    });
  }

  const totalAssetBytes =
    metadata.file.byteLength +
    metadata.file.resources.reduce(
      (total, resource) => total + resource.byteLength,
      0,
    );
  if (
    totalAssetBytes > CHARACTER_PRODUCTION_EXPORT_BUDGETS.maximumTotalAssetBytes
  ) {
    addIssue({
      code: "total-byte-ceiling",
      path: "$.file",
      message:
        "Character export and its resources exceed the total byte budget.",
    });
  }

  if (
    metadata.rig.jointCount > CHARACTER_PRODUCTION_EXPORT_BUDGETS.maximumJoints
  ) {
    addIssue({
      code: "rig-joint-ceiling",
      path: "$.rig.jointCount",
      message: "Character rig exceeds the production joint budget.",
    });
  }

  const materialById = new Map(
    metadata.materials.map((material) => [material.id, material] as const),
  );
  const textureById = new Map(
    metadata.textures.map((texture) => [texture.id, texture] as const),
  );

  if (materialById.size !== metadata.materials.length) {
    addIssue({
      code: "duplicate-material",
      path: "$.materials",
      message: "Material IDs must be unique.",
    });
  }
  if (textureById.size !== metadata.textures.length) {
    addIssue({
      code: "duplicate-texture",
      path: "$.textures",
      message: "Texture IDs must be unique.",
    });
  }
  if (
    metadata.materials.length >
    CHARACTER_PRODUCTION_EXPORT_BUDGETS.maximumMaterials
  ) {
    addIssue({
      code: "material-count-ceiling",
      path: "$.materials",
      message: "Character export exceeds the material-count budget.",
    });
  }
  if (
    metadata.textures.length >
    CHARACTER_PRODUCTION_EXPORT_BUDGETS.maximumTextures
  ) {
    addIssue({
      code: "texture-count-ceiling",
      path: "$.textures",
      message: "Character export exceeds the texture-count budget.",
    });
  }

  const textureBytes = metadata.textures.reduce(
    (total, texture) => total + texture.byteLength,
    0,
  );
  if (textureBytes > CHARACTER_PRODUCTION_EXPORT_BUDGETS.maximumTextureBytes) {
    addIssue({
      code: "texture-byte-ceiling",
      path: "$.textures",
      message: "Character export exceeds the decoded texture byte budget.",
    });
  }

  const referencedTextureIds = new Set<string>();
  for (const [materialIndex, material] of metadata.materials.entries()) {
    const uniqueTextureIds = new Set(material.textureIds);
    if (uniqueTextureIds.size !== material.textureIds.length) {
      addIssue({
        code: "duplicate-texture-reference",
        path: `$.materials[${materialIndex}].textureIds`,
        message: `Material "${material.id}" repeats a texture reference.`,
      });
    }
    for (const textureId of uniqueTextureIds) {
      referencedTextureIds.add(textureId);
      if (!textureById.has(textureId)) {
        addIssue({
          code: "material-texture-reference",
          path: `$.materials[${materialIndex}].textureIds`,
          message: `Material "${material.id}" references unknown texture "${textureId}".`,
        });
      }
    }
  }

  for (const [textureIndex, texture] of metadata.textures.entries()) {
    const textureSource = texture.source;
    if (!isPowerOfTwo(texture.edgePx)) {
      addIssue({
        code: "texture-size-invalid",
        path: `$.textures[${textureIndex}].edgePx`,
        message: `Texture "${texture.id}" must use a power-of-two edge size.`,
      });
    }
    if (
      textureSource.storage === "external" &&
      !metadata.file.resources.some(
        (resource) =>
          resource.kind === "texture" &&
          resource.uri === textureSource.uri &&
          resource.mimeType === texture.mimeType,
      )
    ) {
      addIssue({
        code: "texture-resource-reference",
        path: `$.textures[${textureIndex}].source`,
        message: `Texture "${texture.id}" lacks matching external resource metadata.`,
      });
    }
    if (
      metadata.file.format === "glb" &&
      textureSource.storage !== "embedded"
    ) {
      addIssue({
        code: "file-resource-policy",
        path: `$.textures[${textureIndex}].source`,
        message: "GLB textures must be embedded in the self-contained export.",
      });
    }
    if (!referencedTextureIds.has(texture.id)) {
      addIssue({
        code: "unused-texture",
        path: `$.textures[${textureIndex}].id`,
        message: `Texture "${texture.id}" is not referenced by a material.`,
      });
    }
  }

  const lodValues = metadata.lods.map(({ lod }) => lod);
  if (!sameValueSet(lodValues, REQUIRED_LODS)) {
    addIssue({
      code: "lod-set-incomplete",
      path: "$.lods",
      message:
        "Production character exports require exactly LOD0 through LOD4.",
    });
  }
  if (new Set(lodValues).size !== lodValues.length) {
    addIssue({
      code: "duplicate-lod",
      path: "$.lods",
      message: "Each production LOD may appear only once.",
    });
  }
  if (!sameOrderedValues(lodValues, REQUIRED_LODS)) {
    addIssue({
      code: "lod-order",
      path: "$.lods",
      message: "LOD metadata must use deterministic LOD0-to-LOD4 order.",
    });
  }

  const referencedMaterialIds = new Set<string>();
  let previousTriangleCount = Number.POSITIVE_INFINITY;
  for (const [lodIndex, lod] of metadata.lods.entries()) {
    const budget = CHARACTER_LOD_BUDGETS[lod.lod];
    if (lod.visibleTriangles < budget.minimumTriangles) {
      addIssue({
        code: "lod-triangle-floor",
        path: `$.lods[${lodIndex}].visibleTriangles`,
        message: `LOD${lod.lod} falls below its deterministic triangle floor.`,
      });
    }
    if (lod.visibleTriangles > budget.maximumTriangles) {
      addIssue({
        code: "lod-triangle-ceiling",
        path: `$.lods[${lodIndex}].visibleTriangles`,
        message: `LOD${lod.lod} exceeds its deterministic triangle ceiling.`,
      });
    }
    if (lod.visibleTriangles >= previousTriangleCount) {
      addIssue({
        code: "lod-triangle-order",
        path: `$.lods[${lodIndex}].visibleTriangles`,
        message: "Each successive LOD must reduce visible triangle count.",
      });
    }
    previousTriangleCount = lod.visibleTriangles;

    if (lod.drawCalls > budget.maximumDrawCalls) {
      addIssue({
        code: "lod-draw-call-ceiling",
        path: `$.lods[${lodIndex}].drawCalls`,
        message: `LOD${lod.lod} exceeds its deterministic draw-call ceiling.`,
      });
    }

    const uniqueMaterialIds = new Set(lod.materialIds);
    if (uniqueMaterialIds.size !== lod.materialIds.length) {
      addIssue({
        code: "duplicate-material-reference",
        path: `$.lods[${lodIndex}].materialIds`,
        message: `LOD${lod.lod} repeats a material reference.`,
      });
    }
    if (lod.drawCalls < uniqueMaterialIds.size) {
      addIssue({
        code: "material-draw-call-mismatch",
        path: `$.lods[${lodIndex}]`,
        message: `LOD${lod.lod} declares fewer draw calls than material slots.`,
      });
    }

    let largestTextureEdgePx = 0;
    for (const materialId of uniqueMaterialIds) {
      referencedMaterialIds.add(materialId);
      const material = materialById.get(materialId);
      if (material === undefined) {
        addIssue({
          code: "lod-material-reference",
          path: `$.lods[${lodIndex}].materialIds`,
          message: `LOD${lod.lod} references unknown material "${materialId}".`,
        });
        continue;
      }
      for (const textureId of material.textureIds) {
        largestTextureEdgePx = Math.max(
          largestTextureEdgePx,
          textureById.get(textureId)?.edgePx ?? 0,
        );
      }
    }
    if (largestTextureEdgePx > budget.maximumTextureEdgePx) {
      addIssue({
        code: "lod-texture-ceiling",
        path: `$.lods[${lodIndex}].materialIds`,
        message: `LOD${lod.lod} references a texture above its edge-size ceiling.`,
      });
    }
  }

  for (const [materialIndex, material] of metadata.materials.entries()) {
    if (!referencedMaterialIds.has(material.id)) {
      addIssue({
        code: "unused-material",
        path: `$.materials[${materialIndex}].id`,
        message: `Material "${material.id}" is not referenced by any LOD.`,
      });
    }
  }

  const usedResourceUris = new Set(
    metadata.textures.flatMap((texture) =>
      texture.source.storage === "external" ? [texture.source.uri] : [],
    ),
  );
  for (const [resourceIndex, resource] of metadata.file.resources.entries()) {
    if (resource.kind === "buffer") {
      usedResourceUris.add(resource.uri);
    }
    if (!usedResourceUris.has(resource.uri)) {
      addIssue({
        code: "unused-file-resource",
        path: `$.file.resources[${resourceIndex}].uri`,
        message: `External resource "${resource.uri}" is not used by the export metadata.`,
      });
    }
  }

  const clips = metadata.animations.manifest.clips;
  if (metadata.animations.manifest.rigConvention !== metadata.rig.convention) {
    addIssue({
      code: "animation-rig-mismatch",
      path: "$.animations.manifest.rigConvention",
      message: "Animation and character export rig conventions must match.",
    });
  }
  if (
    metadata.animations.clipCount !== clips.length ||
    clips.length !== REQUIRED_COMPACT_ANIMATION_FAMILIES.length
  ) {
    addIssue({
      code: "animation-clip-count",
      path: "$.animations.clipCount",
      message:
        "Animation clip count must match one complete compact animation family set.",
    });
  }

  const familyCounts = new Map<string, number>();
  for (const clip of clips) {
    familyCounts.set(clip.family, (familyCounts.get(clip.family) ?? 0) + 1);
  }
  if (
    REQUIRED_COMPACT_ANIMATION_FAMILIES.some(
      (family) => familyCounts.get(family) !== 1,
    )
  ) {
    addIssue({
      code: "animation-family-count",
      path: "$.animations.manifest.clips",
      message:
        "Each required compact animation family must appear exactly once.",
    });
  }

  const calculatedDurationMs = clips.reduce(
    (total, clip) => total + clip.durationMs,
    0,
  );
  if (metadata.animations.totalDurationMs !== calculatedDurationMs) {
    addIssue({
      code: "animation-duration-mismatch",
      path: "$.animations.totalDurationMs",
      message: "Declared animation duration must equal the clip-duration sum.",
    });
  }
  if (
    calculatedDurationMs >
    CHARACTER_PRODUCTION_EXPORT_BUDGETS.maximumAnimationDurationMs
  ) {
    addIssue({
      code: "animation-duration-ceiling",
      path: "$.animations.totalDurationMs",
      message: "Compact animation set exceeds its duration budget.",
    });
  }
  if (
    metadata.animations.binaryByteLength >
    CHARACTER_PRODUCTION_EXPORT_BUDGETS.maximumAnimationBytes
  ) {
    addIssue({
      code: "animation-byte-ceiling",
      path: "$.animations.binaryByteLength",
      message: "Animation payload exceeds its byte budget.",
    });
  }
  if (
    metadata.animations.sampleRateHz !==
    CHARACTER_PRODUCTION_EXPORT_BUDGETS.animationSampleRateHz
  ) {
    addIssue({
      code: "animation-sample-rate",
      path: "$.animations.sampleRateHz",
      message:
        "Animation sample rate must use the deterministic production rate.",
    });
  }
  if (
    metadata.animations.maximumKeyframesPerTrack >
    CHARACTER_PRODUCTION_EXPORT_BUDGETS.maximumKeyframesPerTrack
  ) {
    addIssue({
      code: "animation-keyframe-ceiling",
      path: "$.animations.maximumKeyframesPerTrack",
      message: "Animation track exceeds its keyframe budget.",
    });
  }

  const restValid = validateBoundsBox(
    metadata.bounds.rest,
    "$.bounds.rest",
    addIssue,
  );
  const animatedValid = validateBoundsBox(
    metadata.bounds.animatedEnvelope,
    "$.bounds.animatedEnvelope",
    addIssue,
  );
  if (restValid && animatedValid) {
    const restOutsideEnvelope = VECTOR_AXES.some(
      (_, axisIndex) =>
        metadata.bounds.rest.min[axisIndex]! <
          metadata.bounds.animatedEnvelope.min[axisIndex]! ||
        metadata.bounds.rest.max[axisIndex]! >
          metadata.bounds.animatedEnvelope.max[axisIndex]!,
    );
    if (restOutsideEnvelope) {
      addIssue({
        code: "bounds-rest-outside-animated-envelope",
        path: "$.bounds",
        message:
          "Animated full-body envelope must contain the complete rest bounds.",
      });
    }
  }

  const restHeight = metadata.bounds.rest.max[1] - metadata.bounds.rest.min[1];
  if (
    restHeight < CHARACTER_PRODUCTION_EXPORT_BUDGETS.minimumRestHeightMeters
  ) {
    addIssue({
      code: "bounds-rest-height",
      path: "$.bounds.rest",
      message: "Rest bounds are too short to describe a complete body.",
    });
  }
  if (
    Math.abs(metadata.bounds.rest.min[1] - metadata.bounds.groundPlaneY) >
    CHARACTER_PRODUCTION_EXPORT_BUDGETS.maximumFootToGroundDistanceMeters
  ) {
    addIssue({
      code: "bounds-foot-ground-alignment",
      path: "$.bounds.groundPlaneY",
      message: "Footwear bounds must align with the declared ground plane.",
    });
  }

  const clipIds = clips.map(({ id }) => id);
  if (!sameValueSet(metadata.bounds.sampledClipIds, clipIds)) {
    addIssue({
      code: "bounds-animation-coverage",
      path: "$.bounds.sampledClipIds",
      message:
        "Animated full-body bounds must be sampled against every exported clip exactly once.",
    });
  }

  if (
    metadata.provenance.sourceAssetIds.length !==
    metadata.provenance.sourceDigests.length
  ) {
    addIssue({
      code: "provenance-reference-count",
      path: "$.provenance",
      message: "Each opaque source asset ID requires one source digest.",
    });
  }
  if (
    new Set(metadata.provenance.sourceAssetIds).size !==
      metadata.provenance.sourceAssetIds.length ||
    new Set(metadata.provenance.sourceDigests).size !==
      metadata.provenance.sourceDigests.length
  ) {
    addIssue({
      code: "duplicate-provenance-reference",
      path: "$.provenance",
      message: "Opaque source IDs and source digests must be unique.",
    });
  }
}

function compareIssues(
  left: CharacterProductionAssetGateIssue,
  right: CharacterProductionAssetGateIssue,
): number {
  const leftKey = `${left.path}\u0000${left.code}\u0000${left.message}`;
  const rightKey = `${right.path}\u0000${right.code}\u0000${right.message}`;
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

export function validateCharacterProductionAsset(
  input: unknown,
): CharacterProductionAssetGateResult {
  const issues: CharacterProductionAssetGateIssue[] = [];
  const seenIssues = new Set<string>();
  const addIssue = (issue: CharacterProductionAssetGateIssue): void => {
    const key = `${issue.code}\u0000${issue.path}\u0000${issue.message}`;
    if (!seenIssues.has(key)) {
      seenIssues.add(key);
      issues.push(issue);
    }
  };

  collectUnsafeMetadataIssues(input, addIssue);

  const parsed = characterProductionAssetMetadataSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      addIssue({
        code: "schema-invalid",
        path: zodPath(issue.path),
        message: issue.message,
      });
    }
  } else {
    collectSemanticIssues(parsed.data, addIssue);
  }

  issues.sort(compareIssues);
  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    metadata: parsed.data as CharacterProductionAssetMetadata,
    issues: [],
  };
}

export class CharacterProductionAssetGateError extends Error {
  public readonly issues: readonly CharacterProductionAssetGateIssue[];

  public constructor(issues: readonly CharacterProductionAssetGateIssue[]) {
    super(
      `Character production asset gate failed with ${issues.length} issue(s).`,
    );
    this.name = "CharacterProductionAssetGateError";
    this.issues = issues;
  }
}

export function assertCharacterProductionAsset(
  input: unknown,
): CharacterProductionAssetMetadata {
  const result = validateCharacterProductionAsset(input);
  if (!result.ok) throw new CharacterProductionAssetGateError(result.issues);
  return result.metadata;
}
