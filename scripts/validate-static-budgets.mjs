import { gzipSync } from "node:zlib";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const repositoryRoot = process.cwd();
const distDirectory = resolve(repositoryRoot, "dist");
const reportPath = resolve(
  repositoryRoot,
  "AI-COLLAB",
  ".watch-state",
  "static-budget.json",
);

const limits = {
  maximumCompressedHtmlPerRoute: 100 * 1024,
  maximumCompressedCssTotal: 60 * 1024,
  maximumCompressedJavaScriptTotal: 80 * 1024,
  maximumHeroAvif: 450 * 1024,
  maximumSocialCard: 100 * 1024,
  maximumPdf: 750 * 1024,
  maximumDist: 15 * 1024 * 1024,
};

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
const documentPlans = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "src", "data", "profile", "document-manifest.json"),
    "utf8",
  ),
);
const expectedRouteCount = routes.filter(
  (route) => route.staticRenderable,
).length;
const expectedPdfCount = documentPlans.reduce(
  (count, plan) => count + plan.variants.length,
  0,
);
const relativePath = (path) =>
  relative(distDirectory, path).replaceAll("\\", "/");
const byExtension = (extension) =>
  files.filter((path) => extname(path).toLowerCase() === extension);

const html = [];
for (const path of byExtension(".html")) {
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

const css = await compressedTotal(byExtension(".css"));
const javascript = await compressedTotal([
  ...byExtension(".js"),
  ...byExtension(".mjs"),
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

const heroPath = files.find((path) =>
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

const socialCards = files.filter(
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

const distBytes = (
  await Promise.all(files.map(async (path) => (await stat(path)).size))
).reduce((total, bytes) => total + bytes, 0);
if (distBytes > limits.maximumDist) {
  failures.push(
    `The complete release artifact is ${distBytes} bytes, above the 15 MB budget`,
  );
}

const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  limits,
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
    distFileCount: files.length,
    distBytes,
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
    `Static budgets passed: ${maximumHtml} B max HTML gzip, ${css.gzipBytes} B CSS gzip, ${javascript.gzipBytes} B JavaScript gzip, ${distBytes} B artifact.`,
  );
}
