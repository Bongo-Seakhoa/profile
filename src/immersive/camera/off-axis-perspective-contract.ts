import type { Vec2, Viewport } from "./types";

const VISUAL_VIEWPORT_CSS_PIXELS = "visual-viewport-css-pixels" as const;

export class OffAxisPerspectiveContractError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "OffAxisPerspectiveContractError";
  }
}

export interface OffAxisPerspectiveContractInput {
  readonly viewport: Viewport;
  readonly anchorPx: Vec2;
  readonly anchorCoordinateSpace: "visual-viewport-css-pixels";
  readonly verticalFieldOfViewDegrees: number;
  readonly nearPlane: number;
  readonly farPlane: number;
}

export interface PerspectiveFrustumPlanes {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly near: number;
  readonly far: number;
}

/**
 * Renderer-ready off-axis lens data for a camera whose view axis is aimed at
 * the complete animated-envelope center.
 *
 * The anchor and viewport size are local visual-viewport CSS pixels. Device
 * pixel ratio, visual-viewport page offset and visual scale are deliberately
 * absent from the lens calculation: they belong to canvas raster sizing and
 * placement. `normalizedLensShift` is the near-frustum center divided by its
 * symmetric half extent, so it can be translated to another renderer's lens
 * shift convention without reinterpreting pixels. Apply `frustum` to the
 * perspective matrix while the camera continues to look at `targetWorld`; do
 * not translate the target or alter the distant full-body rig.
 */
export interface OffAxisPerspectiveContract {
  readonly kind: "asymmetric-perspective-frustum";
  readonly coordinateSpace: "visual-viewport-css-pixels";
  readonly viewportCssSize: {
    readonly width: number;
    readonly height: number;
  };
  readonly aspect: number;
  readonly verticalFieldOfViewDegrees: number;
  readonly anchorPx: Vec2;
  readonly anchorNdc: Vec2;
  readonly normalizedLensShift: Vec2;
  readonly normalizedLensShiftConvention: "frustum-center-over-symmetric-half-extent";
  readonly frustum: PerspectiveFrustumPlanes;
}

/**
 * Derives an asymmetric perspective frustum that maps a point on the camera's
 * forward view axis to `anchorPx`, instead of implicitly centering that point.
 */
export function deriveOffAxisPerspectiveContract(
  input: OffAxisPerspectiveContractInput,
): OffAxisPerspectiveContract {
  const { viewport } = input;
  if (
    viewport.coordinateSpace !== VISUAL_VIEWPORT_CSS_PIXELS ||
    input.anchorCoordinateSpace !== VISUAL_VIEWPORT_CSS_PIXELS ||
    !Number.isFinite(viewport.width) ||
    viewport.width <= 0 ||
    !Number.isFinite(viewport.height) ||
    viewport.height <= 0 ||
    !Number.isFinite(viewport.devicePixelRatio) ||
    viewport.devicePixelRatio <= 0 ||
    !Number.isFinite(viewport.visualOffsetPx.x) ||
    !Number.isFinite(viewport.visualOffsetPx.y) ||
    !Number.isFinite(viewport.visualScale) ||
    viewport.visualScale <= 0 ||
    !Number.isFinite(input.anchorPx.x) ||
    !Number.isFinite(input.anchorPx.y) ||
    input.anchorPx.x < 0 ||
    input.anchorPx.x > viewport.width ||
    input.anchorPx.y < 0 ||
    input.anchorPx.y > viewport.height ||
    !Number.isFinite(input.verticalFieldOfViewDegrees) ||
    input.verticalFieldOfViewDegrees < 42 ||
    input.verticalFieldOfViewDegrees > 50 ||
    !Number.isFinite(input.nearPlane) ||
    input.nearPlane <= 0 ||
    !Number.isFinite(input.farPlane) ||
    input.farPlane <= input.nearPlane
  ) {
    throw new OffAxisPerspectiveContractError(
      "Off-axis projection requires an in-viewport visual CSS anchor, finite perspective planes and a 42 to 50 degree full-body field of view.",
    );
  }

  const aspect = viewport.width / viewport.height;
  const verticalHalfExtent =
    input.nearPlane *
    Math.tan((input.verticalFieldOfViewDegrees * Math.PI) / 360);
  const horizontalHalfExtent = verticalHalfExtent * aspect;
  const anchorNdc: Vec2 = {
    x: (2 * input.anchorPx.x) / viewport.width - 1,
    y: 1 - (2 * input.anchorPx.y) / viewport.height,
  };
  const normalizedLensShift: Vec2 = {
    x: -anchorNdc.x,
    y: -anchorNdc.y,
  };
  const horizontalCenter = normalizedLensShift.x * horizontalHalfExtent;
  const verticalCenter = normalizedLensShift.y * verticalHalfExtent;
  const frustum: PerspectiveFrustumPlanes = {
    left: horizontalCenter - horizontalHalfExtent,
    right: horizontalCenter + horizontalHalfExtent,
    top: verticalCenter + verticalHalfExtent,
    bottom: verticalCenter - verticalHalfExtent,
    near: input.nearPlane,
    far: input.farPlane,
  };

  if (
    !Number.isFinite(aspect) ||
    !Number.isFinite(verticalHalfExtent) ||
    verticalHalfExtent <= 0 ||
    !Number.isFinite(horizontalHalfExtent) ||
    horizontalHalfExtent <= 0 ||
    Object.values(anchorNdc).some((value) => !Number.isFinite(value)) ||
    Object.values(normalizedLensShift).some(
      (value) => !Number.isFinite(value),
    ) ||
    Object.values(frustum).some((value) => !Number.isFinite(value))
  ) {
    throw new OffAxisPerspectiveContractError(
      "Off-axis projection inputs produced a non-finite perspective frustum.",
    );
  }

  return {
    kind: "asymmetric-perspective-frustum",
    coordinateSpace: VISUAL_VIEWPORT_CSS_PIXELS,
    viewportCssSize: { width: viewport.width, height: viewport.height },
    aspect,
    verticalFieldOfViewDegrees: input.verticalFieldOfViewDegrees,
    anchorPx: { ...input.anchorPx },
    anchorNdc,
    normalizedLensShift,
    normalizedLensShiftConvention: "frustum-center-over-symmetric-half-extent",
    frustum,
  };
}
