import { createHash } from "node:crypto";
import type { Dirent, Stats } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateCharacterProductionAsset,
  type CharacterProductionAssetMetadata,
} from "../src/immersive/characters/production-asset-gate";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = resolve(repositoryRoot, "public");
const defaultCharacterRoot = resolve(
  publicRoot,
  "assets",
  "immersive",
  "characters",
);

interface ValidationFailure {
  readonly path: string;
  readonly message: string;
}

async function tryStat(path: string): Promise<Stats | undefined> {
  try {
    return await stat(path);
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return undefined;
    }
    throw error;
  }
}

async function collectFiles(root: string): Promise<string[]> {
  const rootStats = await tryStat(root);
  if (rootStats === undefined) return [];
  if (rootStats.isFile()) return [root];

  const files: string[] = [];
  const entries: Dirent[] = await readdir(root, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function publicPathForUri(uri: string): string {
  const target = resolve(publicRoot, ...uri.split("/"));
  const relativeTarget = relative(publicRoot, target);
  if (
    relativeTarget === ".." ||
    relativeTarget.startsWith(`..${sep}`) ||
    resolve(target) === publicRoot
  ) {
    throw new Error(`Public asset URI escapes the public directory: ${uri}`);
  }
  return target;
}

async function sha256(path: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

async function verifyFileRecord(
  uri: string,
  expectedBytes: number,
  expectedSha256: string,
  manifestPath: string,
  failures: ValidationFailure[],
): Promise<string | undefined> {
  let path: string;
  try {
    path = publicPathForUri(uri);
  } catch (error) {
    failures.push({
      path: manifestPath,
      message: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }

  const fileStats = await tryStat(path);
  if (fileStats === undefined || !fileStats.isFile()) {
    failures.push({
      path: manifestPath,
      message: `Declared public asset is missing: ${uri}`,
    });
    return undefined;
  }

  if (fileStats.size !== expectedBytes) {
    failures.push({
      path: manifestPath,
      message: `${uri} byte length is ${fileStats.size}; manifest declares ${expectedBytes}.`,
    });
  }

  const digest = await sha256(path);
  if (digest !== expectedSha256) {
    failures.push({
      path: manifestPath,
      message: `${uri} SHA-256 does not match its manifest.`,
    });
  }

  return path;
}

async function verifyManifestFiles(
  metadata: CharacterProductionAssetMetadata,
  manifestPath: string,
  failures: ValidationFailure[],
): Promise<string | undefined> {
  const primaryPath = await verifyFileRecord(
    metadata.file.uri,
    metadata.file.byteLength,
    metadata.file.sha256,
    manifestPath,
    failures,
  );

  for (const resource of metadata.file.resources) {
    await verifyFileRecord(
      resource.uri,
      resource.byteLength,
      resource.sha256,
      manifestPath,
      failures,
    );
  }

  return primaryPath;
}

async function validateManifest(
  manifestPath: string,
  failures: ValidationFailure[],
): Promise<CharacterProductionAssetMetadata | undefined> {
  let input: unknown;
  try {
    input = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
  } catch (error) {
    failures.push({
      path: manifestPath,
      message: `Manifest is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    return undefined;
  }

  const result = validateCharacterProductionAsset(input);
  if (!result.ok) {
    for (const issue of result.issues) {
      failures.push({
        path: manifestPath,
        message: `[${issue.code}] ${issue.path}: ${issue.message}`,
      });
    }
    return undefined;
  }
  return result.metadata;
}

async function main(): Promise<void> {
  const explicitManifestPaths = process.argv
    .slice(2)
    .map((path) => resolve(process.cwd(), path));
  const defaultFiles =
    explicitManifestPaths.length === 0
      ? await collectFiles(defaultCharacterRoot)
      : [];
  const manifestPaths =
    explicitManifestPaths.length > 0
      ? explicitManifestPaths
      : defaultFiles.filter((path) => path.endsWith(".asset.json"));
  const exportedAssetPaths = defaultFiles.filter(
    (path) => path.endsWith(".glb") || path.endsWith(".gltf"),
  );

  if (manifestPaths.length === 0 && exportedAssetPaths.length === 0) {
    console.log(
      "Character production asset gate passed: no public character exports detected.",
    );
    return;
  }

  const failures: ValidationFailure[] = [];
  const referencedAssetPaths = new Set<string>();
  const referencedAssetCounts = new Map<string, number>();

  for (const manifestPath of [...manifestPaths].sort()) {
    if (!manifestPath.endsWith(".asset.json")) {
      failures.push({
        path: manifestPath,
        message: "Character export manifests must end in .asset.json.",
      });
      continue;
    }

    const metadata = await validateManifest(manifestPath, failures);
    if (metadata === undefined) continue;

    const primaryPath = await verifyManifestFiles(
      metadata,
      manifestPath,
      failures,
    );
    if (primaryPath !== undefined) {
      referencedAssetPaths.add(primaryPath);
      referencedAssetCounts.set(
        primaryPath,
        (referencedAssetCounts.get(primaryPath) ?? 0) + 1,
      );
    }
  }

  for (const assetPath of exportedAssetPaths) {
    if (!referencedAssetPaths.has(assetPath)) {
      failures.push({
        path: assetPath,
        message:
          "Public glTF/GLB export has no valid production asset manifest.",
      });
    }
  }
  for (const [assetPath, count] of referencedAssetCounts) {
    if (count > 1) {
      failures.push({
        path: assetPath,
        message: `Public character export is referenced by ${count} manifests.`,
      });
    }
  }

  failures.sort((left, right) => {
    const leftKey = `${left.path}\u0000${left.message}`;
    const rightKey = `${right.path}\u0000${right.message}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`${failure.path}: ${failure.message}`);
    }
    console.error(
      `Character production asset gate failed with ${failures.length} issue(s).`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Character production asset gate passed for ${manifestPaths.length} manifest(s).`,
  );
}

await main();
