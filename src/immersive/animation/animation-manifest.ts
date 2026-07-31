import { z } from "zod";

import type { CompactAnimationFamily } from "./types";

export const REQUIRED_COMPACT_ANIMATION_FAMILIES = [
  "base-idle",
  "weight-shift-idle",
  "garment-adjustment",
  "present-open-hand",
  "point",
  "hourglass-draw",
  "hourglass-inspect",
  "hourglass-stow",
  "short-local-step",
  "edge-lean-enter",
  "edge-lean-hold",
  "edge-lean-exit",
  "sand-recall-recovery",
] as const satisfies readonly CompactAnimationFamily[];

const DURATION_RANGE_MS: Readonly<
  Record<CompactAnimationFamily, readonly [minimum: number, maximum: number]>
> = {
  "base-idle": [8_000, 12_000],
  "weight-shift-idle": [1_500, 2_500],
  "garment-adjustment": [1_500, 2_500],
  "present-open-hand": [650, 1_000],
  point: [800, 1_200],
  "hourglass-draw": [600, 900],
  "hourglass-inspect": [5_000, 8_000],
  "hourglass-stow": [500, 800],
  "short-local-step": [300, 900],
  "edge-lean-enter": [400, 700],
  "edge-lean-hold": [1_000, 8_000],
  "edge-lean-exit": [400, 700],
  "sand-recall-recovery": [450, 800],
};

const LOOP_FAMILIES = new Set<CompactAnimationFamily>([
  "base-idle",
  "hourglass-inspect",
  "edge-lean-hold",
]);

const markerSchema = z
  .object({
    id: z.string().trim().min(1),
    timeMs: z.number().nonnegative(),
    event: z.enum([
      "hourglass-attach-hand",
      "hourglass-attach-belt",
      "hourglass-show",
      "hourglass-hide",
      "recovery-conceal-start",
      "recovery-conceal-end",
    ]),
  })
  .strict();

const clipSchema = z
  .object({
    id: z.string().trim().min(1),
    family: z.enum(REQUIRED_COMPACT_ANIMATION_FAMILIES),
    durationMs: z.number().positive(),
    loop: z.boolean(),
    additiveUpperBody: z.boolean(),
    rootMotion: z.literal("in-place"),
    blendInMs: z.number().min(150).max(250),
    blendOutMs: z.number().min(150).max(250),
    markers: z.array(markerSchema),
  })
  .strict()
  .superRefine((clip, context) => {
    const [minimumDuration, maximumDuration] = DURATION_RANGE_MS[clip.family];
    if (
      clip.durationMs < minimumDuration ||
      clip.durationMs > maximumDuration
    ) {
      context.addIssue({
        code: "custom",
        message: `Clip "${clip.id}" duration must be ${minimumDuration}–${maximumDuration} ms for ${clip.family}.`,
        path: ["durationMs"],
      });
    }

    if (clip.loop !== LOOP_FAMILIES.has(clip.family)) {
      context.addIssue({
        code: "custom",
        message: `Clip "${clip.id}" has the wrong loop policy for ${clip.family}.`,
        path: ["loop"],
      });
    }

    if (
      (clip.family === "present-open-hand" || clip.family === "point") &&
      !clip.additiveUpperBody
    ) {
      context.addIssue({
        code: "custom",
        message: `Gesture "${clip.id}" must be additive upper-body animation.`,
        path: ["additiveUpperBody"],
      });
    }

    const markerIds = new Set<string>();
    for (const marker of clip.markers) {
      if (markerIds.has(marker.id)) {
        context.addIssue({
          code: "custom",
          message: `Clip "${clip.id}" has duplicate marker ID "${marker.id}".`,
          path: ["markers"],
        });
      }
      markerIds.add(marker.id);

      if (marker.timeMs > clip.durationMs) {
        context.addIssue({
          code: "custom",
          message: `Marker "${marker.id}" occurs after clip "${clip.id}" ends.`,
          path: ["markers"],
        });
      }
    }
  });

export const animationManifestSchema = z
  .object({
    version: z.literal(1),
    rigConvention: z.string().trim().min(1),
    clips: z.array(clipSchema),
  })
  .strict()
  .superRefine((manifest, context) => {
    const clipIds = new Set<string>();
    const families = new Set<CompactAnimationFamily>();

    for (const [index, clip] of manifest.clips.entries()) {
      if (clipIds.has(clip.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate animation clip ID "${clip.id}".`,
          path: ["clips", index, "id"],
        });
      }
      clipIds.add(clip.id);
      families.add(clip.family);
    }

    for (const family of REQUIRED_COMPACT_ANIMATION_FAMILIES) {
      if (!families.has(family)) {
        context.addIssue({
          code: "custom",
          message: `Missing required compact animation family "${family}".`,
          path: ["clips"],
        });
      }
    }

    const hourglassDraw = manifest.clips.find(
      (clip) => clip.family === "hourglass-draw",
    );
    if (
      hourglassDraw !== undefined &&
      !hourglassDraw.markers.some(
        (marker) => marker.event === "hourglass-attach-hand",
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Hourglass draw requires a named hand-attachment event marker.",
        path: ["clips"],
      });
    }

    const hourglassStow = manifest.clips.find(
      (clip) => clip.family === "hourglass-stow",
    );
    if (
      hourglassStow !== undefined &&
      !hourglassStow.markers.some(
        (marker) => marker.event === "hourglass-attach-belt",
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Hourglass stow requires a named belt-attachment event marker.",
        path: ["clips"],
      });
    }
  });

export type AnimationManifest = z.infer<typeof animationManifestSchema>;
