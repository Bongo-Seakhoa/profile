import {
  clamp,
  expandRect,
  intersectRects,
  isValidRect,
  rectArea,
  rectCenter,
  rectHeight,
  rectsOverlap,
  rectWidth,
  uniqueSorted,
} from "./math";
import type {
  HorizontalPreference,
  Rect,
  SafeZoneRequest,
  SafeZoneResolution,
  Vec2,
} from "./types";

interface SafeZoneProfile {
  readonly targetHeightRatio: number;
  readonly maximumHeightRatio: number;
  readonly minimumPreferredHeightRatio: number;
}

interface PocketCandidate {
  readonly rect: Rect;
  readonly anchor: Vec2;
  readonly side: Exclude<HorizontalPreference, "auto">;
  readonly score: number;
}

const MIN_CONSTRAINED_HEIGHT_RATIO = 0.08;

function profileFor(request: SafeZoneRequest): SafeZoneProfile {
  if (request.mode === "character-selection") {
    return {
      targetHeightRatio: clamp(
        request.requestedHeightRatio ?? 0.45,
        0.35,
        0.55,
      ),
      maximumHeightRatio: 0.55,
      minimumPreferredHeightRatio: 0.35,
    };
  }

  const desktopLike =
    request.viewport.width >= 768 && request.viewport.height >= 540;

  if (desktopLike) {
    return {
      targetHeightRatio: clamp(
        request.requestedHeightRatio ?? 0.18,
        0.08,
        0.24,
      ),
      maximumHeightRatio: 0.24,
      minimumPreferredHeightRatio: 0.14,
    };
  }

  return {
    targetHeightRatio: clamp(request.requestedHeightRatio ?? 0.21, 0.08, 0.24),
    maximumHeightRatio: 0.24,
    minimumPreferredHeightRatio: 0.12,
  };
}

function desiredHorizontalRatio(
  preference: HorizontalPreference,
  obstacles: readonly Rect[],
  viewportWidth: number,
): number {
  if (preference === "left") {
    return 0.23;
  }

  if (preference === "right") {
    return 0.77;
  }

  if (preference === "center") {
    return 0.5;
  }

  if (obstacles.length === 0) {
    return 0.25;
  }

  const weightedCenter =
    obstacles.reduce((sum, obstacle) => {
      return sum + rectCenter(obstacle).x * Math.max(rectArea(obstacle), 1);
    }, 0) /
    obstacles.reduce(
      (sum, obstacle) => sum + Math.max(rectArea(obstacle), 1),
      0,
    );

  return weightedCenter >= viewportWidth / 2 ? 0.22 : 0.78;
}

function sideForAnchor(
  anchor: Vec2,
  viewportWidth: number,
): Exclude<HorizontalPreference, "auto"> {
  if (anchor.x < viewportWidth * 0.4) {
    return "left";
  }

  if (anchor.x > viewportWidth * 0.6) {
    return "right";
  }

  return "center";
}

function enumerateFreeRectangles(
  searchRect: Rect,
  obstacles: readonly Rect[],
  minimumWidth: number,
  minimumHeight: number,
  desiredPoint: Vec2,
  viewportWidth: number,
  viewportHeight: number,
): PocketCandidate[] {
  const xEdges = uniqueSorted([
    searchRect.left,
    searchRect.right,
    ...obstacles.flatMap((obstacle) => [obstacle.left, obstacle.right]),
  ]).filter((value) => value >= searchRect.left && value <= searchRect.right);
  const yEdges = uniqueSorted([
    searchRect.top,
    searchRect.bottom,
    ...obstacles.flatMap((obstacle) => [obstacle.top, obstacle.bottom]),
  ]).filter((value) => value >= searchRect.top && value <= searchRect.bottom);

  const candidates: PocketCandidate[] = [];

  for (let leftIndex = 0; leftIndex < xEdges.length - 1; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < xEdges.length;
      rightIndex += 1
    ) {
      const left = xEdges[leftIndex];
      const right = xEdges[rightIndex];
      if (left === undefined || right === undefined) {
        continue;
      }

      for (let topIndex = 0; topIndex < yEdges.length - 1; topIndex += 1) {
        for (
          let bottomIndex = topIndex + 1;
          bottomIndex < yEdges.length;
          bottomIndex += 1
        ) {
          const top = yEdges[topIndex];
          const bottom = yEdges[bottomIndex];
          if (top === undefined || bottom === undefined) {
            continue;
          }

          const rect: Rect = { left, top, right, bottom };
          if (
            rectWidth(rect) < minimumWidth ||
            rectHeight(rect) < minimumHeight ||
            obstacles.some((obstacle) => rectsOverlap(rect, obstacle))
          ) {
            continue;
          }

          const anchor: Vec2 = {
            x: clamp(
              desiredPoint.x,
              rect.left + minimumWidth / 2,
              rect.right - minimumWidth / 2,
            ),
            y: clamp(
              desiredPoint.y,
              rect.top + minimumHeight / 2,
              rect.bottom - minimumHeight / 2,
            ),
          };
          const distance =
            Math.abs(anchor.x - desiredPoint.x) / viewportWidth +
            Math.abs(anchor.y - desiredPoint.y) / viewportHeight;
          const fit =
            Math.min(
              rectWidth(rect) / minimumWidth,
              rectHeight(rect) / minimumHeight,
            ) - 1;
          const verticalAffinity =
            1 -
            Math.min(
              Math.abs(anchor.y - desiredPoint.y) / (viewportHeight * 0.5),
              1,
            );
          const score =
            Math.min(fit, 4) * 5 +
            verticalAffinity * 4 -
            distance * 9 +
            (rect.bottom >= searchRect.bottom - 0.5 ? 1 : 0);

          candidates.push({
            rect,
            anchor,
            side: sideForAnchor(anchor, viewportWidth),
            score,
          });
        }
      }
    }
  }

  return candidates.sort((first, second) => second.score - first.score);
}

export class ViewportSafeZoneService {
  public resolve(request: SafeZoneRequest): SafeZoneResolution {
    if (
      request.viewport.width <= 0 ||
      request.viewport.height <= 0 ||
      !Number.isFinite(request.viewport.width) ||
      !Number.isFinite(request.viewport.height)
    ) {
      throw new RangeError("Viewport dimensions must be positive and finite.");
    }

    const viewportRect: Rect = {
      left: 0,
      top: 0,
      right: request.viewport.width,
      bottom: request.viewport.height,
    };
    const compact = request.viewport.width < 768;
    const sideMargin = Math.max(
      compact ? 12 : 18,
      request.viewport.width * (compact ? 0.03 : 0.025),
    );
    const topMargin = Math.max(
      compact ? 16 : 24,
      request.viewport.height * (compact ? 0.03 : 0.045),
    );
    const bottomMargin = Math.max(
      compact ? 16 : 20,
      request.viewport.height * 0.035,
    );
    const containmentRect: Rect = {
      left: request.safeAreaInsets.left + sideMargin,
      top: request.safeAreaInsets.top + topMargin,
      right: request.viewport.width - request.safeAreaInsets.right - sideMargin,
      bottom:
        request.viewport.height - request.safeAreaInsets.bottom - bottomMargin,
    };

    if (!isValidRect(containmentRect)) {
      throw new RangeError(
        "Safe-area insets leave no usable camera containment rectangle.",
      );
    }

    const profile = profileFor(request);
    const avatarClearancePx = Math.max(
      compact ? 8 : 12,
      request.viewport.height * 0.012,
    );
    const obstacles = request.activeContentRegions
      .map((region) =>
        intersectRects(
          containmentRect,
          expandRect(region.rect, Math.max(region.clearancePx, 0)),
        ),
      )
      .filter((rect): rect is Rect => rect !== null);
    const desiredXRatio = desiredHorizontalRatio(
      request.horizontalPreference,
      obstacles,
      request.viewport.width,
    );
    const effectiveVerticalPreference =
      request.mode === "traversal"
        ? request.verticalPreference
        : request.mode === "character-selection"
          ? "middle"
          : "lower-third";
    const desiredYRatio =
      effectiveVerticalPreference === "upper"
        ? 0.25
        : effectiveVerticalPreference === "middle"
          ? 0.5
          : 0.76;
    const desiredPoint: Vec2 = {
      x: request.viewport.width * desiredXRatio,
      y: request.viewport.height * desiredYRatio,
    };
    const aspect = clamp(request.estimatedAvatarAspectRatio, 0.2, 2);

    const choose = (
      searchRect: Rect,
      heightRatio: number,
    ): PocketCandidate | null => {
      const minimumHeight =
        request.viewport.height * heightRatio + avatarClearancePx * 2;
      const minimumWidth =
        request.viewport.height * heightRatio * aspect + avatarClearancePx * 2;
      return (
        enumerateFreeRectangles(
          searchRect,
          obstacles,
          minimumWidth,
          minimumHeight,
          desiredPoint,
          request.viewport.width,
          request.viewport.height,
        )[0] ?? null
      );
    };

    const animationStageRect: Rect =
      request.mode === "character-selection" || request.mode === "traversal"
        ? containmentRect
        : {
            ...containmentRect,
            top: Math.max(
              containmentRect.top,
              request.viewport.height * (2 / 3),
            ),
          };

    let candidate = choose(
      animationStageRect,
      Math.max(
        profile.minimumPreferredHeightRatio,
        Math.min(profile.targetHeightRatio, profile.maximumHeightRatio),
      ),
    );
    let constrained = false;

    if (candidate === null) {
      candidate = choose(animationStageRect, MIN_CONSTRAINED_HEIGHT_RATIO);
      constrained = true;
    }

    if (candidate === null) {
      throw new RangeError(
        "Active content leaves no positive full-avatar safe pocket.",
      );
    }

    const avoidedContentRegionIds = request.activeContentRegions
      .filter((region) => {
        const expanded = expandRect(
          region.rect,
          Math.max(region.clearancePx, 0),
        );
        return !rectsOverlap(candidate.rect, expanded);
      })
      .map((region) => region.id);

    return {
      viewportRect,
      containmentRect,
      animationStageRect,
      pocketRect: candidate.rect,
      targetAnchorPx: candidate.anchor,
      targetHeightRatio: profile.targetHeightRatio,
      maximumHeightRatio: profile.maximumHeightRatio,
      minimumPreferredHeightRatio: profile.minimumPreferredHeightRatio,
      avatarClearancePx,
      side: candidate.side,
      constrained,
      avoidedContentRegionIds,
    };
  }
}
