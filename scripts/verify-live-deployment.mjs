import { assertProfessionalAttribution } from "./professional-attribution.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { URL } from "node:url";
import { TextDecoder } from "node:util";

const [settings] = JSON.parse(
  await readFile("src/data/profile/site-settings.json", "utf8"),
);
const expected = process.env.RELEASE_SHA;
if (!expected)
  throw new Error("RELEASE_SHA is required for live verification.");
const base = settings.siteUrl;
async function request(path) {
  const url = new URL(path, base);
  url.searchParams.set("release", expected);
  const response = await globalThis.fetch(url, {
    signal: globalThis.AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response;
}
let matched = false;
for (let attempt = 0; attempt < 24; attempt += 1) {
  try {
    const metadata = await (await request("version.json")).json();
    if (metadata.revision === expected) {
      matched = true;
      break;
    }
  } catch {
    /* Pages can briefly serve the preceding release during propagation. */
  }
  await setTimeout(10000);
}
if (!matched)
  throw new Error("The live Pages revision does not match the tested release.");
const checks = [];
for (const [path, needles] of [
  [
    "",
    [
      "OmniMind",
      "FXPM: validation and execution",
      "Accepted for ISM 2026",
      "TN8RXZY8M354",
    ],
  ],
  ["experience/", ["Nov 2024 to Jun 2025", "Appen"]],
  ["education/", ["BSc in Engineering Management", "Explore AI Academy"]],
  ["about/", ["Engineering Management"]],
  ["bongo-kosa/", ["One professional identity"]],
  ["credentials/", ["TN8RXZY8M354"]],
  ["research/", ["Accepted for ISM 2026"]],
  ["work/omnimind/", ["57.66%", "does not establish improved answer quality"]],
]) {
  const html = await (await request(path)).text();
  assertProfessionalAttribution(html, path || "home");
  for (const needle of needles)
    if (!html.includes(needle)) throw new Error(`${path} lacks ${needle}`);
  checks.push(path || "home");
}
for (const kind of ["resume", "cv"])
  for (const name of ["bongo-seakhoa", "bongo-kosa"]) {
    const path = `documents/${kind}/${name}/`;
    const html = await (await request(path)).text();
    assertProfessionalAttribution(html, path || "home");
    for (const needle of [
      "TN8RXZY8M354",
      "ism-2026-validation-gates",
      "Jun 2025",
    ])
      if (!html.includes(needle)) throw new Error(`${path} lacks ${needle}`);
    const pdfPath = `documents/${name}-${kind}.pdf`;
    const response = await request(pdfPath);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (
      !response.headers.get("content-type")?.includes("application/pdf") ||
      new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
    )
      throw new Error(`${pdfPath} is not a PDF`);
    checks.push(path, pdfPath);
  }
const immersive = await (
  await request("assets/immersive/runtime-manifest.json")
).json();
if (
  !JSON.stringify(immersive).includes(
    "Google Project Management Professional Certificate",
  ) ||
  !JSON.stringify(immersive).includes("OmniMind")
)
  throw new Error("Anzania professional highlights are stale");
assertProfessionalAttribution(JSON.stringify(immersive), "Anzania");
const report = {
  attributionCheck:
    "Owner-rejected qualification absent from checked HTML and Anzania content",
  revision: expected,
  verifiedAt: new Date().toISOString(),
  siteUrl: base,
  checks,
  immersive: "canonical highlights verified",
};
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/live-verification.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
