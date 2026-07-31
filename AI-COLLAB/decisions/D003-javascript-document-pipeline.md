# D003 — Resume and CV use a JavaScript browser-native document pipeline

**Date:** 2026-07-30  
**Owner:** Bongo Seakhoa  
**Implementer:** Codex  
**Status:** Adopted  
**Supersedes:** D002 only where D002 assigns validation or document generation to Python

## Owner direction

The resume and CV are dynamic, high-value assets. Quality takes priority over render speed. The owner explicitly rejected reliance on Python for document construction because the current output reads as an HTML-to-PDF conversion, has weak page composition and can orphan section headings.

The supplied reference methodology is:

`C:\Users\Bongo\OneDrive\Desktop\MetaPOS\Consulting\Clients\Nielsen Sports\SIYA Report Export Upgrade`

## Evidence from the Nielsen Sports method

The successful pipeline:

- Keeps source data structured.
- Renders full HTML and CSS, not text primitives.
- Uses pure ES modules for reusable templates and theme tokens.
- Uses headless Chromium for print-quality output.
- Uses the same output for browser preview and PDF.
- Waits for complete browser rendering.
- Uses deliberate A4 composition, print backgrounds, headers/footers and page numbers.
- Preserves vector/text content and dramatically reduces rasterised PDF size.
- Renders before/after artefacts for visual comparison.
- Makes fonts an explicit deployment dependency.
- Escapes dynamic content before it reaches Chromium.

Direct visual inspection confirmed the improvement: the old export is a flat text dump; the new export has a designed cover, strong hierarchy, real typesetting, consistent margins and small vector output.

The audit also found improvements that the portfolio pipeline must add:

- The SIYA HTML requests Inter but the inspected PDF embeds Segoe UI, so font intent was not guaranteed.
- The merged SIYA PDF is untagged.
- One longer SIYA figure continuation loses the normal running header.
- Its demo package has no automated tests.

The current portfolio baseline confirms the owner’s concern:

- Both resume and CV are US Letter, not A4.
- `SELECTED PROJECTS` is orphaned at the bottom of resume page 1.
- The CV continues an education record onto page 3 without a repeated section label.
- Current font subsets are Type 3; the rebuild must explicitly verify embedded fonts, selectable text and ATS reading order.

## Decision

1. The production build is JavaScript/TypeScript-first.
2. Astro renders resume and CV preview routes from the same approved manifest used by the site.
3. Pinned Playwright drives its matching Chromium to generate PDFs.
4. Resume and CV use fixed A4 `.sheet` pages with curated content allocation.
5. Automatic browser pagination is not trusted to choose major section starts.
6. The build waits for fonts and images, then validates every content box before printing.
7. The PDF script fails on overflow, font fallback, unexpected page count, missing links, stale output or content mismatch.
8. Playwright captures every browser-rendered sheet to PNG for visual review;
   `pdf-lib` independently verifies the generated PDF structure and page geometry.
9. `pdf-lib` may be used only for JavaScript metadata or merging when a deliberate multi-pass design needs it.
10. Python remains only as a legacy or independent audit utility. It does not build the site, resume or CV.

Paged.js is a fallback only if continuous automatic flow later becomes mandatory. Vivliostyle is reserved for book-length publishing. Puppeteer, react-pdf and PDFKit are excluded from the primary path because they would duplicate the browser/test toolchain or create a second layout model.

## Planned document structure

```text
src/
├── components/documents/
│   ├── DocumentShell.astro
│   ├── ResumeDocument.astro
│   ├── CvDocument.astro
│   └── sections/
├── lib/documents/
│   ├── page-plans.ts
│   ├── document-model.ts
│   ├── layout-audit.ts
│   └── metadata.ts
├── pages/documents/
│   ├── resume/
│   ├── cv/
│   └── print/
└── styles/documents/
    ├── document-tokens.css
    ├── document-screen.css
    └── document-print.css

scripts/
├── build-documents.mjs
├── verify-documents.mjs
└── render-document-pages.mjs
```

## Quality model

- Resume: concise, two deliberate pages.
- CV: detailed, three deliberate pages unless evidence justifies a reviewed change.
- Paper: exact A4, 210×297 mm.
- One-column semantic reading order for ATS compatibility.
- Editorial hierarchy without decorative clutter.
- A restrained professional sans-serif family, local font files and stable metrics.
- Section title kept with meaningful following content.
- Records split only at approved item boundaries.
- Selectable text and clickable links.
- Screen preview visually mirrors printed sheets.
- Four variants generated from one content source.

## Consequences

Positive:

- Document quality is controlled in the same medium as the final output.
- Preview, PDF and site share design tokens and data.
- Typography and pagination are measurable in the browser.
- Dynamic updates regenerate all variants deterministically.
- Python-specific rendering failures leave the production path.

Costs:

- Chromium and local fonts are hard build dependencies.
- Page plans require intentional review when content grows.
- Visual-regression baselines must be maintained.
- Build time is slower, by design.

## Verification

The release gate requires:

- expected page counts;
- zero layout overflow;
- zero orphan headings;
- exact approved fonts;
- text extraction in reading order;
- valid links and metadata;
- the exact owner-approved public business phone, with no arbitrary phone drift;
- PNG render inspection of every page;
- visual regression within an approved tolerance;
- clean generation from a fresh checkout.
