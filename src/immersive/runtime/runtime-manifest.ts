import { z } from "zod";

export const IMMERSIVE_RUNTIME_DEPENDENCY_VERSIONS = {
  three: "0.185.1",
  threeTypes: "0.185.1",
  meshoptimizer: "1.2.0",
  gltfTransform: "4.4.2",
} as const;

export const CANONICAL_RUNTIME_CHARACTER_IDS = [
  "DN-M-AFR-01",
  "DN-M-EAS-01",
  "DN-M-SAS-01",
  "DN-M-MENA-01",
  "DN-M-EUR-01",
  "DN-F-AFR-01",
  "DN-F-EAS-01",
  "DN-F-SAS-01",
  "DN-F-MENA-01",
  "DN-F-EUR-01",
  "DN-N-AFR-01",
  "DN-N-EAS-01",
  "DN-N-SAS-01",
  "DN-N-MENA-01",
  "DN-N-EUR-01",
] as const;

export const REQUIRED_LOCATION_SCENES = [
  {
    sceneId: "threshold-dunes-outer",
    locationId: "threshold-dunes",
    role: "outer",
  },
  {
    sceneId: "threshold-dunes-inner",
    locationId: "threshold-dunes",
    role: "inner",
  },
  {
    sceneId: "stone-pass-names-outer",
    locationId: "stone-pass-names",
    role: "outer",
  },
  {
    sceneId: "stone-pass-names-inner",
    locationId: "stone-pass-names",
    role: "inner",
  },
  {
    sceneId: "garden-origins-outer",
    locationId: "garden-origins",
    role: "outer",
  },
  {
    sceneId: "garden-origins-inner",
    locationId: "garden-origins",
    role: "inner",
  },
  {
    sceneId: "archive-echoes-outer",
    locationId: "archive-echoes",
    role: "outer",
  },
  {
    sceneId: "archive-echoes-inner",
    locationId: "archive-echoes",
    role: "inner",
  },
  {
    sceneId: "forge-resolve-outer",
    locationId: "forge-resolve",
    role: "outer",
  },
  {
    sceneId: "forge-resolve-inner",
    locationId: "forge-resolve",
    role: "inner",
  },
  {
    sceneId: "bazaar-skill-outer",
    locationId: "bazaar-skill",
    role: "outer",
  },
  {
    sceneId: "bazaar-skill-inner",
    locationId: "bazaar-skill",
    role: "inner",
  },
  {
    sceneId: "observatory-horizons-outer",
    locationId: "observatory-horizons",
    role: "outer",
  },
  {
    sceneId: "observatory-horizons-inner",
    locationId: "observatory-horizons",
    role: "inner",
  },
  {
    sceneId: "oasis-audience-outer",
    locationId: "oasis-audience",
    role: "outer",
  },
  {
    sceneId: "oasis-audience-inner",
    locationId: "oasis-audience",
    role: "inner",
  },
] as const;

export const REQUIRED_TRAVERSAL_POWER_PHASES = {
  "solar-propulsion": [
    "anticipation",
    "launch",
    "ascent",
    "hover-crossover",
    "descent",
    "landing",
    "recovery",
  ],
  "sand-teleportation": [
    "anticipation",
    "conceal-start",
    "authored-suppressed",
    "reappearance",
    "recovery",
  ],
  "desert-surfing": [
    "start",
    "steady-travel",
    "turn",
    "launch",
    "landing",
    "cancellation",
    "recovery",
  ],
} as const;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CONTENT_ADDRESSED_URI_PATTERN =
  /^(?:characters|environments|metadata|powers|shared)\/[a-z0-9][a-z0-9/_-]*\.[0-9a-f]{12}\.(?:glb|json|ktx2)$/;
const VERSIONED_DECODER_URI_PATTERN =
  /^decoders\/three-0\.185\.1\/basis_transcoder\.(?:js|wasm)$/;
const RELEASE_ID_PATTERN = /^profile-[0-9]{8}t[0-9]{6}z-[0-9a-f]{12}$/;

type RuntimeAssetKind =
  | "character-glb"
  | "decoder-module"
  | "decoder-wasm"
  | "effect-manifest"
  | "environment-glb"
  | "production-metadata";

const ASSET_KIND_CONTRACT: Readonly<
  Record<
    RuntimeAssetKind,
    { readonly extension: string; readonly mime: string }
  >
> = {
  "character-glb": { extension: ".glb", mime: "model/gltf-binary" },
  "decoder-module": { extension: ".js", mime: "text/javascript" },
  "decoder-wasm": { extension: ".wasm", mime: "application/wasm" },
  "effect-manifest": { extension: ".json", mime: "application/json" },
  "environment-glb": { extension: ".glb", mime: "model/gltf-binary" },
  "production-metadata": { extension: ".json", mime: "application/json" },
};

export const runtimeAssetReferenceSchema = z
  .object({
    kind: z.enum([
      "character-glb",
      "decoder-module",
      "decoder-wasm",
      "effect-manifest",
      "environment-glb",
      "production-metadata",
    ]),
    uri: z
      .string()
      .refine(
        (value) =>
          CONTENT_ADDRESSED_URI_PATTERN.test(value) ||
          VERSIONED_DECODER_URI_PATTERN.test(value),
        "Runtime asset URI must be manifest-relative, content-addressed or an exact manifest-relative Three.js decoder path.",
      ),
    mimeType: z.enum([
      "application/json",
      "application/wasm",
      "model/gltf-binary",
      "text/javascript",
    ]),
    byteLength: z.number().int().positive(),
    sha256: z.string().regex(SHA256_PATTERN),
  })
  .strict()
  .superRefine((asset, context) => {
    const contract = ASSET_KIND_CONTRACT[asset.kind];
    if (!asset.uri.endsWith(contract.extension)) {
      context.addIssue({
        code: "custom",
        message: `${asset.kind} must use a ${contract.extension} asset.`,
        path: ["uri"],
      });
    }
    if (asset.mimeType !== contract.mime) {
      context.addIssue({
        code: "custom",
        message: `${asset.kind} must use MIME type ${contract.mime}.`,
        path: ["mimeType"],
      });
    }

    const hashPrefix = asset.uri.match(/\.([0-9a-f]{12})\.[^.]+$/u)?.[1];
    if (
      !asset.kind.startsWith("decoder-") &&
      hashPrefix !== asset.sha256.slice(0, 12)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Asset URI hash prefix must match its complete SHA-256 digest.",
        path: ["uri"],
      });
    }
  });

const characterEntrySchema = z
  .object({
    characterId: z.enum(CANONICAL_RUNTIME_CHARACTER_IDS),
    approval: z.literal("approved-production"),
    residency: z.literal("selected-character-only"),
    packageFormat: z.literal("self-contained-glb"),
    package: runtimeAssetReferenceSchema,
    metadata: runtimeAssetReferenceSchema,
  })
  .strict()
  .superRefine((entry, context) => {
    if (entry.package.kind !== "character-glb") {
      context.addIssue({
        code: "custom",
        message: "Character package must be a character GLB reference.",
        path: ["package", "kind"],
      });
    }
    if (entry.metadata.kind !== "production-metadata") {
      context.addIssue({
        code: "custom",
        message: "Character metadata must be a production-metadata reference.",
        path: ["metadata", "kind"],
      });
    }
  });

const locationSceneIdSchema = z.enum(
  REQUIRED_LOCATION_SCENES.map(({ sceneId }) => sceneId) as [
    (typeof REQUIRED_LOCATION_SCENES)[number]["sceneId"],
    ...(typeof REQUIRED_LOCATION_SCENES)[number]["sceneId"][],
  ],
);

const locationEntrySchema = z
  .object({
    sceneId: locationSceneIdSchema,
    locationId: z.string().regex(/^[a-z][a-z0-9-]+$/),
    role: z.enum(["outer", "inner"]),
    approval: z.literal("approved-production"),
    scene: runtimeAssetReferenceSchema,
    metadata: runtimeAssetReferenceSchema,
    enhancementFallback: z.literal("approved-still-plate"),
  })
  .strict()
  .superRefine((entry, context) => {
    const expected = REQUIRED_LOCATION_SCENES.find(
      ({ sceneId }) => sceneId === entry.sceneId,
    );
    if (
      expected === undefined ||
      expected.locationId !== entry.locationId ||
      expected.role !== entry.role
    ) {
      context.addIssue({
        code: "custom",
        message: "Location ID and role must match the canonical scene ID.",
        path: ["sceneId"],
      });
    }
    if (entry.scene.kind !== "environment-glb") {
      context.addIssue({
        code: "custom",
        message: "Location scene must be an environment GLB reference.",
        path: ["scene", "kind"],
      });
    }
    if (entry.metadata.kind !== "production-metadata") {
      context.addIssue({
        code: "custom",
        message: "Location metadata must be a production-metadata reference.",
        path: ["metadata", "kind"],
      });
    }
  });

const traversalPowerIdSchema = z.enum([
  "solar-propulsion",
  "sand-teleportation",
  "desert-surfing",
]);

const powerEntrySchema = z
  .object({
    powerId: traversalPowerIdSchema,
    approval: z.literal("approved-production"),
    effectManifest: runtimeAssetReferenceSchema,
    conservativeSilhouetteProxy: z.literal(true),
    completeBodyContainmentOutsideAuthoredSuppression: z.literal(true),
    returnsToLowerThird: z.literal(true),
    reducedMotionSubstitute: z.literal(true),
    phases: z.array(z.string().regex(/^[a-z][a-z0-9-]+$/)).min(1),
  })
  .strict()
  .superRefine((entry, context) => {
    if (entry.effectManifest.kind !== "effect-manifest") {
      context.addIssue({
        code: "custom",
        message: "Traversal power must reference an effect manifest.",
        path: ["effectManifest", "kind"],
      });
    }
    const expected = REQUIRED_TRAVERSAL_POWER_PHASES[entry.powerId];
    if (
      entry.phases.length !== expected.length ||
      expected.some((phase, index) => entry.phases[index] !== phase)
    ) {
      context.addIssue({
        code: "custom",
        message: `Traversal phases for ${entry.powerId} are incomplete or out of order.`,
        path: ["phases"],
      });
    }
  });

const decoderBundleSchema = z
  .object({
    sourcePackage: z.literal("three@0.185.1"),
    transcoderPath: z.literal(
      "/profile/assets/immersive/decoders/three-0.185.1/",
    ),
    basisTranscoderModule: runtimeAssetReferenceSchema,
    basisTranscoderWasm: runtimeAssetReferenceSchema,
  })
  .strict()
  .superRefine((bundle, context) => {
    const expected = {
      basisTranscoderModule: {
        kind: "decoder-module",
        uri: "decoders/three-0.185.1/basis_transcoder.js",
      },
      basisTranscoderWasm: {
        kind: "decoder-wasm",
        uri: "decoders/three-0.185.1/basis_transcoder.wasm",
      },
    } as const;
    for (const [field, contract] of Object.entries(expected)) {
      const asset = bundle[field as keyof typeof expected];
      if (asset.kind !== contract.kind || asset.uri !== contract.uri) {
        context.addIssue({
          code: "custom",
          message: `${field} must use the exact pinned Three.js decoder file.`,
          path: [field],
        });
      }
    }
  });

export const immersiveRuntimeManifestSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    releaseId: z.string().regex(RELEASE_ID_PATTERN),
    generatedAtUtc: z.iso.datetime({ offset: true }),
    surface: z
      .object({
        route: z.literal("/profile/explore/"),
        entryMode: z.literal("explicit-user-opt-in"),
        publicNavigation: z.literal("disabled-until-complete-matrix"),
        staticFallback: z.literal("/profile/"),
        serviceWorkerScope: z.literal("/profile/explore/"),
      })
      .strict(),
    renderer: z
      .object({
        library: z.literal("three"),
        version: z.literal(IMMERSIVE_RUNTIME_DEPENDENCY_VERSIONS.three),
        backend: z.literal("webgl2"),
        cameraAuthority: z.literal("full-body-framing-controller"),
        cameraMode: z.literal("distant-full-body-third-person"),
        offAxisProjection: z.literal(true),
        postSkinningBounds: z.literal(true),
        verificationObjectMask: z.literal(true),
        contextRecoveryAttempts: z.literal(2),
      })
      .strict(),
    compression: z
      .object({
        texture: z.literal("ktx2-basis"),
        geometry: z.literal("meshopt"),
        meshoptimizerVersion: z.literal(
          IMMERSIVE_RUNTIME_DEPENDENCY_VERSIONS.meshoptimizer,
        ),
        decoders: decoderBundleSchema,
      })
      .strict(),
    characters: z.array(characterEntrySchema).length(15),
    locations: z.array(locationEntrySchema).length(16),
    powers: z.array(powerEntrySchema).length(3),
    visibilitySuppressions: z
      .array(
        z
          .object({
            powerId: z.literal("sand-teleportation"),
            phaseId: z.literal("authored-suppressed"),
            marker: z.literal("avatar-visibility-authored-v1"),
            maximumDurationMs: z.number().int().min(100).max(2_000),
          })
          .strict(),
      )
      .length(1),
    qualityTiers: z.tuple([
      z.literal("high"),
      z.literal("standard"),
      z.literal("low-power"),
      z.literal("reduced-motion"),
      z.literal("emergency-static-fallback"),
    ]),
    integrity: z
      .object({
        algorithm: z.literal("SHA-256"),
        verifyBeforeParse: z.literal(true),
        manifestCompleteness: z.literal("15-characters-16-scenes-3-powers"),
      })
      .strict(),
  })
  .strict()
  .superRefine((manifest, context) => {
    const exactSet = (
      actual: readonly string[],
      expected: readonly string[],
      path: string,
    ): void => {
      if (
        actual.length !== expected.length ||
        new Set(actual).size !== actual.length ||
        expected.some((value) => !actual.includes(value))
      ) {
        context.addIssue({
          code: "custom",
          message: `${path} must contain the complete canonical set exactly once.`,
          path: [path],
        });
      }
    };

    exactSet(
      manifest.characters.map(({ characterId }) => characterId),
      CANONICAL_RUNTIME_CHARACTER_IDS,
      "characters",
    );
    exactSet(
      manifest.locations.map(({ sceneId }) => sceneId),
      REQUIRED_LOCATION_SCENES.map(({ sceneId }) => sceneId),
      "locations",
    );
    exactSet(
      manifest.powers.map(({ powerId }) => powerId),
      Object.keys(REQUIRED_TRAVERSAL_POWER_PHASES),
      "powers",
    );

    const assetUris = [
      manifest.compression.decoders.basisTranscoderModule.uri,
      manifest.compression.decoders.basisTranscoderWasm.uri,
      ...manifest.characters.flatMap(({ package: packageAsset, metadata }) => [
        packageAsset.uri,
        metadata.uri,
      ]),
      ...manifest.locations.flatMap(({ scene, metadata }) => [
        scene.uri,
        metadata.uri,
      ]),
      ...manifest.powers.map(({ effectManifest }) => effectManifest.uri),
    ];
    if (new Set(assetUris).size !== assetUris.length) {
      context.addIssue({
        code: "custom",
        message:
          "Every runtime asset must have one unique release-addressed URI.",
        path: ["integrity"],
      });
    }
  });

export type RuntimeAssetReference = z.infer<typeof runtimeAssetReferenceSchema>;
export type ImmersiveRuntimeManifest = z.infer<
  typeof immersiveRuntimeManifestSchema
>;

export function assertImmersiveRuntimeManifest(
  input: unknown,
): ImmersiveRuntimeManifest {
  return immersiveRuntimeManifestSchema.parse(input);
}
