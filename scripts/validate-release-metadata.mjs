import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { URL } from "node:url";

const repositoryRoot = process.cwd();
const distDirectory = resolve(repositoryRoot, "dist");

const packageManifest = JSON.parse(
  await readFile(resolve(repositoryRoot, "package.json"), "utf8"),
);
const [settings] = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "src", "data", "profile", "site-settings.json"),
    "utf8",
  ),
);
const routes = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "src", "data", "profile", "routes.json"),
    "utf8",
  ),
);

const errors = [];
const readDist = (path) => readFile(resolve(distDirectory, path), "utf8");

async function requireFile(path, minimumBytes = 1) {
  try {
    const file = await stat(resolve(distDirectory, path));
    if (!file.isFile() || file.size < minimumBytes) {
      errors.push(`${path} is smaller than ${minimumBytes} bytes`);
    }
  } catch {
    errors.push(`${path} is missing`);
  }
}

await Promise.all([
  requireFile(".nojekyll", 0),
  requireFile("favicon.svg", 100),
  requireFile("favicon-32.png", 100),
  requireFile("apple-touch-icon.png", 500),
  requireFile("icons/icon-192.png", 500),
  requireFile("icons/icon-512.png", 1000),
  requireFile("site.webmanifest", 100),
  requireFile("robots.txt", 50),
  requireFile("sitemap-index.xml", 100),
  requireFile("sitemap-0.xml", 100),
  requireFile("version.json", 100),
  requireFile("assets/social/manifest.json", 100),
]);

const robots = await readDist("robots.txt");
const expectedSitemapUrl = `${settings.siteUrl}sitemap-index.xml`;
if (!robots.includes("Allow: /profile/")) {
  errors.push("robots.txt does not explicitly allow the /profile/ base");
}
if (!robots.includes(`Sitemap: ${expectedSitemapUrl}`)) {
  errors.push("robots.txt does not reference the production sitemap index");
}

const sitemapIndex = await readDist("sitemap-index.xml");
if (!sitemapIndex.includes(`${settings.siteUrl}sitemap-0.xml`)) {
  errors.push("sitemap-index.xml does not use the production /profile/ base");
}

const sitemap = await readDist("sitemap-0.xml");
const actualSitemapUrls = [
  ...sitemap.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g),
].map((match) => match[1]);
const expectedSitemapUrls = routes
  .filter(
    (route) =>
      route.sitemap &&
      route.canonicalRouteId === null &&
      route.kind !== "system",
  )
  .map((route) => new URL(route.path, settings.siteUrl).href)
  .sort();

if (
  JSON.stringify([...actualSitemapUrls].sort()) !==
  JSON.stringify(expectedSitemapUrls)
) {
  errors.push(
    `Sitemap routes differ from the canonical content registry.\nExpected: ${expectedSitemapUrls.join(", ")}\nActual: ${actualSitemapUrls.join(", ")}`,
  );
}

const manifest = JSON.parse(await readDist("site.webmanifest"));
if (
  manifest.start_url !== settings.basePath + "/" ||
  manifest.scope !== settings.basePath + "/"
) {
  errors.push("site.webmanifest start_url and scope must use /profile/");
}

const version = JSON.parse(await readDist("version.json"));
if (version.version !== packageManifest.version) {
  errors.push("version.json does not match package.json");
}
if (
  version.siteUrl !== settings.siteUrl ||
  version.basePath !== settings.basePath
) {
  errors.push("version.json does not match the production site settings");
}
if (
  version.revision !== "unknown" &&
  !/^[0-9a-f]{40}$/i.test(version.revision)
) {
  errors.push("version.json revision must be a full Git SHA or unknown");
}
if (Number.isNaN(Date.parse(version.builtAt))) {
  errors.push("version.json builtAt is not an ISO-compatible timestamp");
}

const socialManifest = JSON.parse(
  await readDist("assets/social/manifest.json"),
);
const socialCardsByRoute = new Map(
  socialManifest.cards.map((card) => [card.routeId, card]),
);
const expectedPublicPages = routes.filter((route) => route.staticRenderable);
const routesById = new Map(routes.map((route) => [route.id, route]));
const cardHashes = new Set();
const pageTitles = new Map();
const pageDescriptions = new Map();

for (const route of expectedPublicPages) {
  const htmlPath = route.path.endsWith(".html")
    ? route.path
    : route.path.length === 0
      ? "index.html"
      : `${route.path}index.html`;
  const html = await readDist(htmlPath);
  const canonicalRoute = route.canonicalRouteId
    ? routesById.get(route.canonicalRouteId)
    : route;
  if (!canonicalRoute) {
    errors.push(`${route.id} has no resolvable canonical route`);
    continue;
  }
  const canonicalUrl = new URL(canonicalRoute.path, settings.siteUrl).href;
  const socialCard = socialCardsByRoute.get(route.id);

  if (!socialCard) {
    errors.push(`${route.id} has no generated social card`);
    continue;
  }

  const socialCardBytes = await readFile(
    resolve(distDirectory, socialCard.path),
  );
  const socialCardHash = createHash("sha256")
    .update(socialCardBytes)
    .digest("hex");
  if (cardHashes.has(socialCardHash)) {
    errors.push(`${route.id} social card duplicates another route image`);
  }
  cardHashes.add(socialCardHash);

  if (socialCard.width !== 1200 || socialCard.height !== 630) {
    errors.push(`${route.id} social card is not 1200x630`);
  }
  await requireFile(socialCard.path, 10_000);
  const socialImageUrl = new URL(socialCard.path, settings.siteUrl).href;
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(
    /<meta name="description" content="([^"]+)">/,
  )?.[1];

  if (!title) {
    errors.push(`${htmlPath} has no document title`);
  } else if (pageTitles.has(title)) {
    errors.push(
      `${htmlPath} duplicates the title from ${pageTitles.get(title)}`,
    );
  } else {
    pageTitles.set(title, htmlPath);
  }

  if (!description) {
    errors.push(`${htmlPath} has no meta description`);
  } else if (pageDescriptions.has(description)) {
    errors.push(
      `${htmlPath} duplicates the description from ${pageDescriptions.get(description)}`,
    );
  } else {
    pageDescriptions.set(description, htmlPath);
  }

  const requiredFragments = [
    `<link rel="canonical" href="${canonicalUrl}">`,
    `<meta property="og:url" content="${canonicalUrl}">`,
    `<meta property="og:image" content="${socialImageUrl}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:image" content="${socialImageUrl}">`,
    '<link rel="icon" href="/profile/favicon.svg" type="image/svg+xml">',
    '<link rel="manifest" href="/profile/site.webmanifest">',
    `<link rel="sitemap" href="${expectedSitemapUrl}" type="application/xml">`,
  ];

  for (const fragment of requiredFragments) {
    if (!html.includes(fragment)) {
      errors.push(`${htmlPath} is missing release metadata: ${fragment}`);
    }
  }
}

if (socialCardsByRoute.size !== expectedPublicPages.length) {
  errors.push(
    `Expected ${expectedPublicPages.length} route-specific social cards, found ${socialCardsByRoute.size}`,
  );
}

if (errors.length > 0) {
  console.error(
    `Release metadata validation failed:\n- ${errors.join("\n- ")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Validated release metadata, ${actualSitemapUrls.length} sitemap routes, unique social previews and install icons.`,
  );
}
