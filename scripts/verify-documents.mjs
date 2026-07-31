import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PDFDocument } from "pdf-lib";

import {
  extractPdfText,
  findPublicPdfTextIssues,
} from "./lib/pdf-text-verification.mjs";

const repositoryRoot = process.cwd();
const distDirectory = resolve(repositoryRoot, "dist");
const manifest = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "src", "data", "profile", "document-manifest.json"),
    "utf8",
  ),
);
const [identity] = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "src", "data", "profile", "identity.json"),
    "utf8",
  ),
);
const buildReport = JSON.parse(
  await readFile(
    resolve(distDirectory, "documents", "build-report.json"),
    "utf8",
  ),
);
const failures = [];

for (const documentManifest of manifest) {
  for (const variant of documentManifest.variants) {
    const outputPath = resolve(distDirectory, variant.pdfPath);
    try {
      await access(outputPath);
      const pdfBytes = await readFile(outputPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = pdf.getPages();

      if (pages.length !== documentManifest.pageCount) {
        failures.push(
          `${variant.id}: expected ${documentManifest.pageCount} pages, found ${pages.length}`,
        );
      }

      for (const [index, page] of pages.entries()) {
        const { width, height } = page.getSize();
        const widthMm = (width * 25.4) / 72;
        const heightMm = (height * 25.4) / 72;
        if (Math.abs(widthMm - 210) > 0.5 || Math.abs(heightMm - 297) > 0.5) {
          failures.push(
            `${variant.id} page ${index + 1}: expected A4, found ${widthMm.toFixed(2)}×${heightMm.toFixed(2)}mm`,
          );
        }
      }

      const title = pdf.getTitle();
      const author = pdf.getAuthor();
      if (title !== `${variant.displayName} | ${documentManifest.label}`) {
        failures.push(`${variant.id}: unexpected PDF title metadata`);
      }
      if (author !== variant.displayName) {
        failures.push(`${variant.id}: unexpected PDF author metadata`);
      }

      const pdfSource = pdfBytes.toString("latin1");
      if (
        !pdfSource.includes("/StructTreeRoot") ||
        !pdfSource.includes("/MarkInfo")
      ) {
        failures.push(`${variant.id}: PDF is missing a tagged structure tree`);
      }
      if (!/IBM[+\s_-]*Plex[+\s_-]*Sans/i.test(pdfSource)) {
        failures.push(
          `${variant.id}: intended IBM Plex Sans font is not embedded`,
        );
      }
      if (!pdfSource.includes("/Annots")) {
        failures.push(`${variant.id}: PDF has no clickable link annotations`);
      }

      const extractedText = await extractPdfText(outputPath);
      for (const issue of findPublicPdfTextIssues(extractedText, {
        approvedPhoneDisplay: identity.publicPhone.display,
      })) {
        failures.push(`${variant.id}: ${issue}`);
      }
    } catch (error) {
      failures.push(`${variant.id}: ${error.message}`);
    }
  }
}

if (buildReport.documents.length !== 4) {
  failures.push(
    `Expected four build-report entries, found ${buildReport.documents.length}`,
  );
}

if (failures.length > 0) {
  console.error("Document verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Verified four A4 PDFs: two 2-page resumes and two 3-page CVs with the approved public phone, extracted-text checks and document metadata.",
);
