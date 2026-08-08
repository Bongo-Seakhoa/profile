import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

const repositoryRoot = process.cwd();
const outputDirectory = resolve(repositoryRoot, "public", "assets", "social");
const routes = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "src", "data", "profile", "routes.json"),
    "utf8",
  ),
);
const [identity] = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "src", "data", "profile", "identity.json"),
    "utf8",
  ),
);
const font = await readFile(
  resolve(
    repositoryRoot,
    "node_modules",
    "@fontsource-variable",
    "ibm-plex-sans",
    "files",
    "ibm-plex-sans-latin-wght-normal.woff2",
  ),
);
const embeddedFont = font.toString("base64");

const WIDTH = 1200;
const HEIGHT = 630;
const cards = routes.filter((route) => route.staticRenderable);
const accents = [
  { primary: "#d3a03f", secondary: "#bc5a3c", field: "#173e46" },
  { primary: "#5f9ca2", secondary: "#d3a03f", field: "#243f5a" },
  { primary: "#bc5a3c", secondary: "#5f9ca2", field: "#3f3328" },
];

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value, maximumCharacters, maximumLines) {
  const words = value.trim().split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line.length > 0 ? `${line} ${word}` : word;
    if (candidate.length <= maximumCharacters || line.length === 0) {
      line = candidate;
      continue;
    }

    lines.push(line);
    line = word;
  }

  if (line.length > 0) lines.push(line);

  if (lines.length <= maximumLines) return lines;

  const visible = lines.slice(0, maximumLines);
  const remainder = lines.slice(maximumLines - 1).join(" ");
  visible[maximumLines - 1] =
    remainder.length > maximumCharacters
      ? `${remainder.slice(0, maximumCharacters - 1).trimEnd()}…`
      : remainder;
  return visible;
}

function textLines(lines, { x, y, lineHeight, className }) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" class="${className}">${escapeXml(line)}</text>`,
    )
    .join("");
}

function routeLabelFor(route) {
  if (route.id === "home") return "PROFESSIONAL PORTFOLIO";
  if (route.id === "explore") return "ORIGINAL FICTIONAL WORLD";
  if (route.kind === "project") return "SELECTED WORK";
  if (route.kind === "document") return "PROFESSIONAL DOCUMENT";
  if (route.kind === "continuity") return "IDENTITY CONTINUITY";
  if (route.kind === "system") return "PAGE RECOVERY";
  return "PROFESSIONAL PROFILE";
}

function cardSvg(route, index) {
  const accent = accents[index % accents.length];
  const titleLines = wrapText(route.title, 31, 2);
  const descriptionLines = wrapText(route.description, 62, 3);
  const titleBaseline = 232;
  const descriptionBaseline = titleBaseline + titleLines.length * 72 + 42;
  const routeLabel = routeLabelFor(route);
  const motifOffset = (index % 5) * 20;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <style>
        @font-face {
          font-family: "IBM Plex Sans Social";
          src: url("data:font/woff2;base64,${embeddedFont}") format("woff2");
          font-weight: 100 700;
          font-style: normal;
        }
        text { font-family: "IBM Plex Sans Social", Arial, sans-serif; }
        .brand { fill: #fffaf0; font-size: 28px; font-weight: 650; letter-spacing: 0.01em; }
        .label { fill: ${accent.primary}; font-size: 22px; font-weight: 700; letter-spacing: 0.16em; }
        .title { fill: #fffaf0; font-size: 58px; font-weight: 680; letter-spacing: -0.015em; }
        .description { fill: #d9ded8; font-size: 25px; font-weight: 420; }
        .path { fill: #bfc9c3; font-size: 18px; font-weight: 550; letter-spacing: 0.04em; }
        .mark { fill: #fffaf0; font-size: 24px; font-weight: 700; }
      </style>

      <rect width="${WIDTH}" height="${HEIGHT}" fill="#12261f" />
      <circle cx="${1115 - motifOffset}" cy="${84 + motifOffset}" r="278" fill="${accent.field}" />
      <path d="M710 630 C830 ${455 - motifOffset}, 965 ${515 + motifOffset}, 1200 350 L1200 630 Z" fill="${accent.primary}" />
      <path d="M770 630 C900 ${525 + motifOffset}, 1045 ${585 - motifOffset}, 1200 462 L1200 630 Z" fill="${accent.secondary}" />
      <path d="M900 630 C995 570, 1090 584, 1200 520 L1200 630 Z" fill="#f5e9d2" />

      <rect x="64" y="56" width="56" height="56" rx="14" fill="none" stroke="${accent.primary}" stroke-width="3" />
      <text x="92" y="92" text-anchor="middle" class="mark">BS</text>
      <text x="142" y="92" class="brand">${escapeXml(identity.primaryName)}</text>
      <rect x="64" y="137" width="118" height="5" rx="2.5" fill="${accent.primary}" />
      <rect x="190" y="137" width="54" height="5" rx="2.5" fill="${accent.secondary}" />

      <text x="64" y="184" class="label">${escapeXml(routeLabel)}</text>
      ${textLines(titleLines, { x: 64, y: titleBaseline, lineHeight: 72, className: "title" })}
      ${textLines(descriptionLines, { x: 64, y: descriptionBaseline, lineHeight: 36, className: "description" })}

      <text x="64" y="582" class="path">bongo-seakhoa.github.io/profile/${escapeXml(route.path)}</text>
      <rect x="64" y="602" width="${250 + index * 7}" height="4" rx="2" fill="${accent.primary}" />
    </svg>
  `;
}

await mkdir(outputDirectory, { recursive: true });
const manifest = [];

for (const [index, route] of cards.entries()) {
  const outputPath = resolve(outputDirectory, `${route.id}.jpg`);
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  const buffer = await sharp(Buffer.from(cardSvg(route, index)))
    .jpeg({
      quality: 88,
      chromaSubsampling: "4:4:4",
      mozjpeg: true,
    })
    .toBuffer();

  await writeFile(temporaryPath, buffer);
  await rename(temporaryPath, outputPath);
  manifest.push({
    routeId: route.id,
    routePath: route.path,
    path: `assets/social/${route.id}.jpg`,
    width: WIDTH,
    height: HEIGHT,
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  });
}

const manifestPath = resolve(outputDirectory, "manifest.json");
const temporaryManifestPath = `${manifestPath}.${process.pid}.tmp`;
await writeFile(
  temporaryManifestPath,
  `${JSON.stringify(
    {
      schemaVersion: "1.0.0",
      generator: "scripts/build-social-cards.mjs",
      font: "IBM Plex Sans Variable",
      cards: manifest,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
await rename(temporaryManifestPath, manifestPath);

console.log(
  `Built ${manifest.length} deterministic 1200x630 social cards with route-specific copy.`,
);
