import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { startDocumentServer } from "../../scripts/document-server.mjs";
import {
  RELEASE_BUDGET_LIMITS,
  RELEASE_SCOPE_RESERVES,
  REQUIRED_COMPLETE_SCOPE_BYTES,
} from "../../scripts/release-budget-policy.mjs";
import {
  buildRequestGraph,
  classifyReleaseFiles,
  findStaticReleasePolicyViolations,
  findStaticRuntimeViolations,
  findUnclaimedRuntimeAssets,
  IMMERSIVE_RUNTIME_MANIFEST_PATH,
  inspectReleaseSurfaces,
  RELEASE_SURFACES,
  routeOutputPath,
  validateImmersiveSurfaceBootstrap,
} from "../../scripts/release-surfaces.mjs";
import { CHARACTER_PRODUCTION_EXPORT_BUDGETS } from "../../src/immersive/characters/production-asset-gate";
import {
  CANONICAL_RUNTIME_CHARACTER_IDS,
  REQUIRED_LOCATION_SCENES,
} from "../../src/immersive/runtime/runtime-manifest";

/** @type {string[]} */
const temporaryDirectories = [];

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "profile-release-surfaces-"));
  temporaryDirectories.push(root);
  return root;
}

/**
 * @param {string} root
 * @param {string} outputPath
 * @param {string} [content]
 */
async function writeFixture(root, outputPath, content = "fixture") {
  const path = join(root, ...outputPath.split("/"));
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

function validImmersiveManifestEnvelope() {
  return {
    schemaVersion: "1.0.0",
    surface: {
      route: "/profile/explore/",
      entryMode: "explicit-user-opt-in",
      publicNavigation: "disabled-until-complete-matrix",
      staticFallback: "/profile/",
      serviceWorkerScope: "/profile/explore/",
    },
    integrity: {
      algorithm: "SHA-256",
      verifyBeforeParse: true,
      manifestCompleteness: "15-characters-16-scenes-3-powers",
    },
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

describe("release surface request graphs", () => {
  it("maps route registry paths to exact output HTML entries", () => {
    expect(routeOutputPath({ path: "" })).toBe("index.html");
    expect(routeOutputPath({ path: "work/" })).toBe("work/index.html");
    expect(routeOutputPath({ path: "work" })).toBe("work/index.html");
    expect(routeOutputPath({ path: "404.html" })).toBe("404.html");
  });

  it("isolates immersive-only assets and rejects the same asset when Static View reaches it", async () => {
    const root = await createFixture();
    const routes = [
      {
        id: "home",
        path: "",
        surface: RELEASE_SURFACES.staticView,
      },
      {
        id: "explore",
        path: "explore/",
        surface: RELEASE_SURFACES.immersiveEntry,
      },
    ];

    await writeFixture(
      root,
      "index.html",
      [
        '<link rel="stylesheet" href="/profile/assets/static.css">',
        '<link rel="manifest" href="/profile/site.webmanifest">',
        '<meta property="og:image" content="https://example.test/profile/assets/static.jpg">',
        '<a href="/profile/explore/">Explore</a>',
      ].join(""),
    );
    await writeFixture(
      root,
      "assets/static.css",
      '@font-face{src:url("./static.woff2")}body{background:none}',
    );
    await writeFixture(root, "assets/static.woff2");
    await writeFixture(root, "assets/static.jpg");
    await writeFixture(
      root,
      "site.webmanifest",
      JSON.stringify({ icons: [{ src: "/profile/icons/static.png" }] }),
    );
    await writeFixture(root, "icons/static.png");

    await writeFixture(
      root,
      "explore/index.html",
      '<script type="module" src="/profile/assets/immersive/runtime.mjs"></script>',
    );
    await writeFixture(
      root,
      "assets/immersive/runtime.mjs",
      [
        'import "./runtime.css";',
        'const character = new URL("./shared.glb", import.meta.url);',
        'const manifest = fetch("./runtime-manifest.json");',
        "export { character, manifest };",
      ].join("\n"),
    );
    await writeFixture(
      root,
      "assets/immersive/runtime.css",
      '@keyframes hover{to{transform:translateY(-1px)}}.power{background:url("./power.ktx2")}',
    );
    await writeFixture(root, "assets/immersive/shared.glb");
    await writeFixture(root, "assets/immersive/power.ktx2");
    await writeFixture(
      root,
      IMMERSIVE_RUNTIME_MANIFEST_PATH,
      JSON.stringify(validImmersiveManifestEnvelope()),
    );

    const release = await inspectReleaseSurfaces({
      distDirectory: root,
      routes,
      basePath: "/profile",
      siteUrl: "https://example.test/profile/",
    });
    const staticGraph = release.graphs[RELEASE_SURFACES.staticView];
    const immersiveGraph = release.graphs[RELEASE_SURFACES.immersiveEntry];

    expect(staticGraph.missing).toEqual([]);
    expect(staticGraph.files).toEqual([
      "assets/static.css",
      "assets/static.jpg",
      "assets/static.woff2",
      "icons/static.png",
      "index.html",
      "site.webmanifest",
    ]);
    expect(staticGraph.files).not.toContain("explore/index.html");
    expect(findStaticRuntimeViolations(staticGraph)).toEqual([]);

    expect(immersiveGraph.missing).toEqual([]);
    expect(immersiveGraph.files).toEqual([
      "assets/immersive/power.ktx2",
      "assets/immersive/runtime-manifest.json",
      "assets/immersive/runtime.css",
      "assets/immersive/runtime.mjs",
      "assets/immersive/shared.glb",
      "explore/index.html",
    ]);
    expect(
      await validateImmersiveSurfaceBootstrap({
        graph: immersiveGraph,
        distDirectory: root,
        basePath: "/profile",
      }),
    ).toEqual([]);
    expect(release.manifests[RELEASE_SURFACES.staticView].routeIds).toEqual([
      "home",
    ]);
    expect(release.manifests[RELEASE_SURFACES.immersiveEntry].routeIds).toEqual(
      ["explore"],
    );
    expect(
      release.manifests[RELEASE_SURFACES.immersiveEntry].requestGraph.sha256,
    ).toMatch(/^[0-9a-f]{64}$/u);

    await writeFixture(
      root,
      "index.html",
      '<link rel="preload" as="fetch" href="/profile/assets/immersive/shared.glb">',
    );
    const contaminatedStaticGraph = await buildRequestGraph({
      distDirectory: root,
      entryPaths: ["index.html"],
      basePath: "/profile",
      siteUrl: "https://example.test/profile/",
    });

    expect(findStaticRuntimeViolations(contaminatedStaticGraph)).toEqual([
      "assets/immersive/shared.glb",
    ]);
  });

  it("records a disabled immersive surface without changing Static View", async () => {
    const root = await createFixture();
    await writeFixture(
      root,
      "index.html",
      "<!doctype html><title>Static</title>",
    );

    const release = await inspectReleaseSurfaces({
      distDirectory: root,
      routes: [
        {
          id: "home",
          path: "",
          surface: RELEASE_SURFACES.staticView,
        },
      ],
      basePath: "/profile",
      siteUrl: "https://example.test/profile/",
    });

    expect(release.manifests[RELEASE_SURFACES.staticView]).toMatchObject({
      enabled: true,
      routeIds: ["home"],
      entryPaths: ["index.html"],
    });
    expect(release.manifests[RELEASE_SURFACES.immersiveEntry]).toEqual({
      enabled: false,
      routeIds: [],
      entryPaths: [],
      requestGraph: {
        algorithm: "sha256-path-content-v1",
        sha256: null,
        fileCount: 0,
        bytes: 0,
      },
    });
  });

  it("fails an enabled immersive entry that has no reachable runtime manifest", async () => {
    const root = await createFixture();
    await writeFixture(
      root,
      "explore/index.html",
      '<script type="module" src="/profile/assets/immersive/runtime.mjs"></script>',
    );
    await writeFixture(
      root,
      "assets/immersive/runtime.mjs",
      "export const ready = true;",
    );
    const graph = await buildRequestGraph({
      distDirectory: root,
      entryPaths: ["explore/index.html"],
      basePath: "/profile",
      siteUrl: "https://example.test/profile/",
    });

    expect(
      await validateImmersiveSurfaceBootstrap({
        graph,
        distDirectory: root,
        basePath: "/profile",
      }),
    ).toContain(
      `An enabled immersive entry must reach ${IMMERSIVE_RUNTIME_MANIFEST_PATH}`,
    );
  });

  it("rejects a classic script as an immersive module bootstrap", async () => {
    const root = await createFixture();
    await writeFixture(
      root,
      "explore/index.html",
      '<script src="/profile/assets/immersive/runtime.mjs"></script>',
    );
    await writeFixture(
      root,
      "assets/immersive/runtime.mjs",
      'fetch("./runtime-manifest.json");',
    );
    await writeFixture(
      root,
      IMMERSIVE_RUNTIME_MANIFEST_PATH,
      JSON.stringify(validImmersiveManifestEnvelope()),
    );
    const graph = await buildRequestGraph({
      distDirectory: root,
      entryPaths: ["explore/index.html"],
      basePath: "/profile",
      siteUrl: "https://example.test/profile/",
    });

    expect(
      await validateImmersiveSurfaceBootstrap({
        graph,
        distDirectory: root,
        basePath: "/profile",
      }),
    ).toContain(
      "An enabled immersive entry must directly request a JavaScript module bootstrap",
    );
  });

  it("rejects a noncanonical immersive route even with a valid manifest", async () => {
    const root = await createFixture();
    await writeFixture(
      root,
      "world/index.html",
      '<script type="module" src="/profile/assets/immersive/runtime.mjs"></script>',
    );
    await writeFixture(
      root,
      "assets/immersive/runtime.mjs",
      'fetch("./runtime-manifest.json");',
    );
    await writeFixture(
      root,
      IMMERSIVE_RUNTIME_MANIFEST_PATH,
      JSON.stringify(validImmersiveManifestEnvelope()),
    );
    const graph = await buildRequestGraph({
      distDirectory: root,
      entryPaths: ["world/index.html"],
      basePath: "/profile",
      siteUrl: "https://example.test/profile/",
    });

    expect(
      await validateImmersiveSurfaceBootstrap({
        graph,
        distDirectory: root,
        basePath: "/profile",
      }),
    ).toContain(
      "An enabled immersive surface must have exactly explore/index.html as its entry",
    );
  });

  it("resolves manifest-relative asset URIs without duplicating their path", async () => {
    const root = await createFixture();
    await writeFixture(
      root,
      IMMERSIVE_RUNTIME_MANIFEST_PATH,
      JSON.stringify({
        characters: [
          {
            package: {
              uri: "characters/dn-m-afr-01.glb",
            },
          },
        ],
      }),
    );
    await writeFixture(root, "assets/immersive/characters/dn-m-afr-01.glb");

    const graph = await buildRequestGraph({
      distDirectory: root,
      entryPaths: [IMMERSIVE_RUNTIME_MANIFEST_PATH],
      basePath: "/profile",
      siteUrl: "https://example.test/profile/",
    });

    expect(graph.missing).toEqual([]);
    expect(graph.files).toContain(
      "assets/immersive/characters/dn-m-afr-01.glb",
    );
    expect(graph.edges).toContainEqual({
      from: IMMERSIVE_RUNTIME_MANIFEST_PATH,
      request: "characters/dn-m-afr-01.glb",
      to: "assets/immersive/characters/dn-m-afr-01.glb",
    });
  });

  it("follows minified side-effect and named module imports", async () => {
    const root = await createFixture();
    await writeFixture(
      root,
      "assets/entry.mjs",
      'import"./side.mjs";import{x}from"./named.mjs";export{x};',
    );
    await writeFixture(root, "assets/side.mjs", "export{};");
    await writeFixture(root, "assets/named.mjs", "export const x=1;");

    const graph = await buildRequestGraph({
      distDirectory: root,
      entryPaths: ["assets/entry.mjs"],
      basePath: "/profile",
      siteUrl: "https://example.test/profile/",
    });

    expect(graph.missing).toEqual([]);
    expect(graph.files).toEqual([
      "assets/entry.mjs",
      "assets/named.mjs",
      "assets/side.mjs",
    ]);
  });

  it("reports cross-origin and same-origin outside-base subresources", async () => {
    const root = await createFixture();
    await writeFixture(
      root,
      "index.html",
      [
        '<img src="/outside.png" alt="">',
        '<img src="https://cdn.example.test/image.png" alt="">',
        '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="">',
      ].join(""),
    );

    const graph = await buildRequestGraph({
      distDirectory: root,
      entryPaths: ["index.html"],
      basePath: "/profile",
      siteUrl: "https://example.test/profile/",
    });

    expect(graph.policyViolations).toHaveLength(2);
    expect(graph.policyViolations).toEqual(
      expect.arrayContaining([
        {
          from: "index.html",
          request: "/outside.png",
          reason: "same-origin subresource is outside the deployment base",
        },
        {
          from: "index.html",
          request: "https://cdn.example.test/image.png",
          reason: "cross-origin subresource is not allowed",
        },
      ]),
    );
  });

  it("reports missing recursive CSS requests", async () => {
    const root = await createFixture();
    await writeFixture(
      root,
      "index.html",
      '<link rel="stylesheet" href="/profile/assets/static.css">',
    );
    await writeFixture(
      root,
      "assets/static.css",
      '.portrait{background:url("./missing.webp")}',
    );

    const graph = await buildRequestGraph({
      distDirectory: root,
      entryPaths: ["index.html"],
      basePath: "/profile",
      siteUrl: "https://example.test/profile/",
    });

    expect(graph.missing).toEqual([
      {
        from: "assets/static.css",
        request: "./missing.webp",
        path: "assets/missing.webp",
      },
    ]);
  });

  it("accounts for shared files once and exposes unclaimed runtime output", () => {
    const staticGraph = {
      entryPaths: ["index.html"],
      files: ["assets/shared.css", "index.html"],
      edges: [],
      missing: [],
    };
    const immersiveGraph = {
      entryPaths: ["explore/index.html"],
      files: [
        "assets/immersive/runtime.mjs",
        "assets/shared.css",
        "explore/index.html",
      ],
      edges: [],
      missing: [],
    };
    const allFiles = [
      "assets/immersive/orphan.glb",
      "assets/immersive/runtime.mjs",
      "assets/shared.css",
      "explore/index.html",
      "index.html",
      "version.json",
    ];

    expect(classifyReleaseFiles(allFiles, staticGraph, immersiveGraph)).toEqual(
      {
        shared: ["assets/shared.css"],
        immersiveExclusive: [
          "assets/immersive/runtime.mjs",
          "explore/index.html",
        ],
        staticRelease: [
          "assets/immersive/orphan.glb",
          "assets/shared.css",
          "index.html",
          "version.json",
        ],
        unclaimed: ["assets/immersive/orphan.glb", "version.json"],
      },
    );
    expect(
      findUnclaimedRuntimeAssets(allFiles, staticGraph, immersiveGraph),
    ).toEqual(["assets/immersive/orphan.glb"]);
  });

  it("applies zero-JS and no-motion policy to unclaimed Static-release files", async () => {
    const root = await createFixture();
    const staticGraph = {
      entryPaths: ["index.html"],
      files: ["index.html"],
      edges: [],
      missing: [],
    };
    const immersiveGraph = {
      entryPaths: [],
      files: [],
      edges: [],
      missing: [],
    };
    const allFiles = [
      "explore/index.html",
      "index.html",
      "orphan.css",
      "orphan.html",
      "orphan.js",
    ];
    await writeFixture(
      root,
      "index.html",
      '<script type="application/ld+json">{"safe":true}</script>',
    );
    await writeFixture(root, "explore/index.html", "<!doctype html>");
    await writeFixture(root, "orphan.css", "a{transition:color 1s}");
    await writeFixture(
      root,
      "orphan.html",
      [
        "<canvas></canvas>",
        "<script>globalThis.active = true;</script>",
        '<button onclick="run()">Run</button>',
        '<a href="javascript:run()">Run</a>',
        "<style>@keyframes drift{to{opacity:0}}</style>",
        '<div style="transition: opacity 1s">Motion</div>',
      ].join(""),
    );
    await writeFixture(root, "orphan.js", "globalThis.active = true;");
    const classification = classifyReleaseFiles(
      allFiles,
      staticGraph,
      immersiveGraph,
    );

    expect(classification.staticRelease).toEqual(allFiles.sort());
    expect(
      await findStaticReleasePolicyViolations({
        distDirectory: root,
        outputPaths: classification.staticRelease,
      }),
    ).toEqual(
      expect.arrayContaining([
        "explore/index.html is an executable or immersive runtime asset in Static View",
        "orphan.css contains forbidden Static View transition",
        "orphan.html contains a canvas in Static View",
        "orphan.html contains an executable script in Static View",
        "orphan.html contains an inline event handler in Static View",
        "orphan.html contains a javascript: URL in Static View",
        "orphan.html contains forbidden inline Static View @keyframes",
        "orphan.html contains forbidden inline Static View transition",
        "orphan.js is an executable or immersive runtime asset in Static View",
      ]),
    );
    expect(
      findUnclaimedRuntimeAssets(allFiles, staticGraph, immersiveGraph),
    ).toContain("explore/index.html");
  });

  it("reserves the complete Static, character, environment and runtime scope", () => {
    const characterCount = CANONICAL_RUNTIME_CHARACTER_IDS.length;
    expect(characterCount).toBe(15);
    expect(RELEASE_SCOPE_RESERVES.characterCount).toBe(characterCount);
    expect(RELEASE_SCOPE_RESERVES.maximumCharacterPackageBytes).toBe(
      CHARACTER_PRODUCTION_EXPORT_BUDGETS.maximumTotalAssetBytes,
    );
    expect(RELEASE_SCOPE_RESERVES.environmentCount).toBe(
      REQUIRED_LOCATION_SCENES.length,
    );
    expect(REQUIRED_COMPLETE_SCOPE_BYTES).toBe(
      RELEASE_SCOPE_RESERVES.staticViewBytes +
        characterCount *
          CHARACTER_PRODUCTION_EXPORT_BUDGETS.maximumTotalAssetBytes +
        REQUIRED_LOCATION_SCENES.length *
          RELEASE_SCOPE_RESERVES.maximumEnvironmentPackageBytes +
        RELEASE_SCOPE_RESERVES.effectsDecodersAndRuntimeBytes,
    );
    expect(REQUIRED_COMPLETE_SCOPE_BYTES).toBeLessThanOrEqual(
      RELEASE_BUDGET_LIMITS.maximumWholeRelease,
    );
  });
});

describe("document server immersive MIME types", () => {
  it.each([
    ["asset.glb", "model/gltf-binary"],
    ["asset.gltf", "model/gltf+json"],
    ["asset.ktx2", "image/ktx2"],
    ["asset.mjs", "text/javascript; charset=utf-8"],
    ["asset.wasm", "application/wasm"],
  ])("serves %s as %s", async (fileName, expectedContentType) => {
    const root = await createFixture();
    await writeFixture(root, `runtime/${fileName}`, "asset");
    const server = await startDocumentServer({ root });

    try {
      const response = await globalThis.fetch(
        `${server.origin}/profile/runtime/${fileName}`,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe(expectedContentType);
    } finally {
      await server.close();
    }
  });

  it("rejects requests outside the exact /profile base", async () => {
    const root = await createFixture();
    await writeFixture(root, "runtime/asset.glb", "asset");
    const server = await startDocumentServer({ root });

    try {
      const [rootResponse, prefixCollisionResponse] = await Promise.all([
        globalThis.fetch(`${server.origin}/runtime/asset.glb`),
        globalThis.fetch(`${server.origin}/profilex/runtime/asset.glb`),
      ]);
      expect(rootResponse.status).toBe(404);
      expect(prefixCollisionResponse.status).toBe(404);
    } finally {
      await server.close();
    }
  });
});
