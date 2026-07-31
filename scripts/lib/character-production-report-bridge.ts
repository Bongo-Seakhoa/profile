import { createHash } from "node:crypto";

import { z } from "zod";

import {
  REQUIRED_COMPACT_ANIMATION_FAMILIES,
  type CharacterLod,
} from "../../src/immersive/animation";
import {
  validateCharacterProductionAsset,
  type CharacterProductionAssetMetadata,
} from "../../src/immersive/characters/production-asset-gate";

const REQUIRED_LODS = [0, 1, 2, 3, 4] as const;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BINARY_CHUNK = 0x004e4942;
const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const TARGET_SAMPLE_RATE_HZ = 30;
const SAMPLE_RATE_TOLERANCE_HZ = 0.05;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CHARACTER_ID_PATTERN = /^DN-[MFN]-(AFR|EAS|SAS|MENA|EUR)-01$/;
const SAFE_ID_PATTERN = /^[a-z][a-z0-9-]{2,63}$/;
const SAFE_SOURCE_ID_PATTERN = /^src-[0-9a-f]{12}$/;
const PUBLIC_GLB_URI_PATTERN =
  /^assets\/immersive\/characters\/[a-z0-9][a-z0-9/_-]*\.glb$/;

const REQUIRED_POSITIVE_PRIVATE_GATES = [
  "rightsConfirmed",
  "ownerSilhouetteApproved",
  "rawMastersPrivate",
  "requiredBonesPresent",
  "requiredSocketsPresent",
  "requiredActionsPresent",
  "materialNamesPass",
  "heightTolerancePass",
  "lodBudgetsPass",
  "exportsPresent",
  "fullBodyCameraRequired",
] as const;

const markerSchema = z
  .object({
    id: z.string().trim().min(1),
    timeMs: z.number().nonnegative(),
    event: z.enum([
      "hourglass-attach-hand",
      "hourglass-attach-belt",
      "hourglass-show",
      "hourglass-hide",
      "recovery-conceal-start",
      "recovery-conceal-end",
    ]),
  })
  .strict();

const markerListSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}, z.array(markerSchema));

const reportBoundsSchema = z
  .object({
    minimum_m: z.tuple([z.number(), z.number(), z.number()]),
    maximum_m: z.tuple([z.number(), z.number(), z.number()]),
    dimensions_m: z.tuple([z.number(), z.number(), z.number()]),
  })
  .loose();

const reportActionSchema = z
  .object({
    frameRange: z.tuple([
      z.number().int().nonnegative(),
      z.number().int().positive(),
    ]),
    loop: z.boolean(),
    family: z.enum(REQUIRED_COMPACT_ANIMATION_FAMILIES),
    durationMs: z.number().int().positive(),
    additiveUpperBody: z.boolean(),
    rootMotion: z.literal("in-place"),
    blendInMs: z.number().min(150).max(250),
    blendOutMs: z.number().min(150).max(250),
    markers: markerListSchema,
  })
  .loose();

const lodNumberRecordSchema = z
  .object({
    LOD0: z.number().int().positive(),
    LOD1: z.number().int().positive(),
    LOD2: z.number().int().positive(),
    LOD3: z.number().int().positive(),
    LOD4: z.number().int().positive(),
  })
  .strict();

const exportRecordSchema = z
  .object({
    path: z.string().min(1),
    sha256: z.string().regex(SHA256_PATTERN),
    bytes: z.number().int().positive(),
  })
  .loose();

const exactLodExportRecordSchema = z
  .object({
    LOD0: exportRecordSchema,
    LOD1: exportRecordSchema,
    LOD2: exportRecordSchema,
    LOD3: exportRecordSchema,
    LOD4: exportRecordSchema,
  })
  .loose();

const privateBlenderProductionReportSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    characterId: z.string().regex(CHARACTER_ID_PATTERN),
    blenderVersion: z.string().regex(/^5\.2(?:\.\d+)?$/),
    rigConvention: z.literal("anzania-humanoid-v1"),
    cameraContract: z.literal("D004-distant-full-body-no-OTS"),
    facingAxis: z.literal("-Y"),
    upAxis: z.literal("+Z"),
    bones: z.array(z.string().min(1)).min(1),
    deformBones: z.array(z.string().min(1)).min(1),
    sockets: z.array(z.string().min(1)).min(1),
    actions: z.record(z.string(), reportActionSchema),
    materials: z.array(z.string().min(1)).min(1),
    restBounds: reportBoundsSchema,
    animationBounds: z.record(z.string(), reportBoundsSchema),
    triangles: lodNumberRecordSchema,
    objectCounts: lodNumberRecordSchema,
    exports: exactLodExportRecordSchema,
    gates: z.record(z.string(), z.boolean()),
    allAutomatedGatesPass: z.literal(true),
  })
  .loose();

const releaseDescriptorSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    manifestRevision: z.number().int().positive(),
    assetId: z.string().regex(SAFE_ID_PATTERN),
    generatedAtUtc: z.iso.datetime({ offset: true }),
    fileUri: z.string().regex(PUBLIC_GLB_URI_PATTERN),
    exporterVersion: z.string().trim().min(1).max(40),
    materialIdsByGltfIndex: z.array(z.string().regex(SAFE_ID_PATTERN)).min(1),
    textureBindingsByGltfIndex: z
      .array(
        z
          .object({
            id: z.string().regex(SAFE_ID_PATTERN),
            role: z.enum([
              "base-color",
              "normal",
              "metallic-roughness",
              "occlusion",
              "emissive",
            ]),
          })
          .strict(),
      )
      .min(1),
    safePaddingMeters: z.number().min(0.05).max(0.5),
    provenance: z
      .object({
        classification: z.literal("approved-public-derivative"),
        sourceAssetIds: z
          .array(z.string().regex(SAFE_SOURCE_ID_PATTERN))
          .min(1)
          .max(8),
        sourceDigests: z.array(z.string().regex(SHA256_PATTERN)).min(1).max(8),
        approvalDigest: z.string().regex(SHA256_PATTERN),
        derivativeOnly: z.literal(true),
        metadataSanitised: z.literal(true),
        redistributionApproved: z.literal(true),
      })
      .strict(),
  })
  .strict();

type PrivateBlenderProductionReport = z.infer<
  typeof privateBlenderProductionReportSchema
>;
type JsonObject = Record<string, unknown>;

interface GlbLodInspection {
  readonly lod: CharacterLod;
  readonly meshCount: number;
  readonly visibleTriangles: number;
  readonly drawCalls: number;
  readonly materialIndices: readonly number[];
}

interface GlbTextureInspection {
  readonly mimeType: "image/ktx2" | "image/webp";
  readonly edgePx: number;
  readonly byteLength: number;
}

interface GlbMaterialInspection {
  readonly alphaMode: "OPAQUE" | "MASK" | "BLEND";
  readonly textureIndices: readonly number[];
}

interface GlbAnimationInspection {
  readonly id: string;
  readonly durationMs: number;
}

interface GlbInspection {
  readonly sha256: string;
  readonly byteLength: number;
  readonly generator: string;
  readonly skeletonRoot: string;
  readonly jointCount: number;
  readonly lods: readonly GlbLodInspection[];
  readonly textures: readonly GlbTextureInspection[];
  readonly materials: readonly GlbMaterialInspection[];
  readonly animations: readonly GlbAnimationInspection[];
  readonly animationBinaryByteLength: number;
  readonly maximumKeyframesPerTrack: number;
  readonly sampleRateHz: number;
}

export type CharacterReportBridgeIssueCode =
  | "animation-contract"
  | "artifact-contract"
  | "bounds-contract"
  | "lod-contract"
  | "private-gate-failed"
  | "private-report-invalid"
  | "public-gate-failed"
  | "release-descriptor-invalid"
  | "rig-contract";

export interface CharacterReportBridgeIssue {
  readonly code: CharacterReportBridgeIssueCode;
  readonly path: string;
  readonly message: string;
}

export type CharacterReportBridgeResult =
  | {
      readonly ok: true;
      readonly metadata: CharacterProductionAssetMetadata;
      readonly issues: readonly [];
    }
  | {
      readonly ok: false;
      readonly issues: readonly CharacterReportBridgeIssue[];
    };

function appendPath(path: string, part: PropertyKey): string {
  return typeof part === "number"
    ? `${path}[${part}]`
    : `${path}.${String(part)}`;
}

function zodPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((current, part) => appendPath(current, part), "$");
}

function asObject(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function integer(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
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

function pushIssue(
  issues: CharacterReportBridgeIssue[],
  code: CharacterReportBridgeIssueCode,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function parseGlb(
  bytes: Uint8Array,
  issues: CharacterReportBridgeIssue[],
): { readonly json: JsonObject; readonly binary: Uint8Array } | undefined {
  if (bytes.byteLength < 20) {
    pushIssue(
      issues,
      "artifact-contract",
      "$artifact",
      "Release artifact is too short to be a GLB 2.0 file.",
    );
    return undefined;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view.getUint32(0, true);
  const version = view.getUint32(4, true);
  const declaredLength = view.getUint32(8, true);
  if (
    magic !== GLB_MAGIC ||
    version !== GLB_VERSION ||
    declaredLength !== bytes.byteLength
  ) {
    pushIssue(
      issues,
      "artifact-contract",
      "$artifact.header",
      "Release artifact must be a complete GLB 2.0 file with an exact declared length.",
    );
    return undefined;
  }

  let offset = 12;
  let jsonChunk: Uint8Array | undefined;
  let binaryChunk: Uint8Array | undefined;
  while (offset + 8 <= bytes.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > bytes.byteLength) {
      pushIssue(
        issues,
        "artifact-contract",
        "$artifact.chunks",
        "GLB chunk length extends beyond the file boundary.",
      );
      return undefined;
    }
    const chunk = bytes.subarray(chunkStart, chunkEnd);
    if (chunkType === GLB_JSON_CHUNK && jsonChunk === undefined) {
      jsonChunk = chunk;
    } else if (chunkType === GLB_BINARY_CHUNK && binaryChunk === undefined) {
      binaryChunk = chunk;
    }
    offset = chunkEnd;
  }

  if (offset !== bytes.byteLength || jsonChunk === undefined) {
    pushIssue(
      issues,
      "artifact-contract",
      "$artifact.chunks",
      "GLB must contain one valid JSON chunk and no trailing bytes.",
    );
    return undefined;
  }

  let parsed: unknown;
  try {
    const decodedText = new TextDecoder().decode(jsonChunk);
    let contentEnd = decodedText.length;
    while (contentEnd > 0) {
      const trailingCodePoint = decodedText.charCodeAt(contentEnd - 1);
      if (trailingCodePoint !== 0 && trailingCodePoint !== 32) break;
      contentEnd -= 1;
    }
    const text = decodedText.slice(0, contentEnd);
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    pushIssue(
      issues,
      "artifact-contract",
      "$artifact.json",
      `GLB JSON chunk is invalid: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }

  const json = asObject(parsed);
  if (json === undefined) {
    pushIssue(
      issues,
      "artifact-contract",
      "$artifact.json",
      "GLB JSON root must be an object.",
    );
    return undefined;
  }

  return { json, binary: binaryChunk ?? new Uint8Array() };
}

function bufferViewBytes(
  json: JsonObject,
  binary: Uint8Array,
  index: number,
): Uint8Array | undefined {
  const bufferView = asObject(asArray(json.bufferViews)[index]);
  if (bufferView === undefined) return undefined;
  const byteOffset = integer(bufferView.byteOffset) ?? 0;
  const byteLength = integer(bufferView.byteLength);
  if (
    byteLength === undefined ||
    byteOffset < 0 ||
    byteLength <= 0 ||
    byteOffset + byteLength > binary.byteLength
  ) {
    return undefined;
  }
  return binary.subarray(byteOffset, byteOffset + byteLength);
}

function imageEdgePx(
  mimeType: "image/ktx2" | "image/webp",
  bytes: Uint8Array,
): number | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (mimeType === "image/ktx2") {
    const identifier = [
      0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a,
    ];
    if (
      bytes.byteLength < 28 ||
      !identifier.every((value, index) => bytes[index] === value)
    ) {
      return undefined;
    }
    const width = view.getUint32(20, true);
    const height = view.getUint32(24, true);
    return width === height && width > 0 ? width : undefined;
  }

  if (
    bytes.byteLength < 30 ||
    new TextDecoder().decode(bytes.subarray(0, 4)) !== "RIFF" ||
    new TextDecoder().decode(bytes.subarray(8, 12)) !== "WEBP"
  ) {
    return undefined;
  }

  const chunk = new TextDecoder().decode(bytes.subarray(12, 16));
  if (chunk === "VP8X") {
    const width = 1 + bytes[24]! + (bytes[25]! << 8) + (bytes[26]! << 16);
    const height = 1 + bytes[27]! + (bytes[28]! << 8) + (bytes[29]! << 16);
    return width === height ? width : undefined;
  }
  if (chunk === "VP8 " && bytes.byteLength >= 30) {
    const width = view.getUint16(26, true) & 0x3fff;
    const height = view.getUint16(28, true) & 0x3fff;
    return width === height && width > 0 ? width : undefined;
  }
  if (chunk === "VP8L" && bytes.byteLength >= 25 && bytes[20] === 0x2f) {
    const b0 = bytes[21]!;
    const b1 = bytes[22]!;
    const b2 = bytes[23]!;
    const b3 = bytes[24]!;
    const width = 1 + b0 + ((b1 & 0x3f) << 8);
    const height = 1 + (b1 >> 6) + (b2 << 2) + ((b3 & 0x0f) << 10);
    return width === height ? width : undefined;
  }
  return undefined;
}

function accessorRecord(
  json: JsonObject,
  index: number,
): JsonObject | undefined {
  return asObject(asArray(json.accessors)[index]);
}

function accessorCount(json: JsonObject, index: number): number | undefined {
  return integer(accessorRecord(json, index)?.count);
}

function decodeFloatAccessor(
  json: JsonObject,
  binary: Uint8Array,
  index: number,
): readonly number[] | undefined {
  const accessor = accessorRecord(json, index);
  if (
    accessor === undefined ||
    integer(accessor.componentType) !== 5126 ||
    stringValue(accessor.type) !== "SCALAR"
  ) {
    return undefined;
  }
  const count = integer(accessor.count);
  const bufferViewIndex = integer(accessor.bufferView);
  if (count === undefined || bufferViewIndex === undefined || count <= 0) {
    return undefined;
  }
  const bufferView = asObject(asArray(json.bufferViews)[bufferViewIndex]);
  const bytes = bufferViewBytes(json, binary, bufferViewIndex);
  if (bufferView === undefined || bytes === undefined) return undefined;
  const accessorOffset = integer(accessor.byteOffset) ?? 0;
  const stride = integer(bufferView.byteStride) ?? 4;
  if (
    accessorOffset < 0 ||
    stride < 4 ||
    accessorOffset + (count - 1) * stride + 4 > bytes.byteLength
  ) {
    return undefined;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return Array.from({ length: count }, (_, itemIndex) =>
    view.getFloat32(accessorOffset + itemIndex * stride, true),
  );
}

function inspectAnimations(
  json: JsonObject,
  binary: Uint8Array,
  issues: CharacterReportBridgeIssue[],
): Pick<
  GlbInspection,
  | "animations"
  | "animationBinaryByteLength"
  | "maximumKeyframesPerTrack"
  | "sampleRateHz"
> {
  const animations = asArray(json.animations);
  const inspected: GlbAnimationInspection[] = [];
  const usedBufferViews = new Set<number>();
  const observedSampleRates: number[] = [];
  let maximumKeyframesPerTrack = 0;

  for (const [animationIndex, rawAnimation] of animations.entries()) {
    const animation = asObject(rawAnimation);
    const id = stringValue(animation?.name);
    if (animation === undefined || id === undefined) {
      pushIssue(
        issues,
        "animation-contract",
        `$.artifact.animations[${animationIndex}]`,
        "Every exported animation requires a stable name.",
      );
      continue;
    }

    let maximumTime = 0;
    for (const [samplerIndex, rawSampler] of asArray(
      animation.samplers,
    ).entries()) {
      const sampler = asObject(rawSampler);
      const inputIndex = integer(sampler?.input);
      const outputIndex = integer(sampler?.output);
      if (inputIndex === undefined || outputIndex === undefined) {
        pushIssue(
          issues,
          "animation-contract",
          `$.artifact.animations[${animationIndex}].samplers[${samplerIndex}]`,
          "Animation samplers require input and output accessors.",
        );
        continue;
      }

      for (const accessorIndex of [inputIndex, outputIndex]) {
        const bufferViewIndex = integer(
          accessorRecord(json, accessorIndex)?.bufferView,
        );
        if (bufferViewIndex !== undefined) usedBufferViews.add(bufferViewIndex);
      }

      const times = decodeFloatAccessor(json, binary, inputIndex);
      if (times === undefined || times.length === 0) {
        pushIssue(
          issues,
          "animation-contract",
          `$.artifact.animations[${animationIndex}].samplers[${samplerIndex}].input`,
          "Animation time accessors must be embedded float scalars.",
        );
        continue;
      }
      maximumKeyframesPerTrack = Math.max(
        maximumKeyframesPerTrack,
        times.length,
      );
      maximumTime = Math.max(maximumTime, ...times);

      if (times.length > 1) {
        const intervals = times
          .slice(1)
          .map((value, index) => value - times[index]!)
          .filter((value) => value > 0)
          .sort((left, right) => left - right);
        const median = intervals[Math.floor(intervals.length / 2)];
        if (median !== undefined && median > 0) {
          observedSampleRates.push(1 / median);
        }
      }
    }
    inspected.push({ id, durationMs: Math.round(maximumTime * 1_000) });
  }

  if (
    !sameValueSet(
      inspected.map(({ id }) => id),
      REQUIRED_COMPACT_ANIMATION_FAMILIES,
    )
  ) {
    pushIssue(
      issues,
      "animation-contract",
      "$.artifact.animations",
      "Release GLB must contain exactly one clip for every required compact animation family.",
    );
  }

  const invalidRate = observedSampleRates.find(
    (rate) => Math.abs(rate - TARGET_SAMPLE_RATE_HZ) > SAMPLE_RATE_TOLERANCE_HZ,
  );
  if (observedSampleRates.length === 0 || invalidRate !== undefined) {
    pushIssue(
      issues,
      "animation-contract",
      "$.artifact.animations",
      "Release GLB animation tracks must use a deterministic 30 Hz sample rate.",
    );
  }

  const animationBinaryByteLength = [...usedBufferViews].reduce(
    (total, index) =>
      total +
      (integer(asObject(asArray(json.bufferViews)[index])?.byteLength) ?? 0),
    0,
  );

  return {
    animations: inspected,
    animationBinaryByteLength,
    maximumKeyframesPerTrack,
    sampleRateHz: TARGET_SAMPLE_RATE_HZ,
  };
}

function inspectTextures(
  json: JsonObject,
  binary: Uint8Array,
  issues: CharacterReportBridgeIssue[],
): readonly GlbTextureInspection[] {
  const images = asArray(json.images);
  return asArray(json.textures).flatMap((rawTexture, textureIndex) => {
    const texture = asObject(rawTexture);
    const sourceIndex = integer(texture?.source);
    const image =
      sourceIndex === undefined ? undefined : asObject(images[sourceIndex]);
    const mimeType = stringValue(image?.mimeType);
    const bufferViewIndex = integer(image?.bufferView);
    if (
      texture === undefined ||
      image === undefined ||
      sourceIndex === undefined ||
      bufferViewIndex === undefined ||
      (mimeType !== "image/ktx2" && mimeType !== "image/webp") ||
      image.uri !== undefined
    ) {
      pushIssue(
        issues,
        "artifact-contract",
        `$.artifact.textures[${textureIndex}]`,
        "Every runtime texture must be an embedded WebP or KTX2 image.",
      );
      return [];
    }
    const imageBytes = bufferViewBytes(json, binary, bufferViewIndex);
    const edgePx =
      imageBytes === undefined ? undefined : imageEdgePx(mimeType, imageBytes);
    if (imageBytes === undefined || edgePx === undefined) {
      pushIssue(
        issues,
        "artifact-contract",
        `$.artifact.textures[${textureIndex}]`,
        "Embedded runtime texture must have a valid square WebP or KTX2 header.",
      );
      return [];
    }
    return [{ mimeType, edgePx, byteLength: imageBytes.byteLength }];
  });
}

function materialTextureIndices(material: JsonObject): number[] {
  const pbr = asObject(material.pbrMetallicRoughness);
  const slots = [
    asObject(pbr?.baseColorTexture),
    asObject(pbr?.metallicRoughnessTexture),
    asObject(material.normalTexture),
    asObject(material.occlusionTexture),
    asObject(material.emissiveTexture),
  ];
  return [
    ...new Set(
      slots.flatMap((slot) => {
        const index = integer(slot?.index);
        return index === undefined ? [] : [index];
      }),
    ),
  ];
}

function inspectMaterials(
  json: JsonObject,
  issues: CharacterReportBridgeIssue[],
): readonly GlbMaterialInspection[] {
  return asArray(json.materials).flatMap((rawMaterial, materialIndex) => {
    const material = asObject(rawMaterial);
    const alphaMode = stringValue(material?.alphaMode) ?? "OPAQUE";
    if (
      material === undefined ||
      (alphaMode !== "OPAQUE" && alphaMode !== "MASK" && alphaMode !== "BLEND")
    ) {
      pushIssue(
        issues,
        "artifact-contract",
        `$.artifact.materials[${materialIndex}]`,
        "glTF material has an unsupported alpha mode.",
      );
      return [];
    }
    const textureIndices = materialTextureIndices(material);
    if (textureIndices.length === 0) {
      pushIssue(
        issues,
        "artifact-contract",
        `$.artifact.materials[${materialIndex}]`,
        "Every production material must reference at least one runtime texture.",
      );
    }
    return [{ alphaMode, textureIndices }];
  });
}

function lodFromNames(
  ...names: readonly (string | undefined)[]
): CharacterLod | undefined {
  const found = new Set<CharacterLod>();
  for (const name of names) {
    if (name === undefined) continue;
    for (const match of name.matchAll(
      /(?:^|[^a-z0-9])lod([0-4])(?:$|[^a-z0-9])/giu,
    )) {
      found.add(Number(match[1]) as CharacterLod);
    }
  }
  return found.size === 1 ? [...found][0] : undefined;
}

function inspectLods(
  json: JsonObject,
  issues: CharacterReportBridgeIssue[],
): readonly GlbLodInspection[] {
  const meshes = asArray(json.meshes);
  const accumulators = new Map<
    CharacterLod,
    {
      meshCount: number;
      visibleTriangles: number;
      drawCalls: number;
      materialIndices: Set<number>;
    }
  >(
    REQUIRED_LODS.map((lod) => [
      lod,
      {
        meshCount: 0,
        visibleTriangles: 0,
        drawCalls: 0,
        materialIndices: new Set<number>(),
      },
    ]),
  );

  for (const [nodeIndex, rawNode] of asArray(json.nodes).entries()) {
    const node = asObject(rawNode);
    const meshIndex = integer(node?.mesh);
    if (node === undefined || meshIndex === undefined) continue;
    const mesh = asObject(meshes[meshIndex]);
    const lod = lodFromNames(stringValue(node.name), stringValue(mesh?.name));
    if (mesh === undefined || lod === undefined) {
      pushIssue(
        issues,
        "lod-contract",
        `$.artifact.nodes[${nodeIndex}]`,
        "Every skinned mesh node must declare exactly one LOD0 through LOD4 token in its node or mesh name.",
      );
      continue;
    }
    if (integer(node.skin) === undefined) {
      pushIssue(
        issues,
        "rig-contract",
        `$.artifact.nodes[${nodeIndex}].skin`,
        "Every character mesh node must reference the one complete character skin.",
      );
    }

    const accumulator = accumulators.get(lod)!;
    accumulator.meshCount += 1;
    for (const [primitiveIndex, rawPrimitive] of asArray(
      mesh.primitives,
    ).entries()) {
      const primitive = asObject(rawPrimitive);
      const mode = integer(primitive?.mode) ?? 4;
      const indices = integer(primitive?.indices);
      const attributes = asObject(primitive?.attributes);
      const positionAccessor = integer(attributes?.POSITION);
      const count =
        indices === undefined
          ? positionAccessor === undefined
            ? undefined
            : accessorCount(json, positionAccessor)
          : accessorCount(json, indices);
      if (
        primitive === undefined ||
        mode !== 4 ||
        count === undefined ||
        count <= 0 ||
        count % 3 !== 0
      ) {
        pushIssue(
          issues,
          "lod-contract",
          `$.artifact.meshes[${meshIndex}].primitives[${primitiveIndex}]`,
          "Production LOD primitives must use indexed or non-indexed TRIANGLES with a valid triangle count.",
        );
        continue;
      }
      if (
        integer(attributes?.JOINTS_0) === undefined ||
        integer(attributes?.WEIGHTS_0) === undefined ||
        attributes?.JOINTS_1 !== undefined ||
        attributes?.WEIGHTS_1 !== undefined
      ) {
        pushIssue(
          issues,
          "rig-contract",
          `$.artifact.meshes[${meshIndex}].primitives[${primitiveIndex}].attributes`,
          "Every primitive must be skinned with at most four influences.",
        );
      }
      accumulator.visibleTriangles += count / 3;
      accumulator.drawCalls += 1;
      const materialIndex = integer(primitive.material);
      if (materialIndex !== undefined) {
        accumulator.materialIndices.add(materialIndex);
      }
    }
  }

  return REQUIRED_LODS.map((lod) => {
    const value = accumulators.get(lod)!;
    if (value.meshCount === 0) {
      pushIssue(
        issues,
        "lod-contract",
        `$.artifact.lods[${lod}]`,
        `Release GLB is missing LOD${lod}.`,
      );
    }
    return {
      lod,
      meshCount: value.meshCount,
      visibleTriangles: value.visibleTriangles,
      drawCalls: value.drawCalls,
      materialIndices: [...value.materialIndices].sort(
        (left, right) => left - right,
      ),
    };
  });
}

function inspectRig(
  json: JsonObject,
  issues: CharacterReportBridgeIssue[],
): Pick<GlbInspection, "skeletonRoot" | "jointCount"> {
  const skins = asArray(json.skins);
  if (skins.length !== 1) {
    pushIssue(
      issues,
      "rig-contract",
      "$.artifact.skins",
      "Release GLB must contain exactly one complete skin.",
    );
  }
  const skin = asObject(skins[0]);
  const joints = asArray(skin?.joints);
  const skeletonIndex = integer(skin?.skeleton);
  const skeletonNode =
    skeletonIndex === undefined
      ? undefined
      : asObject(asArray(json.nodes)[skeletonIndex]);
  const skeletonRoot = stringValue(skeletonNode?.name);
  if (
    skeletonRoot === undefined ||
    !SAFE_ID_PATTERN.test(skeletonRoot) ||
    joints.length === 0
  ) {
    pushIssue(
      issues,
      "rig-contract",
      "$.artifact.skins[0]",
      "Complete skin requires a safe, named skeleton root and at least one joint.",
    );
  }
  return {
    skeletonRoot: skeletonRoot ?? "invalid-root",
    jointCount: joints.length,
  };
}

function inspectSelfContainedGlb(
  bytes: Uint8Array,
  issues: CharacterReportBridgeIssue[],
): GlbInspection | undefined {
  const parsed = parseGlb(bytes, issues);
  if (parsed === undefined) return undefined;
  const { json, binary } = parsed;

  const asset = asObject(json.asset);
  const version = stringValue(asset?.version);
  const generator = stringValue(asset?.generator);
  if (version !== "2.0" || generator === undefined) {
    pushIssue(
      issues,
      "artifact-contract",
      "$.artifact.asset",
      "Release GLB must declare glTF 2.0 and its exporter generator.",
    );
  }

  const externalBuffer = asArray(json.buffers).some(
    (rawBuffer) => asObject(rawBuffer)?.uri !== undefined,
  );
  const externalImage = asArray(json.images).some(
    (rawImage) => asObject(rawImage)?.uri !== undefined,
  );
  if (externalBuffer || externalImage || binary.byteLength === 0) {
    pushIssue(
      issues,
      "artifact-contract",
      "$.artifact",
      "Release GLB must be self-contained with embedded buffers and images.",
    );
  }

  const animations = inspectAnimations(json, binary, issues);
  const rig = inspectRig(json, issues);
  const textures = inspectTextures(json, binary, issues);
  const materials = inspectMaterials(json, issues);
  const lods = inspectLods(json, issues);

  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byteLength: bytes.byteLength,
    generator: generator ?? "Unknown glTF exporter",
    ...rig,
    lods,
    textures,
    materials,
    ...animations,
  };
}

function convertBlenderBoundsToRuntime(
  bounds: z.infer<typeof reportBoundsSchema>,
): {
  readonly min: [number, number, number];
  readonly max: [number, number, number];
} {
  const [minimumX, minimumY, minimumZ] = bounds.minimum_m;
  const [maximumX, maximumY, maximumZ] = bounds.maximum_m;
  return {
    min: [minimumX, minimumZ, -maximumY],
    max: [maximumX, maximumZ, -minimumY],
  };
}

function envelopeFor(report: PrivateBlenderProductionReport): {
  readonly min: [number, number, number];
  readonly max: [number, number, number];
} {
  const boxes = [
    convertBlenderBoundsToRuntime(report.restBounds),
    ...REQUIRED_COMPACT_ANIMATION_FAMILIES.map((family) =>
      convertBlenderBoundsToRuntime(report.animationBounds[family]!),
    ),
  ];
  return {
    min: [
      Math.min(...boxes.map(({ min }) => min[0])),
      Math.min(...boxes.map(({ min }) => min[1])),
      Math.min(...boxes.map(({ min }) => min[2])),
    ],
    max: [
      Math.max(...boxes.map(({ max }) => max[0])),
      Math.max(...boxes.map(({ max }) => max[1])),
      Math.max(...boxes.map(({ max }) => max[2])),
    ],
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function privateContractIssues(
  report: PrivateBlenderProductionReport,
): CharacterReportBridgeIssue[] {
  const issues: CharacterReportBridgeIssue[] = [];
  for (const gate of REQUIRED_POSITIVE_PRIVATE_GATES) {
    if (report.gates[gate] !== true) {
      pushIssue(
        issues,
        "private-gate-failed",
        `$.report.gates.${gate}`,
        `Required private production gate "${gate}" did not pass.`,
      );
    }
  }
  if (report.gates.otsAllowed !== false) {
    pushIssue(
      issues,
      "private-gate-failed",
      "$.report.gates.otsAllowed",
      "Private production report must explicitly prohibit OTS camera assets.",
    );
  }
  for (const [gate, passed] of Object.entries(report.gates)) {
    if (gate !== "otsAllowed" && !passed) {
      pushIssue(
        issues,
        "private-gate-failed",
        `$.report.gates.${gate}`,
        `Private production gate "${gate}" did not pass.`,
      );
    }
  }

  const actionIds = Object.keys(report.actions);
  if (!sameValueSet(actionIds, REQUIRED_COMPACT_ANIMATION_FAMILIES)) {
    pushIssue(
      issues,
      "animation-contract",
      "$.report.actions",
      "Private report must contain exactly the 13 required compact animation families.",
    );
  }
  const boundIds = Object.keys(report.animationBounds);
  if (!sameValueSet(boundIds, REQUIRED_COMPACT_ANIMATION_FAMILIES)) {
    pushIssue(
      issues,
      "bounds-contract",
      "$.report.animationBounds",
      "Private report must sample full animated bounds for exactly the 13 required compact clips.",
    );
  }
  for (const family of REQUIRED_COMPACT_ANIMATION_FAMILIES) {
    if (report.actions[family]?.family !== family) {
      pushIssue(
        issues,
        "animation-contract",
        `$.report.actions.${family}.family`,
        `Animation action "${family}" must report the same family identifier.`,
      );
    }
  }
  return issues;
}

function crossCheckInspection(
  report: PrivateBlenderProductionReport,
  inspection: GlbInspection,
  issues: CharacterReportBridgeIssue[],
): void {
  for (const inspected of inspection.lods) {
    const key = `LOD${inspected.lod}` as keyof typeof report.triangles;
    if (report.triangles[key] !== inspected.visibleTriangles) {
      pushIssue(
        issues,
        "lod-contract",
        `$.artifact.lods[${inspected.lod}].visibleTriangles`,
        `Release GLB LOD${inspected.lod} triangle count does not match the private Blender report.`,
      );
    }
    if (report.objectCounts[key] !== inspected.meshCount) {
      pushIssue(
        issues,
        "lod-contract",
        `$.artifact.lods[${inspected.lod}].meshCount`,
        `Release GLB LOD${inspected.lod} mesh count does not match the private Blender report.`,
      );
    }
  }

  if (inspection.jointCount !== report.bones.length) {
    pushIssue(
      issues,
      "rig-contract",
      "$.artifact.skins[0].joints",
      "Release GLB joint count does not match the private Blender report.",
    );
  }

  for (const clip of inspection.animations) {
    const action = report.actions[clip.id];
    if (
      action === undefined ||
      Math.abs(action.durationMs - clip.durationMs) > 40
    ) {
      pushIssue(
        issues,
        "animation-contract",
        `$.artifact.animations.${clip.id}`,
        `Release clip "${clip.id}" duration does not match the private Blender report within one 30 Hz frame.`,
      );
    }
  }
}

function sortIssues(
  issues: readonly CharacterReportBridgeIssue[],
): CharacterReportBridgeIssue[] {
  return [...issues].sort((left, right) => {
    const leftKey = `${left.path}\u0000${left.code}\u0000${left.message}`;
    const rightKey = `${right.path}\u0000${right.code}\u0000${right.message}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
}

export function buildCharacterAssetCandidate(
  privateReportInput: unknown,
  releaseDescriptorInput: unknown,
  glbBytes: Uint8Array,
): CharacterReportBridgeResult {
  const reportResult =
    privateBlenderProductionReportSchema.safeParse(privateReportInput);
  const descriptorResult = releaseDescriptorSchema.safeParse(
    releaseDescriptorInput,
  );
  const issues: CharacterReportBridgeIssue[] = [];

  if (!reportResult.success) {
    for (const issue of reportResult.error.issues) {
      pushIssue(
        issues,
        "private-report-invalid",
        `$.report${zodPath(issue.path).slice(1)}`,
        issue.message,
      );
    }
  }
  if (!descriptorResult.success) {
    for (const issue of descriptorResult.error.issues) {
      pushIssue(
        issues,
        "release-descriptor-invalid",
        `$.release${zodPath(issue.path).slice(1)}`,
        issue.message,
      );
    }
  }
  if (!reportResult.success || !descriptorResult.success) {
    return { ok: false, issues: sortIssues(issues) };
  }

  const report = reportResult.data;
  const descriptor = descriptorResult.data;
  issues.push(...privateContractIssues(report));
  const inspection = inspectSelfContainedGlb(glbBytes, issues);
  if (inspection !== undefined) {
    crossCheckInspection(report, inspection, issues);
  }
  if (inspection === undefined || issues.length > 0) {
    return { ok: false, issues: sortIssues(issues) };
  }

  if (
    descriptor.materialIdsByGltfIndex.length !== inspection.materials.length
  ) {
    pushIssue(
      issues,
      "release-descriptor-invalid",
      "$.release.materialIdsByGltfIndex",
      "Public material ID mapping must match the GLB material count.",
    );
  }
  if (
    descriptor.textureBindingsByGltfIndex.length !== inspection.textures.length
  ) {
    pushIssue(
      issues,
      "release-descriptor-invalid",
      "$.release.textureBindingsByGltfIndex",
      "Public texture binding mapping must match the GLB texture count.",
    );
  }
  if (
    new Set(descriptor.materialIdsByGltfIndex).size !==
    descriptor.materialIdsByGltfIndex.length
  ) {
    pushIssue(
      issues,
      "release-descriptor-invalid",
      "$.release.materialIdsByGltfIndex",
      "Public material IDs must be unique.",
    );
  }
  if (
    new Set(descriptor.textureBindingsByGltfIndex.map(({ id }) => id)).size !==
    descriptor.textureBindingsByGltfIndex.length
  ) {
    pushIssue(
      issues,
      "release-descriptor-invalid",
      "$.release.textureBindingsByGltfIndex",
      "Public texture IDs must be unique.",
    );
  }
  if (issues.length > 0) {
    return { ok: false, issues: sortIssues(issues) };
  }

  const textures = inspection.textures.map((texture, index) => {
    const binding = descriptor.textureBindingsByGltfIndex[index]!;
    return {
      id: binding.id,
      role: binding.role,
      mimeType: texture.mimeType,
      edgePx: texture.edgePx,
      byteLength: texture.byteLength,
      source: { storage: "embedded" as const },
    };
  });
  const materials = inspection.materials.map((material, index) => ({
    id: descriptor.materialIdsByGltfIndex[index]!,
    shader: "pbr-metallic-roughness" as const,
    alphaMode: material.alphaMode,
    textureIds: material.textureIndices.map(
      (textureIndex) =>
        descriptor.textureBindingsByGltfIndex[textureIndex]?.id ??
        "missing-texture",
    ),
  }));
  const lods = inspection.lods.map((lod) => ({
    lod: lod.lod,
    meshCount: lod.meshCount,
    visibleTriangles: lod.visibleTriangles,
    drawCalls: lod.drawCalls,
    materialIds: lod.materialIndices.map(
      (materialIndex) =>
        descriptor.materialIdsByGltfIndex[materialIndex] ?? "missing-material",
    ),
  }));

  const clips = REQUIRED_COMPACT_ANIMATION_FAMILIES.map((family) => {
    const action = report.actions[family]!;
    const inspected = inspection.animations.find(({ id }) => id === family)!;
    return {
      id: family,
      family,
      durationMs: inspected.durationMs,
      loop: action.loop,
      additiveUpperBody: action.additiveUpperBody,
      rootMotion: action.rootMotion,
      blendInMs: action.blendInMs,
      blendOutMs: action.blendOutMs,
      markers: action.markers,
    };
  });
  const restBounds = convertBlenderBoundsToRuntime(report.restBounds);
  const animatedEnvelope = envelopeFor(report);

  const withoutFingerprint = {
    schemaVersion: "1.0.0",
    manifestRevision: descriptor.manifestRevision,
    assetId: descriptor.assetId,
    characterId: report.characterId,
    generatedAtUtc: descriptor.generatedAtUtc,
    file: {
      uri: descriptor.fileUri,
      format: "glb",
      mimeType: "model/gltf-binary",
      byteLength: inspection.byteLength,
      sha256: inspection.sha256,
      resources: [],
    },
    export: {
      tool: "Blender",
      toolVersion: report.blenderVersion,
      exporter: inspection.generator,
      exporterVersion: descriptor.exporterVersion,
      coordinateSystem: "right-handed-y-up",
      unitScaleMeters: 1,
    },
    rig: {
      convention: report.rigConvention,
      skeletonRoot: inspection.skeletonRoot,
      jointCount: inspection.jointCount,
      maximumSkinInfluences: 4,
      completeRigCount: 1,
    },
    lods,
    materials,
    textures,
    animations: {
      manifest: {
        version: 1,
        rigConvention: report.rigConvention,
        clips,
      },
      clipCount: clips.length,
      totalDurationMs: clips.reduce(
        (total, clip) => total + clip.durationMs,
        0,
      ),
      binaryByteLength: inspection.animationBinaryByteLength,
      sampleRateHz: inspection.sampleRateHz,
      maximumKeyframesPerTrack: inspection.maximumKeyframesPerTrack,
    },
    bounds: {
      coordinateSpace: "character-local-y-up",
      unit: "metre",
      groundPlaneY: restBounds.min[1],
      rest: restBounds,
      animatedEnvelope,
      safePaddingMeters: descriptor.safePaddingMeters,
      includes: {
        headwear: true,
        hands: true,
        footwear: true,
        garmentTails: true,
        pouches: true,
        accessories: true,
        powerRelevantSilhouette: true,
      },
      sampledClipIds: [...REQUIRED_COMPACT_ANIMATION_FAMILIES],
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
    provenance: descriptor.provenance,
  };
  const contentFingerprint = createHash("sha256")
    .update(canonicalJson(withoutFingerprint))
    .digest("hex");
  const candidate = { ...withoutFingerprint, contentFingerprint };
  const gateResult = validateCharacterProductionAsset(candidate);
  if (!gateResult.ok) {
    for (const issue of gateResult.issues) {
      pushIssue(
        issues,
        "public-gate-failed",
        issue.path,
        `[${issue.code}] ${issue.message}`,
      );
    }
    return { ok: false, issues: sortIssues(issues) };
  }
  return { ok: true, metadata: gateResult.metadata, issues: [] };
}
