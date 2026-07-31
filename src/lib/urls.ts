const ABSOLUTE_HTTP_URL = /^https?:\/\//i;
const URI_SCHEME = /^[a-z][a-z\d+.-]*:/i;

function configuredBasePath(): string {
  const runtimeBase =
    typeof import.meta.env.BASE_URL === "string"
      ? import.meta.env.BASE_URL
      : "/profile/";

  return normalizeBasePath(runtimeBase);
}

function splitPathSuffix(value: string): [pathname: string, suffix: string] {
  const suffixIndex = value.search(/[?#]/);

  if (suffixIndex === -1) {
    return [value, ""];
  }

  return [value.slice(0, suffixIndex), value.slice(suffixIndex)];
}

export function normalizeBasePath(basePath: string): string {
  const withoutQuery = basePath.split(/[?#]/, 1)[0] ?? "/";
  const trimmed = withoutQuery.trim().replace(/^\/+|\/+$/g, "");

  return trimmed.length === 0 ? "/" : `/${trimmed}/`;
}

export const SITE_BASE_PATH = configuredBasePath();

export function isExternalUrl(value: string): boolean {
  return ABSOLUTE_HTTP_URL.test(value) || value.startsWith("//");
}

export function isSpecialProtocol(value: string): boolean {
  return URI_SCHEME.test(value) && !ABSOLUTE_HTTP_URL.test(value);
}

/**
 * Resolve a repository-relative route or asset against the configured GitHub
 * Pages base. External URLs and same-document fragments pass through unchanged.
 */
export function sitePath(input = "", basePath = SITE_BASE_PATH): string {
  const value = input.trim();

  if (
    isExternalUrl(value) ||
    isSpecialProtocol(value) ||
    value.startsWith("#")
  ) {
    return value;
  }

  const base = normalizeBasePath(basePath);
  const baseSegment = base.replace(/^\/|\/$/g, "");
  const [pathname, suffix] = splitPathSuffix(value);
  const withoutLeadingSlash = pathname.replace(/^\/+/, "");

  let relativePath = withoutLeadingSlash;

  if (
    baseSegment.length > 0 &&
    (relativePath === baseSegment || relativePath.startsWith(`${baseSegment}/`))
  ) {
    relativePath = relativePath.slice(baseSegment.length).replace(/^\/+/, "");
  }

  if (relativePath.length === 0) {
    return `${base}${suffix}`;
  }

  return `${base}${relativePath}${suffix}`;
}

/**
 * Resolve a route or asset to its production URL. `siteUrl` should include the
 * deployed base path, for example `https://example.github.io/profile/`.
 */
export function absoluteUrl(
  input: string,
  siteUrl: string | URL,
  basePath = SITE_BASE_PATH,
): string {
  if (ABSOLUTE_HTTP_URL.test(input)) {
    return input;
  }

  const productionUrl =
    siteUrl instanceof URL ? new URL(siteUrl.href) : new URL(siteUrl);
  const resolvedPath = sitePath(input, basePath);

  if (isSpecialProtocol(resolvedPath) || resolvedPath.startsWith("#")) {
    throw new TypeError(`Cannot create a production HTTP URL from "${input}".`);
  }

  return new URL(resolvedPath, productionUrl.origin).href;
}

export function isCurrentPath(
  currentPath: string,
  routePath: string,
  basePath = SITE_BASE_PATH,
): boolean {
  const [current] = splitPathSuffix(sitePath(currentPath, basePath));
  const [candidate] = splitPathSuffix(sitePath(routePath, basePath));

  if (candidate === normalizeBasePath(basePath)) {
    return current === candidate;
  }

  return current === candidate || current.startsWith(candidate);
}
