import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import {
  classifyReleaseFiles,
  findStaticReleasePolicyViolations,
  findUnclaimedRuntimeAssets,
  inspectReleaseSurfaces,
  RELEASE_SURFACES,
  validateImmersiveSurfaceBootstrap,
} from "./release-surfaces.mjs";

const repositoryRoot = process.cwd();
const distDirectory = resolve(repositoryRoot, "dist");
const [identity] = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "src", "data", "profile", "identity.json"),
    "utf8",
  ),
);
const documentManifest = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "src", "data", "profile", "document-manifest.json"),
    "utf8",
  ),
);
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
const approvedPhone = identity.publicPhone;
const approvedPhoneDigits = approvedPhone.href.replace(/\D/gu, "");
const sourceRoots = [
  resolve(repositoryRoot, "src", "data", "profile"),
  resolve(repositoryRoot, "src", "components"),
  resolve(repositoryRoot, "src", "layouts"),
  resolve(repositoryRoot, "src", "pages"),
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

const { graphs } = await inspectReleaseSurfaces({
  distDirectory,
  routes,
  basePath: siteSettings.basePath,
  siteUrl: siteSettings.siteUrl,
});
const staticGraph = graphs[RELEASE_SURFACES.staticView];
const immersiveGraph = graphs[RELEASE_SURFACES.immersiveEntry];

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

const allPublicPaths = distFiles.map((path) =>
  relative(distDirectory, path).replaceAll("\\", "/"),
);
const releaseClassification = classifyReleaseFiles(
  allPublicPaths,
  staticGraph,
  immersiveGraph,
);
failures.push(
  ...(await findStaticReleasePolicyViolations({
    distDirectory,
    outputPaths: releaseClassification.staticRelease,
  })),
);
for (const publicPath of findUnclaimedRuntimeAssets(
  allPublicPaths,
  staticGraph,
  immersiveGraph,
)) {
  failures.push(
    `${publicPath} is an unclaimed runtime asset; it must be reachable only from an immersive-entry route`,
  );
}

const htmlFiles = releaseClassification.staticRelease
  .filter((path) => extname(path) === ".html")
  .map((path) => resolve(distDirectory, path));
for (const path of htmlFiles) {
  const html = await readFile(path, "utf8");

  const telephoneLinks = [
    ...html.matchAll(/href=(?:"|')(tel:[^"']+)(?:"|')/giu),
  ].map(([, href]) => href);
  const unapprovedTelephoneLink = telephoneLinks.find(
    (href) => href !== approvedPhone.href,
  );
  if (unapprovedTelephoneLink !== undefined) {
    failures.push(
      `${displayPath(path)} contains an unapproved telephone link: ${unapprovedTelephoneLink}`,
    );
  }

  const visibleText = html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<[^>]+>/gu, " ");
  const unapprovedPhone = [
    ...visibleText.matchAll(/\+\s?\d(?:[\s().-]*\d){7,}/gu),
  ]
    .map(([value]) => ({ value, digits: value.replace(/\D/gu, "") }))
    .find(({ digits }) => digits !== approvedPhoneDigits);
  if (unapprovedPhone !== undefined) {
    failures.push(
      `${displayPath(path)} contains an unapproved phone-like value: ${unapprovedPhone.value}`,
    );
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

const cssFiles = releaseClassification.staticRelease
  .filter((path) => extname(path) === ".css")
  .map((path) => resolve(distDirectory, path));

const expectedDocuments = documentManifest.flatMap((document) =>
  document.variants.map((variant) => variant.pdfPath),
);
const documentsIndex = resolve(distDirectory, "documents", "index.html");
const documentsHtml = await readFile(documentsIndex, "utf8");

const publicPhonePages = [
  resolve(distDirectory, "contact", "index.html"),
  ...documentManifest.flatMap((document) =>
    document.variants.map((variant) =>
      resolve(distDirectory, variant.previewPath, "index.html"),
    ),
  ),
];

for (const path of publicPhonePages) {
  const html = await readFile(path, "utf8");
  if (!html.includes(approvedPhone.display)) {
    failures.push(
      `${displayPath(path)} does not include the approved public phone`,
    );
  }
  if (!html.includes(`href="${approvedPhone.href}"`)) {
    failures.push(
      `${displayPath(path)} does not include the approved telephone link`,
    );
  }
}

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

console.log(
  `Validated the ${staticGraph.files.length}-file Static View request graph (${htmlFiles.length} HTML and ${cssFiles.length} CSS files), an isolated ${immersiveGraph.files.length}-file immersive graph and four direct PDF downloads.`,
);
