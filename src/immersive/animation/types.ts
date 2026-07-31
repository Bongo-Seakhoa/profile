export const ANIMATION_STATES = [
  "NAV_IDLE",
  "INTERACTION_GESTURE",
  "LOOK_BACK_ENTER",
  "LOOK_BACK_HOLD",
  "LOOK_BACK_EXIT",
  "HOURGLASS_DRAW",
  "HOURGLASS_INSPECT",
  "HOURGLASS_STOW",
  "EDGE_MOVE",
  "EDGE_LEAN_ENTER",
  "EDGE_LEAN_HOLD",
  "EDGE_LEAN_EXIT",
  "IDLE_RECOVERY",
  "TRAVERSAL_ANTICIPATION",
  "TRAVERSAL_ACTIVE",
  "TRAVERSAL_ARRIVAL",
] as const;

export type AnimationState = (typeof ANIMATION_STATES)[number];

export type LocomotionPresentation = "male" | "female" | "nonbinary";

export type LocomotionProfileId =
  "walk-male-shared" | "walk-female-shared" | "walk-nonbinary-shared";

export interface AnimationRuntimeContext {
  readonly traversalActive: boolean;
  readonly modalRequiresFocus: boolean;
  readonly formFieldEditing: boolean;
  readonly interactiveMediaActive: boolean;
  readonly previousLocationAvailable: boolean;
  readonly safeEdgeAvailable: boolean;
  readonly explorerIntentionallyHidden: boolean;
  readonly reducedMotion: boolean;
  readonly viewportWidthCssPx: number;
}

export interface AnimationRequest {
  readonly state: AnimationState;
  readonly requestedAtMs: number;
  readonly reason: string;
}

export interface AnimationDecision {
  readonly accepted: boolean;
  readonly previousState: AnimationState;
  readonly state: AnimationState;
  readonly sequence: readonly AnimationState[];
  readonly uiAction: "immediate";
  readonly presentation: "animated" | "reduced-motion-crossfade";
  readonly reason: string;
}

export type CompactAnimationFamily =
  | "base-idle"
  | "weight-shift-idle"
  | "garment-adjustment"
  | "present-open-hand"
  | "point"
  | "hourglass-draw"
  | "hourglass-inspect"
  | "hourglass-stow"
  | "short-local-step"
  | "edge-lean-enter"
  | "edge-lean-hold"
  | "edge-lean-exit"
  | "sand-recall-recovery";
