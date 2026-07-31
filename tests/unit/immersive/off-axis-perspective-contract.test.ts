import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";

import {
  OffAxisPerspectiveContractError,
  PerspectiveAabbProjectionProbe,
  deriveOffAxisPerspectiveContract,
  type AnimatedEnvelope,
  type Bounds3,
  type OffAxisPerspectiveContract,
  type SolvedCamera,
  type Vec2,
  type Vec3,
  type Viewport,
} from "../../../src/immersive/camera";

const CSS_PIXEL_SPACE = "visual-viewport-css-pixels" as const;
const TEST_BOUNDS: Bounds3 = {
  min: { x: -0.7, y: -1, z: -0.45 },
  max: { x: 0.8, y: 1.2, z: 0.6 },
};

function viewport(
  width: number,
  height: number,
  devicePixelRatio = 1,
  visualScale = 1,
  visualOffsetPx: Vec2 = { x: 0, y: 0 },
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

function centre(bounds: Bounds3): Vec3 {
  return {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2,
  };
}

function envelope(bounds = TEST_BOUNDS): AnimatedEnvelope {
  return {
    frameId: 14,
    sampleTimeMs: 240,
    characterId: "DN-M-AFR-01",
    stateId: "present",
    visibility: { state: "visible" },
    predictionHorizonMs: 0,
    currentBounds: bounds,
    predictiveBounds: null,
    combinedBounds: bounds,
    contributorIds: [
      "body",
      "headwear",
      "hands",
      "footwear",
      "scarf",
      "mantle-tail",
      "pouch",
    ],
    fallbackContributorIds: [],
  };
}

function solvedCamera(
  bounds: Bounds3,
  anchorPx: Vec2,
  azimuthRadians: number,
  elevationRadians: number,
): SolvedCamera {
  return {
    radius: 14,
    azimuthRadians,
    elevationRadians,
    anchorPx,
    anchorCoordinateSpace: CSS_PIXEL_SPACE,
    rig: {
      kind: "distant-full-body-perspective",
      targetSource: "complete-animated-envelope-center",
      targetWorld: centre(bounds),
      verticalFieldOfViewDegrees: 46,
    },
  };
}

function configureThreeCamera(
  camera: SolvedCamera,
  projection: OffAxisPerspectiveContract,
): PerspectiveCamera {
  const target = camera.rig.targetWorld;
  const cosElevation = Math.cos(camera.elevationRadians);
  const rendererCamera = new PerspectiveCamera(
    camera.rig.verticalFieldOfViewDegrees,
    projection.aspect,
    projection.frustum.near,
    projection.frustum.far,
  );
  rendererCamera.position.set(
    target.x + camera.radius * Math.sin(camera.azimuthRadians) * cosElevation,
    target.y + camera.radius * Math.sin(camera.elevationRadians),
    target.z + camera.radius * Math.cos(camera.azimuthRadians) * cosElevation,
  );
  rendererCamera.up.set(0, 1, 0);
  rendererCamera.lookAt(target.x, target.y, target.z);
  rendererCamera.updateMatrixWorld(true);

  const { frustum } = projection;
  rendererCamera.projectionMatrix.makePerspective(
    frustum.left,
    frustum.right,
    frustum.top,
    frustum.bottom,
    frustum.near,
    frustum.far,
  );
  rendererCamera.projectionMatrixInverse
    .copy(rendererCamera.projectionMatrix)
    .invert();
  return rendererCamera;
}

function projectWorldPointWithThree(
  point: Vec3,
  rendererCamera: PerspectiveCamera,
  targetViewport: Viewport,
): Vec2 {
  const ndc = new Vector3(point.x, point.y, point.z).project(rendererCamera);
  return {
    x: ((ndc.x + 1) * targetViewport.width) / 2,
    y: ((1 - ndc.y) * targetViewport.height) / 2,
  };
}

function corners(bounds: Bounds3): readonly Vec3[] {
  return [bounds.min.x, bounds.max.x].flatMap((x) =>
    [bounds.min.y, bounds.max.y].flatMap((y) =>
      [bounds.min.z, bounds.max.z].map((z) => ({ x, y, z })),
    ),
  );
}

function derive(
  targetViewport: Viewport,
  anchorPx: Vec2,
  verticalFieldOfViewDegrees = 46,
): OffAxisPerspectiveContract {
  return deriveOffAxisPerspectiveContract({
    viewport: targetViewport,
    anchorPx,
    anchorCoordinateSpace: CSS_PIXEL_SPACE,
    verticalFieldOfViewDegrees,
    nearPlane: 0.1,
    farPlane: 1_000,
  });
}

describe("off-axis full-body perspective contract", () => {
  it("is the symmetric perspective identity at the visual-viewport centre", () => {
    const targetViewport = viewport(1_600, 900, 2);
    const anchorPx = { x: 800, y: 450 };
    const projection = derive(targetViewport, anchorPx);

    expect(projection.kind).toBe("asymmetric-perspective-frustum");
    expect(projection.aspect).toBeCloseTo(16 / 9, 12);
    expect(projection.anchorNdc.x).toBeCloseTo(0, 12);
    expect(projection.anchorNdc.y).toBeCloseTo(0, 12);
    expect(projection.normalizedLensShift.x).toBeCloseTo(0, 12);
    expect(projection.normalizedLensShift.y).toBeCloseTo(0, 12);
    expect(projection.frustum.left).toBeCloseTo(-projection.frustum.right, 12);
    expect(projection.frustum.bottom).toBeCloseTo(-projection.frustum.top, 12);
  });

  it("accepts anchors on every inclusive visual-viewport boundary", () => {
    const targetViewport = viewport(1_000, 800);
    const topLeft = derive(targetViewport, { x: 0, y: 0 });
    const bottomRight = derive(targetViewport, { x: 1_000, y: 800 });

    expect(topLeft.anchorNdc).toEqual({ x: -1, y: 1 });
    expect(bottomRight.anchorNdc).toEqual({ x: 1, y: -1 });
  });

  it.each([42, 50])(
    "accepts the inclusive %d degree full-body FOV boundary",
    (verticalFieldOfViewDegrees) => {
      expect(
        derive(
          viewport(1_440, 900),
          { x: 360, y: 684 },
          verticalFieldOfViewDegrees,
        ).verticalFieldOfViewDegrees,
      ).toBe(verticalFieldOfViewDegrees);
    },
  );

  it.each([
    {
      name: "desktop lower-left",
      targetViewport: viewport(1_440, 900, 2),
      anchorPx: { x: 288, y: 720 },
      azimuthRadians: 0.62,
      elevationRadians: 0.24,
    },
    {
      name: "mobile lower-right",
      targetViewport: viewport(390, 844, 3),
      anchorPx: { x: 304.2, y: 700.52 },
      azimuthRadians: -1.08,
      elevationRadians: 0.38,
    },
  ])(
    "projects the complete-envelope target to the $name anchor",
    ({ targetViewport, anchorPx, azimuthRadians, elevationRadians }) => {
      const camera = solvedCamera(
        TEST_BOUNDS,
        anchorPx,
        azimuthRadians,
        elevationRadians,
      );
      const projection = derive(targetViewport, anchorPx);
      const rendererCamera = configureThreeCamera(camera, projection);
      const projectedTarget = projectWorldPointWithThree(
        camera.rig.targetWorld,
        rendererCamera,
        targetViewport,
      );

      expect(projectedTarget.x).toBeCloseTo(anchorPx.x, 10);
      expect(projectedTarget.y).toBeCloseTo(anchorPx.y, 10);
      expect(
        rendererCamera.position.distanceTo(
          new Vector3(
            camera.rig.targetWorld.x,
            camera.rig.targetWorld.y,
            camera.rig.targetWorld.z,
          ),
        ),
      ).toBeCloseTo(camera.radius, 12);
      expect(camera.rig.kind).toBe("distant-full-body-perspective");
      expect(camera.rig.targetSource).toBe("complete-animated-envelope-center");
    },
  );

  it("expresses lower-third side placement as an explicit normalized lens shift", () => {
    const targetViewport = viewport(1_000, 800);
    const projection = derive(targetViewport, { x: 200, y: 600 });

    expect(projection.anchorNdc).toEqual({ x: -0.6, y: -0.5 });
    expect(projection.normalizedLensShift).toEqual({ x: 0.6, y: 0.5 });
    expect(
      (projection.frustum.left + projection.frustum.right) / 2,
    ).toBeGreaterThan(0);
    expect(
      (projection.frustum.top + projection.frustum.bottom) / 2,
    ).toBeGreaterThan(0);
  });

  it("uses local visual CSS geometry while remaining invariant to DPR, zoom and page offset", () => {
    const standard = derive(viewport(1_440, 900, 1, 1, { x: 0, y: 0 }), {
      x: 360,
      y: 684,
    });
    const sameCssGeometry = derive(
      viewport(1_440, 900, 3, 2.5, { x: 240, y: 140 }),
      { x: 360, y: 684 },
    );
    const scaledVisualViewport = derive(
      viewport(720, 450, 3, 2, { x: 240, y: 140 }),
      { x: 180, y: 342 },
    );

    expect(sameCssGeometry.frustum).toEqual(standard.frustum);
    expect(sameCssGeometry.anchorNdc).toEqual(standard.anchorNdc);
    expect(scaledVisualViewport.frustum).toEqual(standard.frustum);
    expect(scaledVisualViewport.anchorNdc).toEqual(standard.anchorNdc);
    expect(scaledVisualViewport.viewportCssSize).toEqual({
      width: 720,
      height: 450,
    });
  });

  it.each([
    {
      name: "desktop orbit",
      targetViewport: viewport(1_440, 900),
      anchorPx: { x: 310, y: 710 },
      azimuthRadians: 0.7,
      elevationRadians: 0.26,
    },
    {
      name: "mobile elevated orbit",
      targetViewport: viewport(390, 844, 3, 1.8, { x: 40, y: 70 }),
      anchorPx: { x: 292, y: 690 },
      azimuthRadians: -1.2,
      elevationRadians: 0.43,
    },
  ])(
    "matches Three's camera matrix for the target and all eight corners in $name",
    ({ targetViewport, anchorPx, azimuthRadians, elevationRadians }) => {
      const subjectEnvelope = envelope();
      const camera = solvedCamera(
        TEST_BOUNDS,
        anchorPx,
        azimuthRadians,
        elevationRadians,
      );
      const projection = derive(targetViewport, anchorPx);
      const rendererCamera = configureThreeCamera(camera, projection);
      const projectedTarget = projectWorldPointWithThree(
        camera.rig.targetWorld,
        rendererCamera,
        targetViewport,
      );
      const projectedCorners = corners(TEST_BOUNDS).map((point) =>
        projectWorldPointWithThree(point, rendererCamera, targetViewport),
      );
      const probed = new PerspectiveAabbProjectionProbe({
        nearPlane: projection.frustum.near,
        farPlane: projection.frustum.far,
      }).project(subjectEnvelope, camera, targetViewport);

      expect(projectedCorners).toHaveLength(8);
      expect(projectedTarget.x).toBeCloseTo(anchorPx.x, 10);
      expect(projectedTarget.y).toBeCloseTo(anchorPx.y, 10);
      expect(probed.left).toBeCloseTo(
        Math.min(...projectedCorners.map((point) => point.x)),
        10,
      );
      expect(probed.top).toBeCloseTo(
        Math.min(...projectedCorners.map((point) => point.y)),
        10,
      );
      expect(probed.right).toBeCloseTo(
        Math.max(...projectedCorners.map((point) => point.x)),
        10,
      );
      expect(probed.bottom).toBeCloseTo(
        Math.max(...projectedCorners.map((point) => point.y)),
        10,
      );
      expect(probed.visiblePixelFraction).toBe(1);
    },
  );

  it.each([
    {
      name: "zero viewport width",
      mutate: (
        input: Parameters<typeof deriveOffAxisPerspectiveContract>[0],
      ) => ({
        ...input,
        viewport: { ...input.viewport, width: 0 },
      }),
    },
    {
      name: "invalid coordinate space",
      mutate: (
        input: Parameters<typeof deriveOffAxisPerspectiveContract>[0],
      ) => ({
        ...input,
        anchorCoordinateSpace: "layout-pixels",
      }),
    },
    {
      name: "non-finite anchor",
      mutate: (
        input: Parameters<typeof deriveOffAxisPerspectiveContract>[0],
      ) => ({
        ...input,
        anchorPx: { x: Number.NaN, y: 500 },
      }),
    },
    {
      name: "negative horizontal anchor",
      mutate: (
        input: Parameters<typeof deriveOffAxisPerspectiveContract>[0],
      ) => ({ ...input, anchorPx: { x: -0.01, y: 500 } }),
    },
    {
      name: "negative vertical anchor",
      mutate: (
        input: Parameters<typeof deriveOffAxisPerspectiveContract>[0],
      ) => ({ ...input, anchorPx: { x: 500, y: -0.01 } }),
    },
    {
      name: "horizontal anchor beyond viewport width",
      mutate: (
        input: Parameters<typeof deriveOffAxisPerspectiveContract>[0],
      ) => ({
        ...input,
        anchorPx: { x: input.viewport.width + 0.01, y: 500 },
      }),
    },
    {
      name: "vertical anchor beyond viewport height",
      mutate: (
        input: Parameters<typeof deriveOffAxisPerspectiveContract>[0],
      ) => ({
        ...input,
        anchorPx: { x: 500, y: input.viewport.height + 0.01 },
      }),
    },
    {
      name: "zero DPR",
      mutate: (
        input: Parameters<typeof deriveOffAxisPerspectiveContract>[0],
      ) => ({
        ...input,
        viewport: { ...input.viewport, devicePixelRatio: 0 },
      }),
    },
    {
      name: "zero visual scale",
      mutate: (
        input: Parameters<typeof deriveOffAxisPerspectiveContract>[0],
      ) => ({
        ...input,
        viewport: { ...input.viewport, visualScale: 0 },
      }),
    },
    {
      name: "non-finite visual offset",
      mutate: (
        input: Parameters<typeof deriveOffAxisPerspectiveContract>[0],
      ) => ({
        ...input,
        viewport: {
          ...input.viewport,
          visualOffsetPx: { x: Number.POSITIVE_INFINITY, y: 0 },
        },
      }),
    },
    {
      name: "field of view below the full-body floor",
      mutate: (
        input: Parameters<typeof deriveOffAxisPerspectiveContract>[0],
      ) => ({ ...input, verticalFieldOfViewDegrees: 41.999 }),
    },
    {
      name: "field of view above the full-body ceiling",
      mutate: (
        input: Parameters<typeof deriveOffAxisPerspectiveContract>[0],
      ) => ({ ...input, verticalFieldOfViewDegrees: 50.001 }),
    },
    {
      name: "invalid near plane",
      mutate: (
        input: Parameters<typeof deriveOffAxisPerspectiveContract>[0],
      ) => ({ ...input, nearPlane: 0 }),
    },
    {
      name: "far plane before near plane",
      mutate: (
        input: Parameters<typeof deriveOffAxisPerspectiveContract>[0],
      ) => ({ ...input, nearPlane: 1, farPlane: 1 }),
    },
  ])("rejects $name", ({ mutate }) => {
    const validInput = {
      viewport: viewport(1_440, 900),
      anchorPx: { x: 360, y: 684 },
      anchorCoordinateSpace: CSS_PIXEL_SPACE,
      verticalFieldOfViewDegrees: 46,
      nearPlane: 0.1,
      farPlane: 1_000,
    } as const;

    expect(() =>
      deriveOffAxisPerspectiveContract(
        mutate(validInput) as Parameters<
          typeof deriveOffAxisPerspectiveContract
        >[0],
      ),
    ).toThrowError(OffAxisPerspectiveContractError);
  });
});
