import { describe, expect, it } from "vitest";

import {
  AnimationCoordinator,
  IdleScheduler,
  REQUIRED_COMPACT_ANIMATION_FAMILIES,
  animationManifestSchema,
  locomotionProfileFor,
  preferredLodFor,
  validateRuntimeCharacterMetrics,
  type AnimationRuntimeContext,
  type CompactAnimationFamily,
} from "../../../src/immersive/animation";

const READY_CONTEXT: AnimationRuntimeContext = {
  traversalActive: false,
  modalRequiresFocus: false,
  formFieldEditing: false,
  interactiveMediaActive: false,
  previousLocationAvailable: true,
  safeEdgeAvailable: true,
  explorerIntentionallyHidden: false,
  reducedMotion: false,
  viewportWidthCssPx: 1440,
};

const DURATION_BY_FAMILY: Readonly<Record<CompactAnimationFamily, number>> = {
  "base-idle": 10_000,
  "weight-shift-idle": 2_000,
  "garment-adjustment": 2_000,
  "present-open-hand": 800,
  point: 1_000,
  "hourglass-draw": 750,
  "hourglass-inspect": 6_000,
  "hourglass-stow": 650,
  "short-local-step": 600,
  "edge-lean-enter": 550,
  "edge-lean-hold": 3_000,
  "edge-lean-exit": 550,
  "sand-recall-recovery": 650,
};

function manifestClip(family: CompactAnimationFamily, index: number) {
  const markers =
    family === "hourglass-draw"
      ? [
          {
            id: "attach-hand",
            timeMs: 400,
            event: "hourglass-attach-hand" as const,
          },
        ]
      : family === "hourglass-stow"
        ? [
            {
              id: "attach-belt",
              timeMs: 400,
              event: "hourglass-attach-belt" as const,
            },
          ]
        : [];

  return {
    id: `clip-${index}-${family}`,
    family,
    durationMs: DURATION_BY_FAMILY[family],
    loop:
      family === "base-idle" ||
      family === "hourglass-inspect" ||
      family === "edge-lean-hold",
    additiveUpperBody: family === "present-open-hand" || family === "point",
    rootMotion: "in-place" as const,
    blendInMs: 200,
    blendOutMs: 200,
    markers,
  };
}

describe("shared locomotion profiles", () => {
  it("maps every declared presentation to one reusable walk family", () => {
    expect(locomotionProfileFor("male")).toBe("walk-male-shared");
    expect(locomotionProfileFor("female")).toBe("walk-female-shared");
    expect(locomotionProfileFor("nonbinary")).toBe("walk-nonbinary-shared");
  });
});

describe("compact animation manifest", () => {
  it("accepts one complete reusable family set with named prop markers", () => {
    const manifest = {
      version: 1,
      rigConvention: "anzania-humanoid-v1",
      clips: REQUIRED_COMPACT_ANIMATION_FAMILIES.map(manifestClip),
    };

    expect(animationManifestSchema.parse(manifest).clips).toHaveLength(13);
  });

  it("rejects missing families and anonymous hourglass transfers", () => {
    const incomplete = {
      version: 1,
      rigConvention: "anzania-humanoid-v1",
      clips: [
        {
          ...manifestClip("hourglass-draw", 1),
          markers: [],
        },
      ],
    };
    const result = animationManifestSchema.safeParse(incomplete);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.message.includes("Missing required compact animation family"),
        ),
      ).toBe(true);
      expect(
        result.error.issues.some((issue) =>
          issue.message.includes("hand-attachment"),
        ),
      ).toBe(true);
    }
  });
});

describe("animation interruption coordinator", () => {
  it("keeps UI action immediate and discards gesture spam during cooldown", () => {
    const coordinator = new AnimationCoordinator();
    const first = coordinator.request(
      {
        state: "INTERACTION_GESTURE",
        requestedAtMs: 1_000,
        reason: "present-project",
      },
      READY_CONTEXT,
    );
    const repeated = coordinator.request(
      {
        state: "INTERACTION_GESTURE",
        requestedAtMs: 2_000,
        reason: "obsolete-repeat",
      },
      READY_CONTEXT,
    );

    expect(first.accepted).toBe(true);
    expect(first.uiAction).toBe("immediate");
    expect(repeated.accepted).toBe(false);
    expect(repeated.reason).toBe("gesture-cooldown");
    expect(repeated.uiAction).toBe("immediate");
  });

  it("resolves look back before traversal without queuing decorative work", () => {
    const coordinator = new AnimationCoordinator();
    coordinator.request(
      {
        state: "LOOK_BACK_ENTER",
        requestedAtMs: 1_000,
        reason: "hold-start",
      },
      READY_CONTEXT,
    );
    coordinator.request(
      {
        state: "LOOK_BACK_HOLD",
        requestedAtMs: 1_400,
        reason: "hold",
      },
      READY_CONTEXT,
    );
    const traversal = coordinator.request(
      {
        state: "TRAVERSAL_ANTICIPATION",
        requestedAtMs: 2_000,
        reason: "route-request",
      },
      { ...READY_CONTEXT, traversalActive: true },
    );

    expect(traversal.accepted).toBe(true);
    expect(traversal.sequence).toEqual([
      "LOOK_BACK_EXIT",
      "TRAVERSAL_ANTICIPATION",
    ]);
    expect(traversal.uiAction).toBe("immediate");
  });

  it("uses a crossfade for reduced-motion look back", () => {
    const coordinator = new AnimationCoordinator();
    const decision = coordinator.request(
      {
        state: "LOOK_BACK_ENTER",
        requestedAtMs: 1_000,
        reason: "accessible-look-back",
      },
      { ...READY_CONTEXT, reducedMotion: true },
    );

    expect(decision.accepted).toBe(true);
    expect(decision.presentation).toBe("reduced-motion-crossfade");
  });

  it("blocks edge lean on compact or reduced-motion layouts", () => {
    const compactCoordinator = new AnimationCoordinator();
    const compact = compactCoordinator.request(
      {
        state: "EDGE_MOVE",
        requestedAtMs: 100_000,
        reason: "long-idle",
      },
      { ...READY_CONTEXT, viewportWidthCssPx: 1024 },
    );
    const reducedCoordinator = new AnimationCoordinator();
    const reduced = reducedCoordinator.request(
      {
        state: "EDGE_MOVE",
        requestedAtMs: 100_000,
        reason: "long-idle",
      },
      { ...READY_CONTEXT, reducedMotion: true },
    );

    expect(compact.accepted).toBe(false);
    expect(reduced.accepted).toBe(false);
  });

  it("interrupts a long idle into recovery before the next visible frame", () => {
    const coordinator = new AnimationCoordinator();
    coordinator.request(
      {
        state: "EDGE_LEAN_HOLD",
        requestedAtMs: 110_000,
        reason: "long-idle",
      },
      READY_CONTEXT,
    );
    const recovery = coordinator.handleActivity(111_000, READY_CONTEXT);

    expect(recovery.accepted).toBe(true);
    expect(recovery.state).toBe("IDLE_RECOVERY");
    expect(recovery.uiAction).toBe("immediate");
  });
});

describe("idle scheduler", () => {
  it("does not count time while the document is hidden", () => {
    const scheduler = new IdleScheduler(0);
    scheduler.setDocumentHidden(true, 20_000);
    expect(
      scheduler.poll(80_000, {
        reducedMotion: false,
        viewportWidthCssPx: 1440,
        safeEdgeAvailable: true,
        blockedByFocusedTask: false,
      }),
    ).toBeNull();
    scheduler.setDocumentHidden(false, 80_000);

    expect(
      scheduler.poll(112_000, {
        reducedMotion: false,
        viewportWidthCssPx: 1440,
        safeEdgeAvailable: true,
        blockedByFocusedTask: false,
      }),
    ).toBeNull();
    expect(
      scheduler.poll(113_000, {
        reducedMotion: false,
        viewportWidthCssPx: 1440,
        safeEdgeAvailable: true,
        blockedByFocusedTask: false,
      }),
    ).toBe("hourglass");
  });
});

describe("runtime LOD policy", () => {
  it("uses screen height and device quality without loading inspection LOD in navigation", () => {
    expect(preferredLodFor(420, "high", false)).toBe(1);
    expect(preferredLodFor(420, "high", true)).toBe(0);
    expect(preferredLodFor(220, "standard", false)).toBe(2);
    expect(preferredLodFor(80, "low", false)).toBe(3);
    expect(preferredLodFor(40, "high", false)).toBe(4);
  });

  it("fails triangle, draw-call, texture, skinning and residency excesses", () => {
    expect(
      validateRuntimeCharacterMetrics({
        lod: 2,
        visibleTriangles: 25_000,
        drawCalls: 8,
        largestTextureEdgePx: 4_096,
        maximumSkinInfluences: 5,
        residentCompleteRigCount: 2,
      }),
    ).toEqual([
      "triangle-ceiling",
      "draw-call-ceiling",
      "texture-ceiling",
      "skin-influence-ceiling",
      "multiple-complete-rigs-resident",
    ]);
  });
});
