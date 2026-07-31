import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AnimatedBoundsContractError,
  AnimatedBoundsTracker,
  FramingContainmentError,
  FullBodyFramingController,
  ViewportSafeZoneService,
  type AnimatedBoundContribution,
  type AnimatedEnvelope,
  type CameraCandidate,
  type FramingControllerInput,
  type ProjectedAvatarBounds,
  type ProjectionProbe,
  type Rect,
  type Viewport,
} from "../../../src/immersive/camera";

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 } as const;

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

function visibleEnvelope(
  predictiveHeight: number | null = null,
): AnimatedEnvelope {
  return new AnimatedBoundsTracker().sample({
    frameId: 12,
    stateId: predictiveHeight === null ? "idle" : "launch",
    visibility: { state: "visible" },
    expectedContributorIds: ["body", "scarf", "power"],
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
        role: "cloth-proxy",
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
    ],
  });
}

class SyntheticProjectionProbe implements ProjectionProbe {
  public constructor(private readonly pixelsPerWorldUnit = 115) {}

  public project(
    envelope: AnimatedEnvelope,
    candidate: CameraCandidate,
  ): ProjectedAvatarBounds {
    const bounds = envelope.combinedBounds;
    if (bounds === null || candidate.radius <= 0) {
      return {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        visible: false,
        visiblePixelFraction: 0,
      };
    }

    const worldWidth = Math.max(
      bounds.max.x - bounds.min.x,
      bounds.max.z - bounds.min.z,
    );
    const worldHeight = bounds.max.y - bounds.min.y;
    const width = (worldWidth * this.pixelsPerWorldUnit) / candidate.radius;
    const height = (worldHeight * this.pixelsPerWorldUnit) / candidate.radius;

    return {
      left: candidate.anchorPx.x - width / 2,
      top: candidate.anchorPx.y - height / 2,
      right: candidate.anchorPx.x + width / 2,
      bottom: candidate.anchorPx.y + height / 2,
      visible: true,
      visiblePixelFraction: 1,
    };
  }
}

function controllerInput(
  overrides: Partial<FramingControllerInput> = {},
): FramingControllerInput {
  return {
    deltaMs: 16.67,
    mode: "exploration",
    envelope: visibleEnvelope(),
    viewport: { width: 1440, height: 900, devicePixelRatio: 1 },
    safeAreaInsets: ZERO_INSETS,
    activeContentRegions: [],
    horizontalPreference: "auto",
    verticalPreference: "lower-third",
    currentCamera: {
      radius: 1,
      azimuthRadians: 0.6,
      elevationRadians: 0.2,
      anchorPx: { x: 360, y: 684 },
    },
    probe: new SyntheticProjectionProbe(),
    estimatedAvatarAspectRatio: 0.72,
    requestedHeightRatio: null,
    lookBackBaselineRadius: null,
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

    expect(envelope.contributorIds).toEqual(["body", "scarf", "power"]);
    expect(envelope.currentBounds?.min).toEqual({
      x: -0.7,
      y: -0.05,
      z: -0.75,
    });
    expect(envelope.currentBounds?.max.x).toBeCloseTo(0.95, 10);
    expect(envelope.currentBounds?.max.y).toBeCloseTo(2.1, 10);
    expect(envelope.currentBounds?.max.z).toBeCloseTo(0.4, 10);
    expect(envelope.combinedBounds?.min.y).toBe(-0.3);
    expect(envelope.combinedBounds?.max.y).toBeCloseTo(4.35, 10);
    expect(envelope.combinedBounds?.max.x).toBe(1.25);
  });

  it("rejects a visible frame when an expected accessory has no active bound", () => {
    const tracker = new AnimatedBoundsTracker();

    expect(() =>
      tracker.sample({
        frameId: 1,
        stateId: "present",
        visibility: { state: "visible" },
        expectedContributorIds: ["body", "pouch"],
        contributions: [
          contribution({ id: "body", role: "body", sampleFrameId: 1 }),
        ],
      }),
    ).toThrowError(AnimatedBoundsContractError);
  });

  it("permits an empty envelope only for an explicit authored effect", () => {
    const tracker = new AnimatedBoundsTracker({
      allowedVisibilitySuppressions: [
        {
          effectId: "sand-teleport-dissolve",
          powerId: "sand-teleportation",
          phaseId: "fully-submerged",
          marker: "avatar-visibility-authored-v1",
          maximumDurationMs: 650,
        },
      ],
    });
    const envelope = tracker.sample({
      frameId: 2,
      stateId: "sand-teleport",
      visibility: {
        state: "authored-suppressed",
        effectId: "sand-teleport-dissolve",
        powerId: "sand-teleportation",
        phaseId: "fully-submerged",
        marker: "avatar-visibility-authored-v1",
        elapsedMs: 320,
        maximumDurationMs: 650,
      },
      expectedContributorIds: [],
      contributions: [],
    });

    expect(envelope.combinedBounds).toBeNull();
    expect(envelope.visibility.state).toBe("authored-suppressed");
  });

  it("uses a conservative maximum proxy for a missing or stale contributor", () => {
    const tracker = new AnimatedBoundsTracker({
      conservativeFallbacks: [
        {
          id: "scarf",
          role: "cloth-proxy",
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
    const envelope = tracker.sample({
      frameId: 12,
      stateId: "lod-swap",
      visibility: { state: "visible" },
      expectedContributorIds: ["body", "scarf"],
      contributions: [
        contribution({ id: "body", role: "body" }),
        contribution({
          id: "scarf",
          role: "cloth-proxy",
          sampleFrameId: 11,
        }),
      ],
    });

    expect(envelope.fallbackContributorIds).toEqual(["scarf"]);
    expect(envelope.combinedBounds?.max.x).toBeCloseTo(1.9, 10);
    expect(envelope.combinedBounds?.min.z).toBeCloseTo(-2, 10);
  });

  it("rejects an unlisted or overlong disappearance phase", () => {
    const tracker = new AnimatedBoundsTracker();

    expect(() =>
      tracker.sample({
        frameId: 4,
        stateId: "solar-launch",
        visibility: {
          state: "authored-suppressed",
          effectId: "solar-frame-exit",
          powerId: "solar-propulsion",
          phaseId: "launch",
          marker: "avatar-visibility-authored-v1",
          elapsedMs: 1,
          maximumDurationMs: 200,
        },
        expectedContributorIds: [],
        contributions: [],
      }),
    ).toThrowError(/not on the authored whitelist/);
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
      viewport: { width: 1440, height: 900, devicePixelRatio: 1 },
      safeAreaInsets: ZERO_INSETS,
      activeContentRegions: [
        {
          id: "case-study-panel",
          rect: panel,
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

describe("FullBodyFramingController", () => {
  it("solves a desktop companion composition inside the 14–20 percent band", () => {
    const output = new FullBodyFramingController().update(controllerInput());

    expect(output.telemetry.containmentPass).toBe(true);
    expect(output.telemetry.heightRatio).toBeGreaterThanOrEqual(0.179);
    expect(output.telemetry.heightRatio).toBeLessThanOrEqual(0.181);
    expect(output.safeZone.side).toBe("left");
    expect(output.telemetry.projectedBounds?.top).toBeGreaterThan(
      output.safeZone.animationStageRect.top,
    );
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

  it("preserves the look-back radius unless containment requires more", () => {
    const output = new FullBodyFramingController().update(
      controllerInput({
        mode: "look-back",
        currentCamera: {
          radius: 4,
          azimuthRadians: Math.PI,
          elevationRadians: 0.2,
          anchorPx: { x: 360, y: 684 },
        },
        lookBackBaselineRadius: 4,
      }),
    );

    expect(output.camera.radius).toBeCloseTo(4, 8);
    expect(output.telemetry.containmentPass).toBe(true);
    expect(output.telemetry.reasons).toContain("look-back-radius-preserved");
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
        },
        interactionResumed: true,
      }),
    );

    expect(output.safeZone.maximumHeightRatio).toBe(0.55);
    expect(output.telemetry.heightRatio).toBeCloseTo(0.52, 2);
    expect(output.telemetry.containmentPass).toBe(true);
  });

  it("fails closed when independent visibility telemetry reports full occlusion", () => {
    const baseProbe = new SyntheticProjectionProbe();
    const occludedProbe: ProjectionProbe = {
      project(envelope, candidate) {
        return {
          ...baseProbe.project(envelope, candidate),
          visiblePixelFraction: 0,
        };
      },
    };

    expect(() =>
      new FullBodyFramingController().update(
        controllerInput({ probe: occludedProbe }),
      ),
    ).toThrowError(FramingContainmentError);
  });

  it("moves fully away from opening content and restores immediately after input", () => {
    const controller = new FullBodyFramingController();
    const panel = {
      id: "open-work-detail",
      rect: { left: 0, top: 200, right: 820, bottom: 900 },
      clearancePx: 20,
      priority: 10,
    } as const;
    const steppedAside = controller.update(
      controllerInput({
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

  it("passes a deterministic viewport and content-layout containment matrix", () => {
    const controller = new FullBodyFramingController();
    const viewports: Viewport[] = [
      { width: 360, height: 780, devicePixelRatio: 3 },
      { width: 768, height: 1024, devicePixelRatio: 2 },
      { width: 1024, height: 576, devicePixelRatio: 1 },
      { width: 1280, height: 800, devicePixelRatio: 1 },
      { width: 1440, height: 900, devicePixelRatio: 2 },
      { width: 1920, height: 640, devicePixelRatio: 1 },
      { width: 2560, height: 1080, devicePixelRatio: 1 },
      { width: 900, height: 900, devicePixelRatio: 1 },
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
              },
              lookBackBaselineRadius: mode === "look-back" ? 2.8 : null,
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
    const envelope = new AnimatedBoundsTracker({
      allowedVisibilitySuppressions: [
        {
          effectId: "sand-teleport-dissolve",
          powerId: "sand-teleportation",
          phaseId: "fully-submerged",
          marker: "avatar-visibility-authored-v1",
          maximumDurationMs: 650,
        },
      ],
    }).sample({
      frameId: 99,
      stateId: "sand-teleport",
      visibility: {
        state: "authored-suppressed",
        effectId: "sand-teleport-dissolve",
        powerId: "sand-teleportation",
        phaseId: "fully-submerged",
        marker: "avatar-visibility-authored-v1",
        elapsedMs: 320,
        maximumDurationMs: 650,
      },
      expectedContributorIds: [],
      contributions: [],
    });
    const output = new FullBodyFramingController().update(
      controllerInput({ envelope, mode: "traversal" }),
    );

    expect(output.telemetry.projectedBounds).toBeNull();
    expect(output.telemetry.authoredVisibilitySuppression).toBe(true);
    expect(output.telemetry.reasons).toEqual([
      "authored-visibility-effect:sand-teleport-dissolve",
    ]);
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
