import type { MotionPreference, SafeAreaInsets, Vec2, Viewport } from "./types";

export interface VisualViewportReading {
  readonly width: number;
  readonly height: number;
  readonly offsetLeft: number;
  readonly offsetTop: number;
  readonly scale: number;
}

export interface BrowserViewportReadings {
  readonly layoutWidth: number;
  readonly layoutHeight: number;
  readonly devicePixelRatio: number;
  readonly visualViewport: VisualViewportReading | null | undefined;
  readonly safeAreaInsets: SafeAreaInsets;
  readonly motionPreference: MotionPreference;
}

export interface BrowserViewportSnapshot {
  readonly viewport: Viewport;
  readonly visualOffsetPx: Vec2;
  readonly visualScale: number;
  readonly safeAreaInsets: SafeAreaInsets;
  readonly motionPreference: MotionPreference;
}

export function resolveBrowserViewportSnapshot(
  readings: BrowserViewportReadings,
): BrowserViewportSnapshot {
  const visual = readings.visualViewport;
  const width = visual?.width ?? readings.layoutWidth;
  const height = visual?.height ?? readings.layoutHeight;
  const devicePixelRatio = readings.devicePixelRatio;

  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0 ||
    !Number.isFinite(devicePixelRatio) ||
    devicePixelRatio <= 0 ||
    (visual !== null &&
      visual !== undefined &&
      (!Number.isFinite(visual.offsetLeft) ||
        !Number.isFinite(visual.offsetTop) ||
        !Number.isFinite(visual.scale) ||
        visual.scale <= 0)) ||
    Object.values(readings.safeAreaInsets).some(
      (value) => !Number.isFinite(value) || value < 0,
    ) ||
    (readings.motionPreference !== "full" &&
      readings.motionPreference !== "reduced")
  ) {
    throw new RangeError("Invalid browser visual-viewport readings.");
  }

  return {
    viewport: {
      width,
      height,
      devicePixelRatio,
      visualOffsetPx: {
        x: visual?.offsetLeft ?? 0,
        y: visual?.offsetTop ?? 0,
      },
      visualScale: visual?.scale ?? 1,
      coordinateSpace: "visual-viewport-css-pixels",
    },
    visualOffsetPx: {
      x: visual?.offsetLeft ?? 0,
      y: visual?.offsetTop ?? 0,
    },
    visualScale: visual?.scale ?? 1,
    safeAreaInsets: readings.safeAreaInsets,
    motionPreference: readings.motionPreference,
  };
}

export class BrowserViewportBridge {
  readonly #listeners = new Set<(snapshot: BrowserViewportSnapshot) => void>();
  #safeAreaProbe: HTMLElement | null = null;
  #motionQuery: MediaQueryList | null = null;
  #scheduledFrame: number | null = null;

  public snapshot(): BrowserViewportSnapshot {
    if (typeof window === "undefined" || typeof document === "undefined") {
      throw new Error("Browser viewport snapshots require a DOM environment.");
    }

    const visual = window.visualViewport;
    const root = document.documentElement;

    return resolveBrowserViewportSnapshot({
      layoutWidth: root.clientWidth || window.innerWidth,
      layoutHeight: root.clientHeight || window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      visualViewport:
        visual === null || visual === undefined
          ? null
          : {
              width: visual.width,
              height: visual.height,
              offsetLeft: visual.offsetLeft,
              offsetTop: visual.offsetTop,
              scale: visual.scale,
            },
      safeAreaInsets: this.#readSafeAreaInsets(),
      motionPreference: this.#reducedMotionQuery().matches ? "reduced" : "full",
    });
  }

  public subscribe(
    listener: (snapshot: BrowserViewportSnapshot) => void,
  ): () => void {
    this.#listeners.add(listener);
    this.#start();
    listener(this.snapshot());

    return () => {
      this.#listeners.delete(listener);
      if (this.#listeners.size === 0) {
        this.#stop();
      }
    };
  }

  public dispose(): void {
    this.#listeners.clear();
    this.#stop();
    this.#safeAreaProbe?.remove();
    this.#safeAreaProbe = null;
  }

  #readSafeAreaInsets(): SafeAreaInsets {
    if (this.#safeAreaProbe === null) {
      const probe = document.createElement("div");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText = [
        "position:fixed",
        "inset:0 auto auto 0",
        "width:0",
        "height:0",
        "visibility:hidden",
        "pointer-events:none",
        "padding-top:env(safe-area-inset-top, 0px)",
        "padding-right:env(safe-area-inset-right, 0px)",
        "padding-bottom:env(safe-area-inset-bottom, 0px)",
        "padding-left:env(safe-area-inset-left, 0px)",
      ].join(";");
      document.documentElement.append(probe);
      this.#safeAreaProbe = probe;
    }

    const style = window.getComputedStyle(this.#safeAreaProbe);
    const read = (value: string): number => {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    };

    return {
      top: read(style.paddingTop),
      right: read(style.paddingRight),
      bottom: read(style.paddingBottom),
      left: read(style.paddingLeft),
    };
  }

  #reducedMotionQuery(): MediaQueryList {
    this.#motionQuery ??= window.matchMedia("(prefers-reduced-motion: reduce)");
    return this.#motionQuery;
  }

  #start(): void {
    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("resize", this.#schedule);
    window.addEventListener("orientationchange", this.#schedule);
    window.visualViewport?.addEventListener("resize", this.#schedule);
    window.visualViewport?.addEventListener("scroll", this.#schedule);
    this.#reducedMotionQuery().addEventListener("change", this.#schedule);
  }

  #stop(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.#schedule);
      window.removeEventListener("orientationchange", this.#schedule);
      window.visualViewport?.removeEventListener("resize", this.#schedule);
      window.visualViewport?.removeEventListener("scroll", this.#schedule);
      this.#motionQuery?.removeEventListener("change", this.#schedule);

      if (this.#scheduledFrame !== null) {
        window.cancelAnimationFrame(this.#scheduledFrame);
      }
    }

    this.#scheduledFrame = null;
  }

  readonly #schedule = (): void => {
    if (typeof window === "undefined" || this.#scheduledFrame !== null) {
      return;
    }

    this.#scheduledFrame = window.requestAnimationFrame(() => {
      this.#scheduledFrame = null;
      const snapshot = this.snapshot();
      for (const listener of this.#listeners) {
        listener(snapshot);
      }
    });
  };
}
