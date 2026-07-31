import type { LocomotionPresentation, LocomotionProfileId } from "./types";

export const LOCOMOTION_PROFILE_BY_PRESENTATION = {
  male: "walk-male-shared",
  female: "walk-female-shared",
  nonbinary: "walk-nonbinary-shared",
} as const satisfies Record<LocomotionPresentation, LocomotionProfileId>;

export function locomotionProfileFor(
  declaredPresentation: LocomotionPresentation,
): LocomotionProfileId {
  return LOCOMOTION_PROFILE_BY_PRESENTATION[declaredPresentation];
}
