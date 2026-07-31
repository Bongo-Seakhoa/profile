import type {
  AnimatedBoundRole,
  CharacterAnimatedBoundsContract,
  RequiredAnimatedBoundContributor,
} from "./types";

export class AnimatedBoundsRegistryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AnimatedBoundsRegistryError";
  }
}

interface ResolvedStateContract {
  readonly powerState: boolean;
  readonly requiredContributors: readonly RequiredAnimatedBoundContributor[];
}

const ALWAYS_REQUIRED_SILHOUETTE_ROLES: readonly AnimatedBoundRole[] = [
  "body",
  "hand",
  "footwear",
  "scarf",
  "garment-tail",
  "pouch",
];
const ALL_ROLES = new Set<AnimatedBoundRole>([
  "body",
  "hair",
  "headwear",
  "hand",
  "footwear",
  "scarf",
  "garment-tail",
  "pouch",
  "jewellery",
  "accessory",
  "cloth-proxy",
  "held-object",
  "power-proxy",
]);

function assertUniqueContributors(
  characterId: string,
  stateId: string,
  contributors: readonly RequiredAnimatedBoundContributor[],
): void {
  const ids = contributors.map((contributor) => contributor.id);
  if (
    ids.some((id) => id.trim().length === 0 || id !== id.trim()) ||
    new Set(ids).size !== ids.length ||
    contributors.some((contributor) => !ALL_ROLES.has(contributor.role))
  ) {
    throw new AnimatedBoundsRegistryError(
      `Character "${characterId}" state "${stateId}" has empty or duplicate contributor IDs.`,
    );
  }

  for (const role of ALWAYS_REQUIRED_SILHOUETTE_ROLES) {
    if (!contributors.some((contributor) => contributor.role === role)) {
      throw new AnimatedBoundsRegistryError(
        `Character "${characterId}" state "${stateId}" omits required complete-silhouette role "${role}".`,
      );
    }
  }

  if (
    !contributors.some(
      (contributor) =>
        contributor.role === "hair" || contributor.role === "headwear",
    )
  ) {
    throw new AnimatedBoundsRegistryError(
      `Character "${characterId}" state "${stateId}" omits both hair and headwear bounds.`,
    );
  }
}

export class CanonicalAnimatedBoundsRegistry {
  readonly #contracts = new Map<
    string,
    ReadonlyMap<string, ResolvedStateContract>
  >();

  public constructor(contracts: readonly CharacterAnimatedBoundsContract[]) {
    if (contracts.length === 0) {
      throw new AnimatedBoundsRegistryError(
        "At least one canonical character bounds contract is required.",
      );
    }

    for (const contract of contracts) {
      if (
        contract.characterId.trim().length === 0 ||
        contract.characterId !== contract.characterId.trim() ||
        this.#contracts.has(contract.characterId) ||
        contract.states.length === 0
      ) {
        throw new AnimatedBoundsRegistryError(
          "Canonical character IDs must be non-empty and unique, with at least one state.",
        );
      }

      const states = new Map<string, ResolvedStateContract>();
      for (const state of contract.states) {
        if (
          state.stateId.trim().length === 0 ||
          state.stateId !== state.stateId.trim() ||
          typeof state.powerState !== "boolean" ||
          states.has(state.stateId)
        ) {
          throw new AnimatedBoundsRegistryError(
            `Character "${contract.characterId}" has an empty or duplicate state ID.`,
          );
        }

        const requiredContributors = Object.freeze(
          [
            ...contract.commonRequiredContributors,
            ...state.requiredContributors,
          ].map((contributor) => Object.freeze({ ...contributor })),
        );
        assertUniqueContributors(
          contract.characterId,
          state.stateId,
          requiredContributors,
        );

        if (
          state.powerState &&
          !requiredContributors.some(
            (contributor) => contributor.role === "power-proxy",
          )
        ) {
          throw new AnimatedBoundsRegistryError(
            `Power state "${state.stateId}" for "${contract.characterId}" omits its power silhouette proxy.`,
          );
        }

        states.set(
          state.stateId,
          Object.freeze({
            powerState: state.powerState,
            requiredContributors,
          }),
        );
      }

      this.#contracts.set(contract.characterId, states);
    }
  }

  public requirementsFor(
    characterId: string,
    stateId: string,
  ): ResolvedStateContract {
    const states = this.#contracts.get(characterId);
    if (states === undefined) {
      throw new AnimatedBoundsRegistryError(
        `No canonical animated-bounds contract exists for character "${characterId}".`,
      );
    }

    const state = states.get(stateId);
    if (state === undefined) {
      throw new AnimatedBoundsRegistryError(
        `Character "${characterId}" has no canonical animated-bounds state "${stateId}".`,
      );
    }

    return state;
  }
}
