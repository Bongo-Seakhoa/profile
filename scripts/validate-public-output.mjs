import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const repositoryRoot = process.cwd();
const distDirectory = resolve(repositoryRoot, "dist");
const sourceRoots = [
  resolve(repositoryRoot, "src", "data", "profile"),
  resolve(repositoryRoot, "src", "components"),
  resolve(repositoryRoot, "src", "layouts"),
  resolve(repositoryRoot, "src", "pages"),
  resolve(repositoryRoot, "src", "styles"),
  resolve(repositoryRoot, "public", "assets", "static"),
  resolve(repositoryRoot, "public", "assets", "immersive"),
];
const textExtensions = new Set([
  ".astro",
  ".css",
  ".html",
  ".js",
  ".json",
  ".mjs",
  ".ts",
  ".xml",
]);
const failures = [];

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

function displayPath(path) {
  return relative(repositoryRoot, path).replaceAll("\\", "/");
}

function distPath(path) {
  return relative(distDirectory, path).replaceAll("\\", "/");
}

function findLineColumn(text, offset) {
  const preceding = text.slice(0, offset);
  const lines = preceding.split(/\r?\n/);
  return { line: lines.length, column: lines.at(-1).length + 1 };
}

async function rejectEmDashes(path) {
  if (!textExtensions.has(extname(path).toLowerCase())) return;
  const text = await readFile(path, "utf8");
  let offset = text.indexOf("\u2014");
  while (offset !== -1) {
    const { line, column } = findLineColumn(text, offset);
    failures.push(
      `${displayPath(path)}:${line}:${column} contains a prohibited em dash`,
    );
    offset = text.indexOf("\u2014", offset + 1);
  }
}

for (const sourceRoot of sourceRoots) {
  try {
    for (const path of await walk(sourceRoot)) await rejectEmDashes(path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const distFiles = await walk(distDirectory);
for (const path of distFiles) await rejectEmDashes(path);

const immersivePrefix = "assets/immersive/";
const staticPrefix = "assets/static/";
const approvedStaticRuntime = `${staticPrefix}static-runtime.js`;
const approvedStaticRuntimeHref = `/profile/${approvedStaticRuntime}`;
const forbiddenRuntimeExtensions = new Set([
  ".bin",
  ".blend",
  ".fbx",
  ".glb",
  ".gltf",
  ".mp3",
  ".mp4",
  ".ogg",
  ".wasm",
  ".webm",
]);
const allowedImmersiveExtensions = new Set([
  ".css",
  ".js",
  ".json",
  ".svg",
  ".webp",
]);
const allowedStaticExtensions = new Set([".js"]);

for (const path of distFiles) {
  const extension = extname(path).toLowerCase();
  const publicPath = distPath(path);
  const isImmersive = publicPath.startsWith(immersivePrefix);
  const isStaticRuntime = publicPath.startsWith(staticPrefix);

  if (forbiddenRuntimeExtensions.has(extension)) {
    failures.push(`${publicPath} is a prohibited heavy runtime asset`);
  }
  if (
    (extension === ".js" || extension === ".mjs") &&
    !isImmersive &&
    publicPath !== approvedStaticRuntime
  ) {
    failures.push(`${publicPath} adds an unapproved client runtime`);
  }
  if (isImmersive && !allowedImmersiveExtensions.has(extension)) {
    failures.push(`${publicPath} uses an unapproved immersive asset type`);
  }
  if (isStaticRuntime && !allowedStaticExtensions.has(extension)) {
    failures.push(`${publicPath} uses an unapproved Static View asset type`);
  }
}

const htmlFiles = distFiles.filter((path) => extname(path) === ".html");
for (const path of htmlFiles) {
  const html = await readFile(path, "utf8");
  const publicPath = distPath(path);
  const isExploreRoute = publicPath === "explore/index.html";
  // Resume and CV previews are deliberately chrome-less print layouts. They carry
  // no site shell, no client runtime and no Anzania framing, so the Static View
  // contracts below do not apply to them.
  const isDocumentPreview =
    /^documents\/(?:resume|cv)\/[^/]+\/index\.html$/.test(publicPath);

  if (/<canvas(?:\s|>)/i.test(html)) {
    failures.push(`${displayPath(path)} contains a canvas`);
  }
  if (/href=(?:"|')tel:/i.test(html)) {
    failures.push(`${displayPath(path)} exposes a public telephone link`);
  }
  if (!isExploreRoute && html.includes("assets/immersive/")) {
    failures.push(
      `${displayPath(path)} references immersive assets from Static View`,
    );
  }

  const scriptSources = Array.from(
    html.matchAll(/<script\b[^>]*\bsrc=(?:"|')([^"']+)(?:"|')[^>]*>/gi),
    (match) => match[1],
  );

  if (isExploreRoute) {
    const requiredFragments = [
      "/profile/assets/immersive/anzania-explorer.css",
      "/profile/assets/immersive/anzania-explorer.js",
      "An original fictional world",
      "Continue in Static View",
      'data-guide-contract="full-body companion"',
    ];
    for (const fragment of requiredFragments) {
      if (!html.includes(fragment)) {
        failures.push(
          `explore/index.html is missing required contract: ${fragment}`,
        );
      }
    }
    if (
      !/<script\b[^>]*\btype=(?:"|')module(?:"|')[^>]*anzania-explorer\.js/i.test(
        html,
      )
    ) {
      failures.push(
        "explore/index.html does not load the approved module runtime",
      );
    }
  } else if (isDocumentPreview) {
    if (scriptSources.length !== 0) {
      failures.push(
        `${displayPath(path)} must stay script-free, found ${scriptSources.length}`,
      );
    }
  } else {
    if (scriptSources.length !== 1) {
      failures.push(
        `${displayPath(path)} must load exactly one Static View runtime, found ${scriptSources.length}`,
      );
    }
    if (scriptSources.some((source) => source !== approvedStaticRuntimeHref)) {
      failures.push(
        `${displayPath(path)} loads an unapproved client script: ${scriptSources.join(", ")}`,
      );
    }
    if (!html.includes('data-view="static"')) {
      failures.push(`${displayPath(path)} is missing the Static View contract`);
    }
    if (!html.includes("ANZANIA / FICTIONAL WORLD")) {
      failures.push(
        `${displayPath(path)} is missing the canonical fictional-world marker`,
      );
    }
  }

  const attributePattern = /\b(?:href|src)=(?:"|')([^"']+)(?:"|')/gi;
  for (const match of html.matchAll(attributePattern)) {
    const value = match[1];
    const isRootAbsolute = value.startsWith("/") && !value.startsWith("//");
    const isBaseAware = value === "/profile" || value.startsWith("/profile/");
    if (isRootAbsolute && !isBaseAware) {
      failures.push(
        `${displayPath(path)} contains a root-absolute asset or link outside /profile: ${value}`,
      );
    }
  }
}

const cssFiles = distFiles.filter((path) => extname(path) === ".css");
const staticCssFiles = cssFiles.filter(
  (path) => !distPath(path).startsWith(immersivePrefix),
);
const combinedStaticCss = (
  await Promise.all(staticCssFiles.map((path) => readFile(path, "utf8")))
).join("\n");
if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/i.test(combinedStaticCss)) {
  failures.push("Static View CSS is missing a reduced-motion contract");
}
if (/\bscroll-behavior\s*:\s*smooth/i.test(combinedStaticCss)) {
  failures.push("Static View CSS contains prohibited forced smooth scrolling");
}
for (const contract of [
  ".static-atmosphere",
  ".static-command-dialog",
  ".static-transition-veil",
  "@view-transition",
]) {
  if (!combinedStaticCss.includes(contract)) {
    failures.push(`Static View CSS is missing contract: ${contract}`);
  }
}

const staticRuntimePath = resolve(distDirectory, approvedStaticRuntime);
try {
  const runtime = await readFile(staticRuntimePath, "utf8");
  const requiredStaticContracts = [
    "static-enhanced",
    "prefers-reduced-motion",
    "IntersectionObserver",
    "data-command-dialog",
    "data-static-progress",
    "data-leaving",
    "ResizeObserver",
  ];
  for (const contract of requiredStaticContracts) {
    if (!runtime.includes(contract)) {
      failures.push(`The Static View runtime is missing contract: ${contract}`);
    }
  }
  if (/document\.createElement\((?:"|')canvas/i.test(runtime)) {
    failures.push("The Static View runtime creates a canvas");
  }
  if (
    /\bWebGL(?:2)?RenderingContext\b|\.getContext\((?:"|')webgl/i.test(runtime)
  ) {
    failures.push("The Static View runtime initializes WebGL");
  }
} catch {
  failures.push("The approved Static View runtime is missing");
}

const manifestPath = resolve(
  distDirectory,
  "assets",
  "immersive",
  "runtime-manifest.json",
);
try {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.world?.name !== "Anzania") {
    failures.push("The immersive manifest does not identify Anzania correctly");
  }
  if (
    manifest.world?.disclaimer !==
    "Anzania is fictional. It is not Tanzania or any other real location."
  ) {
    failures.push(
      "The immersive manifest is missing the canonical fictional-world disclaimer",
    );
  }
  if (manifest.locations?.length !== 8) {
    failures.push(
      `Expected 8 Anzania locations, found ${manifest.locations?.length ?? 0}`,
    );
  }
  if (manifest.guides?.length !== 15) {
    failures.push(
      `Expected 15 full-body guides, found ${manifest.guides?.length ?? 0}`,
    );
  }
  if (Object.keys(manifest.powers ?? {}).length !== 4) {
    failures.push(
      `Expected 4 authored traversal powers, found ${Object.keys(manifest.powers ?? {}).length}`,
    );
  }

  const assetPaths = [
    manifest.atlas?.src,
    ...manifest.guides.map((guide) => guide.src),
    ...manifest.locations.flatMap((location) => [
      location.outer?.large,
      location.outer?.small,
      location.inner?.large,
      location.inner?.small,
    ]),
  ].filter(Boolean);

  for (const assetPath of assetPaths) {
    const relativeAsset = assetPath.replace(/^\.\//, "");
    try {
      const metadata = await stat(
        resolve(distDirectory, "assets", "immersive", relativeAsset),
      );
      if (metadata.size < 1_000) {
        failures.push(
          `Immersive asset is unexpectedly small: ${relativeAsset}`,
        );
      }
    } catch {
      failures.push(`Immersive asset is missing: ${relativeAsset}`);
    }
  }
} catch (error) {
  failures.push(`Could not validate the immersive manifest: ${error.message}`);
}

const immersiveRuntimePath = resolve(
  distDirectory,
  "assets",
  "immersive",
  "anzania-explorer.js",
);
try {
  const runtime = await readFile(immersiveRuntimePath, "utf8");
  const requiredRuntimeContracts = [
    "calculateFraming",
    "recalculateFraming",
    "is-looking-back",
    "is-traversing",
    "0.14",
    "0.2",
    "ResizeObserver",
    "prefers-reduced-motion",
  ];
  for (const contract of requiredRuntimeContracts) {
    if (!runtime.includes(contract)) {
      failures.push(
        `The Anzania runtime is missing framing contract: ${contract}`,
      );
    }
  }
  if (/over-the-shoulder|\bOTS\b/i.test(runtime)) {
    failures.push(
      "The Anzania runtime contains prohibited OTS camera language",
    );
  }
} catch {
  failures.push("The Explore Anzania runtime is missing");
}

const expectedDocuments = [
  "documents/bongo-seakhoa-resume.pdf",
  "documents/bongo-kosa-resume.pdf",
  "documents/bongo-seakhoa-cv.pdf",
  "documents/bongo-kosa-cv.pdf",
];
const documentsIndex = resolve(distDirectory, "documents", "index.html");
const documentsHtml = await readFile(documentsIndex, "utf8");

for (const documentPath of expectedDocuments) {
  const absolutePath = resolve(distDirectory, documentPath);
  try {
    const metadata = await stat(absolutePath);
    if (metadata.size < 10_000) {
      failures.push(`${documentPath} is unexpectedly small`);
    }
  } catch {
    failures.push(`${documentPath} is missing`);
  }

  const publicHref = `/profile/${documentPath}`;
  if (!documentsHtml.includes(publicHref)) {
    failures.push(`documents/index.html has no direct link to ${publicHref}`);
  }
}

if (failures.length > 0) {
  console.error("Public output validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const immersiveFiles = distFiles.filter((path) =>
  distPath(path).startsWith(immersivePrefix),
);
console.log(
  `Validated ${htmlFiles.length} HTML files, ${cssFiles.length} CSS files, ` +
    `one progressive Static View runtime, ${immersiveFiles.length} approved ` +
    "immersive assets and four direct PDF downloads.",
);
