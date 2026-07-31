import { intersectRects, unionRects } from "./math";
import type { ActiveContentRegion, Rect } from "./types";

export interface ContentSafeZoneRegistration {
  readonly id: string;
  readonly element: Element;
  readonly clearancePx: number;
  readonly priority: number;
  readonly isActive: () => boolean;
  readonly getAnimationSweepRect?: () => Rect | null;
}

export type UnregisterContentSafeZone = () => void;

function toRect(domRect: DOMRectReadOnly): Rect {
  return {
    left: domRect.left,
    top: domRect.top,
    right: domRect.right,
    bottom: domRect.bottom,
  };
}

export class DomContentSafeZoneBridge {
  readonly #registrations = new Map<string, ContentSafeZoneRegistration>();
  readonly #listeners = new Set<
    (regions: readonly ActiveContentRegion[]) => void
  >();
  readonly #previousRects = new Map<string, Rect>();
  #resizeObserver: ResizeObserver | null = null;
  #mutationObserver: MutationObserver | null = null;
  #scheduledFrame: number | null = null;

  public register(
    registration: ContentSafeZoneRegistration,
  ): UnregisterContentSafeZone {
    if (this.#registrations.has(registration.id)) {
      throw new Error(
        `Content safe-zone registration "${registration.id}" already exists.`,
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
      this.#schedule();
    };
  }

  public snapshot(): readonly ActiveContentRegion[] {
    if (typeof window === "undefined") {
      return [];
    }

    const viewportLeft = window.visualViewport?.offsetLeft ?? 0;
    const viewportTop = window.visualViewport?.offsetTop ?? 0;
    const viewportRight =
      viewportLeft +
      (window.visualViewport?.width ??
        window.document.documentElement.clientWidth);
    const viewportBottom =
      viewportTop +
      (window.visualViewport?.height ??
        window.document.documentElement.clientHeight);

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
        const previous = this.#previousRects.get(registration.id);
        const planned = registration.getAnimationSweepRect?.() ?? null;
        const swept =
          planned === null
            ? previous === undefined
              ? raw
              : unionRects(previous, raw)
            : previous === undefined
              ? unionRects(raw, planned)
              : unionRects(unionRects(previous, raw), planned);
        this.#previousRects.set(registration.id, raw);
        const rect = intersectRects(swept, {
          left: viewportLeft,
          top: viewportTop,
          right: viewportRight,
          bottom: viewportBottom,
        });

        if (rect === null) {
          return null;
        }

        return {
          id: registration.id,
          rect,
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
      window.visualViewport?.removeEventListener("resize", this.#schedule);
      window.visualViewport?.removeEventListener("scroll", this.#schedule);
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
