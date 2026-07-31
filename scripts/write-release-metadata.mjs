import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  inspectReleaseSurfaces,
  RELEASE_SURFACES,
  validateImmersiveSurfaceBootstrap,
} from "./release-surfaces.mjs";

const repositoryRoot = process.cwd();
const distDirectory = resolve(repositoryRoot, "dist");
const packagePath = resolve(repositoryRoot, "package.json");
const settingsPath = resolve(
  repositoryRoot,
  "src",
  "data",
  "profile",
  "site-settings.json",
);
const routesPath = resolve(
  repositoryRoot,
  "src",
  "data",
  "profile",
  "routes.json",
);

const packageManifest = JSON.parse(await readFile(packagePath, "utf8"));
const [siteSettings] = JSON.parse(await readFile(settingsPath, "utf8"));
const routes = JSON.parse(await readFile(routesPath, "utf8"));

let gitLocationArguments = [];
try {
  const gitPointer = await readFile(resolve(repositoryRoot, ".git"), "utf8");
  const gitDirectory = gitPointer.match(/^gitdir:\s*(.+)$/m)?.[1]?.trim();
  if (gitDirectory) {
    gitLocationArguments = [
      `--git-dir=${resolve(repositoryRoot, gitDirectory)}`,
      `--work-tree=${repositoryRoot}`,
    ];
  }
} catch {
  // A normal checkout stores .git as a directory and needs no explicit path.
}

function readGitValue(...arguments_) {
  try {
    return execFileSync("git", [...gitLocationArguments, ...arguments_], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const revision =
  process.env.RELEASE_SHA?.trim() || readGitValue("rev-parse", "HEAD");
const releaseRef =
  process.env.RELEASE_REF?.trim() ||
  readGitValue("rev-parse", "--abbrev-ref", "HEAD");
const builtAt =
  process.env.RELEASE_TIMESTAMP?.trim() || new Date().toISOString();
const { graphs, manifests: surfaces } = await inspectReleaseSurfaces({
  distDirectory,
  routes,
  basePath: siteSettings.basePath,
  siteUrl: siteSettings.siteUrl,
});

const missingRequests = Object.entries(graphs).flatMap(([surfaceId, graph]) =>
  graph.missing.map(
    (missing) =>
      `${surfaceId}: ${missing.path} from ${missing.from ?? "the route registry"}`,
  ),
);
const policyViolations = Object.entries(graphs).flatMap(([surfaceId, graph]) =>
  (graph.policyViolations ?? []).map(
    (violation) =>
      `${surfaceId}: ${violation.request} from ${violation.from}: ${violation.reason}`,
  ),
);
if (missingRequests.length > 0 || policyViolations.length > 0) {
  throw new Error(
    `Cannot write release metadata with invalid local requests:\n- ${[...missingRequests, ...policyViolations].join("\n- ")}`,
  );
}
const immersiveBootstrapFailures = await validateImmersiveSurfaceBootstrap({
  graph: graphs[RELEASE_SURFACES.immersiveEntry],
  distDirectory,
  basePath: siteSettings.basePath,
});
if (immersiveBootstrapFailures.length > 0) {
  throw new Error(
    `Cannot write release metadata with an invalid immersive bootstrap:\n- ${immersiveBootstrapFailures.join("\n- ")}`,
  );
}

const metadata = {
  schemaVersion: "2.0.0",
  artifact: "profile-site",
  version: packageManifest.version,
  revision: revision || "unknown",
  ref: releaseRef || "unknown",
  buildId: process.env.RELEASE_BUILD_ID?.trim() || "local",
  builtAt,
  siteUrl: siteSettings.siteUrl,
  basePath: siteSettings.basePath,
  surfaces,
  runtime: {
    node: process.version,
    packageManager: packageManifest.packageManager,
  },
};

await mkdir(distDirectory, { recursive: true });
await writeFile(
  resolve(distDirectory, "version.json"),
  `${JSON.stringify(metadata, null, 2)}\n`,
  "utf8",
);

console.log(
  `Wrote dist/version.json for ${metadata.version} (${metadata.revision.slice(0, 12)}) with separate Static View and immersive surface manifests.`,
);
