import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CANONICAL_RUNTIME_CHARACTER_IDS,
  IMMERSIVE_RUNTIME_DEPENDENCY_VERSIONS,
  REQUIRED_LOCATION_SCENES,
  REQUIRED_TRAVERSAL_POWER_PHASES,
  immersiveRuntimeManifestSchema,
  type RuntimeAssetReference,
} from "../../../src/immersive/runtime";

function asset(
  id: string,
  kind: RuntimeAssetReference["kind"],
): RuntimeAssetReference {
  const sha256 = createHash("sha256").update(id).digest("hex");
  const contract = {
    "character-glb": ["glb", "model/gltf-binary"],
    "decoder-module": ["mjs", "text/javascript"],
    "decoder-wasm": ["wasm", "application/wasm"],
    "effect-manifest": ["json", "application/json"],
    "environment-glb": ["glb", "model/gltf-binary"],
    "production-metadata": ["json", "application/json"],
  } as const;
  const [extension, mimeType] = contract[kind];
  return {
    kind,
    uri: `assets/immersive/test/${id}.${sha256.slice(0, 12)}.${extension}`,
    mimeType,
    byteLength: 1_024,
    sha256,
  };
}

function validManifest() {
  return {
    schemaVersion: "1.0.0",
    releaseId: "profile-20260731t120000z-0123456789ab",
    generatedAtUtc: "2026-07-31T12:00:00Z",
    surface: {
      route: "/profile/explore/",
      entryMode: "explicit-user-opt-in",
      publicNavigation: "disabled-until-complete-matrix",
      staticFallback: "/profile/",
      serviceWorkerScope: "/profile/explore/",
    },
    renderer: {
      library: "three",
      version: IMMERSIVE_RUNTIME_DEPENDENCY_VERSIONS.three,
      backend: "webgl2",
      cameraAuthority: "full-body-framing-controller",
      cameraMode: "distant-full-body-third-person",
      offAxisProjection: true,
      postSkinningBounds: true,
      verificationObjectMask: true,
      contextRecoveryAttempts: 2,
    },
    compression: {
      texture: "ktx2-basis",
      geometry: "meshopt",
      meshoptimizerVersion: IMMERSIVE_RUNTIME_DEPENDENCY_VERSIONS.meshoptimizer,
      decoders: {
        basisTranscoderModule: asset(
          "basis-transcoder-module",
          "decoder-module",
        ),
        basisTranscoderWasm: asset("basis-transcoder-wasm", "decoder-wasm"),
        meshoptDecoderModule: asset("meshopt-decoder-module", "decoder-module"),
      },
    },
    characters: CANONICAL_RUNTIME_CHARACTER_IDS.map((characterId) => ({
      characterId,
      approval: "approved-production",
      residency: "selected-character-only",
      packageFormat: "self-contained-glb",
      package: asset(characterId.toLowerCase(), "character-glb"),
      metadata: asset(
        `${characterId.toLowerCase()}-metadata`,
        "production-metadata",
      ),
    })),
    locations: REQUIRED_LOCATION_SCENES.map(
      ({ sceneId, locationId, role }) => ({
        sceneId,
        locationId,
        role,
        approval: "approved-production",
        scene: asset(sceneId, "environment-glb"),
        metadata: asset(`${sceneId}-metadata`, "production-metadata"),
        enhancementFallback: "approved-still-plate",
      }),
    ),
    powers: Object.entries(REQUIRED_TRAVERSAL_POWER_PHASES).map(
      ([powerId, phases]) => ({
        powerId,
        approval: "approved-production",
        effectManifest: asset(`${powerId}-effect`, "effect-manifest"),
        conservativeSilhouetteProxy: true,
        completeBodyContainmentOutsideAuthoredSuppression: true,
        returnsToLowerThird: true,
        reducedMotionSubstitute: true,
        phases: [...phases],
      }),
    ),
    visibilitySuppressions: [
      {
        powerId: "sand-teleportation",
        phaseId: "authored-suppressed",
        marker: "avatar-visibility-authored-v1",
        maximumDurationMs: 1_200,
      },
    ],
    qualityTiers: [
      "high",
      "standard",
      "low-power",
      "reduced-motion",
      "emergency-static-fallback",
    ],
    integrity: {
      algorithm: "SHA-256",
      verifyBeforeParse: true,
      manifestCompleteness: "15-characters-16-scenes-3-powers",
    },
  };
}

describe("immersive runtime manifest", () => {
  it("accepts the exact production roster, scene and power contract", () => {
    expect(
      immersiveRuntimeManifestSchema.safeParse(validManifest()).success,
    ).toBe(true);
  });

  it("rejects an incomplete character roster", () => {
    const manifest = validManifest();
    manifest.characters.pop();
    expect(immersiveRuntimeManifestSchema.safeParse(manifest).success).toBe(
      false,
    );
  });

  it("rejects an incorrect location role pairing", () => {
    const manifest = validManifest();
    manifest.locations[0]!.role = "inner";
    const result = immersiveRuntimeManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(({ message }) =>
          message.includes("canonical scene ID"),
        ),
      ).toBe(true);
    }
  });

  it("rejects a content-address mismatch", () => {
    const manifest = validManifest();
    manifest.characters[0]!.package.sha256 = "f".repeat(64);
    const result = immersiveRuntimeManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(({ message }) =>
          message.includes("hash prefix"),
        ),
      ).toBe(true);
    }
  });

  it("rejects incomplete or reordered traversal phases", () => {
    const manifest = validManifest();
    manifest.powers[0]!.phases.reverse();
    const result = immersiveRuntimeManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(({ message }) =>
          message.includes("incomplete or out of order"),
        ),
      ).toBe(true);
    }
  });

  it("cannot enable public navigation before the complete matrix", () => {
    const manifest = validManifest();
    manifest.surface.publicNavigation = "enabled";
    expect(immersiveRuntimeManifestSchema.safeParse(manifest).success).toBe(
      false,
    );
  });

  it("rejects a duplicate runtime asset URI", () => {
    const manifest = validManifest();
    manifest.locations[0]!.scene = manifest.characters[0]!.package;
    const result = immersiveRuntimeManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(({ message }) =>
          message.includes("unique content-addressed URI"),
        ),
      ).toBe(true);
    }
  });
});
