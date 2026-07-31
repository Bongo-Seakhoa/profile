import type { Bounds3, Rect, Vec2, Vec3 } from "./types";

export const EPSILON = 1e-6;

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

export function lerpVec2(start: Vec2, end: Vec2, amount: number): Vec2 {
  return {
    x: lerp(start.x, end.x, amount),
    y: lerp(start.y, end.y, amount),
  };
}

export function rectWidth(rect: Rect): number {
  return rect.right - rect.left;
}

export function rectHeight(rect: Rect): number {
  return rect.bottom - rect.top;
}

export function rectArea(rect: Rect): number {
  return Math.max(0, rectWidth(rect)) * Math.max(0, rectHeight(rect));
}

export function isValidRect(rect: Rect): boolean {
  return (
    Number.isFinite(rect.left) &&
    Number.isFinite(rect.top) &&
    Number.isFinite(rect.right) &&
    Number.isFinite(rect.bottom) &&
    rect.right - rect.left > EPSILON &&
    rect.bottom - rect.top > EPSILON
  );
}

export function insetRect(
  rect: Rect,
  insets: { top: number; right: number; bottom: number; left: number },
): Rect {
  return {
    left: rect.left + insets.left,
    top: rect.top + insets.top,
    right: rect.right - insets.right,
    bottom: rect.bottom - insets.bottom,
  };
}

export function expandRect(rect: Rect, amount: number): Rect {
  return {
    left: rect.left - amount,
    top: rect.top - amount,
    right: rect.right + amount,
    bottom: rect.bottom + amount,
  };
}

export function intersectRects(first: Rect, second: Rect): Rect | null {
  const result: Rect = {
    left: Math.max(first.left, second.left),
    top: Math.max(first.top, second.top),
    right: Math.min(first.right, second.right),
    bottom: Math.min(first.bottom, second.bottom),
  };

  return isValidRect(result) ? result : null;
}

export function unionRects(first: Rect, second: Rect): Rect {
  return {
    left: Math.min(first.left, second.left),
    top: Math.min(first.top, second.top),
    right: Math.max(first.right, second.right),
    bottom: Math.max(first.bottom, second.bottom),
  };
}

export function rectsOverlap(first: Rect, second: Rect): boolean {
  return !(
    first.right <= second.left ||
    first.left >= second.right ||
    first.bottom <= second.top ||
    first.top >= second.bottom
  );
}

export function containsRect(outer: Rect, inner: Rect, epsilonPx = 0): boolean {
  return (
    inner.left >= outer.left + epsilonPx &&
    inner.top >= outer.top + epsilonPx &&
    inner.right <= outer.right - epsilonPx &&
    inner.bottom <= outer.bottom - epsilonPx
  );
}

export function minimumRectMargin(outer: Rect, inner: Rect): number {
  return Math.min(
    inner.left - outer.left,
    inner.top - outer.top,
    outer.right - inner.right,
    outer.bottom - inner.bottom,
  );
}

export function rectCenter(rect: Rect): Vec2 {
  return {
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2,
  };
}

export function clampPointToRect(point: Vec2, rect: Rect): Vec2 {
  return {
    x: clamp(point.x, rect.left, rect.right),
    y: clamp(point.y, rect.top, rect.bottom),
  };
}

export function unionBounds(first: Bounds3, second: Bounds3): Bounds3 {
  return {
    min: {
      x: Math.min(first.min.x, second.min.x),
      y: Math.min(first.min.y, second.min.y),
      z: Math.min(first.min.z, second.min.z),
    },
    max: {
      x: Math.max(first.max.x, second.max.x),
      y: Math.max(first.max.y, second.max.y),
      z: Math.max(first.max.z, second.max.z),
    },
  };
}

export function expandBounds(bounds: Bounds3, padding: Vec3): Bounds3 {
  return {
    min: {
      x: bounds.min.x - padding.x,
      y: bounds.min.y - padding.y,
      z: bounds.min.z - padding.z,
    },
    max: {
      x: bounds.max.x + padding.x,
      y: bounds.max.y + padding.y,
      z: bounds.max.z + padding.z,
    },
  };
}

export function isValidBounds(bounds: Bounds3): boolean {
  return (
    Number.isFinite(bounds.min.x) &&
    Number.isFinite(bounds.min.y) &&
    Number.isFinite(bounds.min.z) &&
    Number.isFinite(bounds.max.x) &&
    Number.isFinite(bounds.max.y) &&
    Number.isFinite(bounds.max.z) &&
    bounds.max.x >= bounds.min.x &&
    bounds.max.y >= bounds.min.y &&
    bounds.max.z >= bounds.min.z
  );
}

export function exponentialResponse(
  deltaMs: number,
  halfLifeMs: number,
): number {
  if (deltaMs <= 0) {
    return 0;
  }

  return 1 - Math.pow(0.5, deltaMs / halfLifeMs);
}

export function uniqueSorted(values: readonly number[]): number[] {
  return [...new Set(values.filter(Number.isFinite))].sort((a, b) => a - b);
}
