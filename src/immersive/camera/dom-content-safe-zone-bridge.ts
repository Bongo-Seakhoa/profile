import { intersectRects, isValidRect, unionRects } from "./math";
import type { ActiveContentRegion, Rect } from "./types";

export interface ContentSafeZoneRegistration {
  readonly id: string;
  readonly element: Element;
  readonly clearancePx: number;
  readonly priority: number;
  readonly isActive: () => boolean;
  readonly isAnimationActive?: () => boolean;
  /** Conservative layout-viewport CSS bounds for the complete transition. */
  readonly getAnimationSweepRect?: () => Rect | null;
}

export type UnregisterContentSafeZone = () => void;

export class ContentSafeZoneContractError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ContentSafeZoneContractError";
  }
}

function toRect(domRect: DOMRectReadOnly): Rect {
  return {
    left: domRect.left,
    top: domRect.top,
    right: domRect.right,
    bottom: domRect.bottom,
  };
}

export interface VisualViewportRect {
  readonly width: number;
  readonly height: number;
  readonly offsetLeft: number;
  readonly offsetTop: number;
}

export function normalizeRectToVisualViewport(
  rect: Rect,
  viewport: VisualViewportRect,
): Rect {
  if (
    !isValidRect(rect) ||
    !Number.isFinite(viewport.width) ||
    viewport.width <= 0 ||
    !Number.isFinite(viewport.height) ||
    viewport.height <= 0 ||
    !Number.isFinite(viewport.offsetLeft) ||
    !Number.isFinite(viewport.offsetTop)
  ) {
    throw new ContentSafeZoneContractError(
      "Content rectangles require a finite visual-viewport CSS coordinate contract.",
    );
  }

  return {
    left: rect.left - viewport.offsetLeft,
    top: rect.top - viewport.offsetTop,
    right: rect.right - viewport.offsetLeft,
    bottom: rect.bottom - viewport.offsetTop,
  };
}

export interface ContentSweepResolutionInput {
  readonly id: string;
  readonly currentRect: Rect;
  readonly previousRect: Rect | null;
  readonly conservativeSweepRect: Rect | null;
  readonly animationActive: boolean;
}

export function resolveContentSweepRect(
  input: ContentSweepResolutionInput,
): Rect {
  if (
    input.id.trim().length === 0 ||
    !isValidRect(input.currentRect) ||
    (input.previousRect !== null && !isValidRect(input.previousRect)) ||
    (input.conservativeSweepRect !== null &&
      !isValidRect(input.conservativeSweepRect))
  ) {
    throw new ContentSafeZoneContractError(
      `Content region "${input.id}" supplied an invalid current, previous or sweep rectangle.`,
    );
  }

  if (input.animationActive && input.conservativeSweepRect === null) {
    throw new ContentSafeZoneContractError(
      `Moving content region "${input.id}" requires a conservative transition sweep rectangle.`,
    );
  }

  let swept = input.currentRect;
  if (input.previousRect !== null) {
    swept = unionRects(swept, input.previousRect);
  }
  if (input.conservativeSweepRect !== null) {
    swept = unionRects(swept, input.conservativeSweepRect);
  }
  return swept;
}

export class DomContentSafeZoneBridge {
  readonly #registrations = new Map<string, ContentSafeZoneRegistration>();
  readonly #listeners = new Set<
    (regions: readonly ActiveContentRegion[]) => void
  >();
  readonly #previousRects = new Map<string, Rect>();
  readonly #activeMotionCounts = new Map<string, number>();
  #resizeObserver: ResizeObserver | null = null;
  #mutationObserver: MutationObserver | null = null;
  #scheduledFrame: number | null = null;

  public register(
    registration: ContentSafeZoneRegistration,
  ): UnregisterContentSafeZone {
    if (
      registration.id.trim().length === 0 ||
      !Number.isFinite(registration.clearancePx) ||
      registration.clearancePx < 0 ||
      !Number.isFinite(registration.priority) ||
      this.#registrations.has(registration.id)
    ) {
      throw new ContentSafeZoneContractError(
        `Content safe-zone registration "${registration.id}" is invalid or already exists.`,
      );
    }

    this.#registrations.set(registration.id, registration);
    this.#resizeObserver?.observe(registration.element);
    this.#schedule();

    return () => {
      const current = this.#registrations.get(registration.id);
      if (current !== registration) {
        return;
      }

      this.#resizeObserver?.unobserve(registration.element);
      this.#registrations.delete(registration.id);
      this.#previousRects.delete(registration.id);
      this.#activeMotionCounts.delete(registration.id);
      this.#schedule();
    };
  }

  public invalidate(): void {
    this.#schedule();
  }

  public snapshot(): readonly ActiveContentRegion[] {
    if (typeof window === "undefined") {
      return [];
    }

    const viewport: VisualViewportRect = {
      width:
        window.visualViewport?.width ??
        window.document.documentElement.clientWidth,
      height:
        window.visualViewport?.height ??
        window.document.documentElement.clientHeight,
      offsetLeft: window.visualViewport?.offsetLeft ?? 0,
      offsetTop: window.visualViewport?.offsetTop ?? 0,
    };

    return [...this.#registrations.values()]
      .filter((registration) => {
        return (
          registration.element.isConnected &&
          registration.isActive() &&
          registration.element.getClientRects().length > 0
        );
      })
      .map((registration): ActiveContentRegion | null => {
        const raw = toRect(registration.element.getBoundingClientRect());
        const previous = this.#previousRects.get(registration.id) ?? null;
        const planned = registration.getAnimationSweepRect?.() ?? null;
        const swept = resolveContentSweepRect({
          id: registration.id,
          currentRect: raw,
          previousRect: previous,
          conservativeSweepRect: planned,
          animationActive: this.#isAnimationActive(registration),
        });
        this.#previousRects.set(registration.id, raw);
        const rect = intersectRects(
          normalizeRectToVisualViewport(swept, viewport),
          {
            left: 0,
            top: 0,
            right: viewport.width,
            bottom: viewport.height,
          },
        );

        if (rect === null) {
          return null;
        }

        return {
          id: registration.id,
          rect,
          coordinateSpace: "visual-viewport-css-pixels",
          clearancePx: Math.max(registration.clearancePx, 0),
          priority: registration.priority,
        };
      })
      .filter((region): region is ActiveContentRegion => region !== null)
      .sort((first, second) => second.priority - first.priority);
  }

  public subscribe(
    listener: (regions: readonly ActiveContentRegion[]) => void,
  ): () => void {
    this.#listeners.add(listener);
    this.#startObservers();
    listener(this.snapshot());

    return () => {
      this.#listeners.delete(listener);
      if (this.#listeners.size === 0) {
        this.#stopObservers();
      }
    };
  }

  public dispose(): void {
    this.#listeners.clear();
    this.#registrations.clear();
    this.#previousRects.clear();
    this.#activeMotionCounts.clear();
    this.#stopObservers();
  }

  #startObservers(): void {
    if (
      typeof window === "undefined" ||
      this.#resizeObserver !== null ||
      this.#mutationObserver !== null
    ) {
      return;
    }

    this.#resizeObserver = new ResizeObserver(() => this.#schedule());
    for (const registration of this.#registrations.values()) {
      this.#resizeObserver.observe(registration.element);
    }

    this.#mutationObserver = new MutationObserver(() => this.#schedule());
    this.#mutationObserver.observe(window.document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: [
        "aria-expanded",
        "aria-hidden",
        "class",
        "hidden",
        "open",
        "style",
      ],
    });
    window.addEventListener("resize", this.#schedule);
    window.document.addEventListener(
      "animationstart",
      this.#handleMotionStart,
      true,
    );
    window.document.addEventListener(
      "animationend",
      this.#handleMotionEnd,
      true,
    );
    window.document.addEventListener(
      "animationcancel",
      this.#handleMotionEnd,
      true,
    );
    window.document.addEventListener(
      "transitionrun",
      this.#handleMotionStart,
      true,
    );
    window.document.addEventListener(
      "transitionend",
      this.#handleMotionEnd,
      true,
    );
    window.document.addEventListener(
      "transitioncancel",
      this.#handleMotionEnd,
      true,
    );
    window.visualViewport?.addEventListener("resize", this.#schedule);
    window.visualViewport?.addEventListener("scroll", this.#schedule);
  }

  #stopObservers(): void {
    this.#resizeObserver?.disconnect();
    this.#mutationObserver?.disconnect();
    this.#resizeObserver = null;
    this.#mutationObserver = null;

    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.#schedule);
      window.document.removeEventListener(
        "animationstart",
        this.#handleMotionStart,
        true,
      );
      window.document.removeEventListener(
        "animationend",
        this.#handleMotionEnd,
        true,
      );
      window.document.removeEventListener(
        "animationcancel",
        this.#handleMotionEnd,
        true,
      );
      window.document.removeEventListener(
        "transitionrun",
        this.#handleMotionStart,
        true,
      );
      window.document.removeEventListener(
        "transitionend",
        this.#handleMotionEnd,
        true,
      );
      window.document.removeEventListener(
        "transitioncancel",
        this.#handleMotionEnd,
        true,
      );
      window.visualViewport?.removeEventListener("resize", this.#schedule);
      window.visualViewport?.removeEventListener("scroll", this.#schedule);
      if (this.#scheduledFrame !== null) {
        window.cancelAnimationFrame(this.#scheduledFrame);
      }
    }

    this.#scheduledFrame = null;
    this.#activeMotionCounts.clear();
  }

  readonly #handleMotionStart = (event: Event): void => {
    this.#updateMotionCounts(event.target, 1);
    this.#schedule();
  };

  readonly #handleMotionEnd = (event: Event): void => {
    this.#updateMotionCounts(event.target, -1);
    this.#schedule();
  };

  #updateMotionCounts(target: EventTarget | null, delta: -1 | 1): void {
    if (!(target instanceof Element)) {
      return;
    }

    for (const registration of this.#registrations.values()) {
      if (
        registration.element !== target &&
        !registration.element.contains(target)
      ) {
        continue;
      }

      const next = Math.max(
        0,
        (this.#activeMotionCounts.get(registration.id) ?? 0) + delta,
      );
      if (next === 0) {
        this.#activeMotionCounts.delete(registration.id);
      } else {
        this.#activeMotionCounts.set(registration.id, next);
      }
    }
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
      if (
        [...this.#registrations.values()].some((registration) =>
          this.#isAnimationActive(registration),
        )
      ) {
        this.#schedule();
      }
    });
  };

  #isAnimationActive(registration: ContentSafeZoneRegistration): boolean {
    const declared = registration.isAnimationActive?.() ?? false;
    const eventTracked =
      (this.#activeMotionCounts.get(registration.id) ?? 0) > 0;
    const browserAnimations =
      typeof registration.element.getAnimations === "function"
        ? registration.element
            .getAnimations({ subtree: true })
            .some(
              (animation) =>
                animation.playState === "running" || animation.pending,
            )
        : false;
    return declared || eventTracked || browserAnimations;
  }
}
