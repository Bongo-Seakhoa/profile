# Profile Upgrade worklog

Append concise, evidence-backed entries. Use UTC timestamps.

## 2026-07-30

- Audited repository, live GitHub Pages site, current generator, deployment layout and public routes.
- Confirmed baseline commit `df410d5` and origin `Bongo-Seakhoa/profile`.
- Confirmed real Chrome desktop rendering and severe 390 px horizontal overflow.
- Confirmed the in-app browser could not attach; retained installed Chrome headless as the verified browser fallback.
- Ran the current build from an isolated copy. All four PDF generations failed, but the process exited 0 and reported success. Logged R-002.
- Audited the 39-file reference library and reviewed the Static View authority document.
- Read Claude’s complete R001 independent architecture and quality review.
- Independently reviewed `07_59_39 PM (2).png`; it visually matches the Threshold Dunes camp/waystation description.
- Corrected `Anzania_Asset_Linkage_Actual_Filenames_v2.0.xlsx`, rendered all six sheets, re-imported the export and verified no stale filename suffix or formula-error marker remained.
- Replaced the reference-library workbook with the verified correction and preserved its exact original under `AI-COLLAB/archive/reference-originals/`.
- Adopted the hybrid architecture in D002 after an independent weighted comparison.
- Wrote the systematic Release 1 plan, risk register, status and collaboration protocol.
- Audited Blender 5.2.0 LTS. EEVEE and Cycles CPU headless self-renders passed; Cycles GPU acceleration is unavailable on the AMD integrated GPU.
- Tested the collaboration watcher and heartbeat protocol in isolated staging; it detected missing peer state safely, wrote an atomic heartbeat and exited 0.
- Received owner direction to remove Python from the resume/CV production path.
- Audited the Nielsen Sports SIYA Report Export Upgrade: pure ES templates, shared browser preview, print CSS, local fonts, headless Chromium, optional JavaScript PDF merging and rendered before/after review.
- Rendered the SIYA before/after PDFs with Poppler and visually confirmed the intended editorial-quality improvement.
- Rendered the current resume baseline and confirmed a `SELECTED PROJECTS` heading is orphaned at the bottom of page 1, validating the owner’s concern.
- Adopted D003: curated A4 Astro document routes, Playwright/Chromium PDF generation, browser layout audits and all-page PNG review.
- Independent document architecture review rejected a separate Puppeteer, Paged.js, Vivliostyle, react-pdf or PDFKit primary path. Playwright/Chromium is the single renderer and test browser; specialist paged-media tools remain fallback-only.
- `pdfinfo` confirmed the current resume and CV are US Letter. The replacement contract is exact A4.
