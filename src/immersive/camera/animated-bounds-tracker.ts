import { expandBounds, isValidBounds, unionBounds } from "./math";
import { CanonicalAnimatedBoundsRegistry } from "./required-contributor-registry";
import type {
  AllowedVisibilitySuppression,
  AnimatedBoundContribution,
  AnimatedBoundsFrame,
  AnimatedEnvelope,
  Bounds3,
  ConservativeBoundFallback,
  Vec3,
} from "./types";

export class AnimatedBoundsContractError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AnimatedBoundsContractError";
  }
}

export interface AnimatedBoundsTrackerOptions {
  readonly registry: CanonicalAnimatedBoundsRegistry;
  readonly conservativeFallbacks?: readonly ConservativeBoundFallback[];
  readonly allowedVisibilitySuppressions?: readonly AllowedVisibilitySuppression[];
  readonly maximumSampleAgeFrames?: number;
}

interface ResolvedAnimatedBoundsTrackerOptions {
  readonly registry: CanonicalAnimatedBoundsRegistry;
  readonly conservativeFallbacks: readonly ConservativeBoundFallback[];
  readonly allowedVisibilitySuppressions: readonly AllowedVisibilitySuppression[];
  readonly maximumSampleAgeFrames: number;
}

const DEFAULT_OPTIONS = {
  conservativeFallbacks: [],
  allowedVisibilitySuppressions: [],
  maximumSampleAgeFrames: 0,
} as const;

interface ActiveSuppressionState {
  readonly occurrenceId: string;
  readonly ruleKey: string;
  readonly startedAtMs: number;
  readonly lastElapsedMs: number;
}

interface CharacterTimelineState {
  lastFrameId: number;
  lastSampleTimeMs: number;
  activeSuppression: ActiveSuppressionState | null;
  visibleSinceSuppression: boolean;
  readonly completedOccurrenceIds: Set<string>;
}

function isValidPadding(padding: Vec3): boolean {
  return (
    Number.isFinite(padding.x) &&
    Number.isFinite(padding.y) &&
    Number.isFinite(padding.z) &&
    padding.x >= 0 &&
    padding.y >= 0 &&
    padding.z >= 0
  );
}

function copyBounds(bounds: Bounds3): Bounds3 {
  return {
    min: { ...bounds.min },
    max: { ...bounds.max },
  };
}

function mergeContributionBounds(
  contributions: readonly AnimatedBoundContribution[],
  key: "bounds" | "predictiveBounds",
): Bounds3 | null {
  let merged: Bounds3 | null = null;

  for (const contribution of contributions) {
    if (!isValidPadding(contribution.padding)) {
      throw new AnimatedBoundsContractError(
        `Contributor "${contribution.id}" supplied invalid padding.`,
      );
    }

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
  readonly #options: ResolvedAnimatedBoundsTrackerOptions;
  readonly #fallbacks: ReadonlyMap<string, ConservativeBoundFallback>;
  readonly #visibilityRules: ReadonlyMap<string, AllowedVisibilitySuppression>;
  readonly #timelines = new Map<string, CharacterTimelineState>();

  public constructor(options: AnimatedBoundsTrackerOptions) {
    this.#options = {
      registry: options.registry,
      conservativeFallbacks:
        options.conservativeFallbacks ?? DEFAULT_OPTIONS.conservativeFallbacks,
      allowedVisibilitySuppressions:
        options.allowedVisibilitySuppressions ??
        DEFAULT_OPTIONS.allowedVisibilitySuppressions,
      maximumSampleAgeFrames:
        options.maximumSampleAgeFrames ??
        DEFAULT_OPTIONS.maximumSampleAgeFrames,
    };
    if (!(this.#options.registry instanceof CanonicalAnimatedBoundsRegistry)) {
      throw new AnimatedBoundsContractError(
        "Animated bounds tracking requires a canonical contributor registry.",
      );
    }

    const fallbackIds = this.#options.conservativeFallbacks.map(
      (fallback) => fallback.id,
    );
    if (
      fallbackIds.some((id) => id.length === 0 || id !== id.trim()) ||
      new Set(fallbackIds).size !== fallbackIds.length ||
      this.#options.conservativeFallbacks.some(
        (fallback) =>
          !isValidBounds(fallback.bounds) ||
          !isValidBounds(fallback.predictiveBounds) ||
          !isValidPadding(fallback.padding),
      )
    ) {
      throw new AnimatedBoundsContractError(
        "Conservative animated-bound fallbacks must have unique IDs, valid bounds and non-negative padding.",
      );
    }

    this.#fallbacks = new Map(
      this.#options.conservativeFallbacks.map((fallback) => {
        const copiedFallback: ConservativeBoundFallback = {
          id: fallback.id,
          role: fallback.role,
          bounds: copyBounds(fallback.bounds),
          predictiveBounds: copyBounds(fallback.predictiveBounds),
          padding: { ...fallback.padding },
        };
        return [fallback.id, copiedFallback] as const;
      }),
    );

    const visibilityRuleEntries =
      this.#options.allowedVisibilitySuppressions.map(
        (rule) => [this.#visibilityRuleKey(rule), { ...rule }] as const,
      );
    if (
      visibilityRuleEntries.some(([, rule]) =>
        [
          rule.characterId,
          rule.effectId,
          rule.powerId,
          rule.phaseId,
          rule.stateId,
        ].some((value) => value.trim().length === 0 || value !== value.trim()),
      ) ||
      this.#options.allowedVisibilitySuppressions.some(
        (rule) =>
          rule.marker !== "avatar-visibility-authored-v1" ||
          !Number.isFinite(rule.maximumDurationMs) ||
          rule.maximumDurationMs <= 0,
      ) ||
      new Set(visibilityRuleEntries.map(([key]) => key)).size !==
        visibilityRuleEntries.length
    ) {
      throw new AnimatedBoundsContractError(
        "Visibility-suppression rules must be finite, positive, non-empty and unique.",
      );
    }
    for (const [, rule] of visibilityRuleEntries) {
      const state = this.#options.registry.requirementsFor(
        rule.characterId,
        rule.stateId,
      );
      if (!state.powerState) {
        throw new AnimatedBoundsContractError(
          `Visibility suppression rule "${rule.effectId}" does not target a canonical power state.`,
        );
      }
    }
    this.#visibilityRules = new Map(visibilityRuleEntries);

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

    if (
      !Number.isFinite(frame.sampleTimeMs) ||
      frame.sampleTimeMs < 0 ||
      frame.characterId.trim().length === 0 ||
      frame.characterId !== frame.characterId.trim()
    ) {
      throw new AnimatedBoundsContractError(
        "Animated samples require a non-empty character ID and finite non-negative time.",
      );
    }

    const stateContract = this.#options.registry.requirementsFor(
      frame.characterId,
      frame.stateId,
    );
    const timeline = this.#timelineFor(frame.characterId);
    this.#assertTimelineAdvances(frame, timeline);

    if (
      !Number.isFinite(frame.predictionHorizonMs) ||
      frame.predictionHorizonMs < 0 ||
      (frame.predictiveBoundsRequired && frame.predictionHorizonMs <= 0)
    ) {
      throw new AnimatedBoundsContractError(
        "Prediction horizons must be finite and positive when predictive bounds are required.",
      );
    }

    if (frame.visibility.state === "authored-suppressed") {
      if (!stateContract.powerState) {
        throw new AnimatedBoundsContractError(
          `Visibility suppression is legal only in a canonical power state, not "${frame.stateId}".`,
        );
      }
      if (
        frame.predictiveBoundsRequired ||
        frame.predictionHorizonMs !== 0 ||
        frame.additionalContributorIds.length > 0 ||
        frame.contributions.some((contribution) => contribution.active)
      ) {
        throw new AnimatedBoundsContractError(
          "An authored fully hidden phase cannot discard active or predictive silhouette contributors.",
        );
      }
      return this.#sampleSuppressed(frame, timeline);
    }

    const activeContributions = frame.contributions.filter(
      (contribution) => contribution.active,
    );
    const duplicateAdditionalIds = frame.additionalContributorIds.filter(
      (id, index, all) => all.indexOf(id) !== index,
    );
    if (
      frame.additionalContributorIds.some(
        (id) => id.length === 0 || id !== id.trim(),
      ) ||
      duplicateAdditionalIds.length > 0 ||
      frame.contributions.some(
        (contribution) =>
          typeof contribution.active !== "boolean" ||
          contribution.id.length === 0 ||
          contribution.id !== contribution.id.trim(),
      )
    ) {
      throw new AnimatedBoundsContractError(
        "Additional and active animated-bound contributor IDs must be non-empty and unique.",
      );
    }

    const duplicateIds = activeContributions
      .map((contribution) => contribution.id)
      .filter((id, index, all) => all.indexOf(id) !== index);

    if (duplicateIds.length > 0) {
      throw new AnimatedBoundsContractError(
        `Duplicate animated-bound contributors: ${[...new Set(duplicateIds)].join(", ")}.`,
      );
    }

    const requiredById = new Map(
      stateContract.requiredContributors.map((requirement) => [
        requirement.id,
        requirement,
      ]),
    );
    const expectedIds = new Set([
      ...requiredById.keys(),
      ...frame.additionalContributorIds,
    ]);
    const activeById = new Map(
      activeContributions.map((contribution) => [
        contribution.id,
        contribution,
      ]),
    );
    const idsToResolve = new Set([...expectedIds, ...activeById.keys()]);
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
        (!frame.predictiveBoundsRequired ||
          contribution.predictiveBounds !== null) &&
        Number.isInteger(contribution.sampleFrameId) &&
        sampleAge >= 0 &&
        sampleAge <= this.#options.maximumSampleAgeFrames;

      if (validFreshSample) {
        const requirement = requiredById.get(id);
        if (
          requirement !== undefined &&
          contribution.role !== requirement.role
        ) {
          throw new AnimatedBoundsContractError(
            `Contributor "${id}" has role "${contribution.role}" but canonical state "${frame.stateId}" requires "${requirement.role}".`,
          );
        }
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

      const requirement = requiredById.get(id);
      if (requirement !== undefined && fallback.role !== requirement.role) {
        throw new AnimatedBoundsContractError(
          `Fallback "${id}" has role "${fallback.role}" but canonical state "${frame.stateId}" requires "${requirement.role}".`,
        );
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

    const envelope: AnimatedEnvelope = {
      frameId: frame.frameId,
      sampleTimeMs: frame.sampleTimeMs,
      characterId: frame.characterId,
      stateId: frame.stateId,
      visibility: frame.visibility,
      predictionHorizonMs: frame.predictionHorizonMs,
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
    this.#commitVisibleFrame(frame, timeline);
    return envelope;
  }

  #visibilityRuleKey(
    rule: Pick<
      AllowedVisibilitySuppression,
      "characterId" | "effectId" | "powerId" | "phaseId" | "stateId"
    >,
  ): string {
    return [
      rule.characterId,
      rule.effectId,
      rule.powerId,
      rule.phaseId,
      rule.stateId,
    ].join("\u0000");
  }

  #timelineFor(characterId: string): CharacterTimelineState {
    const existing = this.#timelines.get(characterId);
    if (existing !== undefined) {
      return existing;
    }

    const created: CharacterTimelineState = {
      lastFrameId: -1,
      lastSampleTimeMs: Number.NEGATIVE_INFINITY,
      activeSuppression: null,
      visibleSinceSuppression: true,
      completedOccurrenceIds: new Set(),
    };
    this.#timelines.set(characterId, created);
    return created;
  }

  #assertTimelineAdvances(
    frame: AnimatedBoundsFrame,
    timeline: CharacterTimelineState,
  ): void {
    if (
      frame.frameId <= timeline.lastFrameId ||
      frame.sampleTimeMs <= timeline.lastSampleTimeMs
    ) {
      throw new AnimatedBoundsContractError(
        `Character "${frame.characterId}" animated-bound samples must advance monotonically in frame ID and absolute time.`,
      );
    }
  }

  #sampleSuppressed(
    frame: AnimatedBoundsFrame,
    timeline: CharacterTimelineState,
  ): AnimatedEnvelope {
    if (frame.visibility.state !== "authored-suppressed") {
      throw new AnimatedBoundsContractError(
        "Internal visibility state disagreement.",
      );
    }

    const visibility = frame.visibility;
    const ruleKey = this.#visibilityRuleKey({
      characterId: frame.characterId,
      effectId: visibility.effectId,
      powerId: visibility.powerId,
      phaseId: visibility.phaseId,
      stateId: frame.stateId,
    });
    const rule = this.#visibilityRules.get(ruleKey);

    if (
      rule === undefined ||
      rule.marker !== "avatar-visibility-authored-v1" ||
      visibility.marker !== "avatar-visibility-authored-v1"
    ) {
      throw new AnimatedBoundsContractError(
        `Visibility suppression "${visibility.effectId}" is not on the authored whitelist for state "${frame.stateId}".`,
      );
    }

    const absoluteElapsedMs = frame.sampleTimeMs - visibility.startedAtMs;
    if (
      visibility.occurrenceId.trim().length === 0 ||
      !Number.isFinite(visibility.startedAtMs) ||
      visibility.startedAtMs < 0 ||
      !Number.isFinite(visibility.elapsedMs) ||
      visibility.elapsedMs < 0 ||
      visibility.maximumDurationMs !== rule.maximumDurationMs ||
      Math.abs(absoluteElapsedMs - visibility.elapsedMs) > 1 ||
      absoluteElapsedMs < 0 ||
      absoluteElapsedMs > rule.maximumDurationMs
    ) {
      throw new AnimatedBoundsContractError(
        `Visibility suppression "${visibility.effectId}" exceeded, reset or disagreed with its absolute authored duration.`,
      );
    }

    const active = timeline.activeSuppression;
    if (active === null) {
      if (
        !timeline.visibleSinceSuppression ||
        timeline.completedOccurrenceIds.has(visibility.occurrenceId)
      ) {
        throw new AnimatedBoundsContractError(
          `Visibility suppression occurrence "${visibility.occurrenceId}" was replayed without a new visible interval.`,
        );
      }
    } else if (
      active.occurrenceId !== visibility.occurrenceId ||
      active.ruleKey !== ruleKey ||
      active.startedAtMs !== visibility.startedAtMs ||
      visibility.elapsedMs < active.lastElapsedMs
    ) {
      throw new AnimatedBoundsContractError(
        `Visibility suppression "${visibility.effectId}" changed identity, reset elapsed time or switched phase while still hidden.`,
      );
    }

    timeline.lastFrameId = frame.frameId;
    timeline.lastSampleTimeMs = frame.sampleTimeMs;
    timeline.visibleSinceSuppression = false;
    timeline.activeSuppression = {
      occurrenceId: visibility.occurrenceId,
      ruleKey,
      startedAtMs: visibility.startedAtMs,
      lastElapsedMs: visibility.elapsedMs,
    };

    return {
      frameId: frame.frameId,
      sampleTimeMs: frame.sampleTimeMs,
      characterId: frame.characterId,
      stateId: frame.stateId,
      visibility,
      predictionHorizonMs: frame.predictionHorizonMs,
      currentBounds: null,
      predictiveBounds: null,
      combinedBounds: null,
      contributorIds: [],
      fallbackContributorIds: [],
    };
  }

  #commitVisibleFrame(
    frame: AnimatedBoundsFrame,
    timeline: CharacterTimelineState,
  ): void {
    if (timeline.activeSuppression !== null) {
      timeline.completedOccurrenceIds.add(
        timeline.activeSuppression.occurrenceId,
      );
      timeline.activeSuppression = null;
    }
    timeline.visibleSinceSuppression = true;
    timeline.lastFrameId = frame.frameId;
    timeline.lastSampleTimeMs = frame.sampleTimeMs;
  }
}
