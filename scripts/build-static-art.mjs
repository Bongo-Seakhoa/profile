import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  ANZANIA_DERIVATIVE_FORMATS,
  ANZANIA_DERIVATIVE_WIDTHS,
  ANZANIA_PLATE_IDS,
  ANZANIA_PLATES,
  PUBLISHED_ANZANIA_PLATE_IDS,
  getDerivativeDimensions,
  getDerivativePath,
} from "../src/data/static-art/anzania.ts";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REFERENCE_ROOT = resolve(
  process.env.ANZANIA_REFERENCE_ROOT ??
    "C:\\Users\\Bongo\\OneDrive\\Desktop\\Projects\\Profile Upgrade\\Reference & inspiration material",
);
const REGISTRY_PATH = join(
  REPOSITORY_ROOT,
  "AI-COLLAB",
  "data",
  "anzania-asset-registry-verified.json",
);
const OUTPUT_ROOT = join(
  REPOSITORY_ROOT,
  "public",
  "assets",
  "images",
  "anzania",
);
const MANIFEST_PATH = join(OUTPUT_ROOT, "manifest.json");
const HERO_ID = "threshold-dunes-outer";
const HERO_TARGET_MIN_BYTES = 250 * 1024;
const HERO_TARGET_MAX_BYTES = 450 * 1024;

const ensureInside = (parent, candidate) => {
  const pathFromParent = relative(resolve(parent), resolve(candidate));

  if (
    pathFromParent === "" ||
    pathFromParent === ".." ||
    pathFromParent.startsWith(`..${sep}`)
  ) {
    throw new Error(
      `Refusing output path outside its intended parent: ${candidate}`,
    );
  }
};

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const formatMime = (format) =>
  format === "jpg" ? "image/jpeg" : `image/${format}`;

const encodeAtWidth = async (sourcePath, width, format, quality) => {
  const image = sharp(sourcePath, { failOn: "error" }).rotate().resize({
    width,
    fit: "inside",
    withoutEnlargement: true,
    fastShrinkOnLoad: true,
  });

  if (format === "avif") {
    return image
      .avif({
        quality,
        effort: 6,
        chromaSubsampling: "4:4:4",
      })
      .toBuffer();
  }

  if (format === "webp") {
    return image
      .webp({
        quality,
        effort: 6,
        smartSubsample: true,
      })
      .toBuffer();
  }

  return image
    .jpeg({
      quality,
      progressive: true,
      mozjpeg: true,
      chromaSubsampling: "4:4:4",
    })
    .toBuffer();
};

const distanceFromHeroTarget = (size) => {
  if (size < HERO_TARGET_MIN_BYTES) {
    return HERO_TARGET_MIN_BYTES - size;
  }

  if (size > HERO_TARGET_MAX_BYTES) {
    return size - HERO_TARGET_MAX_BYTES;
  }

  return 0;
};

const encodeHeroAvif = async (sourcePath, width) => {
  const candidates = [];

  for (const quality of [80, 85, 90, 95]) {
    const buffer = await encodeAtWidth(sourcePath, width, "avif", quality);
    const candidate = { buffer, quality };
    candidates.push(candidate);

    if (distanceFromHeroTarget(buffer.byteLength) === 0) {
      return candidate;
    }
  }

  return candidates.sort(
    (left, right) =>
      distanceFromHeroTarget(left.buffer.byteLength) -
      distanceFromHeroTarget(right.buffer.byteLength),
  )[0];
};

const getQuality = (format) => {
  if (format === "avif") {
    return 65;
  }

  if (format === "webp") {
    return 80;
  }

  return 82;
};

const listFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolutePath)));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
};

const registry = await readJson(REGISTRY_PATH);
const registryLocationPlates = registry.assets.filter(
  (asset) => asset.asset_type === "location_plate",
);
const registryById = new Map(
  registryLocationPlates.map((asset) => [asset.asset_id, asset]),
);

if (registryLocationPlates.length !== ANZANIA_PLATE_IDS.length) {
  throw new Error(
    `Registry contains ${registryLocationPlates.length} location plates; expected ${ANZANIA_PLATE_IDS.length}.`,
  );
}

for (const id of ANZANIA_PLATE_IDS) {
  const record = ANZANIA_PLATES[id];
  const registryRecord = registryById.get(id);

  if (!registryRecord) {
    throw new Error(
      `Allowlisted plate "${id}" is missing from the verified registry.`,
    );
  }

  const comparisons = [
    ["source filename", record.sourceFilename, registryRecord.source_filename],
    ["source SHA-256", record.sourceSha256, registryRecord.sha256],
    ["source width", record.sourceWidth, registryRecord.width_px],
    ["source height", record.sourceHeight, registryRecord.height_px],
    ["runtime alias", record.runtimeAlias, registryRecord.runtime_alias],
  ];

  for (const [label, actual, expected] of comparisons) {
    if (actual !== expected) {
      throw new Error(
        `${id} ${label} does not match the verified registry (${actual} !== ${expected}).`,
      );
    }
  }
}

const publishedFromRecords = ANZANIA_PLATE_IDS.filter(
  (id) => ANZANIA_PLATES[id].publishForStaticView,
);

if (
  publishedFromRecords.join("\n") !== PUBLISHED_ANZANIA_PLATE_IDS.join("\n")
) {
  throw new Error(
    "The static-view publication flags do not match PUBLISHED_ANZANIA_PLATE_IDS.",
  );
}

ensureInside(join(REPOSITORY_ROOT, "public"), OUTPUT_ROOT);
await mkdir(OUTPUT_ROOT, { recursive: true });

const manifestAssets = [];
const expectedOutputPaths = new Set([MANIFEST_PATH]);

for (const id of PUBLISHED_ANZANIA_PLATE_IDS) {
  const record = ANZANIA_PLATES[id];
  const sourcePath = join(REFERENCE_ROOT, record.sourceFilename);
  const sourceBuffer = await readFile(sourcePath);
  const actualSourceHash = sha256(sourceBuffer);

  if (actualSourceHash !== record.sourceSha256) {
    throw new Error(
      `${id} source hash mismatch. Expected ${record.sourceSha256}, received ${actualSourceHash}.`,
    );
  }

  const sourceMetadata = await sharp(sourceBuffer, {
    failOn: "error",
  }).metadata();

  if (
    sourceMetadata.width !== record.sourceWidth ||
    sourceMetadata.height !== record.sourceHeight
  ) {
    throw new Error(
      `${id} source dimensions mismatch. Expected ${record.sourceWidth}×${record.sourceHeight}, received ${sourceMetadata.width}×${sourceMetadata.height}.`,
    );
  }

  const derivatives = [];

  for (const width of ANZANIA_DERIVATIVE_WIDTHS) {
    if (width > record.sourceWidth) {
      throw new Error(
        `${id} derivative width ${width}px would upscale its master.`,
      );
    }

    for (const format of ANZANIA_DERIVATIVE_FORMATS) {
      const isTargetHeroAvif =
        id === HERO_ID && width === record.sourceWidth && format === "avif";
      const encoded = isTargetHeroAvif
        ? await encodeHeroAvif(sourcePath, width)
        : {
            buffer: await encodeAtWidth(
              sourcePath,
              width,
              format,
              getQuality(format),
            ),
            quality: getQuality(format),
          };
      const outputRelativePath = getDerivativePath(record, width, format);
      const outputPath = join(REPOSITORY_ROOT, "public", outputRelativePath);
      ensureInside(OUTPUT_ROOT, outputPath);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, encoded.buffer);
      expectedOutputPaths.add(outputPath);

      const outputMetadata = await sharp(encoded.buffer, {
        failOn: "error",
      }).metadata();
      const expectedDimensions = getDerivativeDimensions(width);

      if (
        outputMetadata.width !== expectedDimensions.width ||
        outputMetadata.height !== expectedDimensions.height
      ) {
        throw new Error(
          `${basename(outputPath)} has unexpected dimensions ${outputMetadata.width}×${outputMetadata.height}.`,
        );
      }

      derivatives.push({
        format,
        mimeType: formatMime(format),
        width: outputMetadata.width,
        height: outputMetadata.height,
        quality: encoded.quality,
        bytes: encoded.buffer.byteLength,
        sha256: sha256(encoded.buffer),
        path: outputRelativePath.replaceAll("\\", "/"),
      });
    }
  }

  manifestAssets.push({
    assetId: record.assetId,
    runtimeAlias: record.runtimeAlias,
    sceneId: record.sceneId,
    role: record.role,
    source: {
      sha256: record.sourceSha256,
      width: record.sourceWidth,
      height: record.sourceHeight,
      bytes: sourceBuffer.byteLength,
    },
    focalDesktop: record.focalDesktop,
    focalMobile: record.focalMobile,
    alt: record.alt,
    defaultPresentation: record.defaultPresentation,
    approvedUses: record.approvedUses,
    derivatives,
  });
}

const manifest = {
  schemaVersion: 1,
  collection: "Anzania static-view location plates",
  assets: manifestAssets.map((asset) => ({
    assetId: asset.assetId,
    runtimeAlias: asset.runtimeAlias,
    sceneId: asset.sceneId,
    role: asset.role,
    focalDesktop: asset.focalDesktop,
    focalMobile: asset.focalMobile,
    alt: asset.alt,
    derivatives: asset.derivatives.map((derivative) => ({
      format: derivative.format,
      mimeType: derivative.mimeType,
      width: derivative.width,
      height: derivative.height,
      path: derivative.path,
    })),
  })),
};

await writeFile(
  MANIFEST_PATH,
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

const unexpectedFiles = (await listFiles(OUTPUT_ROOT)).filter(
  (path) => !expectedOutputPaths.has(path),
);

if (unexpectedFiles.length > 0) {
  throw new Error(
    `Unexpected files exist in the Anzania public output. Remove or review them before release:\n${unexpectedFiles
      .map((path) => `- ${relative(REPOSITORY_ROOT, path)}`)
      .join("\n")}`,
  );
}

const heroManifest = manifestAssets
  .find((asset) => asset.assetId === HERO_ID)
  ?.derivatives.find(
    (derivative) =>
      derivative.format === "avif" &&
      derivative.width === ANZANIA_PLATES[HERO_ID].sourceWidth,
  );

if (!heroManifest) {
  throw new Error("The responsive hero AVIF was not generated.");
}

const heroTargetNote =
  distanceFromHeroTarget(heroManifest.bytes) === 0
    ? "within the 250–450 KB target"
    : "closest practical encoding to the 250–450 KB target";

const report = {
  publishedAssets: manifestAssets.length,
  derivatives: manifestAssets.reduce(
    (total, asset) => total + asset.derivatives.length,
    0,
  ),
  totalBytes: manifestAssets.reduce(
    (total, asset) =>
      total +
      asset.derivatives.reduce(
        (assetTotal, derivative) => assetTotal + derivative.bytes,
        0,
      ),
    0,
  ),
  heroAvifBytes: heroManifest.bytes,
  heroTargetNote,
  manifest: relative(REPOSITORY_ROOT, MANIFEST_PATH),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
