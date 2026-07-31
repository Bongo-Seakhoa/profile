import {
  containsRect,
  exponentialResponse,
  isValidRect,
  lerp,
  lerpVec2,
  minimumRectMargin,
  rectHeight,
} from "./math";
import type {
  CameraCandidate,
  FramingControllerInput,
  FramingControllerOutput,
  FramingMode,
  ProjectedAvatarBounds,
  SafeZoneResolution,
  SolvedCamera,
  Vec3,
} from "./types";
import { ViewportSafeZoneService } from "./viewport-safe-zones";

export interface FullBodyFramingControllerOptions {
  readonly minimumRadius: number;
  readonly maximumRadius: number;
  readonly searchIterations: number;
  readonly inwardHalfLifeMs: number;
  readonly anchorHalfLifeMs: number;
  readonly containmentEpsilonPx: number;
  readonly lookBackRadiusToleranceRatio: number;
  readonly edgeLeanMinimumViewportWidthCssPx: number;
  readonly verticalFieldOfViewDegrees: number;
}

const DEFAULT_OPTIONS: FullBodyFramingControllerOptions = {
  minimumRadius: 0.5,
  maximumRadius: 500,
  searchIterations: 36,
  inwardHalfLifeMs: 650,
  anchorHalfLifeMs: 180,
  containmentEpsilonPx: 0.25,
  lookBackRadiusToleranceRatio: 0.15,
  edgeLeanMinimumViewportWidthCssPx: 1_100,
  verticalFieldOfViewDegrees: 46,
};

const FULL_VISIBILITY_NUMERICAL_EPSILON = 1e-6;

export class FramingContainmentError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "FramingContainmentError";
  }
}

export class FullBodyFramingController {
  readonly #safeZones: ViewportSafeZoneService;
  readonly #options: FullBodyFramingControllerOptions;
  readonly #lastVisibleTargets = new Map<string, Vec3>();
  readonly #normalCompositionCameras = new Map<string, SolvedCamera>();

  public constructor(
    safeZones = new ViewportSafeZoneService(),
    options: Partial<FullBodyFramingControllerOptions> = {},
  ) {
    this.#safeZones = safeZones;
    this.#options = { ...DEFAULT_OPTIONS, ...options };

    if (
      Object.values(this.#options).some((value) => !Number.isFinite(value)) ||
      this.#options.minimumRadius <= 0 ||
      this.#options.maximumRadius <= this.#options.minimumRadius ||
      !Number.isInteger(this.#options.searchIterations) ||
      this.#options.searchIterations < 8 ||
      this.#options.inwardHalfLifeMs <= 0 ||
      this.#options.anchorHalfLifeMs <= 0 ||
      this.#options.containmentEpsilonPx <= 0 ||
      this.#options.lookBackRadiusToleranceRatio < 0 ||
      this.#options.edgeLeanMinimumViewportWidthCssPx <= 0 ||
      this.#options.verticalFieldOfViewDegrees < 42 ||
      this.#options.verticalFieldOfViewDegrees > 50
    ) {
      throw new RangeError("Invalid full-body framing controller options.");
    }
  }

  public update(input: FramingControllerInput): FramingControllerOutput {
    this.#validateInput(input);
    const reasons: string[] = [];
    const effectiveMode = this.#effectiveMode(input, reasons);
    const lookBackBaseline =
      input.mode === "look-back"
        ? (this.#normalCompositionCameras.get(input.envelope.characterId) ??
          null)
        : null;
    if (input.mode === "look-back" && lookBackBaseline === null) {
      throw new FramingContainmentError(
        "Look back requires a previously solved normal full-body composition.",
      );
    }
    let seedCamera = input.currentCamera;
    let lookBackOrbitDegrees: number | null = null;
    if (
      input.mode === "look-back" &&
      lookBackBaseline !== null &&
      input.lookBackIntent !== null
    ) {
      lookBackOrbitDegrees =
        input.lookBackIntent.targetOrbitDegrees *
        input.lookBackIntent.orbitProgress;
      seedCamera = {
        radius: lookBackBaseline.radius,
        azimuthRadians:
          lookBackBaseline.azimuthRadians +
          (input.lookBackIntent.orbitDirection *
            (lookBackOrbitDegrees * Math.PI)) /
            180,
        elevationRadians: lookBackBaseline.elevationRadians,
        anchorPx: lookBackBaseline.anchorPx,
        anchorCoordinateSpace: lookBackBaseline.anchorCoordinateSpace,
      };
    }
    const solverInput: FramingControllerInput = {
      ...input,
      mode: effectiveMode,
      currentCamera: seedCamera,
    };

    if (input.mode === "look-back" && input.motionPreference === "reduced") {
      reasons.push("reduced-motion-look-back-crossfade");
    }

    const safeZone = this.#safeZones.resolve({
      viewport: solverInput.viewport,
      safeAreaInsets: solverInput.safeAreaInsets,
      activeContentRegions: solverInput.activeContentRegions,
      mode: solverInput.mode,
      horizontalPreference: solverInput.horizontalPreference,
      verticalPreference: solverInput.verticalPreference,
      estimatedAvatarAspectRatio: solverInput.estimatedAvatarAspectRatio,
      requestedHeightRatio: solverInput.requestedHeightRatio,
    });

    if (solverInput.envelope.visibility.state === "authored-suppressed") {
      const camera = this.#solveCameraRig(solverInput, {
        ...seedCamera,
        anchorPx:
          effectiveMode === "look-back"
            ? seedCamera.anchorPx
            : safeZone.targetAnchorPx,
      });

      return {
        camera,
        safeZone,
        telemetry: {
          frameId: solverInput.envelope.frameId,
          stateId: solverInput.envelope.stateId,
          requestedMode: input.mode,
          mode: effectiveMode,
          motionPreference: input.motionPreference,
          viewport: solverInput.viewport,
          safeZone,
          camera,
          projectedBounds: null,
          heightRatio: null,
          minimumViewportMarginPx: null,
          minimumPocketMarginPx: null,
          lookBackRadiusDeltaRatio: this.#lookBackRadiusDelta(
            camera,
            lookBackBaseline,
          ),
          lookBackOrbitDegrees,
          containmentPass: true,
          constrained: safeZone.constrained,
          authoredVisibilitySuppression: true,
          fallbackContributorIds: [],
          reasons: [
            ...reasons,
            `authored-visibility-effect:${solverInput.envelope.visibility.effectId}`,
          ],
        },
      };
    }

    if (solverInput.envelope.combinedBounds === null) {
      throw new FramingContainmentError(
        "A visible avatar must provide complete animated bounds.",
      );
    }

    let candidateAnchor: CameraCandidate["anchorPx"];
    if (effectiveMode === "look-back" && lookBackBaseline !== null) {
      candidateAnchor = this.#anchorCanFit(
        solverInput,
        safeZone,
        lookBackBaseline.anchorPx,
      )
        ? lookBackBaseline.anchorPx
        : safeZone.targetAnchorPx;
      if (
        candidateAnchor.x !== lookBackBaseline.anchorPx.x ||
        candidateAnchor.y !== lookBackBaseline.anchorPx.y
      ) {
        reasons.push("look-back-anchor-relocated-for-containment");
      }
    } else {
      const anchorResponse =
        input.interactionResumed || input.motionPreference === "reduced"
          ? 1
          : exponentialResponse(
              Math.max(input.deltaMs, 0),
              this.#options.anchorHalfLifeMs,
            );
      const smoothedAnchor = lerpVec2(
        seedCamera.anchorPx,
        safeZone.targetAnchorPx,
        anchorResponse,
      );
      candidateAnchor = this.#anchorCanFit(
        solverInput,
        safeZone,
        smoothedAnchor,
      )
        ? smoothedAnchor
        : safeZone.targetAnchorPx;
    }

    let requiredRadius = this.#findRequiredRadius(
      solverInput,
      safeZone,
      candidateAnchor,
    );
    if (solverInput.envelope.fallbackContributorIds.length > 0) {
      reasons.push("conservative-bounds-fallback");
    }

    if (effectiveMode === "look-back" && lookBackBaseline !== null) {
      const protectedRadius = Math.max(
        lookBackBaseline.radius,
        seedCamera.radius,
      );
      if (protectedRadius > requiredRadius) {
        requiredRadius = protectedRadius;
        reasons.push("look-back-radius-preserved");
      } else if (requiredRadius > protectedRadius + 1e-4) {
        reasons.push("look-back-containment-pullback");
      }
    }

    let appliedRadius: number;
    if (requiredRadius >= seedCamera.radius) {
      appliedRadius = requiredRadius;
      if (requiredRadius > seedCamera.radius + 1e-4) {
        reasons.push(
          effectiveMode === "traversal"
            ? "predictive-traversal-pullback"
            : "containment-pullback",
        );
      }
    } else {
      const inwardResponse = exponentialResponse(
        Math.max(input.deltaMs, 0),
        this.#options.inwardHalfLifeMs,
      );
      appliedRadius = lerp(seedCamera.radius, requiredRadius, inwardResponse);
      reasons.push("damped-inward-recovery");
    }

    let projected = this.#project(solverInput, {
      radius: appliedRadius,
      azimuthRadians: seedCamera.azimuthRadians,
      elevationRadians: seedCamera.elevationRadians,
      anchorPx: candidateAnchor,
      anchorCoordinateSpace: seedCamera.anchorCoordinateSpace,
    });
    let camera = projected.camera;
    let projectedBounds = projected.projectedBounds;
    ({ camera, projectedBounds } = this.#alignEdgeLean(
      solverInput,
      safeZone,
      camera,
      projectedBounds,
    ));

    if (!this.#fits(projectedBounds, solverInput, safeZone)) {
      const emergencyRequiredRadius = this.#findRequiredRadius(
        solverInput,
        safeZone,
        safeZone.targetAnchorPx,
      );
      const emergencyCandidate: CameraCandidate = {
        ...camera,
        radius: Math.max(
          emergencyRequiredRadius,
          effectiveMode === "look-back" && lookBackBaseline !== null
            ? Math.max(lookBackBaseline.radius, seedCamera.radius)
            : 0,
        ),
        anchorPx: safeZone.targetAnchorPx,
      };
      projected = this.#project(solverInput, emergencyCandidate);
      let emergencyCamera = projected.camera;
      projectedBounds = projected.projectedBounds;
      ({ camera: emergencyCamera, projectedBounds } = this.#alignEdgeLean(
        solverInput,
        safeZone,
        emergencyCamera,
        projectedBounds,
      ));

      if (!this.#fits(projectedBounds, solverInput, safeZone)) {
        throw new FramingContainmentError(
          "Full-avatar containment failed after the emergency pullback solve.",
        );
      }

      reasons.push("emergency-safe-pocket-solve");
      return this.#output(
        input,
        effectiveMode,
        safeZone,
        emergencyCamera,
        projectedBounds,
        reasons,
        lookBackBaseline,
      );
    }

    return this.#output(
      input,
      effectiveMode,
      safeZone,
      camera,
      projectedBounds,
      reasons,
      lookBackBaseline,
    );
  }

  #output(
    input: FramingControllerInput,
    effectiveMode: FramingMode,
    safeZone: SafeZoneResolution,
    camera: SolvedCamera,
    projectedBounds: ProjectedAvatarBounds,
    reasons: readonly string[],
    lookBackBaseline: SolvedCamera | null,
  ): FramingControllerOutput {
    const heightRatio = rectHeight(projectedBounds) / input.viewport.height;
    const belowPreferredSize =
      effectiveMode !== "character-selection" &&
      heightRatio < safeZone.minimumPreferredHeightRatio - 1e-4;
    const constrained = safeZone.constrained || belowPreferredSize;
    const resolvedSafeZone =
      constrained === safeZone.constrained
        ? safeZone
        : { ...safeZone, constrained };
    const outputReasons = [...reasons];

    if (belowPreferredSize) {
      outputReasons.push("below-preferred-height");
    }

    const lookBackRadiusDeltaRatio =
      input.mode === "look-back"
        ? this.#lookBackRadiusDelta(camera, lookBackBaseline)
        : null;
    if (
      lookBackRadiusDeltaRatio !== null &&
      lookBackRadiusDeltaRatio >
        this.#options.lookBackRadiusToleranceRatio + 1e-6
    ) {
      outputReasons.push("look-back-radius-tolerance-exceeded-for-containment");
    }

    this.#lastVisibleTargets.set(input.envelope.characterId, {
      ...camera.rig.targetWorld,
    });
    if (effectiveMode === "exploration" || effectiveMode === "gesture") {
      this.#normalCompositionCameras.set(
        input.envelope.characterId,
        this.#copySolvedCamera(camera),
      );
    }

    return {
      camera,
      safeZone: resolvedSafeZone,
      telemetry: {
        frameId: input.envelope.frameId,
        stateId: input.envelope.stateId,
        requestedMode: input.mode,
        mode: effectiveMode,
        motionPreference: input.motionPreference,
        viewport: input.viewport,
        safeZone: resolvedSafeZone,
        camera,
        projectedBounds,
        heightRatio,
        minimumViewportMarginPx: minimumRectMargin(
          resolvedSafeZone.viewportRect,
          projectedBounds,
        ),
        minimumPocketMarginPx: minimumRectMargin(
          resolvedSafeZone.pocketRect,
          projectedBounds,
        ),
        lookBackRadiusDeltaRatio,
        lookBackOrbitDegrees:
          input.mode === "look-back" && input.lookBackIntent !== null
            ? input.lookBackIntent.targetOrbitDegrees *
              input.lookBackIntent.orbitProgress
            : null,
        containmentPass: true,
        constrained,
        authoredVisibilitySuppression: false,
        fallbackContributorIds: input.envelope.fallbackContributorIds,
        reasons: [...new Set(outputReasons)],
      },
    };
  }

  #effectiveMode(
    input: FramingControllerInput,
    reasons: string[],
  ): FramingMode {
    if (input.mode !== "idle-edge-lean") {
      return input.mode;
    }

    if (input.interactionResumed) {
      reasons.push("interaction-restored-home-composition");
      return "exploration";
    }

    if (input.motionPreference === "reduced") {
      reasons.push("reduced-motion-edge-lean-suppressed");
      return "exploration";
    }

    if (
      input.viewport.width < this.#options.edgeLeanMinimumViewportWidthCssPx
    ) {
      reasons.push("compact-viewport-edge-lean-suppressed");
      return "exploration";
    }

    return input.mode;
  }

  #lookBackRadiusDelta(
    camera: CameraCandidate,
    baseline: CameraCandidate | null,
  ): number | null {
    if (baseline === null || baseline.radius <= 0) {
      return null;
    }

    return Math.abs(camera.radius - baseline.radius) / baseline.radius;
  }

  #validateInput(input: FramingControllerInput): void {
    const finiteNonNegative = (value: number): boolean =>
      Number.isFinite(value) && value >= 0;
    const validCamera = (camera: CameraCandidate): boolean =>
      Number.isFinite(camera.radius) &&
      camera.radius >= this.#options.minimumRadius &&
      camera.radius <= this.#options.maximumRadius &&
      Number.isFinite(camera.azimuthRadians) &&
      Number.isFinite(camera.elevationRadians) &&
      Number.isFinite(camera.anchorPx.x) &&
      Number.isFinite(camera.anchorPx.y) &&
      camera.anchorCoordinateSpace === "visual-viewport-css-pixels";
    if (
      !finiteNonNegative(input.deltaMs) ||
      !(
        [
          "exploration",
          "gesture",
          "look-back",
          "traversal",
          "idle-edge-lean",
          "character-selection",
        ] as const
      ).includes(input.mode) ||
      !(["auto", "left", "right", "center"] as const).includes(
        input.horizontalPreference,
      ) ||
      !(["lower-third", "middle", "upper"] as const).includes(
        input.verticalPreference,
      ) ||
      !Number.isFinite(input.viewport.width) ||
      input.viewport.width <= 0 ||
      !Number.isFinite(input.viewport.height) ||
      input.viewport.height <= 0 ||
      !Number.isFinite(input.viewport.devicePixelRatio) ||
      input.viewport.devicePixelRatio <= 0 ||
      input.viewport.coordinateSpace !== "visual-viewport-css-pixels" ||
      !Number.isFinite(input.viewport.visualOffsetPx.x) ||
      !Number.isFinite(input.viewport.visualOffsetPx.y) ||
      !Number.isFinite(input.viewport.visualScale) ||
      input.viewport.visualScale <= 0 ||
      (input.motionPreference !== "full" &&
        input.motionPreference !== "reduced") ||
      !Number.isFinite(input.estimatedAvatarAspectRatio) ||
      input.estimatedAvatarAspectRatio <= 0 ||
      (input.requestedHeightRatio !== null &&
        (!Number.isFinite(input.requestedHeightRatio) ||
          input.requestedHeightRatio <= 0)) ||
      Object.values(input.safeAreaInsets).some(
        (value) => !finiteNonNegative(value),
      ) ||
      !validCamera(input.currentCamera)
    ) {
      throw new RangeError("Invalid full-body framing input.");
    }

    if (input.mode === "look-back" && input.lookBackIntent === null) {
      throw new FramingContainmentError(
        "Look back requires authored orbit intent.",
      );
    }

    if (input.mode !== "look-back" && input.lookBackIntent !== null) {
      throw new FramingContainmentError(
        "Look-back orbit intent is legal only in look-back framing mode.",
      );
    }

    if (input.lookBackIntent !== null) {
      const intent = input.lookBackIntent;
      const phaseProgressValid =
        input.motionPreference === "reduced"
          ? intent.orbitProgress === 0
          : (intent.phase === "inactive" && intent.orbitProgress === 0) ||
            (intent.phase === "hold" && intent.orbitProgress === 1) ||
            intent.phase === "enter" ||
            intent.phase === "exit";
      if (
        !Number.isFinite(intent.targetOrbitDegrees) ||
        intent.targetOrbitDegrees < 160 ||
        intent.targetOrbitDegrees > 180 ||
        !Number.isFinite(intent.orbitProgress) ||
        intent.orbitProgress < 0 ||
        intent.orbitProgress > 1 ||
        !(intent.orbitDirection === -1 || intent.orbitDirection === 1) ||
        !(["inactive", "enter", "hold", "exit"] as const).includes(
          intent.phase,
        ) ||
        !phaseProgressValid ||
        (input.motionPreference === "reduced" &&
          (intent.presentation !== "still-crossfade" ||
            intent.orbitProgress !== 0)) ||
        (input.motionPreference === "full" &&
          intent.presentation !== "camera-orbit")
      ) {
        throw new FramingContainmentError(
          "Look-back intent must encode a 160 to 180 degree authored orbit or a fixed-camera reduced-motion crossfade.",
        );
      }
    }

    if (
      input.mode === "traversal" &&
      input.envelope.visibility.state === "visible" &&
      (input.envelope.predictiveBounds === null ||
        input.envelope.predictionHorizonMs <= 0)
    ) {
      throw new FramingContainmentError(
        "Visible traversal requires a predictive complete-avatar envelope.",
      );
    }
  }

  #solveCameraRig(
    input: FramingControllerInput,
    candidate: CameraCandidate,
  ): SolvedCamera {
    const bounds = input.envelope.combinedBounds;
    let targetWorld: Vec3;
    if (bounds === null) {
      const lastVisibleTarget = this.#lastVisibleTargets.get(
        input.envelope.characterId,
      );
      if (lastVisibleTarget === undefined) {
        throw new FramingContainmentError(
          "An authored hidden phase requires the last complete-envelope camera target.",
        );
      }
      targetWorld = lastVisibleTarget;
    } else {
      targetWorld = {
        x: (bounds.min.x + bounds.max.x) / 2,
        y: (bounds.min.y + bounds.max.y) / 2,
        z: (bounds.min.z + bounds.max.z) / 2,
      };
    }

    return {
      ...candidate,
      rig: {
        kind: "distant-full-body-perspective",
        targetSource: "complete-animated-envelope-center",
        targetWorld,
        verticalFieldOfViewDegrees: this.#options.verticalFieldOfViewDegrees,
      },
    };
  }

  #copySolvedCamera(camera: SolvedCamera): SolvedCamera {
    return {
      radius: camera.radius,
      azimuthRadians: camera.azimuthRadians,
      elevationRadians: camera.elevationRadians,
      anchorPx: { ...camera.anchorPx },
      anchorCoordinateSpace: camera.anchorCoordinateSpace,
      rig: {
        ...camera.rig,
        targetWorld: { ...camera.rig.targetWorld },
      },
    };
  }

  #project(
    input: FramingControllerInput,
    candidate: CameraCandidate,
  ): {
    readonly camera: SolvedCamera;
    readonly projectedBounds: ProjectedAvatarBounds;
  } {
    const camera = this.#solveCameraRig(input, candidate);
    return {
      camera,
      projectedBounds: input.probe.project(
        input.envelope,
        camera,
        input.viewport,
      ),
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
      this.#project(input, probeCamera).projectedBounds,
      input,
      safeZone,
    );
  }

  #alignEdgeLean(
    input: FramingControllerInput,
    safeZone: SafeZoneResolution,
    camera: SolvedCamera,
    projectedBounds: ProjectedAvatarBounds,
  ): {
    readonly camera: SolvedCamera;
    readonly projectedBounds: ProjectedAvatarBounds;
  } {
    if (
      input.mode !== "idle-edge-lean" ||
      safeZone.edgeLeanInsetPx === null ||
      safeZone.side === "center"
    ) {
      return { camera, projectedBounds };
    }

    const edgeEpsilon = this.#options.containmentEpsilonPx * 2;
    const desiredEdge =
      safeZone.side === "left"
        ? safeZone.pocketRect.left + edgeEpsilon
        : safeZone.pocketRect.right - edgeEpsilon;
    const currentEdge =
      safeZone.side === "left" ? projectedBounds.left : projectedBounds.right;
    const alignedCandidate: CameraCandidate = {
      ...camera,
      anchorPx: {
        x: camera.anchorPx.x + desiredEdge - currentEdge,
        y: camera.anchorPx.y,
      },
    };
    const aligned = this.#project(input, alignedCandidate);

    return {
      camera: aligned.camera,
      projectedBounds: aligned.projectedBounds,
    };
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
      return this.#project(input, {
        radius,
        azimuthRadians: input.currentCamera.azimuthRadians,
        elevationRadians: input.currentCamera.elevationRadians,
        anchorPx,
        anchorCoordinateSpace: input.currentCamera.anchorCoordinateSpace,
      }).projectedBounds;
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
      !isValidRect(projected) ||
      projected.coordinateSpace !== "visual-viewport-css-pixels" ||
      !Number.isFinite(projected.visiblePixelFraction) ||
      projected.visiblePixelFraction < 1 - FULL_VISIBILITY_NUMERICAL_EPSILON ||
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
