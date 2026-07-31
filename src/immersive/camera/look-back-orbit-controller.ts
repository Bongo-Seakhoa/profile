import { clamp } from "./math";
import type { LookBackFramingIntent, MotionPreference } from "./types";

export type LookBackPhase = "inactive" | "enter" | "hold" | "exit";

export interface LookBackOrbitInput {
  readonly phase: LookBackPhase;
  readonly phaseElapsedMs: number;
  readonly baselineAzimuthRadians: number;
  readonly orbitDirection: -1 | 1;
  readonly motionPreference: MotionPreference;
  readonly targetOrbitDegrees?: number;
}

export interface LookBackOrbitOutput {
  readonly azimuthRadians: number;
  readonly orbitDegrees: number;
  readonly orbitProgress: number;
  readonly backdropBlend: number;
  readonly phaseComplete: boolean;
  readonly presentation: "camera-orbit" | "still-crossfade";
  readonly framingIntent: LookBackFramingIntent;
}

export interface LookBackOrbitControllerOptions {
  readonly enterDurationMs: number;
  readonly exitDurationMs: number;
  readonly defaultOrbitDegrees: number;
}

const DEFAULT_OPTIONS: LookBackOrbitControllerOptions = {
  enterDurationMs: 380,
  exitDurationMs: 280,
  defaultOrbitDegrees: 170,
};

function smoothStep(progress: number): number {
  const bounded = clamp(progress, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
}

export class LookBackOrbitController {
  readonly #options: LookBackOrbitControllerOptions;

  public constructor(options: Partial<LookBackOrbitControllerOptions> = {}) {
    this.#options = { ...DEFAULT_OPTIONS, ...options };

    if (
      Object.values(this.#options).some((value) => !Number.isFinite(value)) ||
      this.#options.enterDurationMs < 300 ||
      this.#options.enterDurationMs > 450 ||
      this.#options.exitDurationMs < 220 ||
      this.#options.exitDurationMs > 350 ||
      this.#options.defaultOrbitDegrees < 160 ||
      this.#options.defaultOrbitDegrees > 180
    ) {
      throw new RangeError(
        "Look-back timing or orbit extent is outside the authored contract.",
      );
    }
  }

  public resolve(input: LookBackOrbitInput): LookBackOrbitOutput {
    if (
      !Number.isFinite(input.phaseElapsedMs) ||
      input.phaseElapsedMs < 0 ||
      !Number.isFinite(input.baselineAzimuthRadians) ||
      !(["inactive", "enter", "hold", "exit"] as const).includes(input.phase) ||
      (input.motionPreference !== "full" &&
        input.motionPreference !== "reduced") ||
      (input.orbitDirection !== -1 && input.orbitDirection !== 1)
    ) {
      throw new RangeError("Invalid look-back orbit input.");
    }

    const targetOrbitDegrees =
      input.targetOrbitDegrees ?? this.#options.defaultOrbitDegrees;
    if (
      !Number.isFinite(targetOrbitDegrees) ||
      targetOrbitDegrees < 160 ||
      targetOrbitDegrees > 180
    ) {
      throw new RangeError(
        "Look-back orbit extent must remain between 160 and 180 degrees.",
      );
    }

    const phaseProgress = this.#phaseProgress(
      input.phase,
      input.phaseElapsedMs,
    );
    const reducedMotion = input.motionPreference === "reduced";
    const orbitProgress = reducedMotion ? 0 : phaseProgress.progress;
    const orbitDegrees = targetOrbitDegrees * orbitProgress;

    const presentation = reducedMotion ? "still-crossfade" : "camera-orbit";
    return {
      azimuthRadians:
        input.baselineAzimuthRadians +
        (input.orbitDirection * (orbitDegrees * Math.PI)) / 180,
      orbitDegrees,
      orbitProgress,
      backdropBlend: phaseProgress.progress,
      phaseComplete: phaseProgress.complete,
      presentation,
      framingIntent: {
        phase: input.phase,
        orbitDirection: input.orbitDirection,
        targetOrbitDegrees,
        orbitProgress,
        presentation,
      },
    };
  }

  #phaseProgress(
    phase: LookBackPhase,
    elapsedMs: number,
  ): { readonly progress: number; readonly complete: boolean } {
    if (phase === "inactive") {
      return { progress: 0, complete: true };
    }

    if (phase === "hold") {
      return { progress: 1, complete: false };
    }

    const duration =
      phase === "enter"
        ? this.#options.enterDurationMs
        : this.#options.exitDurationMs;
    const linearProgress = clamp(elapsedMs / duration, 0, 1);
    const easedProgress = smoothStep(linearProgress);

    return {
      progress: phase === "enter" ? easedProgress : 1 - easedProgress,
      complete: linearProgress >= 1,
    };
  }
}
