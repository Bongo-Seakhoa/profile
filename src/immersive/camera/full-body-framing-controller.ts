import {
  containsRect,
  exponentialResponse,
  lerp,
  lerpVec2,
  rectHeight,
} from "./math";
import type {
  CameraCandidate,
  FramingControllerInput,
  FramingControllerOutput,
  ProjectedAvatarBounds,
  SafeZoneResolution,
} from "./types";
import { ViewportSafeZoneService } from "./viewport-safe-zones";

export interface FullBodyFramingControllerOptions {
  readonly minimumRadius: number;
  readonly maximumRadius: number;
  readonly searchIterations: number;
  readonly inwardHalfLifeMs: number;
  readonly anchorHalfLifeMs: number;
  readonly containmentEpsilonPx: number;
}

const DEFAULT_OPTIONS: FullBodyFramingControllerOptions = {
  minimumRadius: 0.5,
  maximumRadius: 500,
  searchIterations: 36,
  inwardHalfLifeMs: 650,
  anchorHalfLifeMs: 180,
  containmentEpsilonPx: 0.25,
};

export class FramingContainmentError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "FramingContainmentError";
  }
}

export class FullBodyFramingController {
  readonly #safeZones: ViewportSafeZoneService;
  readonly #options: FullBodyFramingControllerOptions;

  public constructor(
    safeZones = new ViewportSafeZoneService(),
    options: Partial<FullBodyFramingControllerOptions> = {},
  ) {
    this.#safeZones = safeZones;
    this.#options = { ...DEFAULT_OPTIONS, ...options };

    if (
      this.#options.minimumRadius <= 0 ||
      this.#options.maximumRadius <= this.#options.minimumRadius ||
      this.#options.searchIterations < 8
    ) {
      throw new RangeError("Invalid full-body framing controller options.");
    }
  }

  public update(input: FramingControllerInput): FramingControllerOutput {
    const safeZone = this.#safeZones.resolve({
      viewport: input.viewport,
      safeAreaInsets: input.safeAreaInsets,
      activeContentRegions: input.activeContentRegions,
      mode: input.mode,
      horizontalPreference: input.horizontalPreference,
      verticalPreference: input.verticalPreference,
      estimatedAvatarAspectRatio: input.estimatedAvatarAspectRatio,
      requestedHeightRatio: input.requestedHeightRatio,
    });

    if (input.envelope.visibility.state === "authored-suppressed") {
      const camera = {
        ...input.currentCamera,
        anchorPx: safeZone.targetAnchorPx,
      };

      return {
        camera,
        safeZone,
        telemetry: {
          frameId: input.envelope.frameId,
          stateId: input.envelope.stateId,
          mode: input.mode,
          viewport: input.viewport,
          safeZone,
          camera,
          projectedBounds: null,
          heightRatio: null,
          containmentPass: true,
          authoredVisibilitySuppression: true,
          fallbackContributorIds: [],
          reasons: [
            `authored-visibility-effect:${input.envelope.visibility.effectId}`,
          ],
        },
      };
    }

    if (input.envelope.combinedBounds === null) {
      throw new FramingContainmentError(
        "A visible avatar must provide complete animated bounds.",
      );
    }

    const anchorResponse = input.interactionResumed
      ? 1
      : exponentialResponse(
          Math.max(input.deltaMs, 0),
          this.#options.anchorHalfLifeMs,
        );
    const smoothedAnchor = lerpVec2(
      input.currentCamera.anchorPx,
      safeZone.targetAnchorPx,
      anchorResponse,
    );
    const candidateAnchor = this.#anchorCanFit(input, safeZone, smoothedAnchor)
      ? smoothedAnchor
      : safeZone.targetAnchorPx;

    let requiredRadius = this.#findRequiredRadius(
      input,
      safeZone,
      candidateAnchor,
    );
    const reasons: string[] = [];
    if (input.envelope.fallbackContributorIds.length > 0) {
      reasons.push("conservative-bounds-fallback");
    }

    if (input.mode === "look-back" && input.lookBackBaselineRadius !== null) {
      const protectedRadius = Math.max(input.lookBackBaselineRadius, 0);
      if (protectedRadius > requiredRadius) {
        requiredRadius = protectedRadius;
        reasons.push("look-back-radius-preserved");
      } else if (requiredRadius > protectedRadius + 1e-4) {
        reasons.push("look-back-containment-pullback");
      }
    }

    let appliedRadius: number;
    if (requiredRadius >= input.currentCamera.radius) {
      appliedRadius = requiredRadius;
      if (requiredRadius > input.currentCamera.radius + 1e-4) {
        reasons.push(
          input.mode === "traversal"
            ? "predictive-traversal-pullback"
            : "containment-pullback",
        );
      }
    } else {
      const inwardResponse = exponentialResponse(
        Math.max(input.deltaMs, 0),
        this.#options.inwardHalfLifeMs,
      );
      appliedRadius = lerp(
        input.currentCamera.radius,
        requiredRadius,
        inwardResponse,
      );
      reasons.push("damped-inward-recovery");
    }

    const camera: CameraCandidate = {
      radius: appliedRadius,
      azimuthRadians: input.currentCamera.azimuthRadians,
      elevationRadians: input.currentCamera.elevationRadians,
      anchorPx: candidateAnchor,
    };
    let projectedBounds = input.probe.project(
      input.envelope,
      camera,
      input.viewport,
    );

    if (!this.#fits(projectedBounds, input, safeZone)) {
      const emergencyCamera: CameraCandidate = {
        ...camera,
        radius: this.#findRequiredRadius(
          input,
          safeZone,
          safeZone.targetAnchorPx,
        ),
        anchorPx: safeZone.targetAnchorPx,
      };
      projectedBounds = input.probe.project(
        input.envelope,
        emergencyCamera,
        input.viewport,
      );

      if (!this.#fits(projectedBounds, input, safeZone)) {
        throw new FramingContainmentError(
          "Full-avatar containment failed after the emergency pullback solve.",
        );
      }

      reasons.push("emergency-safe-pocket-solve");
      return this.#output(
        input,
        safeZone,
        emergencyCamera,
        projectedBounds,
        reasons,
      );
    }

    return this.#output(input, safeZone, camera, projectedBounds, reasons);
  }

  #output(
    input: FramingControllerInput,
    safeZone: SafeZoneResolution,
    camera: CameraCandidate,
    projectedBounds: ProjectedAvatarBounds,
    reasons: readonly string[],
  ): FramingControllerOutput {
    return {
      camera,
      safeZone,
      telemetry: {
        frameId: input.envelope.frameId,
        stateId: input.envelope.stateId,
        mode: input.mode,
        viewport: input.viewport,
        safeZone,
        camera,
        projectedBounds,
        heightRatio: rectHeight(projectedBounds) / input.viewport.height,
        containmentPass: true,
        authoredVisibilitySuppression: false,
        fallbackContributorIds: input.envelope.fallbackContributorIds,
        reasons,
      },
    };
  }

  #anchorCanFit(
    input: FramingControllerInput,
    safeZone: SafeZoneResolution,
    anchorPx: CameraCandidate["anchorPx"],
  ): boolean {
    const probeCamera: CameraCandidate = {
      ...input.currentCamera,
      radius: this.#options.maximumRadius,
      anchorPx,
    };
    return this.#fits(
      input.probe.project(input.envelope, probeCamera, input.viewport),
      input,
      safeZone,
    );
  }

  #findRequiredRadius(
    input: FramingControllerInput,
    safeZone: SafeZoneResolution,
    anchorPx: CameraCandidate["anchorPx"],
  ): number {
    let lower = this.#options.minimumRadius;
    let upper = Math.max(
      input.currentCamera.radius,
      this.#options.minimumRadius * 2,
    );
    upper = Math.min(upper, this.#options.maximumRadius);

    const projectAt = (radius: number): ProjectedAvatarBounds => {
      return input.probe.project(
        input.envelope,
        {
          radius,
          azimuthRadians: input.currentCamera.azimuthRadians,
          elevationRadians: input.currentCamera.elevationRadians,
          anchorPx,
        },
        input.viewport,
      );
    };

    while (
      !this.#fits(projectAt(upper), input, safeZone) &&
      upper < this.#options.maximumRadius
    ) {
      lower = upper;
      upper = Math.min(upper * 2, this.#options.maximumRadius);
    }

    if (!this.#fits(projectAt(upper), input, safeZone)) {
      throw new FramingContainmentError(
        `Complete avatar cannot fit inside the safe pocket at maximum radius ${this.#options.maximumRadius}.`,
      );
    }

    for (
      let iteration = 0;
      iteration < this.#options.searchIterations;
      iteration += 1
    ) {
      const middle = (lower + upper) / 2;
      if (this.#fits(projectAt(middle), input, safeZone)) {
        upper = middle;
      } else {
        lower = middle;
      }
    }

    return upper;
  }

  #fits(
    projected: ProjectedAvatarBounds,
    input: FramingControllerInput,
    safeZone: SafeZoneResolution,
  ): boolean {
    if (
      !projected.visible ||
      !Number.isFinite(projected.visiblePixelFraction) ||
      projected.visiblePixelFraction <= 0 ||
      projected.visiblePixelFraction > 1 ||
      !containsRect(
        safeZone.pocketRect,
        projected,
        this.#options.containmentEpsilonPx,
      )
    ) {
      return false;
    }

    const heightRatio = rectHeight(projected) / input.viewport.height;
    const sizeLimit =
      input.mode === "character-selection"
        ? safeZone.targetHeightRatio
        : Math.min(safeZone.targetHeightRatio, safeZone.maximumHeightRatio);

    return heightRatio <= sizeLimit + 1e-6;
  }
}
