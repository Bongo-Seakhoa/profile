export type CharacterLod = 0 | 1 | 2 | 3 | 4;
export type DeviceQualityTier = "high" | "standard" | "low";

export interface CharacterLodBudget {
  readonly minimumTriangles: number;
  readonly maximumTriangles: number;
  readonly maximumDrawCalls: number;
  readonly maximumTextureEdgePx: number;
}

export const CHARACTER_LOD_BUDGETS: Readonly<
  Record<CharacterLod, CharacterLodBudget>
> = {
  0: {
    minimumTriangles: 55_000,
    maximumTriangles: 75_000,
    maximumDrawCalls: 12,
    maximumTextureEdgePx: 4_096,
  },
  1: {
    minimumTriangles: 28_000,
    maximumTriangles: 42_000,
    maximumDrawCalls: 10,
    maximumTextureEdgePx: 2_048,
  },
  2: {
    minimumTriangles: 14_000,
    maximumTriangles: 24_000,
    maximumDrawCalls: 7,
    maximumTextureEdgePx: 2_048,
  },
  3: {
    minimumTriangles: 7_000,
    maximumTriangles: 12_000,
    maximumDrawCalls: 5,
    maximumTextureEdgePx: 1_024,
  },
  4: {
    minimumTriangles: 3_000,
    maximumTriangles: 6_000,
    maximumDrawCalls: 3,
    maximumTextureEdgePx: 1_024,
  },
};

export interface RuntimeCharacterMetrics {
  readonly lod: CharacterLod;
  readonly visibleTriangles: number;
  readonly drawCalls: number;
  readonly largestTextureEdgePx: number;
  readonly maximumSkinInfluences: number;
  readonly residentCompleteRigCount: number;
}

export function preferredLodFor(
  projectedHeightPx: number,
  deviceQuality: DeviceQualityTier,
  characterSelection: boolean,
): CharacterLod {
  if (!Number.isFinite(projectedHeightPx) || projectedHeightPx < 0) {
    throw new RangeError("Projected character height must be non-negative.");
  }

  let geometricChoice: CharacterLod;
  if (projectedHeightPx > 360 && characterSelection) {
    geometricChoice = 0;
  } else if (projectedHeightPx >= 180) {
    geometricChoice = 1;
  } else if (projectedHeightPx >= 100) {
    geometricChoice = 2;
  } else if (projectedHeightPx >= 60) {
    geometricChoice = 3;
  } else {
    geometricChoice = 4;
  }

  const deviceFloor: CharacterLod =
    deviceQuality === "high" ? 0 : deviceQuality === "standard" ? 2 : 3;
  return Math.max(geometricChoice, deviceFloor) as CharacterLod;
}

export function validateRuntimeCharacterMetrics(
  metrics: RuntimeCharacterMetrics,
): readonly string[] {
  const budget = CHARACTER_LOD_BUDGETS[metrics.lod];
  const violations: string[] = [];

  if (metrics.visibleTriangles > budget.maximumTriangles) {
    violations.push("triangle-ceiling");
  }
  if (metrics.drawCalls > budget.maximumDrawCalls) {
    violations.push("draw-call-ceiling");
  }
  if (metrics.largestTextureEdgePx > budget.maximumTextureEdgePx) {
    violations.push("texture-ceiling");
  }
  if (metrics.maximumSkinInfluences > 4) {
    violations.push("skin-influence-ceiling");
  }
  if (metrics.residentCompleteRigCount > 1) {
    violations.push("multiple-complete-rigs-resident");
  }

  return violations;
}
