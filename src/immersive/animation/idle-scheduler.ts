export type LongIdleIntent = "hourglass" | "edge-lean";

export interface IdleSchedulerContext {
  readonly reducedMotion: boolean;
  readonly viewportWidthCssPx: number;
  readonly safeEdgeAvailable: boolean;
  readonly blockedByFocusedTask: boolean;
}

export interface IdleSchedulerOptions {
  readonly hourglassDelayMs: number;
  readonly edgeLeanDelayMs: number;
  readonly edgeLeanCooldownMs: number;
  readonly edgeMinimumViewportWidthCssPx: number;
}

const DEFAULT_OPTIONS: IdleSchedulerOptions = {
  hourglassDelayMs: 52_500,
  edgeLeanDelayMs: 110_000,
  edgeLeanCooldownMs: 300_000,
  edgeMinimumViewportWidthCssPx: 1_100,
};

export class IdleScheduler {
  readonly #options: IdleSchedulerOptions;
  #lastActivityAtMs: number;
  #hiddenAtMs: number | null = null;
  #hourglassIssued = false;
  #edgeLeanIssued = false;
  #lastEdgeLeanCompletedAtMs = Number.NEGATIVE_INFINITY;

  public constructor(
    initialTimeMs: number,
    options: Partial<IdleSchedulerOptions> = {},
  ) {
    this.#options = { ...DEFAULT_OPTIONS, ...options };
    this.#lastActivityAtMs = initialTimeMs;
  }

  public noteActivity(atMs: number): void {
    this.#lastActivityAtMs = atMs;
    this.#hourglassIssued = false;
    this.#edgeLeanIssued = false;
  }

  public setDocumentHidden(hidden: boolean, atMs: number): void {
    if (hidden && this.#hiddenAtMs === null) {
      this.#hiddenAtMs = atMs;
      return;
    }

    if (!hidden && this.#hiddenAtMs !== null) {
      this.#lastActivityAtMs += Math.max(0, atMs - this.#hiddenAtMs);
      this.#hiddenAtMs = null;
    }
  }

  public markEdgeLeanCompleted(atMs: number): void {
    this.#lastEdgeLeanCompletedAtMs = atMs;
  }

  public poll(
    atMs: number,
    context: IdleSchedulerContext,
  ): LongIdleIntent | null {
    if (this.#hiddenAtMs !== null || context.blockedByFocusedTask) {
      return null;
    }

    const idleMs = Math.max(0, atMs - this.#lastActivityAtMs);
    if (
      !this.#edgeLeanIssued &&
      idleMs >= this.#options.edgeLeanDelayMs &&
      !context.reducedMotion &&
      context.viewportWidthCssPx >=
        this.#options.edgeMinimumViewportWidthCssPx &&
      context.safeEdgeAvailable &&
      atMs - this.#lastEdgeLeanCompletedAtMs >= this.#options.edgeLeanCooldownMs
    ) {
      this.#edgeLeanIssued = true;
      return "edge-lean";
    }

    if (!this.#hourglassIssued && idleMs >= this.#options.hourglassDelayMs) {
      this.#hourglassIssued = true;
      return "hourglass";
    }

    return null;
  }
}
