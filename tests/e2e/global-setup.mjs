import { resolve } from "node:path";

import { startDocumentServer } from "../../scripts/document-server.mjs";

export default async function globalSetup() {
  const server = await startDocumentServer({
    root: resolve("dist"),
    basePath: "/profile",
    port: 4321,
  });

  try {
    const homeResponse = await globalThis.fetch(`${server.origin}/profile/`);
    const homeContentType = homeResponse.headers.get("content-type") ?? "";
    await homeResponse.arrayBuffer();

    if (!homeResponse.ok || !homeContentType.includes("text/html")) {
      throw new Error(
        `Static test server returned ${homeResponse.status} ${homeContentType} for /profile/.`,
      );
    }

    const pdfResponse = await globalThis.fetch(
      `${server.origin}/profile/documents/bongo-seakhoa-resume.pdf`,
    );
    const pdfContentType = pdfResponse.headers.get("content-type") ?? "";
    await pdfResponse.arrayBuffer();

    if (!pdfResponse.ok || !pdfContentType.includes("application/pdf")) {
      throw new Error(
        `Static test server returned ${pdfResponse.status} ${pdfContentType} for the resume PDF.`,
      );
    }
  } catch (error) {
    await server.close();
    throw error;
  }

  return async () => {
    await server.close();
  };
}
