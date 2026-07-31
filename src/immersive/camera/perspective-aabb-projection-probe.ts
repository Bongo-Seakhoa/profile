import { clamp, intersectRects, isValidBounds, rectArea } from "./math";
import { deriveOffAxisPerspectiveContract } from "./off-axis-perspective-contract";
import type {
  AnimatedEnvelope,
  Bounds3,
  ProjectedAvatarBounds,
  ProjectionProbe,
  SolvedCamera,
  Vec3,
  Viewport,
} from "./types";

export class PerspectiveProjectionContractError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PerspectiveProjectionContractError";
  }
}

export interface PerspectiveAabbProjectionProbeOptions {
  readonly nearPlane: number;
  readonly farPlane: number;
  readonly targetEpsilonWorldUnits: number;
}

const DEFAULT_OPTIONS: PerspectiveAabbProjectionProbeOptions = {
  nearPlane: 0.01,
  farPlane: 10_000,
  targetEpsilonWorldUnits: 1e-6,
};

function subtract(first: Vec3, second: Vec3): Vec3 {
  return {
    x: first.x - second.x,
    y: first.y - second.y,
    z: first.z - second.z,
  };
}

function dot(first: Vec3, second: Vec3): number {
  return first.x * second.x + first.y * second.y + first.z * second.z;
}

function cross(first: Vec3, second: Vec3): Vec3 {
  return {
    x: first.y * second.z - first.z * second.y,
    y: first.z * second.x - first.x * second.z,
    z: first.x * second.y - first.y * second.x,
  };
}

function normalize(vector: Vec3): Vec3 | null {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (!Number.isFinite(length) || length <= 1e-9) {
    return null;
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function boundsCenter(bounds: Bounds3): Vec3 {
  return {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2,
  };
}

function boundsCorners(bounds: Bounds3): readonly Vec3[] {
  return [bounds.min.x, bounds.max.x].flatMap((x) =>
    [bounds.min.y, bounds.max.y].flatMap((y) =>
      [bounds.min.z, bounds.max.z].map((z) => ({ x, y, z })),
    ),
  );
}

function hiddenProjection(): ProjectedAvatarBounds {
  return {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    coordinateSpace: "visual-viewport-css-pixels",
    visible: false,
    visiblePixelFraction: 0,
  };
}

export class PerspectiveAabbProjectionProbe implements ProjectionProbe {
  readonly #options: PerspectiveAabbProjectionProbeOptions;

  public constructor(
    options: Partial<PerspectiveAabbProjectionProbeOptions> = {},
  ) {
    this.#options = { ...DEFAULT_OPTIONS, ...options };
    if (
      Object.values(this.#options).some((value) => !Number.isFinite(value)) ||
      this.#options.nearPlane <= 0 ||
      this.#options.farPlane <= this.#options.nearPlane ||
      this.#options.targetEpsilonWorldUnits < 0
    ) {
      throw new RangeError("Invalid perspective projection-probe options.");
    }
  }

  public project(
    envelope: AnimatedEnvelope,
    candidate: SolvedCamera,
    viewport: Viewport,
  ): ProjectedAvatarBounds {
    const bounds = envelope.combinedBounds;
    if (bounds === null) {
      return hiddenProjection();
    }

    if (
      !isValidBounds(bounds) ||
      viewport.coordinateSpace !== "visual-viewport-css-pixels" ||
      !Number.isFinite(viewport.width) ||
      viewport.width <= 0 ||
      !Number.isFinite(viewport.height) ||
      viewport.height <= 0 ||
      !Number.isFinite(viewport.devicePixelRatio) ||
      viewport.devicePixelRatio <= 0 ||
      !Number.isFinite(viewport.visualScale) ||
      viewport.visualScale <= 0 ||
      !Number.isFinite(viewport.visualOffsetPx.x) ||
      !Number.isFinite(viewport.visualOffsetPx.y) ||
      candidate.rig.kind !== "distant-full-body-perspective" ||
      candidate.rig.targetSource !== "complete-animated-envelope-center" ||
      !Number.isFinite(candidate.radius) ||
      candidate.radius <= 0 ||
      !Number.isFinite(candidate.azimuthRadians) ||
      !Number.isFinite(candidate.elevationRadians) ||
      !Number.isFinite(candidate.anchorPx.x) ||
      !Number.isFinite(candidate.anchorPx.y) ||
      candidate.anchorCoordinateSpace !== "visual-viewport-css-pixels" ||
      !Number.isFinite(candidate.rig.targetWorld.x) ||
      !Number.isFinite(candidate.rig.targetWorld.y) ||
      !Number.isFinite(candidate.rig.targetWorld.z) ||
      !Number.isFinite(candidate.rig.verticalFieldOfViewDegrees) ||
      candidate.rig.verticalFieldOfViewDegrees < 42 ||
      candidate.rig.verticalFieldOfViewDegrees > 50
    ) {
      throw new PerspectiveProjectionContractError(
        "Projection inputs must use the complete-envelope visual-viewport CSS contract.",
      );
    }

    const target = boundsCenter(bounds);
    if (
      Math.max(
        Math.abs(candidate.rig.targetWorld.x - target.x),
        Math.abs(candidate.rig.targetWorld.y - target.y),
        Math.abs(candidate.rig.targetWorld.z - target.z),
      ) > this.#options.targetEpsilonWorldUnits
    ) {
      throw new PerspectiveProjectionContractError(
        "Camera target was not derived from the complete animated envelope.",
      );
    }

    const projection = deriveOffAxisPerspectiveContract({
      viewport,
      anchorPx: candidate.anchorPx,
      anchorCoordinateSpace: candidate.anchorCoordinateSpace,
      verticalFieldOfViewDegrees: candidate.rig.verticalFieldOfViewDegrees,
      nearPlane: this.#options.nearPlane,
      farPlane: this.#options.farPlane,
    });

    const cosElevation = Math.cos(candidate.elevationRadians);
    const cameraPosition: Vec3 = {
      x:
        target.x +
        candidate.radius * Math.sin(candidate.azimuthRadians) * cosElevation,
      y: target.y + candidate.radius * Math.sin(candidate.elevationRadians),
      z:
        target.z +
        candidate.radius * Math.cos(candidate.azimuthRadians) * cosElevation,
    };
    const forward = normalize(subtract(target, cameraPosition));
    const right =
      forward === null ? null : normalize(cross(forward, { x: 0, y: 1, z: 0 }));
    const up =
      forward === null || right === null
        ? null
        : normalize(cross(right, forward));
    if (forward === null || right === null || up === null) {
      throw new PerspectiveProjectionContractError(
        "Camera orientation produced a singular perspective basis.",
      );
    }

    const { frustum } = projection;
    const horizontalSpan = frustum.right - frustum.left;
    const verticalSpan = frustum.top - frustum.bottom;
    const projected = boundsCorners(bounds).map((corner) => {
      const relative = subtract(corner, cameraPosition);
      const depth = dot(relative, forward);
      if (depth <= frustum.near || depth >= frustum.far) {
        return null;
      }

      const ndcX =
        (2 * frustum.near * dot(relative, right)) / (horizontalSpan * depth) -
        (frustum.right + frustum.left) / horizontalSpan;
      const ndcY =
        (2 * frustum.near * dot(relative, up)) / (verticalSpan * depth) -
        (frustum.top + frustum.bottom) / verticalSpan;
      return {
        x: ((ndcX + 1) * viewport.width) / 2,
        y: ((1 - ndcY) * viewport.height) / 2,
      };
    });
    if (projected.some((point) => point === null)) {
      return hiddenProjection();
    }

    const points = projected.filter(
      (point): point is { readonly x: number; readonly y: number } =>
        point !== null,
    );
    const result = {
      left: Math.min(...points.map((point) => point.x)),
      top: Math.min(...points.map((point) => point.y)),
      right: Math.max(...points.map((point) => point.x)),
      bottom: Math.max(...points.map((point) => point.y)),
    };
    const clipped = intersectRects(result, {
      left: 0,
      top: 0,
      right: viewport.width,
      bottom: viewport.height,
    });
    const totalArea = rectArea(result);
    const visiblePixelFraction =
      clipped === null || totalArea <= 0
        ? 0
        : clamp(rectArea(clipped) / totalArea, 0, 1);

    return {
      ...result,
      coordinateSpace: "visual-viewport-css-pixels",
      visible: visiblePixelFraction > 0,
      visiblePixelFraction,
    };
  }
}
