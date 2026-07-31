import type { FramingTelemetry } from "./types";

export interface FramingTelemetryBufferOptions {
  readonly enabled: boolean;
  readonly maximumFrames: number;
}

const DEFAULT_OPTIONS: FramingTelemetryBufferOptions = {
  enabled: false,
  maximumFrames: 4_000,
};

export function framingTelemetryEnabled(search: string): boolean {
  return new URLSearchParams(search).get("framingTelemetry") === "1";
}

export class FramingTelemetryBuffer {
  readonly #options: FramingTelemetryBufferOptions;
  readonly #frames: FramingTelemetry[] = [];

  public constructor(options: Partial<FramingTelemetryBufferOptions> = {}) {
    this.#options = { ...DEFAULT_OPTIONS, ...options };

    if (
      !Number.isInteger(this.#options.maximumFrames) ||
      this.#options.maximumFrames <= 0
    ) {
      throw new RangeError(
        "Framing telemetry capacity must be a positive integer.",
      );
    }
  }

  public get enabled(): boolean {
    return this.#options.enabled;
  }

  public record(telemetry: FramingTelemetry): void {
    if (!this.#options.enabled) {
      return;
    }

    this.#frames.push(telemetry);
    const excess = this.#frames.length - this.#options.maximumFrames;
    if (excess > 0) {
      this.#frames.splice(0, excess);
    }
  }

  public snapshot(): readonly FramingTelemetry[] {
    return [...this.#frames];
  }

  public clear(): void {
    this.#frames.length = 0;
  }
}
