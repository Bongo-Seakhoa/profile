import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AnimatedBoundsTracker,
  CanonicalAnimatedBoundsRegistry,
  ContentSafeZoneContractError,
  FramingContainmentError,
  FramingTelemetryBuffer,
  FullBodyFramingController,
  LookBackOrbitController,
  PerspectiveAabbProjectionProbe,
  ViewportSafeZoneService,
  resolveContentSweepRect,
  normalizeRectToVisualViewport,
  framingTelemetryEnabled,
  resolveBrowserViewportSnapshot,
  type AnimatedBoundContribution,
  type AnimatedEnvelope,
  type FramingControllerInput,
  type ProjectedAvatarBounds,
  type ProjectionProbe,
  type Rect,
  type SolvedCamera,
  type Viewport,
} from "../../../src/immersive/camera";

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 } as const;
const CSS_PIXEL_SPACE = "visual-viewport-css-pixels" as const;
const TEST_CHARACTER_ID = "DN-M-AFR-01";
const TEST_STATE_IDS = [
  "idle",
  "launch",
  "surf-hard-turn",
  "present",
  "sand-teleport",
  "lod-swap",
  "solar-launch",
] as const;

function testRegistry(): CanonicalAnimatedBoundsRegistry {
  return new CanonicalAnimatedBoundsRegistry([
    {
      characterId: TEST_CHARACTER_ID,
      commonRequiredContributors: [
        { id: "body", role: "body" },
        { id: "headwear", role: "headwear" },
        { id: "hands", role: "hand" },
        { id: "footwear", role: "footwear" },
        { id: "scarf", role: "scarf" },
        { id: "mantle-tail", role: "garment-tail" },
        { id: "pouch", role: "pouch" },
        { id: "power", role: "power-proxy" },
      ],
      states: TEST_STATE_IDS.map((stateId) => ({
        stateId,
        powerState:
          stateId === "launch" ||
          stateId === "surf-hard-turn" ||
          stateId === "sand-teleport" ||
          stateId === "solar-launch",
        requiredContributors: [],
      })),
    },
  ]);
}

function tracker(
  overrides: {
    readonly conservativeFallbacks?: ConstructorParameters<
      typeof AnimatedBoundsTracker
    >[0]["conservativeFallbacks"];
    readonly allowedVisibilitySuppressions?: ConstructorParameters<
      typeof AnimatedBoundsTracker
    >[0]["allowedVisibilitySuppressions"];
    readonly maximumSampleAgeFrames?: number;
  } = {},
): AnimatedBoundsTracker {
  return new AnimatedBoundsTracker({
    registry: testRegistry(),
    ...(overrides.conservativeFallbacks === undefined
      ? {}
      : { conservativeFallbacks: overrides.conservativeFallbacks }),
    ...(overrides.allowedVisibilitySuppressions === undefined
      ? {}
      : {
          allowedVisibilitySuppressions:
            overrides.allowedVisibilitySuppressions,
        }),
    ...(overrides.maximumSampleAgeFrames === undefined
      ? {}
      : { maximumSampleAgeFrames: overrides.maximumSampleAgeFrames }),
  });
}

function visualViewport(
  width: number,
  height: number,
  devicePixelRatio = 1,
  visualScale = 1,
  visualOffsetPx = { x: 0, y: 0 },
): Viewport {
  return {
    width,
    height,
    devicePixelRatio,
    visualOffsetPx,
    visualScale,
    coordinateSpace: CSS_PIXEL_SPACE,
  };
}

function solvedCamera(
  envelope: AnimatedEnvelope,
  overrides: Partial<SolvedCamera> = {},
): SolvedCamera {
  const bounds = envelope.combinedBounds;
  if (bounds === null) {
    throw new Error("A visible envelope is required for a solved test camera.");
  }

  return {
    radius: 8,
    azimuthRadians: 0,
    elevationRadians: 0,
    anchorPx: { x: 600, y: 400 },
    anchorCoordinateSpace: CSS_PIXEL_SPACE,
    rig: {
      kind: "distant-full-body-perspective",
      targetSource: "complete-animated-envelope-center",
      targetWorld: {
        x: (bounds.min.x + bounds.max.x) / 2,
        y: (bounds.min.y + bounds.max.y) / 2,
        z: (bounds.min.z + bounds.max.z) / 2,
      },
      verticalFieldOfViewDegrees: 46,
    },
    ...overrides,
  };
}

function contribution(
  overrides: Partial<AnimatedBoundContribution> & {
    id: string;
  },
): AnimatedBoundContribution {
  return {
    id: overrides.id,
    role: overrides.role ?? "accessory",
    active: overrides.active ?? true,
    sampleFrameId: overrides.sampleFrameId ?? 12,
    samplingMode:
      overrides.samplingMode ??
      (overrides.role === "body"
        ? "post-skinning"
        : "authored-conservative-proxy"),
    bounds:
      overrides.bounds ??
      ({
        min: { x: -0.4, y: 0, z: -0.25 },
        max: { x: 0.4, y: 2, z: 0.25 },
      } as const),
    predictiveBounds: overrides.predictiveBounds ?? null,
    padding: overrides.padding ?? { x: 0, y: 0, z: 0 },
  };
}

function canonicalContributions(
  frameId: number,
  predictive: boolean,
): AnimatedBoundContribution[] {
  const bounds = {
    min: { x: -0.4, y: 0, z: -0.3 },
    max: { x: 0.4, y: 2, z: 0.3 },
  } as const;
  return [
    ["body", "body"],
    ["headwear", "headwear"],
    ["hands", "hand"],
    ["footwear", "footwear"],
    ["scarf", "scarf"],
    ["mantle-tail", "garment-tail"],
    ["pouch", "pouch"],
    ["power", "power-proxy"],
  ].map(([id, role]) =>
    contribution({
      id: id as string,
      role: role as AnimatedBoundContribution["role"],
      sampleFrameId: frameId,
      bounds,
      predictiveBounds: predictive ? bounds : null,
    }),
  );
}

function visibleEnvelope(
  predictiveHeight: number | null = null,
): AnimatedEnvelope {
  const predictiveBounds = (
    bounds: AnimatedBoundContribution["bounds"],
  ): AnimatedBoundContribution["predictiveBounds"] =>
    predictiveHeight === null ? null : bounds;

  return tracker().sample({
    frameId: 12,
    sampleTimeMs: 200,
    characterId: TEST_CHARACTER_ID,
    stateId: predictiveHeight === null ? "idle" : "launch",
    visibility: { state: "visible" },
    predictiveBoundsRequired: predictiveHeight !== null,
    predictionHorizonMs: predictiveHeight === null ? 0 : 350,
    additionalContributorIds: [],
    contributions: [
      contribution({
        id: "body",
        role: "body",
        bounds: {
          min: { x: -0.38, y: 0, z: -0.22 },
          max: { x: 0.38, y: 1.9, z: 0.22 },
        },
        predictiveBounds:
          predictiveHeight === null
            ? null
            : {
                min: { x: -0.5, y: -0.2, z: -0.3 },
                max: { x: 0.5, y: predictiveHeight, z: 0.3 },
              },
      }),
      contribution({
        id: "scarf",
        role: "scarf",
        bounds: {
          min: { x: -0.2, y: 1.2, z: -0.7 },
          max: { x: 0.9, y: 2.05, z: 0.25 },
        },
        predictiveBounds:
          predictiveHeight === null
            ? null
            : {
                min: { x: -0.35, y: 1, z: -1.2 },
                max: { x: 1.2, y: predictiveHeight + 0.1, z: 0.4 },
              },
        padding: { x: 0.05, y: 0.05, z: 0.05 },
      }),
      contribution({
        id: "power",
        role: "power-proxy",
        bounds: {
          min: { x: -0.7, y: -0.05, z: -0.4 },
          max: { x: 0.7, y: 0.3, z: 0.4 },
        },
        predictiveBounds:
          predictiveHeight === null
            ? null
            : {
                min: { x: -1.1, y: -0.3, z: -0.6 },
                max: { x: 1.1, y: 0.5, z: 0.6 },
              },
      }),
      contribution({
        id: "headwear",
        role: "headwear",
        bounds: {
          min: { x: -0.3, y: 1.75, z: -0.3 },
          max: { x: 0.3, y: 2.04, z: 0.3 },
        },
        predictiveBounds: predictiveBounds({
          min: { x: -0.3, y: 1.75, z: -0.3 },
          max: { x: 0.3, y: 2.04, z: 0.3 },
        }),
      }),
      contribution({
        id: "hands",
        role: "hand",
        predictiveBounds: predictiveBounds({
          min: { x: -0.8, y: 0.7, z: -0.25 },
          max: { x: 0.8, y: 1.4, z: 0.25 },
        }),
      }),
      contribution({
        id: "footwear",
        role: "footwear",
        bounds: {
          min: { x: -0.4, y: -0.03, z: -0.35 },
          max: { x: 0.4, y: 0.25, z: 0.45 },
        },
        predictiveBounds: predictiveBounds({
          min: { x: -0.4, y: -0.03, z: -0.35 },
          max: { x: 0.4, y: 0.25, z: 0.45 },
        }),
      }),
      contribution({
        id: "mantle-tail",
        role: "garment-tail",
        predictiveBounds: predictiveBounds({
          min: { x: -0.4, y: 0.5, z: -0.8 },
          max: { x: 0.5, y: 1.7, z: 0.3 },
        }),
      }),
      contribution({
        id: "pouch",
        role: "pouch",
        predictiveBounds: predictiveBounds({
          min: { x: 0.25, y: 0.65, z: -0.25 },
          max: { x: 0.65, y: 1.1, z: 0.25 },
        }),
      }),
    ],
  });
}

function controllerInput(
  overrides: Partial<FramingControllerInput> = {},
): FramingControllerInput {
  return {
    deltaMs: 16.67,
    mode: "exploration",
    envelope: visibleEnvelope(),
    viewport: visualViewport(1440, 900),
    safeAreaInsets: ZERO_INSETS,
    activeContentRegions: [],
    horizontalPreference: "auto",
    verticalPreference: "lower-third",
    currentCamera: {
      radius: 8,
      azimuthRadians: 0.6,
      elevationRadians: 0.2,
      anchorPx: { x: 360, y: 684 },
      anchorCoordinateSpace: CSS_PIXEL_SPACE,
    },
    probe: new PerspectiveAabbProjectionProbe(),
    estimatedAvatarAspectRatio: 0.72,
    requestedHeightRatio: null,
    motionPreference: "full",
    lookBackIntent: null,
    interactionResumed: false,
    ...overrides,
  };
}

function overlaps(first: Rect, second: Rect): boolean {
  return !(
    first.right <= second.left ||
    first.left >= second.right ||
    first.bottom <= second.top ||
    first.top >= second.bottom
  );
}

describe("AnimatedBoundsTracker", () => {
  it("unions the body, accessories, motion proxies and predictive traversal extrema", () => {
    const envelope = visibleEnvelope(4.2);

    expect(envelope.contributorIds).toEqual([
      "body",
      "headwear",
      "hands",
      "footwear",
      "scarf",
      "mantle-tail",
      "pouch",
      "power",
    ]);
    expect(envelope.currentBounds?.min).toEqual({
      x: -0.7,
      y: -0.05,
      z: -0.75,
    });
    expect(envelope.currentBounds?.max.x).toBeCloseTo(0.95, 10);
    expect(envelope.currentBounds?.max.y).toBeCloseTo(2.1, 10);
    expect(envelope.currentBounds?.max.z).toBeCloseTo(0.45, 10);
    expect(envelope.combinedBounds?.min.y).toBe(-0.3);
    expect(envelope.combinedBounds?.max.y).toBeCloseTo(4.35, 10);
    expect(envelope.combinedBounds?.max.x).toBe(1.25);
  });

  it("fails closed when a fast state omits any contributor's predictive bound", () => {
    const boundsTracker = tracker();
    const contributions = canonicalContributions(12, true).map((candidate) =>
      candidate.id === "mantle-tail"
        ? { ...candidate, predictiveBounds: null }
        : candidate,
    );

    expect(() =>
      boundsTracker.sample({
        frameId: 12,
        sampleTimeMs: 200,
        characterId: TEST_CHARACTER_ID,
        stateId: "surf-hard-turn",
        visibility: { state: "visible" },
        predictiveBoundsRequired: true,
        predictionHorizonMs: 400,
        additionalContributorIds: [],
        contributions,
      }),
    ).toThrowError(/without conservative fallbacks/);
  });

  it("does not let a caller omit a canonical scarf from its additional IDs", () => {
    const boundsTracker = tracker();
    const contributions = canonicalContributions(1, false).filter(
      (candidate) => candidate.id !== "scarf",
    );

    expect(() =>
      boundsTracker.sample({
        frameId: 1,
        sampleTimeMs: 20,
        characterId: TEST_CHARACTER_ID,
        stateId: "present",
        visibility: { state: "visible" },
        predictiveBoundsRequired: false,
        predictionHorizonMs: 0,
        additionalContributorIds: [],
        contributions,
      }),
    ).toThrowError(/scarf/);
  });

  it("fails closed for unknown canonical states and power states without a power proxy", () => {
    expect(() =>
      testRegistry().requirementsFor(TEST_CHARACTER_ID, "unknown-state"),
    ).toThrowError(/no canonical animated-bounds state "unknown-state"/);

    expect(
      () =>
        new CanonicalAnimatedBoundsRegistry([
          {
            characterId: "incomplete-accessory-contract-test",
            commonRequiredContributors: [
              { id: "body", role: "body" },
              { id: "hair", role: "hair" },
              { id: "hands", role: "hand" },
              { id: "footwear", role: "footwear" },
              { id: "mantle-tail", role: "garment-tail" },
              { id: "pouch", role: "pouch" },
            ],
            states: [
              {
                stateId: "idle",
                powerState: false,
                requiredContributors: [],
              },
            ],
          },
        ]),
    ).toThrowError(/role "scarf"/);

    expect(
      () =>
        new CanonicalAnimatedBoundsRegistry([
          {
            characterId: "power-proxy-contract-test",
            commonRequiredContributors: [
              { id: "body", role: "body" },
              { id: "hair", role: "hair" },
              { id: "hands", role: "hand" },
              { id: "footwear", role: "footwear" },
              { id: "scarf", role: "scarf" },
              { id: "mantle-tail", role: "garment-tail" },
              { id: "pouch", role: "pouch" },
            ],
            states: [
              {
                stateId: "solar-launch",
                powerState: true,
                requiredContributors: [],
              },
            ],
          },
        ]),
    ).toThrowError(/omits its power silhouette proxy/);
  });

  it("permits an empty envelope only for an explicit authored effect", () => {
    const boundsTracker = tracker({
      allowedVisibilitySuppressions: [
        {
          characterId: TEST_CHARACTER_ID,
          effectId: "sand-teleport-dissolve",
          powerId: "sand-teleportation",
          phaseId: "fully-submerged",
          stateId: "sand-teleport",
          marker: "avatar-visibility-authored-v1",
          maximumDurationMs: 650,
        },
      ],
    });
    const envelope = boundsTracker.sample({
      frameId: 2,
      sampleTimeMs: 1_000,
      characterId: TEST_CHARACTER_ID,
      stateId: "sand-teleport",
      visibility: {
        state: "authored-suppressed",
        effectId: "sand-teleport-dissolve",
        powerId: "sand-teleportation",
        phaseId: "fully-submerged",
        marker: "avatar-visibility-authored-v1",
        occurrenceId: "teleport-001",
        startedAtMs: 680,
        elapsedMs: 320,
        maximumDurationMs: 650,
      },
      predictiveBoundsRequired: false,
      predictionHorizonMs: 0,
      additionalContributorIds: [],
      contributions: [],
    });

    expect(envelope.combinedBounds).toBeNull();
    expect(envelope.visibility.state).toBe("authored-suppressed");
  });

  it("uses a conservative maximum proxy for a missing or stale contributor", () => {
    const boundsTracker = tracker({
      conservativeFallbacks: [
        {
          id: "scarf",
          role: "scarf",
          bounds: {
            min: { x: -1.4, y: 0.7, z: -1.6 },
            max: { x: 1.5, y: 2.5, z: 0.7 },
          },
          predictiveBounds: {
            min: { x: -1.6, y: 0.4, z: -1.9 },
            max: { x: 1.8, y: 2.8, z: 0.9 },
          },
          padding: { x: 0.1, y: 0.1, z: 0.1 },
        },
      ],
    });
    const contributions = canonicalContributions(12, false).map((candidate) =>
      candidate.id === "scarf"
        ? { ...candidate, sampleFrameId: 11 }
        : candidate,
    );
    const envelope = boundsTracker.sample({
      frameId: 12,
      sampleTimeMs: 200,
      characterId: TEST_CHARACTER_ID,
      stateId: "lod-swap",
      visibility: { state: "visible" },
      predictiveBoundsRequired: false,
      predictionHorizonMs: 0,
      additionalContributorIds: [],
      contributions,
    });

    expect(envelope.fallbackContributorIds).toEqual(["scarf"]);
    expect(envelope.combinedBounds?.max.x).toBeCloseTo(1.9, 10);
    expect(envelope.combinedBounds?.min.z).toBeCloseTo(-2, 10);
  });

  it("rejects an unlisted or overlong disappearance phase", () => {
    const boundsTracker = tracker();

    expect(() =>
      boundsTracker.sample({
        frameId: 4,
        sampleTimeMs: 1_001,
        characterId: TEST_CHARACTER_ID,
        stateId: "solar-launch",
        visibility: {
          state: "authored-suppressed",
          effectId: "solar-frame-exit",
          powerId: "solar-propulsion",
          phaseId: "launch",
          marker: "avatar-visibility-authored-v1",
          occurrenceId: "solar-001",
          startedAtMs: 1_000,
          elapsedMs: 1,
          maximumDurationMs: 200,
        },
        predictiveBoundsRequired: false,
        predictionHorizonMs: 0,
        additionalContributorIds: [],
        contributions: [],
      }),
    ).toThrowError(/not on the authored whitelist/);

    const solarRule = {
      characterId: TEST_CHARACTER_ID,
      effectId: "solar-frame-exit",
      powerId: "solar-propulsion",
      phaseId: "launch",
      stateId: "solar-launch",
      marker: "avatar-visibility-authored-v1" as const,
      maximumDurationMs: 200,
    };
    const boundedTracker = tracker({
      allowedVisibilitySuppressions: [solarRule],
    });
    expect(() =>
      boundedTracker.sample({
        frameId: 1,
        sampleTimeMs: 1_201,
        characterId: TEST_CHARACTER_ID,
        stateId: "solar-launch",
        visibility: {
          state: "authored-suppressed",
          effectId: solarRule.effectId,
          powerId: solarRule.powerId,
          phaseId: solarRule.phaseId,
          marker: solarRule.marker,
          occurrenceId: "solar-overlong-001",
          startedAtMs: 1_000,
          elapsedMs: 201,
          maximumDurationMs: solarRule.maximumDurationMs,
        },
        predictiveBoundsRequired: false,
        predictionHorizonMs: 0,
        additionalContributorIds: [],
        contributions: [],
      }),
    ).toThrowError(/exceeded|absolute authored duration/);
  });

  it("rejects suppression resets, phase switches and occurrence replay", () => {
    const rule = {
      characterId: TEST_CHARACTER_ID,
      effectId: "sand-teleport-dissolve",
      powerId: "sand-teleportation",
      phaseId: "fully-submerged",
      stateId: "sand-teleport",
      marker: "avatar-visibility-authored-v1" as const,
      maximumDurationMs: 650,
    };
    const secondPhaseRule = { ...rule, phaseId: "dust-transit" };
    const boundsTracker = tracker({
      allowedVisibilitySuppressions: [rule, secondPhaseRule],
    });
    const suppressed = (
      frameId: number,
      sampleTimeMs: number,
      occurrenceId: string,
      startedAtMs: number,
      elapsedMs: number,
    ) => ({
      frameId,
      sampleTimeMs,
      characterId: TEST_CHARACTER_ID,
      stateId: "sand-teleport",
      visibility: {
        state: "authored-suppressed" as const,
        effectId: rule.effectId,
        powerId: rule.powerId,
        phaseId: rule.phaseId,
        marker: rule.marker,
        occurrenceId,
        startedAtMs,
        elapsedMs,
        maximumDurationMs: rule.maximumDurationMs,
      },
      predictiveBoundsRequired: false,
      predictionHorizonMs: 0,
      additionalContributorIds: [],
      contributions: [],
    });

    boundsTracker.sample(suppressed(1, 1_000, "teleport-001", 900, 100));
    boundsTracker.sample(suppressed(2, 1_100, "teleport-001", 900, 200));

    expect(() =>
      boundsTracker.sample(suppressed(3, 1_150, "teleport-001", 900, 10)),
    ).toThrowError(/reset|absolute authored duration/);
    expect(() =>
      boundsTracker.sample(suppressed(3, 1_150, "teleport-002", 1_100, 50)),
    ).toThrowError(/changed identity|replayed/);
    const phaseSwitch = suppressed(3, 1_150, "teleport-001", 900, 250);
    expect(() =>
      boundsTracker.sample({
        ...phaseSwitch,
        visibility: {
          ...phaseSwitch.visibility,
          phaseId: secondPhaseRule.phaseId,
        },
      }),
    ).toThrowError(/switched phase|changed identity/);
  });

  it("rejects a used suppression occurrence after visibility resumes", () => {
    const rule = {
      characterId: TEST_CHARACTER_ID,
      effectId: "sand-teleport-dissolve",
      powerId: "sand-teleportation",
      phaseId: "fully-submerged",
      stateId: "sand-teleport",
      marker: "avatar-visibility-authored-v1" as const,
      maximumDurationMs: 650,
    };
    const boundsTracker = tracker({ allowedVisibilitySuppressions: [rule] });
    boundsTracker.sample({
      frameId: 1,
      sampleTimeMs: 1_000,
      characterId: TEST_CHARACTER_ID,
      stateId: "sand-teleport",
      visibility: {
        state: "authored-suppressed",
        ...rule,
        occurrenceId: "teleport-replay",
        startedAtMs: 900,
        elapsedMs: 100,
      },
      predictiveBoundsRequired: false,
      predictionHorizonMs: 0,
      additionalContributorIds: [],
      contributions: [],
    });
    boundsTracker.sample({
      frameId: 2,
      sampleTimeMs: 1_100,
      characterId: TEST_CHARACTER_ID,
      stateId: "idle",
      visibility: { state: "visible" },
      predictiveBoundsRequired: false,
      predictionHorizonMs: 0,
      additionalContributorIds: [],
      contributions: canonicalContributions(2, false),
    });

    expect(() =>
      boundsTracker.sample({
        frameId: 3,
        sampleTimeMs: 1_200,
        characterId: TEST_CHARACTER_ID,
        stateId: "sand-teleport",
        visibility: {
          state: "authored-suppressed",
          ...rule,
          occurrenceId: "teleport-replay",
          startedAtMs: 1_150,
          elapsedMs: 50,
        },
        predictiveBoundsRequired: false,
        predictionHorizonMs: 0,
        additionalContributorIds: [],
        contributions: [],
      }),
    ).toThrowError(/replayed/);
  });

  it("rejects non-finite or duplicate visibility whitelist rules", () => {
    const baseRule = {
      characterId: TEST_CHARACTER_ID,
      effectId: "sand-teleport-dissolve",
      powerId: "sand-teleportation",
      phaseId: "fully-submerged",
      stateId: "sand-teleport",
      marker: "avatar-visibility-authored-v1" as const,
      maximumDurationMs: 650,
    };

    expect(() =>
      tracker({
        allowedVisibilitySuppressions: [baseRule, { ...baseRule }],
      }),
    ).toThrowError(/unique/);
    expect(() =>
      tracker({
        allowedVisibilitySuppressions: [
          { ...baseRule, maximumDurationMs: Number.NaN },
        ],
      }),
    ).toThrowError(/finite/);
  });
});

describe("ViewportSafeZoneService", () => {
  it("selects a lower-left free pocket when active HTML occupies the right", () => {
    const service = new ViewportSafeZoneService();
    const panel: Rect = {
      left: 720,
      top: 180,
      right: 1410,
      bottom: 860,
    };
    const result = service.resolve({
      viewport: visualViewport(1440, 900),
      safeAreaInsets: ZERO_INSETS,
      activeContentRegions: [
        {
          id: "case-study-panel",
          rect: panel,
          coordinateSpace: CSS_PIXEL_SPACE,
          clearancePx: 24,
          priority: 10,
        },
      ],
      mode: "exploration",
      horizontalPreference: "auto",
      verticalPreference: "lower-third",
      estimatedAvatarAspectRatio: 0.65,
      requestedHeightRatio: null,
    });

    expect(result.side).toBe("left");
    expect(result.targetAnchorPx.y / 900).toBeGreaterThan(0.65);
    expect(overlaps(result.pocketRect, panel)).toBe(false);
    expect(result.animationStageRect.top).toBe(600);
    expect(result.targetHeightRatio).toBe(0.18);
    expect(result.maximumHeightRatio).toBe(0.24);
  });
});

describe("browser visual-viewport integration", () => {
  it("uses the visual viewport and normalizes layout rectangles to its origin", () => {
    const snapshot = resolveBrowserViewportSnapshot({
      layoutWidth: 1_440,
      layoutHeight: 900,
      devicePixelRatio: 2,
      visualViewport: {
        width: 720,
        height: 450,
        offsetLeft: 120,
        offsetTop: 80,
        scale: 2,
      },
      safeAreaInsets: { top: 18, right: 0, bottom: 22, left: 0 },
      motionPreference: "reduced",
    });
    const normalized = normalizeRectToVisualViewport(
      { left: 150, top: 100, right: 350, bottom: 300 },
      { width: 720, height: 450, offsetLeft: 120, offsetTop: 80 },
    );

    expect(snapshot.viewport).toEqual({
      width: 720,
      height: 450,
      devicePixelRatio: 2,
      visualOffsetPx: { x: 120, y: 80 },
      visualScale: 2,
      coordinateSpace: "visual-viewport-css-pixels",
    });
    expect(snapshot.visualOffsetPx).toEqual({ x: 120, y: 80 });
    expect(snapshot.visualScale).toBe(2);
    expect(snapshot.motionPreference).toBe("reduced");
    expect(normalized).toEqual({
      left: 30,
      top: 20,
      right: 230,
      bottom: 220,
    });
  });

  it("falls back to the layout viewport without losing safe-area data", () => {
    const snapshot = resolveBrowserViewportSnapshot({
      layoutWidth: 1_366,
      layoutHeight: 768,
      devicePixelRatio: 1,
      visualViewport: null,
      safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
      motionPreference: "full",
    });

    expect(snapshot.viewport.width).toBe(1_366);
    expect(snapshot.viewport.height).toBe(768);
    expect(snapshot.visualOffsetPx).toEqual({ x: 0, y: 0 });
    expect(snapshot.visualScale).toBe(1);
  });

  it("treats an unavailable visual-viewport API as a supported fallback", () => {
    const snapshot = resolveBrowserViewportSnapshot({
      layoutWidth: 1_280,
      layoutHeight: 720,
      devicePixelRatio: 1.25,
      visualViewport: undefined,
      safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
      motionPreference: "full",
    });

    expect(snapshot.viewport).toEqual({
      width: 1_280,
      height: 720,
      devicePixelRatio: 1.25,
      visualOffsetPx: { x: 0, y: 0 },
      visualScale: 1,
      coordinateSpace: "visual-viewport-css-pixels",
    });
    expect(snapshot.visualOffsetPx).toEqual({ x: 0, y: 0 });
  });
});

describe("DOM content transition sweeps", () => {
  it("fails closed for invalid rectangles and moving content without a sweep", () => {
    expect(() =>
      resolveContentSweepRect({
        id: "invalid-panel",
        currentRect: { left: 50, top: 20, right: 40, bottom: 200 },
        previousRect: null,
        conservativeSweepRect: null,
        animationActive: false,
      }),
    ).toThrowError(ContentSafeZoneContractError);

    expect(() =>
      resolveContentSweepRect({
        id: "moving-panel",
        currentRect: { left: 500, top: 100, right: 900, bottom: 700 },
        previousRect: { left: 1_100, top: 100, right: 1_400, bottom: 700 },
        conservativeSweepRect: null,
        animationActive: true,
      }),
    ).toThrowError(/requires a conservative transition sweep rectangle/);
  });

  it("unions current, previous and authored sweep bounds before visual-viewport normalization", () => {
    const swept = resolveContentSweepRect({
      id: "opening-case-study",
      currentRect: { left: 520, top: 120, right: 980, bottom: 760 },
      previousRect: { left: 1_080, top: 160, right: 1_420, bottom: 720 },
      conservativeSweepRect: {
        left: 440,
        top: 80,
        right: 1_440,
        bottom: 800,
      },
      animationActive: true,
    });

    expect(swept).toEqual({
      left: 440,
      top: 80,
      right: 1_440,
      bottom: 800,
    });
    expect(
      normalizeRectToVisualViewport(swept, {
        width: 720,
        height: 450,
        offsetLeft: 120,
        offsetTop: 80,
      }),
    ).toEqual({ left: 320, top: 0, right: 1_320, bottom: 720 });
  });
});

describe("PerspectiveAabbProjectionProbe", () => {
  it("projects all 8 AABB corners across orbit, elevation and viewport aspect", () => {
    const envelope = visibleEnvelope();
    const probe = new PerspectiveAabbProjectionProbe();
    const baseViewport = visualViewport(1_200, 800);
    const baseCamera = solvedCamera(envelope);
    const front = probe.project(envelope, baseCamera, baseViewport);
    const side = probe.project(
      envelope,
      solvedCamera(envelope, { azimuthRadians: Math.PI / 2 }),
      baseViewport,
    );
    const elevated = probe.project(
      envelope,
      solvedCamera(envelope, { elevationRadians: 0.42 }),
      baseViewport,
    );
    const wideViewport = visualViewport(1_600, 800);
    const wide = probe.project(
      envelope,
      solvedCamera(envelope, { anchorPx: { x: 800, y: 400 } }),
      wideViewport,
    );

    const frontWidth = front.right - front.left;
    const frontHeight = front.bottom - front.top;
    const sideWidth = side.right - side.left;
    const elevatedHeight = elevated.bottom - elevated.top;
    const wideWidth = wide.right - wide.left;

    expect(front.coordinateSpace).toBe(CSS_PIXEL_SPACE);
    expect(front.visiblePixelFraction).toBe(1);
    expect(sideWidth).not.toBeCloseTo(frontWidth, 3);
    expect(elevatedHeight).not.toBeCloseTo(frontHeight, 3);
    expect(wideWidth).toBeCloseTo(frontWidth, 8);
    expect(frontWidth / baseViewport.width).toBeGreaterThan(
      wideWidth / wideViewport.width,
    );
  });

  it("keeps projection output in visual-viewport CSS pixels across DPR, scale and offset", () => {
    const envelope = visibleEnvelope();
    const probe = new PerspectiveAabbProjectionProbe();
    const camera = solvedCamera(envelope);
    const standard = probe.project(
      envelope,
      camera,
      visualViewport(1_200, 800, 1, 1, { x: 0, y: 0 }),
    );
    const zoomedHighDpr = probe.project(
      envelope,
      camera,
      visualViewport(1_200, 800, 3, 2.5, { x: 240, y: 140 }),
    );

    expect(zoomedHighDpr).toEqual(standard);
    expect(zoomedHighDpr.coordinateSpace).toBe(CSS_PIXEL_SPACE);
  });

  it("rejects a rig target that is not the complete animated-envelope center", () => {
    const envelope = visibleEnvelope();
    const valid = solvedCamera(envelope);
    const invalid: SolvedCamera = {
      ...valid,
      rig: {
        ...valid.rig,
        targetWorld: {
          ...valid.rig.targetWorld,
          x: valid.rig.targetWorld.x + 0.01,
        },
      },
    };

    expect(() =>
      new PerspectiveAabbProjectionProbe().project(
        envelope,
        invalid,
        visualViewport(1_200, 800),
      ),
    ).toThrowError(/not derived from the complete animated envelope/);
  });
});

describe("LookBackOrbitController", () => {
  it("drives the authored wide orbit and controlled return", () => {
    const orbit = new LookBackOrbitController();
    const entered = orbit.resolve({
      phase: "enter",
      phaseElapsedMs: 380,
      baselineAzimuthRadians: 0.4,
      orbitDirection: 1,
      motionPreference: "full",
    });
    const held = orbit.resolve({
      phase: "hold",
      phaseElapsedMs: 2_000,
      baselineAzimuthRadians: 0.4,
      orbitDirection: 1,
      motionPreference: "full",
    });
    const returned = orbit.resolve({
      phase: "exit",
      phaseElapsedMs: 280,
      baselineAzimuthRadians: 0.4,
      orbitDirection: 1,
      motionPreference: "full",
    });

    expect(entered.orbitDegrees).toBe(170);
    expect(entered.phaseComplete).toBe(true);
    expect(held.orbitDegrees).toBe(170);
    expect(held.backdropBlend).toBe(1);
    expect(held.framingIntent).toEqual({
      phase: "hold",
      orbitDirection: 1,
      targetOrbitDegrees: 170,
      orbitProgress: 1,
      presentation: "camera-orbit",
    });
    expect(returned.orbitDegrees).toBe(0);
    expect(returned.azimuthRadians).toBeCloseTo(0.4, 10);
    expect(returned.phaseComplete).toBe(true);
  });

  it("keeps the camera fixed and exposes a still crossfade in reduced motion", () => {
    const output = new LookBackOrbitController().resolve({
      phase: "enter",
      phaseElapsedMs: 380,
      baselineAzimuthRadians: 1.1,
      orbitDirection: -1,
      motionPreference: "reduced",
    });

    expect(output.azimuthRadians).toBe(1.1);
    expect(output.orbitDegrees).toBe(0);
    expect(output.backdropBlend).toBe(1);
    expect(output.presentation).toBe("still-crossfade");
    expect(output.framingIntent.orbitProgress).toBe(0);
    expect(output.framingIntent.presentation).toBe("still-crossfade");
  });
});

describe("framing telemetry debug buffer", () => {
  it("stays production-disabled unless the exact debug flag is present", () => {
    expect(framingTelemetryEnabled("?framingTelemetry=1")).toBe(true);
    expect(framingTelemetryEnabled("?framingTelemetry=true")).toBe(false);

    const output = new FullBodyFramingController().update(controllerInput());
    const disabled = new FramingTelemetryBuffer();
    disabled.record(output.telemetry);

    expect(disabled.enabled).toBe(false);
    expect(disabled.snapshot()).toEqual([]);
  });

  it("keeps a bounded per-frame trace for independent browser review", () => {
    const controller = new FullBodyFramingController();
    const buffer = new FramingTelemetryBuffer({
      enabled: true,
      maximumFrames: 2,
    });

    for (const frameId of [40, 41, 42]) {
      const envelope = { ...visibleEnvelope(), frameId };
      buffer.record(controller.update(controllerInput({ envelope })).telemetry);
    }

    expect(buffer.snapshot().map((frame) => frame.frameId)).toEqual([41, 42]);
    buffer.clear();
    expect(buffer.snapshot()).toEqual([]);
  });
});

describe("FullBodyFramingController", () => {
  it("solves a desktop companion composition inside the 14–20 percent band", () => {
    const input = controllerInput();
    const output = new FullBodyFramingController().update(input);
    const bounds = input.envelope.combinedBounds;
    if (bounds === null) {
      throw new Error("Expected a visible complete-envelope fixture.");
    }

    expect(output.telemetry.containmentPass).toBe(true);
    expect(output.telemetry.heightRatio).toBeGreaterThanOrEqual(0.179);
    expect(output.telemetry.heightRatio).toBeLessThanOrEqual(0.181);
    expect(output.safeZone.side).toBe("left");
    expect(output.telemetry.projectedBounds?.top).toBeGreaterThan(
      output.safeZone.animationStageRect.top,
    );
    expect(output.camera.anchorCoordinateSpace).toBe(CSS_PIXEL_SPACE);
    expect(output.safeZone.coordinateSpace).toBe(CSS_PIXEL_SPACE);
    expect(output.telemetry.projectedBounds?.coordinateSpace).toBe(
      CSS_PIXEL_SPACE,
    );
    expect(output.camera.rig).toEqual({
      kind: "distant-full-body-perspective",
      targetSource: "complete-animated-envelope-center",
      targetWorld: {
        x: (bounds.min.x + bounds.max.x) / 2,
        y: (bounds.min.y + bounds.max.y) / 2,
        z: (bounds.min.z + bounds.max.z) / 2,
      },
      verticalFieldOfViewDegrees: 46,
    });
  });

  it("pulls back for a predictive launch envelope before it reaches the edge", () => {
    const controller = new FullBodyFramingController();
    const idle = controller.update(controllerInput());
    const launch = controller.update(
      controllerInput({
        mode: "traversal",
        envelope: visibleEnvelope(4.2),
        currentCamera: idle.camera,
      }),
    );

    expect(launch.camera.radius).toBeGreaterThan(idle.camera.radius);
    expect(launch.telemetry.heightRatio).toBeLessThanOrEqual(0.181);
    expect(launch.telemetry.reasons).toContain("predictive-traversal-pullback");
  });

  it("allows an authored power to hover above the home stage and then return", () => {
    const controller = new FullBodyFramingController();
    const upper = controller.update(
      controllerInput({
        mode: "traversal",
        verticalPreference: "upper",
        envelope: visibleEnvelope(2.8),
        currentCamera: {
          radius: 1,
          azimuthRadians: 0.2,
          elevationRadians: 0.3,
          anchorPx: { x: 360, y: 684 },
          anchorCoordinateSpace: CSS_PIXEL_SPACE,
        },
        interactionResumed: true,
      }),
    );
    const returned = controller.update(
      controllerInput({
        mode: "exploration",
        verticalPreference: "lower-third",
        currentCamera: upper.camera,
        interactionResumed: true,
      }),
    );

    expect(upper.camera.anchorPx.y / 900).toBeLessThan(0.4);
    expect(upper.telemetry.containmentPass).toBe(true);
    expect(returned.safeZone.animationStageRect.top).toBe(600);
    expect(returned.telemetry.projectedBounds?.top).toBeGreaterThan(
      returned.safeZone.animationStageRect.top,
    );
  });

  it("derives a 160-180 degree look-back only from the baseline and authored intent", () => {
    const controller = new FullBodyFramingController();
    const orbit = new LookBackOrbitController();
    const baseline = controller.update(controllerInput());
    const orbitHint = orbit.resolve({
      phase: "hold",
      phaseElapsedMs: 5_000,
      baselineAzimuthRadians: baseline.camera.azimuthRadians,
      orbitDirection: 1,
      motionPreference: "full",
    });
    const maliciousCurrent = {
      radius: 0.5,
      azimuthRadians: -12,
      elevationRadians: 1.1,
      anchorPx: { x: 1_430, y: 20 },
      anchorCoordinateSpace: CSS_PIXEL_SPACE,
    } as const;
    const output = controller.update({
      ...controllerInput({
        mode: "look-back",
        currentCamera: maliciousCurrent,
        lookBackIntent: orbitHint.framingIntent,
      }),
      lookBackBaselineCamera: maliciousCurrent,
    } as FramingControllerInput);

    expect(orbitHint.framingIntent.targetOrbitDegrees).toBeGreaterThanOrEqual(
      160,
    );
    expect(orbitHint.framingIntent.targetOrbitDegrees).toBeLessThanOrEqual(180);
    expect(output.camera.azimuthRadians).toBeCloseTo(
      baseline.camera.azimuthRadians + (170 * Math.PI) / 180,
      10,
    );
    expect(output.camera.azimuthRadians).not.toBe(
      maliciousCurrent.azimuthRadians,
    );
    expect(output.camera.elevationRadians).toBe(
      baseline.camera.elevationRadians,
    );
    expect(output.camera.anchorPx).toEqual(baseline.camera.anchorPx);
    expect(output.camera.radius).toBeGreaterThanOrEqual(baseline.camera.radius);
    expect(output.telemetry.lookBackRadiusDeltaRatio).toBeLessThanOrEqual(0.15);
    expect(output.telemetry.lookBackOrbitDegrees).toBe(170);
    expect(output.telemetry.containmentPass).toBe(true);
  });

  it("rejects a fabricated baseline before a normal composition has been solved", () => {
    const orbitHint = new LookBackOrbitController().resolve({
      phase: "hold",
      phaseElapsedMs: 1_000,
      baselineAzimuthRadians: 0,
      orbitDirection: 1,
      motionPreference: "full",
    });
    const fabricatedBaseline = {
      radius: 0.5,
      azimuthRadians: 2.8,
      elevationRadians: 1.2,
      anchorPx: { x: 1_430, y: 10 },
      anchorCoordinateSpace: CSS_PIXEL_SPACE,
    } as const;

    expect(() =>
      new FullBodyFramingController().update({
        ...controllerInput({
          mode: "look-back",
          currentCamera: fabricatedBaseline,
          lookBackIntent: orbitHint.framingIntent,
        }),
        lookBackBaselineCamera: fabricatedBaseline,
      } as FramingControllerInput),
    ).toThrowError(/previously solved normal full-body composition/);
  });

  it("restores the cached home composition before look back after an edge lean", () => {
    const controller = new FullBodyFramingController();
    const baseline = controller.update(
      controllerInput({ deltaMs: 8_000, horizontalPreference: "left" }),
    );
    const edge = controller.update(
      controllerInput({
        deltaMs: 8_000,
        mode: "idle-edge-lean",
        horizontalPreference: "right",
        currentCamera: baseline.camera,
      }),
    );
    const orbitHint = new LookBackOrbitController().resolve({
      phase: "hold",
      phaseElapsedMs: 1_000,
      baselineAzimuthRadians: baseline.camera.azimuthRadians,
      orbitDirection: 1,
      motionPreference: "full",
    });
    const output = controller.update(
      controllerInput({
        mode: "look-back",
        currentCamera: edge.camera,
        lookBackIntent: orbitHint.framingIntent,
      }),
    );

    expect(edge.camera.anchorPx).not.toEqual(baseline.camera.anchorPx);
    expect(output.camera.anchorPx).toEqual(baseline.camera.anchorPx);
    expect(output.camera.elevationRadians).toBe(
      baseline.camera.elevationRadians,
    );
  });

  it("does not promote an elevated traversal camera to the look-back baseline", () => {
    const controller = new FullBodyFramingController();
    const baseline = controller.update(controllerInput({ deltaMs: 8_000 }));
    const traversal = controller.update(
      controllerInput({
        deltaMs: 8_000,
        mode: "traversal",
        verticalPreference: "upper",
        envelope: visibleEnvelope(3.7),
        currentCamera: {
          ...baseline.camera,
          elevationRadians: 0.65,
        },
        interactionResumed: true,
      }),
    );
    const orbitHint = new LookBackOrbitController().resolve({
      phase: "hold",
      phaseElapsedMs: 1_000,
      baselineAzimuthRadians: baseline.camera.azimuthRadians,
      orbitDirection: -1,
      motionPreference: "full",
    });
    const output = controller.update(
      controllerInput({
        mode: "look-back",
        currentCamera: traversal.camera,
        lookBackIntent: orbitHint.framingIntent,
      }),
    );

    expect(traversal.camera.elevationRadians).toBe(0.65);
    expect(traversal.camera.anchorPx).not.toEqual(baseline.camera.anchorPx);
    expect(output.camera.elevationRadians).toBe(
      baseline.camera.elevationRadians,
    );
    expect(output.camera.anchorPx).toEqual(baseline.camera.anchorPx);
  });

  it("contains every sampled wide-orbit frame at approximately one radius", () => {
    const framing = new FullBodyFramingController();
    const orbit = new LookBackOrbitController();
    const baseline = framing.update(controllerInput());

    for (let elapsedMs = 0; elapsedMs <= 380; elapsedMs += 19) {
      const orbitHint = orbit.resolve({
        phase: "enter",
        phaseElapsedMs: elapsedMs,
        baselineAzimuthRadians: baseline.camera.azimuthRadians,
        orbitDirection: 1,
        motionPreference: "full",
      });
      const frame = framing.update(
        controllerInput({
          mode: "look-back",
          currentCamera: {
            ...baseline.camera,
            azimuthRadians: -10,
            elevationRadians: -0.8,
            anchorPx: { x: 1_420, y: 30 },
          },
          lookBackIntent: orbitHint.framingIntent,
        }),
      );

      expect(frame.telemetry.containmentPass).toBe(true);
      expect(frame.telemetry.minimumViewportMarginPx).toBeGreaterThan(0);
      expect(frame.telemetry.minimumPocketMarginPx).toBeGreaterThan(0);
      expect(frame.telemetry.lookBackRadiusDeltaRatio).toBeLessThanOrEqual(
        0.15,
      );
      expect(frame.camera.azimuthRadians).toBeCloseTo(
        orbitHint.azimuthRadians,
        10,
      );
      expect(frame.camera.elevationRadians).toBe(
        baseline.camera.elevationRadians,
      );
      expect(frame.camera.anchorPx).toEqual(baseline.camera.anchorPx);
    }
  });

  it("enforces the normal camera composition during reduced-motion look back", () => {
    const controller = new FullBodyFramingController();
    const orbit = new LookBackOrbitController();
    const baseline = controller.update(controllerInput());
    const orbitHint = orbit.resolve({
      phase: "enter",
      phaseElapsedMs: 380,
      baselineAzimuthRadians: baseline.camera.azimuthRadians,
      orbitDirection: -1,
      motionPreference: "reduced",
    });
    const output = controller.update(
      controllerInput({
        mode: "look-back",
        motionPreference: "reduced",
        currentCamera: {
          ...baseline.camera,
          azimuthRadians: baseline.camera.azimuthRadians + Math.PI,
          elevationRadians: -0.8,
          anchorPx: { x: 1_400, y: 10 },
        },
        lookBackIntent: orbitHint.framingIntent,
      }),
    );

    expect(output.camera.azimuthRadians).toBe(baseline.camera.azimuthRadians);
    expect(output.camera.elevationRadians).toBe(
      baseline.camera.elevationRadians,
    );
    expect(output.camera.anchorPx).toEqual(baseline.camera.anchorPx);
    expect(output.telemetry.lookBackRadiusDeltaRatio).toBe(0);
    expect(output.telemetry.reasons).toContain(
      "reduced-motion-look-back-crossfade",
    );
    expect(output.telemetry.containmentPass).toBe(true);
  });

  it("permits deliberate zoom while clamping normal navigation to 24 percent", () => {
    const controller = new FullBodyFramingController();
    const zoomedIn = controller.update(
      controllerInput({
        deltaMs: 8_000,
        requestedHeightRatio: 0.23,
        currentCamera: {
          radius: 6,
          azimuthRadians: 0.4,
          elevationRadians: 0.2,
          anchorPx: { x: 360, y: 720 },
          anchorCoordinateSpace: CSS_PIXEL_SPACE,
        },
      }),
    );
    const clamped = controller.update(
      controllerInput({
        deltaMs: 8_000,
        requestedHeightRatio: 0.31,
        currentCamera: zoomedIn.camera,
      }),
    );

    expect(zoomedIn.telemetry.heightRatio).toBeCloseTo(0.23, 3);
    expect(clamped.safeZone.targetHeightRatio).toBe(0.24);
    expect(clamped.telemetry.heightRatio).toBeLessThanOrEqual(0.24);
  });

  it("allows a larger but still complete full-body character-selection view", () => {
    const output = new FullBodyFramingController().update(
      controllerInput({
        deltaMs: 8_000,
        mode: "character-selection",
        requestedHeightRatio: 0.52,
        verticalPreference: "middle",
        currentCamera: {
          radius: 8,
          azimuthRadians: 0,
          elevationRadians: 0.1,
          anchorPx: { x: 720, y: 450 },
          anchorCoordinateSpace: CSS_PIXEL_SPACE,
        },
        interactionResumed: true,
      }),
    );

    expect(output.safeZone.maximumHeightRatio).toBe(0.55);
    expect(output.telemetry.heightRatio).toBeCloseTo(0.52, 2);
    expect(output.telemetry.containmentPass).toBe(true);
  });

  it("keeps full visibility non-relaxable when telemetry reports a partial silhouette", () => {
    const baseProbe = new PerspectiveAabbProjectionProbe();
    const occludedProbe: ProjectionProbe = {
      project(envelope, candidate, viewport) {
        return {
          ...baseProbe.project(envelope, candidate, viewport),
          visiblePixelFraction: 0.998,
        };
      },
    };
    const attemptedRelaxation = {
      minimumVisiblePixelFraction: 0.9,
    } as unknown as ConstructorParameters<typeof FullBodyFramingController>[1];

    expect(() =>
      new FullBodyFramingController(undefined, attemptedRelaxation).update(
        controllerInput({ probe: occludedProbe }),
      ),
    ).toThrowError(FramingContainmentError);
  });

  it("moves fully away from opening content and restores immediately after input", () => {
    const controller = new FullBodyFramingController();
    const panel = {
      id: "open-work-detail",
      rect: { left: 0, top: 200, right: 820, bottom: 900 },
      coordinateSpace: CSS_PIXEL_SPACE,
      clearancePx: 20,
      priority: 10,
    } as const;
    const steppedAside = controller.update(
      controllerInput({
        deltaMs: 8_000,
        mode: "idle-edge-lean",
        activeContentRegions: [panel],
        horizontalPreference: "auto",
      }),
    );

    expect(steppedAside.safeZone.side).toBe("right");
    expect(
      overlaps(
        steppedAside.telemetry.projectedBounds as ProjectedAvatarBounds,
        panel.rect,
      ),
    ).toBe(false);

    const restored = controller.update(
      controllerInput({
        currentCamera: steppedAside.camera,
        activeContentRegions: [],
        horizontalPreference: "left",
        interactionResumed: true,
      }),
    );

    expect(restored.camera.anchorPx.x).toBeCloseTo(
      restored.safeZone.targetAnchorPx.x,
      10,
    );
    expect(restored.camera.anchorPx.y).toBeCloseTo(
      restored.safeZone.targetAnchorPx.y,
      10,
    );
    expect(restored.safeZone.side).toBe("left");
  });

  it("reaches both safe edges without cropping a wide animated silhouette", () => {
    const controller = new FullBodyFramingController();
    const viewport = visualViewport(3_840, 1_080, 2);
    const left = controller.update(
      controllerInput({
        deltaMs: 8_000,
        mode: "idle-edge-lean",
        viewport,
        horizontalPreference: "left",
        currentCamera: {
          radius: 1,
          azimuthRadians: 0.4,
          elevationRadians: 0.2,
          anchorPx: { x: 960, y: 820 },
          anchorCoordinateSpace: CSS_PIXEL_SPACE,
        },
      }),
    );
    const right = controller.update(
      controllerInput({
        deltaMs: 8_000,
        mode: "idle-edge-lean",
        viewport,
        horizontalPreference: "right",
        currentCamera: {
          radius: 1,
          azimuthRadians: 0.4,
          elevationRadians: 0.2,
          anchorPx: { x: 2_880, y: 820 },
          anchorCoordinateSpace: CSS_PIXEL_SPACE,
        },
      }),
    );
    const leftInset = left.telemetry.projectedBounds?.left ?? 0;
    const rightInset =
      viewport.width - (right.telemetry.projectedBounds?.right ?? 0);

    expect(left.safeZone.edgeLeanInsetPx).toBe(40);
    expect(right.safeZone.edgeLeanInsetPx).toBe(40);
    expect(leftInset).toBeGreaterThanOrEqual(40);
    expect(leftInset).toBeLessThan(41);
    expect(rightInset).toBeGreaterThanOrEqual(40);
    expect(rightInset).toBeLessThan(41);
    expect(left.telemetry.containmentPass).toBe(true);
    expect(right.telemetry.containmentPass).toBe(true);
  });

  it("suppresses edge movement for reduced motion, compact layouts and resumed input", () => {
    const controller = new FullBodyFramingController();
    const reduced = controller.update(
      controllerInput({
        mode: "idle-edge-lean",
        motionPreference: "reduced",
      }),
    );
    const compact = controller.update(
      controllerInput({
        mode: "idle-edge-lean",
        viewport: visualViewport(1_080, 720),
      }),
    );
    const resumed = controller.update(
      controllerInput({
        mode: "idle-edge-lean",
        interactionResumed: true,
      }),
    );

    expect(reduced.telemetry.mode).toBe("exploration");
    expect(reduced.telemetry.reasons).toContain(
      "reduced-motion-edge-lean-suppressed",
    );
    expect(compact.telemetry.mode).toBe("exploration");
    expect(compact.telemetry.reasons).toContain(
      "compact-viewport-edge-lean-suppressed",
    );
    expect(resumed.telemetry.mode).toBe("exploration");
    expect(resumed.telemetry.reasons).toContain(
      "interaction-restored-home-composition",
    );
    expect(resumed.camera.anchorPx).toEqual(resumed.safeZone.targetAnchorPx);
  });

  it("passes a deterministic viewport and content-layout containment matrix", () => {
    const controller = new FullBodyFramingController();
    const viewports: Viewport[] = [
      visualViewport(360, 780, 3),
      visualViewport(768, 1_024, 2),
      visualViewport(1_024, 576),
      visualViewport(1_280, 800),
      visualViewport(1_440, 900, 2),
      visualViewport(1_920, 640),
      visualViewport(2_560, 1_080),
      visualViewport(900, 900),
    ];
    const modes = [
      "exploration",
      "gesture",
      "look-back",
      "traversal",
      "idle-edge-lean",
    ] as const;

    for (const viewport of viewports) {
      for (const mode of modes) {
        for (const contentSide of ["none", "left", "right"] as const) {
          const panel =
            contentSide === "none"
              ? []
              : [
                  {
                    id: `${contentSide}-panel`,
                    rect:
                      contentSide === "left"
                        ? {
                            left: 0,
                            top: viewport.height * 0.18,
                            right: viewport.width * 0.54,
                            bottom: viewport.height * 0.94,
                          }
                        : {
                            left: viewport.width * 0.46,
                            top: viewport.height * 0.18,
                            right: viewport.width,
                            bottom: viewport.height * 0.94,
                          },
                    clearancePx: 12,
                    priority: 10,
                    coordinateSpace: CSS_PIXEL_SPACE,
                  },
                ];
          const output = controller.update(
            controllerInput({
              mode,
              envelope:
                mode === "traversal" ? visibleEnvelope(3.7) : visibleEnvelope(),
              viewport,
              activeContentRegions: panel,
              currentCamera: {
                radius: 0.8,
                azimuthRadians: mode === "look-back" ? Math.PI : 0.4,
                elevationRadians: 0.2,
                anchorPx: {
                  x: viewport.width / 2,
                  y: viewport.height * 0.76,
                },
                anchorCoordinateSpace: CSS_PIXEL_SPACE,
              },
              lookBackIntent:
                mode === "look-back"
                  ? {
                      phase: "hold",
                      orbitDirection: 1,
                      targetOrbitDegrees: 170,
                      orbitProgress: 1,
                      presentation: "camera-orbit",
                    }
                  : null,
            }),
          );

          expect(output.telemetry.containmentPass).toBe(true);
          expect(output.telemetry.projectedBounds?.left).toBeGreaterThan(
            output.safeZone.pocketRect.left,
          );
          expect(output.telemetry.projectedBounds?.right).toBeLessThan(
            output.safeZone.pocketRect.right,
          );
          expect(output.telemetry.projectedBounds?.top).toBeGreaterThan(
            output.safeZone.pocketRect.top,
          );
          expect(output.telemetry.projectedBounds?.bottom).toBeLessThan(
            output.safeZone.pocketRect.bottom,
          );
          expect(output.telemetry.projectedBounds?.top).toBeGreaterThan(
            output.safeZone.animationStageRect.top,
          );

          if (viewport.width >= 768 && viewport.height >= 540) {
            expect(output.telemetry.heightRatio).toBeLessThanOrEqual(0.24);
          } else {
            expect(output.telemetry.heightRatio).toBeLessThanOrEqual(0.24);
          }
        }
      }
    }
  });

  it("records authored disappearance without pretending camera containment", () => {
    const envelope = tracker({
      allowedVisibilitySuppressions: [
        {
          characterId: TEST_CHARACTER_ID,
          effectId: "sand-teleport-dissolve",
          powerId: "sand-teleportation",
          phaseId: "fully-submerged",
          stateId: "sand-teleport",
          marker: "avatar-visibility-authored-v1",
          maximumDurationMs: 650,
        },
      ],
    }).sample({
      frameId: 99,
      sampleTimeMs: 1_000,
      characterId: TEST_CHARACTER_ID,
      stateId: "sand-teleport",
      visibility: {
        state: "authored-suppressed",
        effectId: "sand-teleport-dissolve",
        powerId: "sand-teleportation",
        phaseId: "fully-submerged",
        marker: "avatar-visibility-authored-v1",
        occurrenceId: "teleport-camera-test-001",
        startedAtMs: 680,
        elapsedMs: 320,
        maximumDurationMs: 650,
      },
      predictiveBoundsRequired: false,
      predictionHorizonMs: 0,
      additionalContributorIds: [],
      contributions: [],
    });
    const controller = new FullBodyFramingController();
    const visible = controller.update(controllerInput());
    const output = controller.update(
      controllerInput({ envelope, mode: "traversal" }),
    );

    expect(output.telemetry.projectedBounds).toBeNull();
    expect(output.telemetry.authoredVisibilitySuppression).toBe(true);
    expect(output.camera.rig.targetWorld).toEqual(
      visible.camera.rig.targetWorld,
    );
    expect(output.telemetry.reasons).toEqual([
      "authored-visibility-effect:sand-teleport-dissolve",
    ]);
  });

  it("fails closed when an authored disappearance arrives before any visible target", () => {
    const envelope = tracker({
      allowedVisibilitySuppressions: [
        {
          characterId: TEST_CHARACTER_ID,
          effectId: "sand-teleport-dissolve",
          powerId: "sand-teleportation",
          phaseId: "fully-submerged",
          stateId: "sand-teleport",
          marker: "avatar-visibility-authored-v1",
          maximumDurationMs: 650,
        },
      ],
    }).sample({
      frameId: 1,
      sampleTimeMs: 120,
      characterId: TEST_CHARACTER_ID,
      stateId: "sand-teleport",
      visibility: {
        state: "authored-suppressed",
        effectId: "sand-teleport-dissolve",
        powerId: "sand-teleportation",
        phaseId: "fully-submerged",
        marker: "avatar-visibility-authored-v1",
        occurrenceId: "teleport-hidden-first-001",
        startedAtMs: 0,
        elapsedMs: 120,
        maximumDurationMs: 650,
      },
      predictiveBoundsRequired: false,
      predictionHorizonMs: 0,
      additionalContributorIds: [],
      contributions: [],
    });

    expect(() =>
      new FullBodyFramingController().update(
        controllerInput({ envelope, mode: "traversal" }),
      ),
    ).toThrowError(/requires the last complete-envelope camera target/);
  });
});

describe("camera source guard", () => {
  it("contains no prohibited close-shoulder camera symbols or presets", () => {
    const sourceRoot = join(process.cwd(), "src", "immersive", "camera");
    const files: string[] = [];
    const walk = (directory: string): void => {
      for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        if (statSync(path).isDirectory()) {
          walk(path);
        } else if (path.endsWith(".ts")) {
          files.push(path);
        }
      }
    };
    walk(sourceRoot);

    const prohibited =
      /\bots\b|over[- ]the[- ]shoulder|shoulder[- ]camera|chase[- ]camera|cameraAnchor|target(?:Head|Neck|Clavicle|Shoulder)/i;
    const violations = files.filter((path) =>
      prohibited.test(readFileSync(path, "utf8")),
    );

    expect(violations).toEqual([]);
  });
});
