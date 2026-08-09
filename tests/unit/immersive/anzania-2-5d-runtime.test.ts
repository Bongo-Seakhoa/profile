import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

interface SceneRecord {
  readonly large: string;
  readonly small: string;
}

interface LocationRecord {
  readonly id: string;
  readonly number: string;
  readonly name: string;
  readonly outer: SceneRecord;
  readonly inner: SceneRecord;
  readonly power: string;
  readonly biome: string;
  readonly deepDive: {
    readonly heading: string;
    readonly pillars: readonly unknown[];
    readonly now: readonly unknown[];
    readonly notes: readonly {
      readonly question: string;
      readonly answer: string;
    }[];
  };
}

interface GuideRecord {
  readonly id: string;
  readonly name: string;
  readonly presentation: "Masculine" | "Feminine" | "Neutral";
  readonly inspiration: string;
  readonly specialty: string;
  readonly temperament: string;
  readonly src: string;
  readonly alt: string;
}

interface RuntimeManifest {
  readonly schemaVersion: string;
  readonly world: {
    readonly name: string;
    readonly definition: string;
    readonly disclaimer: string;
    readonly experience: string;
  };
  readonly locations: readonly LocationRecord[];
  readonly powers: Readonly<
    Record<
      string,
      {
        readonly name: string;
        readonly durationMs: number;
        readonly className: string;
      }
    >
  >;
  readonly guides: readonly GuideRecord[];
  readonly atlas: { readonly src: string; readonly alt: string };
}

const repositoryRoot = resolve(import.meta.dirname, "..", "..", "..");
const immersiveRoot = resolve(repositoryRoot, "public", "assets", "immersive");
const manifestPath = resolve(immersiveRoot, "runtime-manifest.json");
const runtimePath = resolve(immersiveRoot, "anzania-explorer.js");
const baseCssPath = resolve(immersiveRoot, "anzania-explorer.css");
const v2CssPath = resolve(immersiveRoot, "anzania-explorer-v2.css");

const parseManifest = async (): Promise<RuntimeManifest> =>
  JSON.parse(await readFile(manifestPath, "utf8")) as RuntimeManifest;

const resolveManifestAsset = (path: string): string =>
  resolve(immersiveRoot, path.replace(/^\.\//, ""));

describe("Explore Anzania 2.5D release manifest", () => {
  it("defines Anzania only as an original fictional portfolio world", async () => {
    const manifest = await parseManifest();

    expect(manifest.world).toEqual({
      name: "Anzania",
      definition:
        "An original fictional portfolio world created for Bongo Seakhoa.",
      disclaimer:
        "Anzania is fictional. It is not Tanzania or any other real location.",
      experience: "Interactive 2.5D guided portfolio journey",
    });
  });

  it("ships the complete eight-location narrative and four selectable traversal powers", async () => {
    const manifest = await parseManifest();

    expect(manifest.schemaVersion).toBe("3.0.0");
    expect(manifest.locations.map(({ name }) => name)).toEqual([
      "Threshold Dunes",
      "Stone Pass of Names",
      "Garden of Origins",
      "Archive of Echoes",
      "Forge of Resolve",
      "Bazaar of Skill",
      "Observatory of Horizons",
      "Oasis of Audience",
    ]);
    expect(Object.keys(manifest.powers)).toEqual([
      "dune-surfing",
      "sand-teleportation",
      "solar-propulsion",
      "reality-bending",
    ]);
    expect(
      manifest.locations.every(({ power }) => power in manifest.powers),
    ).toBe(true);
    expect(
      manifest.locations.every(
        ({ biome, deepDive }) =>
          biome.length > 0 &&
          deepDive.heading.length > 0 &&
          deepDive.pillars.length >= 3 &&
          deepDive.now.length >= 2 &&
          deepDive.notes.length >= 3,
      ),
    ).toBe(true);
  });

  it("publishes responsive outer and inner plates for every location", async () => {
    const manifest = await parseManifest();
    const paths = manifest.locations.flatMap(({ outer, inner }) => [
      outer.large,
      outer.small,
      inner.large,
      inner.small,
    ]);

    expect(new Set(paths).size).toBe(32);
    await Promise.all(
      paths.map(async (path) => {
        expect(path).toMatch(/^\.\/scenes\/.+-\d+\.webp$/);
        expect((await stat(resolveManifestAsset(path))).size).toBeGreaterThan(
          15_000,
        );
      }),
    );
  });
});

describe("original illustrated full-body companion roster", () => {
  it("provides fifteen distinct guides across three presentations", async () => {
    const manifest = await parseManifest();
    const counts = manifest.guides.reduce(
      (accumulator, guide) => {
        accumulator[guide.presentation] += 1;
        return accumulator;
      },
      { Masculine: 0, Feminine: 0, Neutral: 0 },
    );

    expect(manifest.guides).toHaveLength(15);
    expect(counts.Masculine).toBe(5);
    expect(counts.Feminine).toBe(5);
    expect(counts.Neutral).toBe(5);
    expect(new Set(manifest.guides.map(({ id }) => id)).size).toBe(15);
    expect(
      manifest.guides.every(
        ({ specialty, temperament }) =>
          specialty.length > 0 && temperament.length > 0,
      ),
    ).toBe(true);
  });

  it("keeps every runtime guide transparent, portrait-oriented and authored as a layered SVG", async () => {
    const manifest = await parseManifest();

    await Promise.all(
      manifest.guides.map(async (guide) => {
        const path = resolveManifestAsset(guide.src);
        const [source, metadata] = await Promise.all([
          readFile(path, "utf8"),
          stat(path),
        ]);

        expect(guide.src).toMatch(/^\.\/characters\/.+\.svg$/);
        expect(guide.alt).toContain("Full-body");
        expect(source).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
        expect(source).toContain('viewBox="0 0 540 1280"');
        expect(source).toContain("<linearGradient");
        expect(source).toContain("<filter");
        expect(metadata.size).toBeGreaterThan(4_000);
      }),
    );
  });
});

describe("responsive framing and interaction runtime", () => {
  it("implements larger safe-zone framing, deep records and biome effects without OTS framing", async () => {
    const [runtime, baseCss, v2Css] = await Promise.all([
      readFile(runtimePath, "utf8"),
      readFile(baseCssPath, "utf8"),
      readFile(v2CssPath, "utf8"),
    ]);

    expect(runtime).toContain("calculateFraming");
    expect(runtime).toContain("recalculateFraming");
    expect(runtime).toContain("intersectionArea");
    expect(runtime).toContain("ResizeObserver");
    expect(runtime).toContain("state.isTraversing");
    expect(runtime).toContain("targetRatio");
    expect(runtime).toContain("renderDeepDive");
    expect(runtime).toContain("selectPower");
    expect(runtime).toContain("0.14");
    expect(runtime).toContain("0.2");
    expect(runtime).not.toMatch(/over-the-shoulder|\bOTS\b/i);

    expect(baseCss).toContain("--avatar-height");
    expect(baseCss).toContain("--avatar-left");
    expect(baseCss).toContain("--avatar-top");
    expect(baseCss).toContain(".experience.is-looking-back .companion img");
    expect(baseCss).toContain(".experience.is-traversing .companion");
    expect(baseCss).toContain("@media (prefers-reduced-motion: reduce)");

    expect(v2Css).toContain(".scene__environment");
    expect(v2Css).toContain('.experience[data-biome="garden"]');
    expect(v2Css).toContain('.experience[data-biome="forge"]');
    expect(v2Css).toContain(".ability-dock");
    expect(v2Css).toContain(".chapter-panel__inside");
  });

  it("keeps the immersive runtime isolated from the Static View source tree", async () => {
    const runtime = await readFile(runtimePath, "utf8");

    expect(runtime).toContain(
      'new URL("./runtime-manifest.json", import.meta.url)',
    );
    expect(runtime).toContain('new URL("../../", import.meta.url)');
    expect(runtime).not.toContain("document.write");
    expect(runtime).not.toContain("eval(");
    expect(runtime).not.toContain("canvas");
  });
});
