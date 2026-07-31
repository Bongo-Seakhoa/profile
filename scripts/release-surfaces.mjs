import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { extname, posix, relative, resolve, sep } from "node:path";
import { URL } from "node:url";

export const RELEASE_SURFACES = Object.freeze({
  staticView: "static-view",
  immersiveEntry: "immersive-entry",
});

export const RELEASE_SURFACE_IDS = Object.freeze([
  RELEASE_SURFACES.staticView,
  RELEASE_SURFACES.immersiveEntry,
]);

export const STATIC_FORBIDDEN_EXTENSIONS = new Set([
  ".basis",
  ".bin",
  ".blend",
  ".fbx",
  ".glb",
  ".gltf",
  ".js",
  ".ktx2",
  ".mjs",
  ".mp3",
  ".mp4",
  ".ogg",
  ".wasm",
  ".webm",
]);

export const IMMERSIVE_RUNTIME_MANIFEST_PATH =
  "assets/immersive/runtime-manifest.json";

const GRAPH_DIGEST_ALGORITHM = "sha256-path-content-v1";
/** @type {Array<[RegExp, string]>} */
const STATIC_FORBIDDEN_MOTION = [
  [/@keyframes\b/iu, "@keyframes"],
  [/\banimation(?:-name)?\s*:(?!\s*none\b)/iu, "animation"],
  [/\bscroll-behavior\s*:\s*smooth/iu, "smooth scrolling"],
  [/\btransition\s*:/iu, "transition"],
];
const REQUEST_ATTRIBUTE_PATTERN =
  /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gu;
const REQUEST_TAG_PATTERN = /<([a-z][\w:-]*)\b([^>]*)>/giu;

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeBasePath(value) {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash === "/" ? "" : withLeadingSlash.replace(/\/+$/u, "");
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeOutputPath(value) {
  const normalized = posix.normalize(value.replaceAll("\\", "/"));
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.startsWith("/")
  ) {
    throw new Error(`Invalid release output path: ${value}`);
  }
  return normalized;
}

/**
 * @param {{ path: string }} route
 * @returns {string}
 */
export function routeOutputPath(route) {
  if (route.path === "") return "index.html";
  if (route.path.endsWith(".html")) return normalizeOutputPath(route.path);
  return normalizeOutputPath(`${route.path.replace(/\/?$/u, "/")}index.html`);
}

/**
 * @param {string} root
 * @param {string} outputPath
 * @returns {string}
 */
function absoluteOutputPath(root, outputPath) {
  const normalized = normalizeOutputPath(outputPath);
  const absoluteRoot = resolve(root);
  const candidate = resolve(absoluteRoot, normalized);
  if (
    candidate !== absoluteRoot &&
    !candidate.startsWith(`${absoluteRoot}${sep}`)
  ) {
    throw new Error(`Release path escaped its output root: ${outputPath}`);
  }
  return candidate;
}

/**
 * @param {string} attributesText
 * @returns {Map<string, string>}
 */
function readAttributes(attributesText) {
  const attributes = new Map();
  for (const match of attributesText.matchAll(REQUEST_ATTRIBUTE_PATTERN)) {
    const name = match[1]?.toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (name) attributes.set(name, value);
  }
  return attributes;
}

/**
 * @param {string} value
 * @returns {string[]}
 */
function parseSourceSet(value) {
  return value
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/u)[0] ?? "")
    .filter(Boolean);
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function cssRequests(text) {
  const requests = [];
  for (const match of text.matchAll(
    /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s][^)]*))\s*\)/giu,
  )) {
    const value = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (value) requests.push(value);
  }
  for (const match of text.matchAll(
    /@import\s+(?:url\(\s*)?(?:"([^"]+)"|'([^']+)')/giu,
  )) {
    const value = match[1] ?? match[2] ?? "";
    if (value) requests.push(value);
  }
  return requests;
}

/**
 * @param {string} css
 * @returns {string[]}
 */
function staticMotionViolations(css) {
  return STATIC_FORBIDDEN_MOTION.filter(([pattern]) => pattern.test(css)).map(
    ([, label]) => label,
  );
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function htmlRequests(text) {
  const requests = [];
  for (const match of text.matchAll(REQUEST_TAG_PATTERN)) {
    const tagName = match[1]?.toLowerCase();
    const attributes = readAttributes(match[2] ?? "");
    const source = attributes.get("src");
    const sourceSet = attributes.get("srcset");
    const poster = attributes.get("poster");

    if (source) requests.push(source);
    if (sourceSet) requests.push(...parseSourceSet(sourceSet));
    if (poster) requests.push(poster);

    if (tagName === "object") {
      const data = attributes.get("data");
      if (data) requests.push(data);
    }

    if (tagName === "link") {
      const relationships = new Set(
        (attributes.get("rel") ?? "")
          .toLowerCase()
          .split(/\s+/u)
          .filter(Boolean),
      );
      if (
        ["icon", "manifest", "modulepreload", "preload", "stylesheet"].some(
          (relationship) => relationships.has(relationship),
        )
      ) {
        const href = attributes.get("href");
        if (href) requests.push(href);
      }
    }

    if (tagName === "image" || tagName === "use") {
      const href = attributes.get("href") ?? attributes.get("xlink:href");
      if (href) requests.push(href);
    }

    if (tagName === "meta") {
      const metadataName = (
        attributes.get("property") ??
        attributes.get("name") ??
        ""
      ).toLowerCase();
      if (metadataName === "og:image" || metadataName === "twitter:image") {
        const content = attributes.get("content");
        if (content) requests.push(content);
      }
    }

    const inlineStyle = attributes.get("style");
    if (inlineStyle) requests.push(...cssRequests(inlineStyle));
  }

  for (const match of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/giu)) {
    requests.push(...cssRequests(match[1] ?? ""));
  }
  return requests;
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function javaScriptRequests(text) {
  const requests = [];
  const patterns = [
    /\bimport\s*["']([^"']+)["']/gu,
    /\b(?:import|export)\s*[^"'();]*?\bfrom\s*["']([^"']+)["']/gu,
    /import\s*\(\s*["']([^"']+)["']\s*\)/gu,
    /new\s+URL\s*\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/gu,
    /(?:fetch|new\s+Worker)\s*\(\s*["']([^"']+)["']/gu,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[1] ?? "";
      if (value) requests.push(value);
    }
  }
  return requests;
}

/**
 * @param {unknown} value
 * @param {string | null} key
 * @param {string[]} requests
 */
function collectManifestRequests(value, key, requests) {
  if (typeof value === "string") {
    if (
      key &&
      /^(?:asset|assets|file|files|href|path|src|uri|url)$/iu.test(key)
    ) {
      requests.push(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectManifestRequests(item, key, requests);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [childKey, childValue] of Object.entries(value)) {
    collectManifestRequests(childValue, childKey, requests);
  }
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function manifestRequests(text) {
  try {
    /** @type {string[]} */
    const requests = [];
    collectManifestRequests(JSON.parse(text), null, requests);
    return requests;
  } catch {
    return [];
  }
}

/**
 * @param {string} text
 * @param {string} outputPath
 * @returns {string[]}
 */
function extractRequests(text, outputPath) {
  const extension = extname(outputPath).toLowerCase();
  if (extension === ".html") return htmlRequests(text);
  if (extension === ".css") return cssRequests(text);
  if (extension === ".js" || extension === ".mjs") {
    return javaScriptRequests(text);
  }
  if (
    extension === ".json" ||
    extension === ".webmanifest" ||
    outputPath.endsWith("manifest.json")
  ) {
    return manifestRequests(text);
  }
  return [];
}

/**
 * @param {string} request
 * @param {string} fromPath
 * @param {string} basePath
 * @param {URL} siteUrl
 * @returns {{ path: string | null; violation: string | null }}
 */
function resolveRequest(request, fromPath, basePath, siteUrl) {
  const decodedRequest = request.replaceAll("&amp;", "&").trim();
  if (
    !decodedRequest ||
    decodedRequest.startsWith("#") ||
    /^(?:data|mailto|tel|javascript|blob):/iu.test(decodedRequest)
  ) {
    return { path: null, violation: null };
  }

  if (
    !decodedRequest.startsWith(".") &&
    !decodedRequest.startsWith("/") &&
    !/^[a-z][a-z\d+.-]*:/iu.test(decodedRequest) &&
    !decodedRequest.includes("/") &&
    !decodedRequest.includes(".")
  ) {
    return {
      path: null,
      violation: "bare subresource specifier is not deployable",
    };
  }

  const publicFromPath = `${basePath}/${fromPath}`.replace(/\/{2,}/gu, "/");
  const fromUrl = new URL(publicFromPath, siteUrl.origin);
  let target;
  try {
    target = new URL(decodedRequest, fromUrl);
  } catch {
    return { path: null, violation: "subresource URL is invalid" };
  }
  if (target.origin !== siteUrl.origin) {
    return { path: null, violation: "cross-origin subresource is not allowed" };
  }

  const targetPath = decodeURIComponent(target.pathname);
  if (targetPath !== basePath && !targetPath.startsWith(`${basePath}/`)) {
    return {
      path: null,
      violation: "same-origin subresource is outside the deployment base",
    };
  }

  let outputPath = targetPath.slice(basePath.length).replace(/^\/+/, "");
  if (!outputPath || outputPath.endsWith("/")) outputPath += "index.html";
  return { path: normalizeOutputPath(outputPath), violation: null };
}

/**
 * @typedef {{ from: string; request: string; to: string }} RequestGraphEdge
 * @typedef {{ from: string | null; request: string; path: string }} MissingRequest
 * @typedef {{ from: string; request: string; reason: string }} RequestPolicyViolation
 * @typedef {{ entryPaths: string[]; files: string[]; edges: RequestGraphEdge[]; missing: MissingRequest[]; policyViolations?: RequestPolicyViolation[] }} RequestGraph
 */

/**
 * Build the deployment requests reachable from exact HTML entries. Navigation
 * anchors are deliberately excluded because a link does not load the target
 * surface. HTML subresources, CSS dependencies, module imports and explicit
 * asset-manifest references are followed recursively.
 *
 * @param {{ distDirectory: string; entryPaths: string[]; basePath: string; siteUrl: string }} options
 * @returns {Promise<RequestGraph>}
 */
export async function buildRequestGraph({
  distDirectory,
  entryPaths,
  basePath: rawBasePath,
  siteUrl: rawSiteUrl,
}) {
  const basePath = normalizeBasePath(rawBasePath);
  const siteUrl = new URL(rawSiteUrl);
  const normalizedEntries = [
    ...new Set(entryPaths.map(normalizeOutputPath)),
  ].sort();
  const queued = [...normalizedEntries];
  const visited = new Set();
  const files = new Set();
  const missing = [];
  const edges = [];
  /** @type {RequestPolicyViolation[]} */
  const policyViolations = [];

  while (queued.length > 0) {
    const outputPath = queued.shift();
    if (!outputPath || visited.has(outputPath)) continue;
    visited.add(outputPath);

    const absolutePath = absoluteOutputPath(distDirectory, outputPath);
    let metadata;
    try {
      metadata = await stat(absolutePath);
    } catch {
      missing.push({ from: null, request: outputPath, path: outputPath });
      continue;
    }
    if (!metadata.isFile()) {
      missing.push({ from: null, request: outputPath, path: outputPath });
      continue;
    }
    files.add(outputPath);

    const extension = extname(outputPath).toLowerCase();
    if (
      ![".css", ".html", ".js", ".json", ".mjs", ".webmanifest"].includes(
        extension,
      ) &&
      !outputPath.endsWith("manifest.json")
    ) {
      continue;
    }

    const text = await readFile(absolutePath, "utf8");
    for (const request of extractRequests(text, outputPath)) {
      const resolution = resolveRequest(request, outputPath, basePath, siteUrl);
      if (resolution.violation) {
        policyViolations.push({
          from: outputPath,
          request,
          reason: resolution.violation,
        });
      }
      const targetPath = resolution.path;
      if (!targetPath) continue;
      edges.push({ from: outputPath, request, to: targetPath });

      const targetAbsolutePath = absoluteOutputPath(distDirectory, targetPath);
      try {
        const targetMetadata = await stat(targetAbsolutePath);
        if (!targetMetadata.isFile()) throw new Error("Not a file");
        if (!visited.has(targetPath)) queued.push(targetPath);
      } catch {
        missing.push({ from: outputPath, request, path: targetPath });
      }
    }
  }

  /**
   * @param {RequestGraphEdge | MissingRequest} value
   * @returns {string}
   */
  const sortablePath = (value) => ("path" in value ? value.path : value.to);
  /**
   * @param {RequestGraphEdge | MissingRequest} left
   * @param {RequestGraphEdge | MissingRequest} right
   * @returns {number}
   */
  const compareByPath = (left, right) =>
    `${left.from ?? ""}\0${sortablePath(left)}`.localeCompare(
      `${right.from ?? ""}\0${sortablePath(right)}`,
    );
  return {
    entryPaths: normalizedEntries,
    files: [...files].sort(),
    edges: edges.sort(compareByPath),
    missing: missing.sort(compareByPath),
    policyViolations: policyViolations.sort((left, right) =>
      `${left.from}\0${left.request}`.localeCompare(
        `${right.from}\0${right.request}`,
      ),
    ),
  };
}

/**
 * @param {RequestGraph} graph
 * @param {string} distDirectory
 * @returns {Promise<{ algorithm: string; sha256: string; fileCount: number; bytes: number }>}
 */
export async function digestRequestGraph(graph, distDirectory) {
  const hash = createHash("sha256");
  hash.update("profile-release-request-graph-v1\0");
  for (const entryPath of graph.entryPaths) {
    hash.update(`entry\0${entryPath}\0`);
  }

  let bytes = 0;
  for (const outputPath of graph.files) {
    const content = await readFile(
      absoluteOutputPath(distDirectory, outputPath),
    );
    bytes += content.length;
    hash.update(`file\0${outputPath}\0${content.length}\0`);
    hash.update(content);
    hash.update("\0");
  }

  return {
    algorithm: GRAPH_DIGEST_ALGORITHM,
    sha256: hash.digest("hex"),
    fileCount: graph.files.length,
    bytes,
  };
}

/**
 * @param {{ distDirectory: string; routes: Array<{ id: string; path: string; surface: string }>; basePath: string; siteUrl: string }} options
 */
export async function inspectReleaseSurfaces({
  distDirectory,
  routes,
  basePath,
  siteUrl,
}) {
  /** @typedef {"static-view" | "immersive-entry"} ReleaseSurfaceId */
  /**
   * @typedef {{
   *   enabled: boolean;
   *   routeIds: string[];
   *   entryPaths: string[];
   *   requestGraph: { algorithm: string; sha256: string | null; fileCount: number; bytes: number };
   * }} ReleaseSurfaceManifest
   */
  /** @type {Partial<Record<ReleaseSurfaceId, RequestGraph>>} */
  const graphs = {};
  /** @type {Partial<Record<ReleaseSurfaceId, ReleaseSurfaceManifest>>} */
  const manifests = {};

  for (const surfaceId of RELEASE_SURFACE_IDS) {
    const surfaceRoutes = routes.filter((route) => route.surface === surfaceId);
    const entryPaths = surfaceRoutes.map(routeOutputPath).sort();
    const graph = await buildRequestGraph({
      distDirectory,
      entryPaths,
      basePath,
      siteUrl,
    });
    const enabled = surfaceRoutes.length > 0;
    graphs[surfaceId] = graph;
    manifests[surfaceId] = {
      enabled,
      routeIds: surfaceRoutes.map((route) => route.id).sort(),
      entryPaths,
      requestGraph: enabled
        ? await digestRequestGraph(graph, distDirectory)
        : {
            algorithm: GRAPH_DIGEST_ALGORITHM,
            sha256: null,
            fileCount: 0,
            bytes: 0,
          },
    };
  }

  return {
    graphs: /** @type {Record<ReleaseSurfaceId, RequestGraph>} */ (graphs),
    manifests: /** @type {Record<ReleaseSurfaceId, ReleaseSurfaceManifest>} */ (
      manifests
    ),
  };
}

/**
 * @param {RequestGraph} graph
 * @returns {string[]}
 */
export function findStaticRuntimeViolations(graph) {
  return graph.files.filter((outputPath) => {
    const lowerPath = outputPath.toLowerCase();
    return (
      STATIC_FORBIDDEN_EXTENSIONS.has(extname(lowerPath)) ||
      lowerPath.includes("immersive") ||
      lowerPath === "explore/index.html" ||
      lowerPath.startsWith("explore/")
    );
  });
}

/**
 * Assign every built file without double-counting files shared by the two
 * request graphs. Files not reached from either surface remain part of the
 * Static release envelope, so adding an immersive route cannot hide orphaned
 * output from the preserved 15 MB Static View ceiling.
 *
 * @param {string[]} allFiles
 * @param {RequestGraph} staticGraph
 * @param {RequestGraph} immersiveGraph
 */
export function classifyReleaseFiles(allFiles, staticGraph, immersiveGraph) {
  const all = [...new Set(allFiles.map(normalizeOutputPath))].sort();
  const staticFiles = new Set(staticGraph.files);
  const immersiveFiles = new Set(immersiveGraph.files);
  const shared = all.filter(
    (path) => staticFiles.has(path) && immersiveFiles.has(path),
  );
  const immersiveExclusive = all.filter(
    (path) => immersiveFiles.has(path) && !staticFiles.has(path),
  );
  const immersiveExclusiveSet = new Set(immersiveExclusive);

  return {
    shared,
    immersiveExclusive,
    staticRelease: all.filter((path) => !immersiveExclusiveSet.has(path)),
    unclaimed: all.filter(
      (path) => !staticFiles.has(path) && !immersiveFiles.has(path),
    ),
  };
}

/**
 * @param {string[]} allFiles
 * @param {RequestGraph} staticGraph
 * @param {RequestGraph} immersiveGraph
 * @returns {string[]}
 */
export function findUnclaimedRuntimeAssets(
  allFiles,
  staticGraph,
  immersiveGraph,
) {
  return classifyReleaseFiles(
    allFiles,
    staticGraph,
    immersiveGraph,
  ).unclaimed.filter((outputPath) => {
    const lowerPath = outputPath.toLowerCase();
    return (
      STATIC_FORBIDDEN_EXTENSIONS.has(extname(lowerPath)) ||
      lowerPath.includes("immersive") ||
      lowerPath === "explore/index.html" ||
      lowerPath.startsWith("explore/")
    );
  });
}

/**
 * Enforce the Static View execution and motion policy across every file
 * charged to the Static release, including unclaimed output. JSON-LD is the
 * only inert script block currently emitted by Static View.
 *
 * @param {{ distDirectory: string; outputPaths: string[] }} options
 * @returns {Promise<string[]>}
 */
export async function findStaticReleasePolicyViolations({
  distDirectory,
  outputPaths,
}) {
  const failures = [];
  for (const outputPath of [...new Set(outputPaths)].sort()) {
    const lowerPath = outputPath.toLowerCase();
    const extension = extname(lowerPath);
    if (
      STATIC_FORBIDDEN_EXTENSIONS.has(extension) ||
      lowerPath.includes("immersive") ||
      lowerPath === "explore/index.html" ||
      lowerPath.startsWith("explore/")
    ) {
      failures.push(
        `${outputPath} is an executable or immersive runtime asset in Static View`,
      );
    }

    if (extension === ".html") {
      const html = await readFile(
        absoluteOutputPath(distDirectory, outputPath),
        "utf8",
      );
      if (/<canvas(?:\s|>)/iu.test(html)) {
        failures.push(`${outputPath} contains a canvas in Static View`);
      }
      for (const match of html.matchAll(/<script\b([^>]*)>/giu)) {
        const attributes = readAttributes(match[1] ?? "");
        const inertJsonLd =
          attributes.get("type")?.toLowerCase() === "application/ld+json" &&
          !attributes.has("src");
        if (!inertJsonLd) {
          failures.push(
            `${outputPath} contains an executable script in Static View`,
          );
        }
      }
      for (const match of html.matchAll(REQUEST_TAG_PATTERN)) {
        const rawAttributes = match[2] ?? "";
        const attributes = readAttributes(rawAttributes);
        if (/\son[a-z]+\s*=/iu.test(` ${rawAttributes}`)) {
          failures.push(
            `${outputPath} contains an inline event handler in Static View`,
          );
        }
        if (
          [...attributes.values()].some((value) =>
            value.trim().toLowerCase().startsWith("javascript:"),
          )
        ) {
          failures.push(
            `${outputPath} contains a javascript: URL in Static View`,
          );
        }
        const inlineStyle = attributes.get("style");
        if (inlineStyle) {
          for (const label of staticMotionViolations(inlineStyle)) {
            failures.push(
              `${outputPath} contains forbidden inline Static View ${label}`,
            );
          }
        }
      }
      for (const match of html.matchAll(
        /<style\b[^>]*>([\s\S]*?)<\/style>/giu,
      )) {
        for (const label of staticMotionViolations(match[1] ?? "")) {
          failures.push(
            `${outputPath} contains forbidden inline Static View ${label}`,
          );
        }
      }
    }

    if (extension === ".css") {
      const css = await readFile(
        absoluteOutputPath(distDirectory, outputPath),
        "utf8",
      );
      for (const label of staticMotionViolations(css)) {
        failures.push(`${outputPath} contains forbidden Static View ${label}`);
      }
    }
  }
  return failures;
}

/**
 * @param {RequestGraph} graph
 * @param {string[]} startPaths
 * @param {string} targetPath
 * @returns {boolean}
 */
function graphReaches(graph, startPaths, targetPath) {
  const adjacency = new Map();
  for (const { from, to } of graph.edges) {
    const targets = adjacency.get(from) ?? [];
    targets.push(to);
    adjacency.set(from, targets);
  }
  const queue = [...startPaths];
  const visited = new Set();
  while (queue.length > 0) {
    const path = queue.shift();
    if (!path || visited.has(path)) continue;
    if (path === targetPath) return true;
    visited.add(path);
    queue.push(...(adjacency.get(path) ?? []));
  }
  return false;
}

/**
 * Validate the release-level immersive bootstrap envelope. The full manifest
 * schema remains owned by the immersive runtime; this boundary proves that an
 * enabled route loads a module which reaches the canonical JSON manifest and
 * that its opt-in/fallback/integrity identity cannot be mistaken for Static
 * View.
 *
 * @param {{ graph: RequestGraph; distDirectory: string; basePath: string }} options
 * @returns {Promise<string[]>}
 */
export async function validateImmersiveSurfaceBootstrap({
  graph,
  distDirectory,
  basePath: rawBasePath,
}) {
  if (graph.entryPaths.length === 0) {
    return graph.files.length === 0
      ? []
      : ["A disabled immersive surface must have a zero-file request graph"];
  }

  const failures = [];
  if (
    graph.entryPaths.length !== 1 ||
    graph.entryPaths[0] !== "explore/index.html"
  ) {
    failures.push(
      "An enabled immersive surface must have exactly explore/index.html as its entry",
    );
  }
  const bootstrapModules = [];
  for (const entryPath of graph.entryPaths) {
    let html;
    try {
      html = await readFile(
        absoluteOutputPath(distDirectory, entryPath),
        "utf8",
      );
    } catch {
      continue;
    }
    for (const match of html.matchAll(REQUEST_TAG_PATTERN)) {
      if (match[1]?.toLowerCase() !== "script") continue;
      const attributes = readAttributes(match[2] ?? "");
      if (attributes.get("type")?.toLowerCase() !== "module") continue;
      const source = attributes.get("src");
      if (!source) continue;
      for (const { from, request, to } of graph.edges) {
        if (
          from === entryPath &&
          request === source &&
          [".js", ".mjs"].includes(extname(to).toLowerCase())
        ) {
          bootstrapModules.push(to);
        }
      }
    }
  }
  if (bootstrapModules.length === 0) {
    failures.push(
      "An enabled immersive entry must directly request a JavaScript module bootstrap",
    );
  }

  if (!graph.files.includes(IMMERSIVE_RUNTIME_MANIFEST_PATH)) {
    failures.push(
      `An enabled immersive entry must reach ${IMMERSIVE_RUNTIME_MANIFEST_PATH}`,
    );
    return failures;
  }
  if (
    bootstrapModules.length > 0 &&
    !graphReaches(graph, bootstrapModules, IMMERSIVE_RUNTIME_MANIFEST_PATH)
  ) {
    failures.push(
      `The immersive module bootstrap does not reach ${IMMERSIVE_RUNTIME_MANIFEST_PATH}`,
    );
  }

  let manifest;
  try {
    manifest = JSON.parse(
      await readFile(
        absoluteOutputPath(distDirectory, IMMERSIVE_RUNTIME_MANIFEST_PATH),
        "utf8",
      ),
    );
  } catch {
    failures.push("The immersive runtime manifest is not valid JSON");
    return failures;
  }

  const basePath = normalizeBasePath(rawBasePath);
  if (
    !manifest ||
    typeof manifest !== "object" ||
    manifest.schemaVersion !== "1.0.0" ||
    manifest.surface?.route !== `${basePath}/explore/` ||
    manifest.surface?.entryMode !== "explicit-user-opt-in" ||
    manifest.surface?.publicNavigation !== "disabled-until-complete-matrix" ||
    manifest.surface?.staticFallback !== `${basePath}/` ||
    manifest.surface?.serviceWorkerScope !== `${basePath}/explore/` ||
    manifest.integrity?.algorithm !== "SHA-256" ||
    manifest.integrity?.verifyBeforeParse !== true ||
    manifest.integrity?.manifestCompleteness !==
      "15-characters-16-scenes-3-powers"
  ) {
    failures.push(
      "The immersive runtime manifest does not satisfy the release bootstrap envelope",
    );
  }
  return failures;
}

/**
 * @param {string} root
 * @param {string} absolutePath
 * @returns {string}
 */
export function relativeReleasePath(root, absolutePath) {
  return relative(root, absolutePath).replaceAll("\\", "/");
}
