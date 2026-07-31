import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "..", "..");

async function read(path: string): Promise<string> {
  return readFile(resolve(repositoryRoot, path), "utf8");
}

describe("production build pipeline", () => {
  it("does not invoke the retained legacy Python generator", async () => {
    const packageManifest = JSON.parse(await read("package.json")) as {
      scripts: Record<string, string>;
    };
    const productionCommands = Object.values(packageManifest.scripts).join(
      "\n",
    );
    const workflow = await read(".github/workflows/deploy-pages.yml");

    expect(productionCommands).not.toMatch(/\bpython(?:3)?\b|build\.py/i);
    expect(workflow).not.toMatch(/\bpython(?:3)?\b|build\.py/i);
  });

  it("builds professional documents through JavaScript and Chromium", async () => {
    const documentBuilder = await read("scripts/build-documents.mjs");

    expect(documentBuilder).toContain('from "@playwright/test"');
    expect(documentBuilder).toContain('from "pdf-lib"');
    expect(documentBuilder).toContain("page.pdf(");
    expect(documentBuilder).not.toMatch(/\bpython(?:3)?\b|build\.py/i);
  });
});
