import { expandBounds, isValidBounds, unionBounds } from "./math";
import type {
  AllowedVisibilitySuppression,
  AnimatedBoundContribution,
  AnimatedBoundsFrame,
  AnimatedEnvelope,
  Bounds3,
  ConservativeBoundFallback,
} from "./types";

export class AnimatedBoundsContractError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AnimatedBoundsContractError";
  }
}

export interface AnimatedBoundsTrackerOptions {
  readonly conservativeFallbacks: readonly ConservativeBoundFallback[];
  readonly allowedVisibilitySuppressions: readonly AllowedVisibilitySuppression[];
  readonly maximumSampleAgeFrames: number;
}

const DEFAULT_OPTIONS: AnimatedBoundsTrackerOptions = {
  conservativeFallbacks: [],
  allowedVisibilitySuppressions: [],
  maximumSampleAgeFrames: 0,
};

function mergeContributionBounds(
  contributions: readonly AnimatedBoundContribution[],
  key: "bounds" | "predictiveBounds",
): Bounds3 | null {
  let merged: Bounds3 | null = null;

  for (const contribution of contributions) {
    const source = contribution[key];
    if (source === null) {
      continue;
    }

    if (!isValidBounds(source)) {
      throw new AnimatedBoundsContractError(
        `Contributor "${contribution.id}" supplied invalid ${key}.`,
      );
    }

    const expanded = expandBounds(source, contribution.padding);
    merged = merged === null ? expanded : unionBounds(merged, expanded);
  }

  return merged;
}

export class AnimatedBoundsTracker {
  readonly #options: AnimatedBoundsTrackerOptions;
  readonly #fallbacks: ReadonlyMap<string, ConservativeBoundFallback>;

  public constructor(options: Partial<AnimatedBoundsTrackerOptions> = {}) {
    this.#options = { ...DEFAULT_OPTIONS, ...options };
    this.#fallbacks = new Map(
      this.#options.conservativeFallbacks.map((fallback) => [
        fallback.id,
        fallback,
      ]),
    );

    if (
      !Number.isInteger(this.#options.maximumSampleAgeFrames) ||
      this.#options.maximumSampleAgeFrames < 0
    ) {
      throw new RangeError(
        "maximumSampleAgeFrames must be a non-negative integer.",
      );
    }
  }

  public sample(frame: AnimatedBoundsFrame): AnimatedEnvelope {
    if (!Number.isInteger(frame.frameId) || frame.frameId < 0) {
      throw new AnimatedBoundsContractError(
        "Animated frame IDs must be non-negative integers.",
      );
    }

    if (frame.visibility.state === "authored-suppressed") {
      const visibility = frame.visibility;
      const rule = this.#options.allowedVisibilitySuppressions.find(
        (candidate) =>
          candidate.effectId === visibility.effectId &&
          candidate.powerId === visibility.powerId &&
          candidate.phaseId === visibility.phaseId &&
          candidate.marker === visibility.marker,
      );

      if (rule === undefined) {
        throw new AnimatedBoundsContractError(
          `Visibility suppression "${visibility.effectId}" is not on the authored whitelist.`,
        );
      }

      if (
        !Number.isFinite(visibility.elapsedMs) ||
        visibility.elapsedMs < 0 ||
        visibility.maximumDurationMs !== rule.maximumDurationMs ||
        visibility.maximumDurationMs <= 0 ||
        visibility.elapsedMs > rule.maximumDurationMs
      ) {
        throw new AnimatedBoundsContractError(
          `Visibility suppression "${visibility.effectId}" exceeded or disagreed with its authored duration.`,
        );
      }

      return {
        frameId: frame.frameId,
        stateId: frame.stateId,
        visibility,
        currentBounds: null,
        predictiveBounds: null,
        combinedBounds: null,
        contributorIds: [],
        fallbackContributorIds: [],
      };
    }

    const activeContributions = frame.contributions.filter(
      (contribution) => contribution.active,
    );
    const duplicateIds = activeContributions
      .map((contribution) => contribution.id)
      .filter((id, index, all) => all.indexOf(id) !== index);

    if (duplicateIds.length > 0) {
      throw new AnimatedBoundsContractError(
        `Duplicate animated-bound contributors: ${[...new Set(duplicateIds)].join(", ")}.`,
      );
    }

    const expectedIds = new Set(frame.expectedContributorIds);
    const activeById = new Map(
      activeContributions.map((contribution) => [
        contribution.id,
        contribution,
      ]),
    );
    const idsToResolve = new Set([
      ...frame.expectedContributorIds,
      ...activeById.keys(),
    ]);
    const resolvedContributions: AnimatedBoundContribution[] = [];
    const fallbackContributorIds: string[] = [];
    const unresolvedContributorIds: string[] = [];

    for (const id of idsToResolve) {
      const contribution = activeById.get(id);
      const sampleAge =
        contribution === undefined
          ? Number.POSITIVE_INFINITY
          : frame.frameId - contribution.sampleFrameId;
      const validFreshSample =
        contribution !== undefined &&
        contribution.bounds !== null &&
        Number.isInteger(contribution.sampleFrameId) &&
        sampleAge >= 0 &&
        sampleAge <= this.#options.maximumSampleAgeFrames;

      if (validFreshSample) {
        resolvedContributions.push(contribution);
        continue;
      }

      const fallback = this.#fallbacks.get(id);
      if (fallback === undefined) {
        if (expectedIds.has(id) || contribution !== undefined) {
          unresolvedContributorIds.push(id);
        }
        continue;
      }

      resolvedContributions.push({
        id: fallback.id,
        role: fallback.role,
        active: true,
        sampleFrameId: frame.frameId,
        samplingMode: "authored-conservative-proxy",
        bounds: fallback.bounds,
        predictiveBounds: fallback.predictiveBounds,
        padding: fallback.padding,
      });
      fallbackContributorIds.push(id);
    }

    if (unresolvedContributorIds.length > 0) {
      throw new AnimatedBoundsContractError(
        `Missing, empty or stale animated-bound contributors without conservative fallbacks: ${unresolvedContributorIds.join(", ")}.`,
      );
    }

    if (resolvedContributions.length === 0) {
      throw new AnimatedBoundsContractError(
        `Visible avatar state "${frame.stateId}" has no active bounds.`,
      );
    }

    if (
      !resolvedContributions.some(
        (contribution) => contribution.role === "body",
      )
    ) {
      throw new AnimatedBoundsContractError(
        `Visible avatar state "${frame.stateId}" has no complete body contributor.`,
      );
    }

    const currentBounds = mergeContributionBounds(
      resolvedContributions,
      "bounds",
    );
    const predictiveBounds = mergeContributionBounds(
      resolvedContributions,
      "predictiveBounds",
    );

    if (currentBounds === null) {
      throw new AnimatedBoundsContractError(
        `Visible avatar state "${frame.stateId}" produced an empty envelope.`,
      );
    }

    return {
      frameId: frame.frameId,
      stateId: frame.stateId,
      visibility: frame.visibility,
      currentBounds,
      predictiveBounds,
      combinedBounds:
        predictiveBounds === null
          ? currentBounds
          : unionBounds(currentBounds, predictiveBounds),
      contributorIds: resolvedContributions.map(
        (contribution) => contribution.id,
      ),
      fallbackContributorIds,
    };
  }
}
