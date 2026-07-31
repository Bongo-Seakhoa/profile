import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const MIME_TYPES = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".glb", "model/gltf-binary"],
  [".gltf", "model/gltf+json"],
  [".html", "text/html; charset=utf-8"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".ktx2", "image/ktx2"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".wasm", "application/wasm"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
]);

/**
 * @param {string} urlPath
 * @param {string} basePath
 * @returns {string}
 */
function safeRelativePath(urlPath, basePath) {
  const [pathPart = ""] = urlPath.split("?");
  const decoded = decodeURIComponent(pathPart);
  const normalizedBase = basePath === "/" ? "" : basePath.replace(/\/+$/u, "");
  if (decoded !== normalizedBase && !decoded.startsWith(`${normalizedBase}/`)) {
    throw new Error("Request is outside the configured base path");
  }
  const withoutBase = decoded.slice(normalizedBase.length);
  const relative = normalize(withoutBase).replace(/^[/\\]+/, "");

  if (relative.startsWith("..")) {
    throw new Error("Path traversal rejected");
  }

  return relative;
}

/**
 * @param {string} root
 * @param {string} relativePath
 * @returns {Promise<string>}
 */
async function resolveFile(root, relativePath) {
  const candidate = resolve(root, relativePath || "index.html");
  const rootWithSeparator = `${resolve(root)}${sep}`;
  if (candidate !== resolve(root) && !candidate.startsWith(rootWithSeparator)) {
    throw new Error("Path escaped document root");
  }

  try {
    const metadata = await stat(candidate);
    if (metadata.isDirectory()) return join(candidate, "index.html");
    return candidate;
  } catch {
    if (!extname(candidate)) return join(candidate, "index.html");
    throw new Error("Not found");
  }
}

/**
 * @param {{ root: string; basePath?: string; port?: number }} options
 * @returns {Promise<{ origin: string; close: () => Promise<void> }>}
 */
export async function startDocumentServer({
  root,
  basePath = "/profile",
  port = 0,
}) {
  const server = createServer(async (request, response) => {
    try {
      const relative = safeRelativePath(request.url ?? "/", basePath);
      const filePath = await resolveFile(root, relative);
      const metadata = await stat(filePath);

      response.writeHead(200, {
        "Content-Type":
          MIME_TYPES.get(extname(filePath).toLowerCase()) ??
          "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": "no-store",
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });

  await /** @type {Promise<void>} */ (
    new Promise((resolvePromise, rejectPromise) => {
      server.once("error", rejectPromise);
      server.listen(port, "127.0.0.1", resolvePromise);
    })
  );

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Unable to resolve local document server port");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () =>
      /** @type {Promise<void>} */ (
        new Promise((resolvePromise, rejectPromise) => {
          server.close((error) =>
            error ? rejectPromise(error) : resolvePromise(),
          );
          server.closeAllConnections();
        })
      ),
  };
}
