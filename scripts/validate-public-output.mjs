import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const repositoryRoot = process.cwd();
const distDirectory = resolve(repositoryRoot, "dist");
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

const forbiddenStaticExtensions = new Set([
  ".bin",
  ".blend",
  ".fbx",
  ".glb",
  ".gltf",
  ".js",
  ".mjs",
  ".mp3",
  ".mp4",
  ".ogg",
  ".wasm",
  ".webm",
]);
for (const path of distFiles) {
  const extension = extname(path).toLowerCase();
  const publicPath = relative(distDirectory, path).replaceAll("\\", "/");
  if (forbiddenStaticExtensions.has(extension)) {
    failures.push(
      `${publicPath} is an executable or immersive runtime asset in Static View`,
    );
  }
  if (publicPath.toLowerCase().includes("immersive")) {
    failures.push(`${publicPath} exposes an immersive asset in Static View`);
  }
}

const htmlFiles = distFiles.filter((path) => extname(path) === ".html");
for (const path of htmlFiles) {
  const html = await readFile(path, "utf8");

  if (/<canvas(?:\s|>)/i.test(html)) {
    failures.push(`${displayPath(path)} contains a canvas in Static View`);
  }
  if (/<script\b[^>]*\bsrc\s*=/i.test(html)) {
    failures.push(`${displayPath(path)} loads a client script in Static View`);
  }
  if (/<script\b[^>]*\btype=(?:"|')module(?:"|')/i.test(html)) {
    failures.push(
      `${displayPath(path)} contains a client module in Static View`,
    );
  }
  if (/href=(?:"|')tel:/i.test(html)) {
    failures.push(`${displayPath(path)} exposes a public telephone link`);
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
for (const path of cssFiles) {
  const css = await readFile(path, "utf8");
  const forbiddenMotion = [
    [/@keyframes\b/i, "@keyframes"],
    [/\banimation(?:-name)?\s*:(?!\s*none\b)/i, "animation"],
    [/\bscroll-behavior\s*:\s*smooth/i, "smooth scrolling"],
    [/\btransition\s*:/i, "transition"],
  ];
  for (const [pattern, label] of forbiddenMotion) {
    if (pattern.test(css)) {
      failures.push(
        `${displayPath(path)} contains forbidden Static View ${label}`,
      );
    }
  }
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

console.log(
  `Validated ${htmlFiles.length} HTML files, ${cssFiles.length} CSS files and four direct PDF downloads.`,
);
