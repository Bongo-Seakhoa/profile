export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Bounds3 {
  readonly min: Vec3;
  readonly max: Vec3;
}

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
}

export interface SafeAreaInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface ActiveContentRegion {
  readonly id: string;
  readonly rect: Rect;
  readonly clearancePx: number;
  readonly priority: number;
}

export type AnimatedBoundRole =
  | "body"
  | "headwear"
  | "hand"
  | "accessory"
  | "cloth-proxy"
  | "held-object"
  | "power-proxy";

export type AnimatedBoundSamplingMode =
  "post-skinning" | "authored-conservative-proxy" | "lod-union";

export interface AnimatedBoundContribution {
  readonly id: string;
  readonly role: AnimatedBoundRole;
  readonly active: boolean;
  readonly sampleFrameId: number;
  readonly samplingMode: AnimatedBoundSamplingMode;
  readonly bounds: Bounds3 | null;
  readonly predictiveBounds: Bounds3 | null;
  readonly padding: Vec3;
}

export interface ConservativeBoundFallback {
  readonly id: string;
  readonly role: AnimatedBoundRole;
  readonly bounds: Bounds3;
  readonly predictiveBounds: Bounds3;
  readonly padding: Vec3;
}

export interface AllowedVisibilitySuppression {
  readonly effectId: string;
  readonly powerId: string;
  readonly phaseId: string;
  readonly marker: "avatar-visibility-authored-v1";
  readonly maximumDurationMs: number;
}

export type AvatarVisibility =
  | {
      readonly state: "visible";
    }
  | {
      readonly state: "authored-suppressed";
      readonly effectId: string;
      readonly powerId: string;
      readonly phaseId: string;
      readonly marker: "avatar-visibility-authored-v1";
      readonly elapsedMs: number;
      readonly maximumDurationMs: number;
    };

export interface AnimatedBoundsFrame {
  readonly frameId: number;
  readonly stateId: string;
  readonly visibility: AvatarVisibility;
  readonly expectedContributorIds: readonly string[];
  readonly contributions: readonly AnimatedBoundContribution[];
}

export interface AnimatedEnvelope {
  readonly frameId: number;
  readonly stateId: string;
  readonly visibility: AvatarVisibility;
  readonly currentBounds: Bounds3 | null;
  readonly predictiveBounds: Bounds3 | null;
  readonly combinedBounds: Bounds3 | null;
  readonly contributorIds: readonly string[];
  readonly fallbackContributorIds: readonly string[];
}

export type FramingMode =
  | "exploration"
  | "gesture"
  | "look-back"
  | "traversal"
  | "idle-edge-lean"
  | "character-selection";

export type HorizontalPreference = "auto" | "left" | "right" | "center";
export type VerticalPreference = "lower-third" | "middle" | "upper";

export interface CameraCandidate {
  readonly radius: number;
  readonly azimuthRadians: number;
  readonly elevationRadians: number;
  readonly anchorPx: Vec2;
}

export interface ProjectedAvatarBounds extends Rect {
  readonly visible: boolean;
  readonly visiblePixelFraction: number;
}

export interface ProjectionProbe {
  project(
    envelope: AnimatedEnvelope,
    candidate: CameraCandidate,
    viewport: Viewport,
  ): ProjectedAvatarBounds;
}

export interface SafeZoneRequest {
  readonly viewport: Viewport;
  readonly safeAreaInsets: SafeAreaInsets;
  readonly activeContentRegions: readonly ActiveContentRegion[];
  readonly mode: FramingMode;
  readonly horizontalPreference: HorizontalPreference;
  readonly verticalPreference: VerticalPreference;
  readonly estimatedAvatarAspectRatio: number;
  readonly requestedHeightRatio: number | null;
}

export interface SafeZoneResolution {
  readonly viewportRect: Rect;
  readonly containmentRect: Rect;
  readonly animationStageRect: Rect;
  readonly pocketRect: Rect;
  readonly targetAnchorPx: Vec2;
  readonly targetHeightRatio: number;
  readonly maximumHeightRatio: number;
  readonly minimumPreferredHeightRatio: number;
  readonly avatarClearancePx: number;
  readonly side: Exclude<HorizontalPreference, "auto">;
  readonly constrained: boolean;
  readonly avoidedContentRegionIds: readonly string[];
}

export interface FramingControllerInput {
  readonly deltaMs: number;
  readonly mode: FramingMode;
  readonly envelope: AnimatedEnvelope;
  readonly viewport: Viewport;
  readonly safeAreaInsets: SafeAreaInsets;
  readonly activeContentRegions: readonly ActiveContentRegion[];
  readonly horizontalPreference: HorizontalPreference;
  readonly verticalPreference: VerticalPreference;
  readonly currentCamera: CameraCandidate;
  readonly probe: ProjectionProbe;
  readonly estimatedAvatarAspectRatio: number;
  readonly requestedHeightRatio: number | null;
  readonly lookBackBaselineRadius: number | null;
  readonly interactionResumed: boolean;
}

export interface FramingTelemetry {
  readonly frameId: number;
  readonly stateId: string;
  readonly mode: FramingMode;
  readonly viewport: Viewport;
  readonly safeZone: SafeZoneResolution;
  readonly camera: CameraCandidate;
  readonly projectedBounds: ProjectedAvatarBounds | null;
  readonly heightRatio: number | null;
  readonly containmentPass: boolean;
  readonly authoredVisibilitySuppression: boolean;
  readonly fallbackContributorIds: readonly string[];
  readonly reasons: readonly string[];
}

export interface FramingControllerOutput {
  readonly camera: CameraCandidate;
  readonly safeZone: SafeZoneResolution;
  readonly telemetry: FramingTelemetry;
}
