import { describe, expect, it } from "vitest";

import { REQUIRED_COMPACT_ANIMATION_FAMILIES } from "../../../src/immersive/animation";
import { buildCharacterAssetCandidate } from "../../../scripts/lib/character-production-report-bridge";

const TRIANGLES = [65_000, 35_000, 19_000, 9_000, 4_500] as const;

const ACTIONS = {
  "base-idle": { durationMs: 8_000, loop: true, additiveUpperBody: false },
  "weight-shift-idle": {
    durationMs: 1_500,
    loop: false,
    additiveUpperBody: false,
  },
  "garment-adjustment": {
    durationMs: 1_500,
    loop: false,
    additiveUpperBody: true,
  },
  "present-open-hand": {
    durationMs: 700,
    loop: false,
    additiveUpperBody: true,
  },
  point: { durationMs: 800, loop: false, additiveUpperBody: true },
  "hourglass-draw": {
    durationMs: 700,
    loop: false,
    additiveUpperBody: true,
  },
  "hourglass-inspect": {
    durationMs: 5_000,
    loop: true,
    additiveUpperBody: true,
  },
  "hourglass-stow": {
    durationMs: 600,
    loop: false,
    additiveUpperBody: true,
  },
  "short-local-step": {
    durationMs: 500,
    loop: false,
    additiveUpperBody: false,
  },
  "edge-lean-enter": {
    durationMs: 500,
    loop: false,
    additiveUpperBody: false,
  },
  "edge-lean-hold": {
    durationMs: 1_000,
    loop: true,
    additiveUpperBody: false,
  },
  "edge-lean-exit": {
    durationMs: 500,
    loop: false,
    additiveUpperBody: false,
  },
  "sand-recall-recovery": {
    durationMs: 500,
    loop: false,
    additiveUpperBody: false,
  },
} as const;

function markersFor(family: string) {
  if (family === "hourglass-draw") {
    return [
      {
        id: "draw-attach",
        timeMs: 400,
        event: "hourglass-attach-hand",
      },
    ];
  }
  if (family === "hourglass-stow") {
    return [
      {
        id: "stow-attach",
        timeMs: 400,
        event: "hourglass-attach-belt",
      },
    ];
  }
  if (family === "sand-recall-recovery") {
    return [
      {
        id: "recovery-start",
        timeMs: 0,
        event: "recovery-conceal-start",
      },
      {
        id: "recovery-end",
        timeMs: 400,
        event: "recovery-conceal-end",
      },
    ];
  }
  return [];
}

function makePrivateReport() {
  const bounds = {
    minimum_m: [-0.5, -0.3, 0],
    maximum_m: [0.5, 0.3, 1.84],
    dimensions_m: [1, 0.6, 1.84],
  };
  const actions = Object.fromEntries(
    REQUIRED_COMPACT_ANIMATION_FAMILIES.map((family) => [
      family,
      {
        frameRange: [1, Math.round(ACTIONS[family].durationMs * 0.03)],
        family,
        durationMs: ACTIONS[family].durationMs,
        loop: ACTIONS[family].loop,
        additiveUpperBody: ACTIONS[family].additiveUpperBody,
        rootMotion: "in-place",
        blendInMs: 200,
        blendOutMs: 200,
        markers: markersFor(family),
      },
    ]),
  );
  const animationBounds = Object.fromEntries(
    REQUIRED_COMPACT_ANIMATION_FAMILIES.map((family) => [
      family,
      {
        minimum_m: [-0.65, -0.45, -0.02],
        maximum_m: [0.68, 0.48, 2.05],
        dimensions_m: [1.33, 0.93, 2.07],
        sampleFrames: [1, 2, 3],
      },
    ]),
  );
  const triangles = Object.fromEntries(
    TRIANGLES.map((count, lod) => [`LOD${lod}`, count]),
  );
  const objectCounts = Object.fromEntries(
    TRIANGLES.map((_, lod) => [`LOD${lod}`, 1]),
  );
  const exports = Object.fromEntries(
    TRIANGLES.map((_, lod) => [
      `LOD${lod}`,
      {
        path: `C:\\Users\\Bongo\\private\\DN-M-AFR-01_LOD${lod}.glb`,
        sha256: String(lod + 1).repeat(64),
        bytes: 1_024 + lod,
      },
    ]),
  );

  return {
    schemaVersion: "1.0.0",
    status: "production-pilot-v1",
    characterId: "DN-M-AFR-01",
    blenderVersion: "5.2.0",
    rigConvention: "anzania-humanoid-v1",
    cameraContract: "D004-distant-full-body-no-OTS",
    facingAxis: "-Y",
    upAxis: "+Z",
    bones: ["root"],
    deformBones: ["root"],
    sockets: ["socket_bounds"],
    actions,
    materials: ["M_DN_M_AFR_01_Skin"],
    restBounds: bounds,
    animationBounds,
    triangles,
    objectCounts,
    exports,
    blend: {
      path: "C:\\Users\\Bongo\\private\\DN-M-AFR-01-production.blend",
      sha256: "f".repeat(64),
      bytes: 100,
    },
    gates: {
      rightsConfirmed: true,
      ownerSilhouetteApproved: true,
      rawMastersPrivate: true,
      requiredBonesPresent: true,
      requiredSocketsPresent: true,
      requiredActionsPresent: true,
      materialNamesPass: true,
      heightTolerancePass: true,
      lodBudgetsPass: true,
      exportsPresent: true,
      fullBodyCameraRequired: true,
      otsAllowed: false,
    },
    allAutomatedGatesPass: true,
  };
}

function makeReleaseDescriptor() {
  return {
    schemaVersion: "1.0.0",
    manifestRevision: 1,
    assetId: "dn-m-afr-01-production-r1",
    generatedAtUtc: "2026-07-31T00:00:00Z",
    fileUri: "assets/immersive/characters/dn-m-afr-01-production.glb",
    exporterVersion: "5.2.0",
    materialIdsByGltfIndex: ["mat-character"],
    textureBindingsByGltfIndex: [{ id: "tex-character", role: "base-color" }],
    safePaddingMeters: 0.1,
    provenance: {
      classification: "approved-public-derivative",
      sourceAssetIds: ["src-0123456789ab"],
      sourceDigests: ["a".repeat(64)],
      approvalDigest: "b".repeat(64),
      derivativeOnly: true,
      metadataSanitised: true,
      redistributionApproved: true,
    },
  };
}

interface BinaryPart {
  readonly bytes: Uint8Array;
  readonly offset: number;
}

function makeWebpHeader(edgePx: number): Uint8Array {
  const bytes = new Uint8Array(30);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  bytes.set(new TextEncoder().encode("WEBP"), 8);
  bytes.set(new TextEncoder().encode("VP8X"), 12);
  const size = edgePx - 1;
  bytes[24] = size & 0xff;
  bytes[25] = (size >> 8) & 0xff;
  bytes[26] = (size >> 16) & 0xff;
  bytes[27] = size & 0xff;
  bytes[28] = (size >> 8) & 0xff;
  bytes[29] = (size >> 16) & 0xff;
  return bytes;
}

function makeGlb(
  options: {
    readonly omittedLod?: number;
    readonly omittedAnimation?: string;
  } = {},
): Uint8Array {
  const binaryParts: Uint8Array[] = [];
  const bufferViews: Array<{ byteOffset: number; byteLength: number }> = [];
  let binaryLength = 0;
  const addBinary = (bytes: Uint8Array): BinaryPart => {
    const offset = binaryLength;
    binaryParts.push(bytes);
    bufferViews.push({ byteOffset: offset, byteLength: bytes.byteLength });
    binaryLength += bytes.byteLength;
    return { bytes, offset };
  };

  const image = addBinary(makeWebpHeader(1_024));
  const imageBufferView = bufferViews.length - 1;
  expect(image.offset).toBe(0);
  const output = addBinary(new Uint8Array(4));
  const outputBufferView = bufferViews.length - 1;
  expect(output.bytes.byteLength).toBe(4);

  const accessors: Array<Record<string, unknown>> = [];
  const animations: Array<Record<string, unknown>> = [];
  for (const family of REQUIRED_COMPACT_ANIMATION_FAMILIES) {
    if (family === options.omittedAnimation) continue;
    const durationSeconds = ACTIONS[family].durationMs / 1_000;
    const sampleCount = Math.round(durationSeconds * 30) + 1;
    const timeBytes = new Uint8Array(sampleCount * 4);
    const timeView = new DataView(timeBytes.buffer);
    for (let index = 0; index < sampleCount; index += 1) {
      timeView.setFloat32(
        index * 4,
        Math.min(index / 30, durationSeconds),
        true,
      );
    }
    addBinary(timeBytes);
    const timeBufferView = bufferViews.length - 1;
    const inputAccessor = accessors.push({
      bufferView: timeBufferView,
      componentType: 5126,
      type: "SCALAR",
      count: sampleCount,
      min: [0],
      max: [durationSeconds],
    });
    const outputAccessor = accessors.push({
      bufferView: outputBufferView,
      componentType: 5126,
      type: "SCALAR",
      count: 1,
    });
    animations.push({
      name: family,
      samplers: [{ input: inputAccessor - 1, output: outputAccessor - 1 }],
      channels: [
        {
          sampler: 0,
          target: { node: 0, path: "translation" },
        },
      ],
    });
  }

  const meshes: Array<Record<string, unknown>> = [];
  const nodes: Array<Record<string, unknown>> = [{ name: "root" }];
  for (let lod = 0; lod <= 4; lod += 1) {
    if (lod === options.omittedLod) continue;
    const positionAccessor = accessors.push({
      componentType: 5126,
      type: "VEC3",
      count: 3,
    });
    const jointsAccessor = accessors.push({
      componentType: 5123,
      type: "VEC4",
      count: 3,
    });
    const weightsAccessor = accessors.push({
      componentType: 5126,
      type: "VEC4",
      count: 3,
    });
    const indexAccessor = accessors.push({
      componentType: 5125,
      type: "SCALAR",
      count: TRIANGLES[lod]! * 3,
    });
    const meshIndex =
      meshes.push({
        name: `DN-M-AFR-01_LOD${lod}`,
        primitives: [
          {
            attributes: {
              POSITION: positionAccessor - 1,
              JOINTS_0: jointsAccessor - 1,
              WEIGHTS_0: weightsAccessor - 1,
            },
            indices: indexAccessor - 1,
            material: 0,
          },
        ],
      }) - 1;
    nodes.push({
      name: `DN-M-AFR-01_LOD${lod}`,
      mesh: meshIndex,
      skin: 0,
    });
  }

  const binary = new Uint8Array(binaryLength);
  let cursor = 0;
  for (const part of binaryParts) {
    binary.set(part, cursor);
    cursor += part.byteLength;
  }
  const json = {
    asset: {
      version: "2.0",
      generator: "Synthetic Blender glTF exporter",
    },
    buffers: [{ byteLength: binary.byteLength }],
    bufferViews,
    accessors,
    images: [
      {
        mimeType: "image/webp",
        bufferView: imageBufferView,
      },
    ],
    textures: [{ source: 0 }],
    materials: [
      {
        alphaMode: "OPAQUE",
        pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
      },
    ],
    meshes,
    nodes,
    skins: [{ skeleton: 0, joints: [0] }],
    animations,
  };

  const encodedJson = new TextEncoder().encode(JSON.stringify(json));
  const jsonPadding = (4 - (encodedJson.byteLength % 4)) % 4;
  const binaryPadding = (4 - (binary.byteLength % 4)) % 4;
  const jsonChunkLength = encodedJson.byteLength + jsonPadding;
  const binaryChunkLength = binary.byteLength + binaryPadding;
  const totalLength = 12 + 8 + jsonChunkLength + 8 + binaryChunkLength;
  const glb = new Uint8Array(totalLength);
  const view = new DataView(glb.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, totalLength, true);
  view.setUint32(12, jsonChunkLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  glb.set(encodedJson, 20);
  glb.fill(0x20, 20 + encodedJson.byteLength, 20 + jsonChunkLength);
  const binaryHeader = 20 + jsonChunkLength;
  view.setUint32(binaryHeader, binaryChunkLength, true);
  view.setUint32(binaryHeader + 4, 0x004e4942, true);
  glb.set(binary, binaryHeader + 8);
  return glb;
}

function issueCodes(
  report: unknown,
  release: unknown,
  glb = makeGlb(),
): string[] {
  const result = buildCharacterAssetCandidate(report, release, glb);
  return result.ok ? [] : result.issues.map(({ code }) => code);
}

describe("private Blender report to public character manifest bridge", () => {
  it("emits a gate-valid public-safe candidate from complete evidence", () => {
    const result = buildCharacterAssetCandidate(
      makePrivateReport(),
      makeReleaseDescriptor(),
      makeGlb(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.metadata.lods.map(({ lod }) => lod)).toEqual([0, 1, 2, 3, 4]);
    expect(
      result.metadata.animations.manifest.clips.map(({ family }) => family),
    ).toEqual(REQUIRED_COMPACT_ANIMATION_FAMILIES);
    expect(result.metadata.bounds.sampledClipIds).toEqual(
      REQUIRED_COMPACT_ANIMATION_FAMILIES,
    );
    expect(result.metadata.cameraContract.mode).toBe(
      "distant-full-body-third-person",
    );

    const publicJson = JSON.stringify(result.metadata);
    expect(publicJson).not.toMatch(/[A-Z]:[\\/]/);
    expect(publicJson).not.toContain("Users");
    expect(publicJson).not.toContain(".blend");
    expect(publicJson).not.toMatch(/(?:^|[^a-z0-9])ots(?:$|[^a-z0-9])/i);
  });

  it("does not emit when any private production gate is false", () => {
    const report = makePrivateReport();
    report.gates.ownerSilhouetteApproved = false;

    expect(issueCodes(report, makeReleaseDescriptor())).toContain(
      "private-gate-failed",
    );
  });

  it("does not treat five separate report exports as a combined five-LOD GLB", () => {
    expect(
      issueCodes(
        makePrivateReport(),
        makeReleaseDescriptor(),
        makeGlb({ omittedLod: 4 }),
      ),
    ).toContain("lod-contract");
  });

  it("requires the exact 13-family animation set in both report and GLB", () => {
    const report = makePrivateReport();
    delete report.actions.point;

    expect(
      issueCodes(
        report,
        makeReleaseDescriptor(),
        makeGlb({ omittedAnimation: "point" }),
      ),
    ).toEqual(expect.arrayContaining(["animation-contract"]));
  });

  it("rejects an OTS camera report even if the rest of the evidence passes", () => {
    const report = {
      ...makePrivateReport(),
      cameraContract: "over-the-shoulder",
    };

    expect(issueCodes(report, makeReleaseDescriptor())).toContain(
      "private-report-invalid",
    );
  });

  it("rejects extra path-bearing fields in the public release descriptor", () => {
    const release = {
      ...makeReleaseDescriptor(),
      sourcePath: "C:\\Users\\Bongo\\private\\source.blend",
    };

    expect(issueCodes(makePrivateReport(), release)).toContain(
      "release-descriptor-invalid",
    );
  });

  it("requires complete animated-bound coverage", () => {
    const report = makePrivateReport();
    delete report.animationBounds["sand-recall-recovery"];

    expect(issueCodes(report, makeReleaseDescriptor())).toContain(
      "bounds-contract",
    );
  });
});
