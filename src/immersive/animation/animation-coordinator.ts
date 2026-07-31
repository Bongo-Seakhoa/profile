import type {
  AnimationDecision,
  AnimationRequest,
  AnimationRuntimeContext,
  AnimationState,
} from "./types";

const PRIORITY: Record<AnimationState, number> = {
  NAV_IDLE: 1,
  HOURGLASS_DRAW: 2,
  HOURGLASS_INSPECT: 2,
  HOURGLASS_STOW: 2,
  EDGE_MOVE: 2,
  EDGE_LEAN_ENTER: 2,
  EDGE_LEAN_HOLD: 2,
  EDGE_LEAN_EXIT: 2,
  IDLE_RECOVERY: 3,
  INTERACTION_GESTURE: 4,
  LOOK_BACK_ENTER: 5,
  LOOK_BACK_HOLD: 5,
  LOOK_BACK_EXIT: 5,
  TRAVERSAL_ANTICIPATION: 6,
  TRAVERSAL_ACTIVE: 6,
  TRAVERSAL_ARRIVAL: 6,
};

const EDGE_STATES = new Set<AnimationState>([
  "EDGE_MOVE",
  "EDGE_LEAN_ENTER",
  "EDGE_LEAN_HOLD",
  "EDGE_LEAN_EXIT",
]);
const LOOK_BACK_STATES = new Set<AnimationState>([
  "LOOK_BACK_ENTER",
  "LOOK_BACK_HOLD",
  "LOOK_BACK_EXIT",
]);
const TRAVERSAL_STATES = new Set<AnimationState>([
  "TRAVERSAL_ANTICIPATION",
  "TRAVERSAL_ACTIVE",
  "TRAVERSAL_ARRIVAL",
]);
const LONG_IDLE_STATES = new Set<AnimationState>([
  "HOURGLASS_DRAW",
  "HOURGLASS_INSPECT",
  "HOURGLASS_STOW",
  ...EDGE_STATES,
]);

export interface AnimationCoordinatorOptions {
  readonly gestureCooldownMs: number;
  readonly edgeMinimumViewportWidthCssPx: number;
}

const DEFAULT_OPTIONS: AnimationCoordinatorOptions = {
  gestureCooldownMs: 3_000,
  edgeMinimumViewportWidthCssPx: 1_100,
};

export class AnimationCoordinator {
  readonly #options: AnimationCoordinatorOptions;
  #state: AnimationState = "NAV_IDLE";
  #lastGestureAtMs = Number.NEGATIVE_INFINITY;

  public constructor(options: Partial<AnimationCoordinatorOptions> = {}) {
    this.#options = { ...DEFAULT_OPTIONS, ...options };
  }

  public get state(): AnimationState {
    return this.#state;
  }

  public request(
    request: AnimationRequest,
    context: AnimationRuntimeContext,
  ): AnimationDecision {
    const previousState = this.#state;
    const rejected = (reason: string): AnimationDecision => ({
      accepted: false,
      previousState,
      state: this.#state,
      sequence: [],
      uiAction: "immediate",
      presentation: context.reducedMotion
        ? "reduced-motion-crossfade"
        : "animated",
      reason,
    });

    if (!Number.isFinite(request.requestedAtMs) || request.requestedAtMs < 0) {
      return rejected("invalid-request-time");
    }

    if (LOOK_BACK_STATES.has(request.state)) {
      if (
        context.traversalActive ||
        context.modalRequiresFocus ||
        context.formFieldEditing ||
        context.explorerIntentionallyHidden ||
        !context.previousLocationAvailable
      ) {
        return rejected("look-back-context-blocked");
      }
    }

    if (EDGE_STATES.has(request.state)) {
      if (
        context.reducedMotion ||
        context.viewportWidthCssPx <
          this.#options.edgeMinimumViewportWidthCssPx ||
        context.modalRequiresFocus ||
        context.formFieldEditing ||
        context.interactiveMediaActive ||
        !context.safeEdgeAvailable
      ) {
        return rejected("edge-lean-context-blocked");
      }
    }

    if (request.state === "INTERACTION_GESTURE") {
      if (
        request.requestedAtMs - this.#lastGestureAtMs <
        this.#options.gestureCooldownMs
      ) {
        return rejected("gesture-cooldown");
      }
    }

    if (
      TRAVERSAL_STATES.has(request.state) &&
      LOOK_BACK_STATES.has(previousState)
    ) {
      this.#state = request.state;
      return {
        accepted: true,
        previousState,
        state: this.#state,
        sequence: ["LOOK_BACK_EXIT", request.state],
        uiAction: "immediate",
        presentation: context.reducedMotion
          ? "reduced-motion-crossfade"
          : "animated",
        reason: "resolve-look-back-before-traversal",
      };
    }

    if (
      PRIORITY[request.state] < PRIORITY[previousState] &&
      !this.#isPermittedRecovery(request.state, previousState)
    ) {
      return rejected("higher-priority-state-active");
    }

    if (request.state === "INTERACTION_GESTURE") {
      this.#lastGestureAtMs = request.requestedAtMs;
    }

    this.#state = request.state;
    return {
      accepted: true,
      previousState,
      state: this.#state,
      sequence: [request.state],
      uiAction: "immediate",
      presentation:
        context.reducedMotion && LOOK_BACK_STATES.has(request.state)
          ? "reduced-motion-crossfade"
          : "animated",
      reason: request.reason,
    };
  }

  public handleActivity(
    atMs: number,
    context: AnimationRuntimeContext,
  ): AnimationDecision {
    if (LONG_IDLE_STATES.has(this.#state)) {
      return this.request(
        {
          state: "IDLE_RECOVERY",
          requestedAtMs: atMs,
          reason: "meaningful-input-cancelled-long-idle",
        },
        context,
      );
    }

    return {
      accepted: false,
      previousState: this.#state,
      state: this.#state,
      sequence: [],
      uiAction: "immediate",
      presentation: "animated",
      reason: "no-long-idle-to-recover",
    };
  }

  #isPermittedRecovery(
    requested: AnimationState,
    previous: AnimationState,
  ): boolean {
    if (requested === "IDLE_RECOVERY" && LONG_IDLE_STATES.has(previous)) {
      return true;
    }

    if (requested === "NAV_IDLE") {
      return (
        previous === "IDLE_RECOVERY" ||
        previous === "INTERACTION_GESTURE" ||
        previous === "TRAVERSAL_ARRIVAL"
      );
    }

    return false;
  }
}
