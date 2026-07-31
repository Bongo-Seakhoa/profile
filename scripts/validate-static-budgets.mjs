import { gzipSync } from "node:zlib";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import {
  classifyReleaseFiles,
  inspectReleaseSurfaces,
  RELEASE_SURFACES,
  validateImmersiveSurfaceBootstrap,
} from "./release-surfaces.mjs";
import {
  RELEASE_BUDGET_LIMITS,
  RELEASE_SCOPE_RESERVES,
  REQUIRED_COMPLETE_SCOPE_BYTES,
} from "./release-budget-policy.mjs";

const repositoryRoot = process.cwd();
const distDirectory = resolve(repositoryRoot, "dist");
const reportPath = resolve(
  repositoryRoot,
  "AI-COLLAB",
  ".watch-state",
  "static-budget.json",
);

const limits = RELEASE_BUDGET_LIMITS;
if (REQUIRED_COMPLETE_SCOPE_BYTES > limits.maximumWholeRelease) {
  throw new Error(
    "The declared complete immersive scope cannot fit inside the whole-release ceiling",
  );
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

const files = await walk(distDirectory);
const failures = [];
const routes = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "src", "data", "profile", "routes.json"),
    "utf8",
  ),
);
const [siteSettings] = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "src", "data", "profile", "site-settings.json"),
    "utf8",
  ),
);
const documentPlans = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "src", "data", "profile", "document-manifest.json"),
    "utf8",
  ),
);
const { graphs, manifests } = await inspectReleaseSurfaces({
  distDirectory,
  routes,
  basePath: siteSettings.basePath,
  siteUrl: siteSettings.siteUrl,
});
const staticGraph = graphs[RELEASE_SURFACES.staticView];
const immersiveGraph = graphs[RELEASE_SURFACES.immersiveEntry];
const releaseFiles = files.map((path) =>
  relative(distDirectory, path).replaceAll("\\", "/"),
);
const releaseClassification = classifyReleaseFiles(
  releaseFiles,
  staticGraph,
  immersiveGraph,
);
const expectedRouteCount = staticGraph.entryPaths.length;
const expectedPdfCount = documentPlans.reduce(
  (count, plan) => count + plan.variants.length,
  0,
);
const relativePath = (path) =>
  relative(distDirectory, path).replaceAll("\\", "/");
const byExtension = (extension, candidates = files) =>
  candidates.filter((path) => extname(path).toLowerCase() === extension);
const staticReleaseFiles = releaseClassification.staticRelease.map((path) =>
  resolve(distDirectory, path),
);

for (const [surfaceId, graph] of Object.entries(graphs)) {
  for (const missing of graph.missing) {
    failures.push(
      `${surfaceId} request graph is missing ${missing.path} referenced by ${missing.from ?? "its route registry"}`,
    );
  }
  for (const violation of graph.policyViolations ?? []) {
    failures.push(
      `${surfaceId} request graph rejects ${violation.request} from ${violation.from}: ${violation.reason}`,
    );
  }
}
for (const failure of await validateImmersiveSurfaceBootstrap({
  graph: immersiveGraph,
  distDirectory,
  basePath: siteSettings.basePath,
})) {
  failures.push(`immersive-entry bootstrap: ${failure}`);
}

const html = [];
for (const path of byExtension(".html", staticReleaseFiles)) {
  const bytes = await readFile(path);
  const gzipBytes = gzipSync(bytes, { level: 9 }).length;
  html.push({ path: relativePath(path), bytes: bytes.length, gzipBytes });
  if (gzipBytes > limits.maximumCompressedHtmlPerRoute) {
    failures.push(
      `${relativePath(path)} compresses to ${gzipBytes} bytes, above the 100 KB route budget`,
    );
  }
}
if (html.length !== expectedRouteCount) {
  failures.push(
    `Expected ${expectedRouteCount} rendered HTML routes, found ${html.length}`,
  );
}

async function compressedTotal(paths) {
  let rawBytes = 0;
  let gzipBytes = 0;
  for (const path of paths) {
    const bytes = await readFile(path);
    rawBytes += bytes.length;
    gzipBytes += gzipSync(bytes, { level: 9 }).length;
  }
  return { count: paths.length, rawBytes, gzipBytes };
}

const staticGraphAbsolutePaths = staticGraph.files.map((path) =>
  resolve(distDirectory, path),
);
const css = await compressedTotal(byExtension(".css", staticReleaseFiles));
const javascript = await compressedTotal([
  ...byExtension(".js", staticReleaseFiles),
  ...byExtension(".mjs", staticReleaseFiles),
]);

if (css.gzipBytes > limits.maximumCompressedCssTotal) {
  failures.push(
    `CSS compresses to ${css.gzipBytes} bytes, above the 60 KB initial budget`,
  );
}
if (javascript.gzipBytes > limits.maximumCompressedJavaScriptTotal) {
  failures.push(
    `JavaScript compresses to ${javascript.gzipBytes} bytes, above the 80 KB initial budget`,
  );
}
if (javascript.count > 0) {
  failures.push(
    `Static View contains ${javascript.count} JavaScript artifact(s); the release target is zero`,
  );
}

const heroPath = staticGraphAbsolutePaths.find((path) =>
  relativePath(path).endsWith("anzania-threshold-dunes-outer-v01-1672.avif"),
);
if (!heroPath) {
  failures.push("The approved 1672px Threshold Dunes hero AVIF is missing");
}
const heroBytes = heroPath ? (await stat(heroPath)).size : 0;
if (heroBytes > limits.maximumHeroAvif) {
  failures.push(
    `Threshold Dunes hero AVIF is ${heroBytes} bytes, above the 450 KB budget`,
  );
}

const socialCards = staticGraphAbsolutePaths.filter(
  (path) =>
    relativePath(path).startsWith("assets/social/") &&
    extname(path).toLowerCase() === ".jpg",
);
if (socialCards.length !== expectedRouteCount) {
  failures.push(
    `Expected ${expectedRouteCount} route social cards, found ${socialCards.length}`,
  );
}
for (const path of socialCards) {
  const bytes = (await stat(path)).size;
  if (bytes > limits.maximumSocialCard) {
    failures.push(
      `${relativePath(path)} is ${bytes} bytes, above the 100 KB social-card budget`,
    );
  }
}

const pdfs = byExtension(".pdf");
if (pdfs.length !== expectedPdfCount) {
  failures.push(
    `Expected ${expectedPdfCount} professional PDFs, found ${pdfs.length}`,
  );
}
for (const path of pdfs) {
  const bytes = (await stat(path)).size;
  if (bytes > limits.maximumPdf) {
    failures.push(
      `${relativePath(path)} is ${bytes} bytes, above the 750 KB document budget`,
    );
  }
}

const staticReleaseBytes = (
  await Promise.all(
    staticReleaseFiles.map(async (path) => (await stat(path)).size),
  )
).reduce((total, bytes) => total + bytes, 0);
if (staticReleaseBytes > limits.maximumStaticRelease) {
  failures.push(
    `The Static View release surface is ${staticReleaseBytes} bytes, above the preserved 15 MB budget`,
  );
}

const wholeReleaseBytes = (
  await Promise.all(files.map(async (path) => (await stat(path)).size))
).reduce((total, bytes) => total + bytes, 0);
if (wholeReleaseBytes > limits.maximumWholeRelease) {
  failures.push(
    `The complete release artifact is ${wholeReleaseBytes} bytes, above the 768 MB ceiling`,
  );
}

const report = {
  schemaVersion: "2.0.0",
  generatedAt: new Date().toISOString(),
  limits,
  scopeReserves: RELEASE_SCOPE_RESERVES,
  requiredCompleteScopeBytes: REQUIRED_COMPLETE_SCOPE_BYTES,
  surfaces: manifests,
  measured: {
    routes: html.sort((left, right) => left.path.localeCompare(right.path)),
    css,
    javascript,
    heroAvifBytes: heroBytes,
    socialCardCount: socialCards.length,
    largestSocialCardBytes: Math.max(
      0,
      ...(await Promise.all(
        socialCards.map(async (path) => (await stat(path)).size),
      )),
    ),
    pdfCount: pdfs.length,
    largestPdfBytes: Math.max(
      0,
      ...(await Promise.all(pdfs.map(async (path) => (await stat(path)).size))),
    ),
    staticRequestGraphFileCount: staticGraph.files.length,
    staticRequestGraphBytes:
      manifests[RELEASE_SURFACES.staticView].requestGraph.bytes,
    immersiveRequestGraphFileCount: immersiveGraph.files.length,
    immersiveRequestGraphBytes:
      manifests[RELEASE_SURFACES.immersiveEntry].requestGraph.bytes,
    sharedSurfaceFileCount: releaseClassification.shared.length,
    immersiveExclusiveFileCount:
      releaseClassification.immersiveExclusive.length,
    unclaimedFileCount: releaseClassification.unclaimed.length,
    staticReleaseFileCount: staticReleaseFiles.length,
    staticReleaseBytes,
    wholeReleaseFileCount: files.length,
    wholeReleaseBytes,
  },
  status: failures.length === 0 ? "pass" : "fail",
  failures,
};

await mkdir(resolve(reportPath, ".."), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (failures.length > 0) {
  console.error(`Static budget validation failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  const maximumHtml = Math.max(0, ...html.map((route) => route.gzipBytes));
  console.log(
    `Static budgets passed: ${maximumHtml} B max HTML gzip, ${css.gzipBytes} B CSS gzip, ${javascript.gzipBytes} B JavaScript gzip, ${staticReleaseBytes} B Static View surface and ${wholeReleaseBytes} B whole release.`,
  );
}
