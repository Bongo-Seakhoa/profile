import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

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

const packageManifest = JSON.parse(await readFile(packagePath, "utf8"));
const [siteSettings] = JSON.parse(await readFile(settingsPath, "utf8"));

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
const builtAt =
  process.env.RELEASE_TIMESTAMP?.trim() || new Date().toISOString();

const metadata = {
  schemaVersion: "1.0.0",
  artifact: "static-view",
  version: packageManifest.version,
  revision: revision || "unknown",
  builtAt,
  siteUrl: siteSettings.siteUrl,
  basePath: siteSettings.basePath,
};

await mkdir(distDirectory, { recursive: true });
await writeFile(
  resolve(distDirectory, "version.json"),
  `${JSON.stringify(metadata, null, 2)}\n`,
  "utf8",
);

console.log(
  `Wrote dist/version.json for ${metadata.version} (${metadata.revision.slice(0, 12)}).`,
);
