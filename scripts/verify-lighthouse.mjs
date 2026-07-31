import { existsSync } from "node:fs";
import { mkdir, realpath, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { startDocumentServer } from "./document-server.mjs";

const repositoryRoot = process.cwd();
const distDirectory = resolve(repositoryRoot, "dist");
const reportDirectory = resolve(
  repositoryRoot,
  "AI-COLLAB",
  ".watch-state",
  "lighthouse",
);
const temporaryDirectory = resolve(repositoryRoot, "tmp", "lighthouse");
const runCount = 3;

const thresholds = {
  performance: { comparator: ">=", value: 90 },
  accessibility: { comparator: ">=", value: 95 },
  bestPractices: { comparator: ">=", value: 95 },
  seo: { comparator: ">=", value: 95 },
  largestContentfulPaintMs: { comparator: "<=", value: 2_500 },
  cumulativeLayoutShift: { comparator: "<", value: 0.1 },
  totalBlockingTimeMs: { comparator: "<=", value: 200 },
};

function resolveChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);

  const chromePath = candidates.find((candidate) => existsSync(candidate));
  if (!chromePath) {
    throw new Error(
      "Chrome was not found. Set CHROME_PATH to an installed Chrome executable.",
    );
  }
  return chromePath;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function categoryScore(lhr, category) {
  const score = lhr.categories[category]?.score;
  if (typeof score !== "number") {
    throw new Error(`Lighthouse did not return a ${category} score`);
  }
  return Math.round(score * 10_000) / 100;
}

function auditValue(lhr, audit) {
  const value = lhr.audits[audit]?.numericValue;
  if (typeof value !== "number") {
    throw new Error(`Lighthouse did not return a numeric ${audit} value`);
  }
  return value;
}

function summarizeRun(lhr, run, durationMs) {
  return {
    run,
    durationMs,
    lighthouseVersion: lhr.lighthouseVersion,
    requestedUrl: lhr.requestedUrl,
    finalUrl: lhr.finalUrl,
    fetchTime: lhr.fetchTime,
    userAgent: lhr.userAgent,
    scores: {
      performance: categoryScore(lhr, "performance"),
      accessibility: categoryScore(lhr, "accessibility"),
      bestPractices: categoryScore(lhr, "best-practices"),
      seo: categoryScore(lhr, "seo"),
    },
    metrics: {
      largestContentfulPaintMs: auditValue(lhr, "largest-contentful-paint"),
      cumulativeLayoutShift: auditValue(lhr, "cumulative-layout-shift"),
      totalBlockingTimeMs: auditValue(lhr, "total-blocking-time"),
    },
  };
}

function aggregateRuns(runs) {
  return {
    scores: {
      performance: median(runs.map((run) => run.scores.performance)),
      accessibility: median(runs.map((run) => run.scores.accessibility)),
      bestPractices: median(runs.map((run) => run.scores.bestPractices)),
      seo: median(runs.map((run) => run.scores.seo)),
    },
    metrics: {
      largestContentfulPaintMs: median(
        runs.map((run) => run.metrics.largestContentfulPaintMs),
      ),
      cumulativeLayoutShift: median(
        runs.map((run) => run.metrics.cumulativeLayoutShift),
      ),
      totalBlockingTimeMs: median(
        runs.map((run) => run.metrics.totalBlockingTimeMs),
      ),
    },
  };
}

function evaluate(aggregate) {
  return {
    performance: aggregate.scores.performance >= thresholds.performance.value,
    accessibility:
      aggregate.scores.accessibility >= thresholds.accessibility.value,
    bestPractices:
      aggregate.scores.bestPractices >= thresholds.bestPractices.value,
    seo: aggregate.scores.seo >= thresholds.seo.value,
    largestContentfulPaintMs:
      aggregate.metrics.largestContentfulPaintMs <=
      thresholds.largestContentfulPaintMs.value,
    cumulativeLayoutShift:
      aggregate.metrics.cumulativeLayoutShift <
      thresholds.cumulativeLayoutShift.value,
    totalBlockingTimeMs:
      aggregate.metrics.totalBlockingTimeMs <=
      thresholds.totalBlockingTimeMs.value,
  };
}

if (!existsSync(resolve(distDirectory, "index.html"))) {
  throw new Error(
    "The production build is missing. Run `pnpm run build` before Lighthouse.",
  );
}

await mkdir(reportDirectory, { recursive: true });
await mkdir(temporaryDirectory, { recursive: true });
process.env.TEMP = temporaryDirectory;
process.env.TMP = temporaryDirectory;

const chromePath = resolveChromePath();
const lighthousePackagePath = await realpath(
  resolve(repositoryRoot, "node_modules", "lighthouse", "package.json"),
);
const requireFromLighthouse = createRequire(lighthousePackagePath);
const chromeLauncherPath = requireFromLighthouse.resolve("chrome-launcher");
const [{ default: lighthouse }, chromeLauncher] = await Promise.all([
  import("lighthouse"),
  import(pathToFileURL(chromeLauncherPath).href),
]);

const server = await startDocumentServer({
  root: distDirectory,
  basePath: "/profile",
});
const url = `${server.origin}/profile/`;
const runs = [];

try {
  for (let index = 0; index < runCount; index += 1) {
    const startedAt = Date.now();
    const userDataDirectory = resolve(
      temporaryDirectory,
      `profile-${index + 1}-${startedAt}`,
    );
    await mkdir(userDataDirectory, { recursive: true });
    const chrome = await chromeLauncher.launch({
      chromePath,
      userDataDir: userDataDirectory,
      chromeFlags: [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-breakpad",
        "--disable-crash-reporter",
      ],
      logLevel: "silent",
    });
    chrome.process?.unref();

    try {
      const result = await lighthouse(url, {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
        ],
        formFactor: "mobile",
        throttlingMethod: "simulate",
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 1,
          disabled: false,
        },
      });

      if (!result) {
        throw new Error(`Lighthouse run ${index + 1} returned no result`);
      }

      const rawPath = resolve(
        reportDirectory,
        `mobile-profile-run-${index + 1}.lhr.json`,
      );
      await writeFile(
        rawPath,
        `${JSON.stringify(result.lhr, null, 2)}\n`,
        "utf8",
      );
      const run = summarizeRun(result.lhr, index + 1, Date.now() - startedAt);
      runs.push(run);
      console.log(
        `Lighthouse run ${run.run}/${runCount}: performance ${run.scores.performance}, accessibility ${run.scores.accessibility}, best practices ${run.scores.bestPractices}, SEO ${run.scores.seo}, LCP ${Math.round(run.metrics.largestContentfulPaintMs)} ms, CLS ${run.metrics.cumulativeLayoutShift.toFixed(3)}, TBT ${Math.round(run.metrics.totalBlockingTimeMs)} ms.`,
      );
    } finally {
      chrome.kill();
    }
  }
} finally {
  await server.close();
}

const aggregate = aggregateRuns(runs);
const checks = evaluate(aggregate);
const failures = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([check]) => check);
const summary = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  status: failures.length === 0 ? "pass" : "fail",
  url,
  profile: {
    formFactor: "mobile",
    viewport: { width: 390, height: 844, deviceScaleFactor: 1 },
    throttlingMethod: "simulate",
    runs: runCount,
    aggregation: "median of three runs for each score and metric",
    responsivenessProxy:
      "Total Blocking Time is the lab proxy because Lighthouse does not measure field INP.",
  },
  runtime: {
    chromePath,
    lighthouseVersion: runs[0]?.lighthouseVersion ?? null,
  },
  thresholds,
  runs,
  median: aggregate,
  checks,
  failures,
};

await writeFile(
  resolve(reportDirectory, "mobile-profile-summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
  "utf8",
);

if (failures.length > 0) {
  console.error(`Lighthouse gate failed: ${failures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(
    `Lighthouse gate passed: performance ${aggregate.scores.performance}, accessibility ${aggregate.scores.accessibility}, best practices ${aggregate.scores.bestPractices}, SEO ${aggregate.scores.seo}, LCP ${Math.round(aggregate.metrics.largestContentfulPaintMs)} ms, CLS ${aggregate.metrics.cumulativeLayoutShift.toFixed(3)}, TBT ${Math.round(aggregate.metrics.totalBlockingTimeMs)} ms.`,
  );
}
