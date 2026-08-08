import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";
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
}

interface GuideRecord {
  readonly id: string;
  readonly name: string;
  readonly presentation: "Masculine" | "Feminine" | "Neutral";
  readonly inspiration: string;
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
const cssPath = resolve(immersiveRoot, "anzania-explorer.css");

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
      experience: "Cinematic 2.5D guided portfolio journey",
    });
  });

  it("ships the complete eight-location narrative and four traversal powers", async () => {
    const manifest = await parseManifest();

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

describe("full-body companion roster", () => {
  it("provides fifteen complete silhouettes across three presentations", async () => {
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
  });

  it("keeps every runtime guide transparent, portrait-oriented and full-body sized", async () => {
    const manifest = await parseManifest();

    await Promise.all(
      manifest.guides.map(async (guide) => {
        const path = resolveManifestAsset(guide.src);
        const metadata = await sharp(path).metadata();

        expect(guide.src).toMatch(/^\.\/characters\/.+\.webp$/);
        expect(guide.alt).toContain("Full-body");
        expect(metadata.width).toBe(540);
        expect(metadata.height).toBe(1280);
        expect(metadata.hasAlpha).toBe(true);
        expect((await stat(path)).size).toBeGreaterThan(50_000);
      }),
    );
  });
});

describe("responsive framing and interaction runtime", () => {
  it("implements animated-bound safe zones without OTS framing", async () => {
    const [runtime, css] = await Promise.all([
      readFile(runtimePath, "utf8"),
      readFile(cssPath, "utf8"),
    ]);

    expect(runtime).toContain("calculateFraming");
    expect(runtime).toContain("recalculateFraming");
    expect(runtime).toContain("intersectionArea");
    expect(runtime).toContain("ResizeObserver");
    expect(runtime).toContain("state.isTraversing");
    expect(runtime).toContain("targetRatio");
    expect(runtime).toContain("0.14");
    expect(runtime).toContain("0.2");
    expect(runtime).not.toMatch(/over-the-shoulder|\bOTS\b/i);

    expect(css).toContain("--avatar-height");
    expect(css).toContain("--avatar-left");
    expect(css).toContain("--avatar-top");
    expect(css).toContain(".experience.is-looking-back .companion img");
    expect(css).toContain(".experience.is-traversing .companion");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps the immersive runtime isolated from the Static View source tree", async () => {
    const runtime = await readFile(runtimePath, "utf8");

    expect(runtime).toContain(
      'new URL("./runtime-manifest.json", import.meta.url)',
    );
    expect(runtime).toContain('new URL("../../", import.meta.url)');
    expect(runtime).not.toContain("document.write");
    expect(runtime).not.toContain("eval(");
  });
});
