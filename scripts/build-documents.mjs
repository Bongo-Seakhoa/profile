import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { chromium } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

import { startDocumentServer } from "./document-server.mjs";

const repositoryRoot = process.cwd();
const distDirectory = resolve(repositoryRoot, "dist");
const previewDirectory = resolve(
  repositoryRoot,
  "AI-COLLAB",
  ".watch-state",
  "document-previews",
);
const manifestPath = resolve(
  repositoryRoot,
  "src",
  "data",
  "profile",
  "document-manifest.json",
);
const identityPath = resolve(
  repositoryRoot,
  "src",
  "data",
  "profile",
  "identity.json",
);

const manifests = JSON.parse(await readFile(manifestPath, "utf8"));
const [identity] = JSON.parse(await readFile(identityPath, "utf8"));

function findChromeExecutable() {
  const configured = process.env.PROFILE_CHROME_EXECUTABLE;
  const candidates = [
    configured,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    join(
      process.env.LOCALAPPDATA ?? "",
      "Google",
      "Chrome",
      "Application",
      "chrome.exe",
    ),
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}

function pointsToMillimetres(points) {
  return (points * 25.4) / 72;
}

async function attachMetadata(pdfBytes, { displayName, label }) {
  const pdf = await PDFDocument.load(pdfBytes);
  pdf.setTitle(`${displayName} | ${label}`);
  pdf.setAuthor(displayName);
  pdf.setSubject(`${label} for ${displayName}`);
  pdf.setCreator(
    "Bongo Seakhoa portfolio | Chromium browser-native document pipeline",
  );
  pdf.setProducer("Chromium and pdf-lib");
  pdf.setKeywords([displayName, "data scientist", "data engineer", label]);
  pdf.setCreationDate(new Date());
  pdf.setModificationDate(new Date());
  return pdf.save({ useObjectStreams: false });
}

async function validateRenderedPages(page, expectedPageCount, publicPhone) {
  return page.evaluate(
    ({ expected, phone }) => {
      const millimetresToPixels = (millimetres) => (millimetres * 96) / 25.4;
      const sheets = [...document.querySelectorAll("[data-document-page]")];
      const findings = [];
      const bodyFont = getComputedStyle(document.body).fontFamily;
      const heading = document.querySelector("h1");
      const headingFont = heading ? getComputedStyle(heading).fontFamily : "";

      if (
        !document.fonts.check('12px "IBM Plex Sans Variable"') ||
        !bodyFont.includes("IBM Plex Sans Variable") ||
        !headingFont.includes("IBM Plex Sans Variable")
      ) {
        findings.push(
          `Expected IBM Plex Sans Variable, received body=${bodyFont} heading=${headingFont}`,
        );
      }
      if (!document.fonts.check('8px "IBM Plex Mono"')) {
        findings.push(
          "IBM Plex Mono did not load for compact document metadata",
        );
      }

      if (sheets.length !== expected) {
        findings.push(
          `Expected ${expected} rendered sheets, found ${sheets.length}`,
        );
      }

      for (const [pageIndex, sheet] of sheets.entries()) {
        const canvas = sheet.querySelector("[data-page-canvas]");
        if (!(canvas instanceof HTMLElement)) {
          findings.push(`Page ${pageIndex + 1} has no measurable canvas`);
          continue;
        }

        const overflow = canvas.scrollHeight - canvas.clientHeight;
        if (overflow > 0.5) {
          findings.push(
            `Page ${pageIndex + 1} overflows its A4 canvas by ${overflow.toFixed(2)}px`,
          );
        }

        const canvasBox = canvas.getBoundingClientRect();
        const sections = [
          ...canvas.querySelectorAll("[data-document-section]"),
        ];

        for (const section of sections) {
          const sectionBox = section.getBoundingClientRect();
          if (sectionBox.bottom > canvasBox.bottom + 0.5) {
            findings.push(
              `Section ${section.getAttribute("data-document-section")} crosses page ${pageIndex + 1}`,
            );
          }

          const header = section.querySelector(".document-section__header");
          if (header) {
            const remaining =
              canvasBox.bottom - header.getBoundingClientRect().top;
            if (remaining < millimetresToPixels(32)) {
              findings.push(
                `Section ${section.getAttribute("data-document-section")} starts within the final 32mm of page ${pageIndex + 1}`,
              );
            }
          }
        }
      }

      const bodyText = document.body.innerText;
      if (!bodyText.includes(phone.display)) {
        findings.push("The approved public phone is missing from the document");
      }

      const telephoneLinks = [...document.querySelectorAll('a[href^="tel:"]')]
        .map((link) => link.getAttribute("href"))
        .filter(Boolean);
      if (!telephoneLinks.includes(phone.href)) {
        findings.push(
          "The approved telephone link is missing from the document",
        );
      }
      const unexpectedTelephoneLink = telephoneLinks.find(
        (href) => href !== phone.href,
      );
      if (unexpectedTelephoneLink) {
        findings.push(
          `An unapproved telephone link appears in the document (${unexpectedTelephoneLink})`,
        );
      }

      const approvedDigits = phone.href.replace(/\D/gu, "");
      const unapprovedPhone = [
        ...bodyText.matchAll(/\+\s?\d(?:[\s().-]*\d){7,}/gu),
      ]
        .map(([value]) => ({ value, digits: value.replace(/\D/gu, "") }))
        .find(({ digits }) => digits !== approvedDigits);
      if (unapprovedPhone) {
        findings.push(
          `An unapproved phone-like value appears in the document (${unapprovedPhone.value})`,
        );
      }

      return findings;
    },
    { expected: expectedPageCount, phone: publicPhone },
  );
}

if (!existsSync(join(distDirectory, "index.html"))) {
  throw new Error(
    "dist/index.html is missing. Run the Astro site build before building documents.",
  );
}

const executablePath = findChromeExecutable();
const browser = await chromium.launch({
  executablePath,
  headless: true,
});
const server = await startDocumentServer({ root: distDirectory });
const buildReport = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  renderer: executablePath ? "Google Chrome" : "Playwright Chromium",
  documents: [],
};

try {
  await mkdir(previewDirectory, { recursive: true });

  for (const documentManifest of manifests) {
    for (const variant of documentManifest.variants) {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
        deviceScaleFactor: 1,
      });
      const url = `${server.origin}/profile/${variant.previewPath}`;

      await page.goto(url, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.emulateMedia({ media: "screen", colorScheme: "light" });

      const renderedFindings = await validateRenderedPages(
        page,
        documentManifest.pageCount,
        identity.publicPhone,
      );
      if (renderedFindings.length > 0) {
        throw new Error(
          `${variant.id} failed browser layout validation:\n- ${renderedFindings.join("\n- ")}`,
        );
      }

      await page.emulateMedia({ media: "print", colorScheme: "light" });
      const previewFiles = [];
      const sheets = page.locator("[data-document-page]");
      for (
        let pageIndex = 0;
        pageIndex < documentManifest.pageCount;
        pageIndex += 1
      ) {
        const previewFile = join(
          previewDirectory,
          `${variant.id}-page-${pageIndex + 1}.png`,
        );
        await sheets.nth(pageIndex).screenshot({
          path: previewFile,
          animations: "disabled",
        });
        previewFiles.push(previewFile);
      }

      const rawPdf = await page.pdf({
        format: "A4",
        tagged: true,
        outline: true,
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
      });
      const withMetadata = await attachMetadata(rawPdf, {
        displayName: variant.displayName,
        label: documentManifest.label,
      });
      const outputPath = resolve(distDirectory, variant.pdfPath);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, withMetadata);

      const pdf = await PDFDocument.load(withMetadata);
      const pages = pdf.getPages();
      if (pages.length !== documentManifest.pageCount) {
        throw new Error(
          `${variant.id} expected ${documentManifest.pageCount} PDF pages, received ${pages.length}`,
        );
      }

      const dimensions = pages.map((pdfPage, pageIndex) => {
        const { width, height } = pdfPage.getSize();
        const widthMm = pointsToMillimetres(width);
        const heightMm = pointsToMillimetres(height);
        if (Math.abs(widthMm - 210) > 0.5 || Math.abs(heightMm - 297) > 0.5) {
          throw new Error(
            `${variant.id} page ${pageIndex + 1} is ${widthMm.toFixed(2)}×${heightMm.toFixed(2)}mm, not A4`,
          );
        }
        return {
          page: pageIndex + 1,
          widthMm: Number(widthMm.toFixed(2)),
          heightMm: Number(heightMm.toFixed(2)),
        };
      });

      buildReport.documents.push({
        id: variant.id,
        kind: documentManifest.id,
        displayName: variant.displayName,
        pageCount: pages.length,
        paper: documentManifest.paper,
        outputPath: variant.pdfPath,
        previewPath: variant.previewPath,
        previewFiles,
        dimensions,
      });
      await page.close();
    }
  }

  const reportPath = join(distDirectory, "documents", "build-report.json");
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(buildReport, null, 2)}\n`);
  console.log(
    `Built ${buildReport.documents.length} browser-native documents for ${identity.primaryName}.`,
  );
} finally {
  await browser.close();
  await server.close();
}
