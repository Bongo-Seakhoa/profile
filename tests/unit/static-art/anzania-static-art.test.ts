import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  ANZANIA_DERIVATIVE_FORMATS,
  ANZANIA_DERIVATIVE_WIDTHS,
  ANZANIA_PLATE_IDS,
  ANZANIA_PLATES,
  PUBLISHED_ANZANIA_PLATE_IDS,
  getDerivativeDimensions,
} from "../../../src/data/static-art";

interface RegistryAsset {
  readonly asset_id: string;
  readonly asset_type: string;
  readonly source_filename: string;
  readonly sha256: string;
  readonly width_px: number;
  readonly height_px: number;
  readonly runtime_alias?: string;
}

interface VerifiedRegistry {
  readonly assets: readonly RegistryAsset[];
}

interface ManifestDerivative {
  readonly format: "avif" | "webp" | "jpg";
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly sha256: string;
  readonly path: string;
}

interface ManifestAsset {
  readonly assetId: string;
  readonly runtimeAlias: string;
  readonly derivatives: readonly ManifestDerivative[];
}

interface StaticArtManifest {
  readonly assets: readonly ManifestAsset[];
}

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const registryPath = join(
  repositoryRoot,
  "AI-COLLAB",
  "data",
  "anzania-asset-registry-verified.json",
);
const manifestPath = join(
  repositoryRoot,
  "public",
  "assets",
  "images",
  "anzania",
  "manifest.json",
);
const outputRoot = dirname(manifestPath);

const parseJson = async <Value>(path: string): Promise<Value> =>
  JSON.parse(await readFile(path, "utf8")) as Value;

const listFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );

  return nestedFiles.flat();
};

describe("Anzania static-art catalog", () => {
  it("matches all 16 verified location plates without allowlisting reference-only assets", async () => {
    const registry = await parseJson<VerifiedRegistry>(registryPath);
    const locationRegistry = registry.assets.filter(
      (asset) => asset.asset_type === "location_plate",
    );
    const registryById = new Map(
      locationRegistry.map((asset) => [asset.asset_id, asset]),
    );

    expect(ANZANIA_PLATE_IDS).toHaveLength(16);
    expect(Object.keys(ANZANIA_PLATES)).toEqual([...ANZANIA_PLATE_IDS]);
    expect(locationRegistry).toHaveLength(16);

    for (const id of ANZANIA_PLATE_IDS) {
      const plate = ANZANIA_PLATES[id];
      const registryPlate = registryById.get(id);

      expect(registryPlate, `${id} registry entry`).toBeDefined();
      expect(plate.assetId).toBe(id);
      expect(plate.sourceFilename).toBe(registryPlate?.source_filename);
      expect(plate.sourceSha256).toBe(registryPlate?.sha256);
      expect(plate.sourceWidth).toBe(registryPlate?.width_px);
      expect(plate.sourceHeight).toBe(registryPlate?.height_px);
      expect(plate.runtimeAlias).toBe(registryPlate?.runtime_alias);
      expect(plate.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(plate.alt.length).toBeGreaterThan(20);
      expect(plate.approvedUses.length).toBeGreaterThan(0);
      expect(plate.focalDesktop.xPercent).toBeGreaterThanOrEqual(0);
      expect(plate.focalDesktop.xPercent).toBeLessThanOrEqual(100);
      expect(plate.focalDesktop.yPercent).toBeGreaterThanOrEqual(0);
      expect(plate.focalDesktop.yPercent).toBeLessThanOrEqual(100);
      expect(plate.focalMobile.xPercent).toBeGreaterThanOrEqual(0);
      expect(plate.focalMobile.xPercent).toBeLessThanOrEqual(100);
      expect(plate.focalMobile.yPercent).toBeGreaterThanOrEqual(0);
      expect(plate.focalMobile.yPercent).toBeLessThanOrEqual(100);
    }

    const forbiddenTypes = registry.assets
      .filter((asset) => asset.asset_type !== "location_plate")
      .map((asset) => asset.asset_id);

    expect(
      forbiddenTypes.some((id) =>
        ANZANIA_PLATE_IDS.includes(id as (typeof ANZANIA_PLATE_IDS)[number]),
      ),
    ).toBe(false);
  });

  it("publishes only the three approved launch art moments", () => {
    const publishedFromRecords = ANZANIA_PLATE_IDS.filter(
      (id) => ANZANIA_PLATES[id].publishForStaticView,
    );

    expect(publishedFromRecords).toEqual([...PUBLISHED_ANZANIA_PLATE_IDS]);
    expect(PUBLISHED_ANZANIA_PLATE_IDS).toEqual([
      "threshold-dunes-outer",
      "archive-echoes-outer",
      "oasis-audience-inner",
    ]);
  });

  it("keeps reader-facing art strings concise and free of em dashes", () => {
    for (const id of ANZANIA_PLATE_IDS) {
      const plate = ANZANIA_PLATES[id];
      const readerFacingStrings = [plate.alt, ...plate.approvedUses];

      expect(
        readerFacingStrings.every((value) => !value.includes("\u2014")),
      ).toBe(true);
      expect(plate.alt.length).toBeLessThanOrEqual(160);
    }
  });
});

describe("generated Anzania derivatives", () => {
  it("keeps verified provenance and emits every responsive format and width", async () => {
    const manifest = await parseJson<StaticArtManifest>(manifestPath);

    expect(manifest.assets).toHaveLength(PUBLISHED_ANZANIA_PLATE_IDS.length);

    for (const asset of manifest.assets) {
      const id = asset.assetId as (typeof PUBLISHED_ANZANIA_PLATE_IDS)[number];
      const plate = ANZANIA_PLATES[id];

      expect(PUBLISHED_ANZANIA_PLATE_IDS).toContain(id);
      expect(asset.runtimeAlias).toBe(plate.runtimeAlias);
      expect(asset.derivatives).toHaveLength(
        ANZANIA_DERIVATIVE_WIDTHS.length * ANZANIA_DERIVATIVE_FORMATS.length,
      );

      for (const width of ANZANIA_DERIVATIVE_WIDTHS) {
        for (const format of ANZANIA_DERIVATIVE_FORMATS) {
          const derivative = asset.derivatives.find(
            (candidate) =>
              candidate.width === width && candidate.format === format,
          );
          const expectedDimensions = getDerivativeDimensions(width);

          expect(derivative, `${id} ${width}px ${format}`).toBeDefined();
          expect(derivative?.width).toBe(expectedDimensions.width);
          expect(derivative?.height).toBe(expectedDimensions.height);
          expect(derivative?.width).toBeLessThanOrEqual(plate.sourceWidth);
          expect(derivative?.path).not.toMatch(/\.png$/i);
        }
      }
    }
  });

  it("matches every derivative path and encoded dimension", async () => {
    const manifest = await parseJson<StaticArtManifest>(manifestPath);
    const derivatives = manifest.assets.flatMap((asset) => asset.derivatives);

    await Promise.all(
      derivatives.map(async (derivative) => {
        const path = join(repositoryRoot, "public", derivative.path);
        const buffer = await readFile(path);
        const metadata = await sharp(buffer, { failOn: "error" }).metadata();

        expect(buffer.byteLength, derivative.path).toBe(derivative.bytes);
        expect(
          createHash("sha256").update(buffer).digest("hex"),
          derivative.path,
        ).toBe(derivative.sha256);
        expect(metadata.width, derivative.path).toBe(derivative.width);
        expect(metadata.height, derivative.path).toBe(derivative.height);
        expect(metadata.format, derivative.path).toBe(
          derivative.format === "jpg"
            ? "jpeg"
            : derivative.format === "avif"
              ? "heif"
              : derivative.format,
        );
      }),
    );
  });

  it("contains no PNG masters, reference boards, character sheets or stale files", async () => {
    const manifest = await parseJson<StaticArtManifest>(manifestPath);
    const files = await listFiles(outputRoot);
    const expectedPaths = new Set([
      manifestPath,
      ...manifest.assets.flatMap((asset) =>
        asset.derivatives.map((derivative) =>
          join(repositoryRoot, "public", derivative.path),
        ),
      ),
    ]);

    expect(files.every((path) => expectedPaths.has(path))).toBe(true);
    expect(files.some((path) => extname(path).toLowerCase() === ".png")).toBe(
      false,
    );
    expect(
      files.some((path) =>
        /character|props-board|artefacts-board|world-atlas|zahir/i.test(path),
      ),
    ).toBe(false);
  });

  it("keeps the largest first-viewport AVIF below the hero budget ceiling", async () => {
    const manifest = await parseJson<StaticArtManifest>(manifestPath);
    const hero = manifest.assets.find(
      (asset) => asset.assetId === "threshold-dunes-outer",
    );
    const heroAvif = hero?.derivatives.find(
      (derivative) => derivative.format === "avif" && derivative.width === 1672,
    );

    expect(heroAvif).toBeDefined();
    const heroBuffer = await readFile(
      join(repositoryRoot, "public", heroAvif!.path),
    );
    expect(heroBuffer.byteLength).toBeLessThanOrEqual(450 * 1024);
  });
});
