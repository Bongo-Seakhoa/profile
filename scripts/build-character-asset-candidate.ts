import { readFile, rename, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildCharacterAssetCandidate } from "./lib/character-production-report-bridge";

interface CommandLineOptions {
  readonly reportPath: string;
  readonly releasePath: string;
  readonly artifactPath: string;
  readonly outputPath: string;
}

function usage(): string {
  return [
    "Usage:",
    "  pnpm exec tsx scripts/build-character-asset-candidate.ts",
    "    --report <private production-report.json>",
    "    --release <public-safe release descriptor.json>",
    "    --artifact <combined self-contained GLB>",
    "    --output <candidate.asset.json>",
  ].join("\n");
}

function parseOptions(argv: readonly string[]): CommandLineOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (
      flag === undefined ||
      value === undefined ||
      !flag.startsWith("--") ||
      value.startsWith("--")
    ) {
      throw new Error(usage());
    }
    values.set(flag, value);
  }

  const reportPath = values.get("--report");
  const releasePath = values.get("--release");
  const artifactPath = values.get("--artifact");
  const outputPath = values.get("--output");
  if (
    reportPath === undefined ||
    releasePath === undefined ||
    artifactPath === undefined ||
    outputPath === undefined ||
    values.size !== 4
  ) {
    throw new Error(usage());
  }
  if (extname(artifactPath).toLowerCase() !== ".glb") {
    throw new Error("Release artifact must use the .glb extension.");
  }
  if (!outputPath.endsWith(".asset.json")) {
    throw new Error("Candidate output must end in .asset.json.");
  }
  return {
    reportPath: resolve(reportPath),
    releasePath: resolve(releasePath),
    artifactPath: resolve(artifactPath),
    outputPath: resolve(outputPath),
  };
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

export async function buildCandidateFromFiles(
  options: CommandLineOptions,
): Promise<void> {
  const [report, release, artifact] = await Promise.all([
    readJson(options.reportPath),
    readJson(options.releasePath),
    readFile(options.artifactPath),
  ]);
  const result = buildCharacterAssetCandidate(report, release, artifact);
  if (!result.ok) {
    const detail = result.issues
      .map((issue) => `[${issue.code}] ${issue.path}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Character candidate was not emitted because the release evidence failed:\n${detail}`,
    );
  }

  const temporaryPath = `${options.outputPath}.tmp`;
  await writeFile(
    temporaryPath,
    `${JSON.stringify(result.metadata, null, 2)}\n`,
    "utf8",
  );
  await rename(temporaryPath, options.outputPath);
  console.log(
    `Wrote production-gated character candidate: ${options.outputPath}`,
  );
}

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  try {
    await buildCandidateFromFiles(parseOptions(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
