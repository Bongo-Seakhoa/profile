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
- Recorded the owner’s superseding distant full-body camera correction as D004, struck OTS from the allowed design space, expanded M7 and acceptance criteria, logged R-025 and assigned Claude an independent cross-animation/browser containment audit.
- Implemented the isolated TypeScript camera core: post-skinning/proxy bounds, conservative stale-bound fallback, typed traversal suppression, responsive safe pockets, DOM animation sweeps, predictive pullback, look-back radius preservation, interaction restore and exhaustive telemetry.
- Passed 13 deterministic camera-contract tests across landscape, portrait, square, ultrawide, short-height, content-left/content-right and special-state cases; strict TypeScript compilation also passes.
- Read the complete `Animation Addendum.md`, adopted it through D005 and reconciled its older camera ranges with the tighter direct owner correction.
- Implemented the lower-third home stage with traversal-only middle/upper power intents and deterministic return, plus deliberate zoom, shared male/female/non-binary locomotion profiles, compact manifest validation, animation interruption, long-idle scheduling and LOD/runtime budgets.
- Passed 26 immersive contract tests after the owner clarified that powers may cross or hover outside the lower-third home stage.
- Audited Blender 5.2.0 LTS. EEVEE and Cycles CPU headless self-renders passed; Cycles GPU acceleration is unavailable on the AMD integrated GPU.
- Tested the collaboration watcher and heartbeat protocol in isolated staging; it detected missing peer state safely, wrote an atomic heartbeat and exited 0.
- Received owner direction to remove Python from the resume/CV production path.
- Audited the Nielsen Sports SIYA Report Export Upgrade: pure ES templates, shared browser preview, print CSS, local fonts, headless Chromium, optional JavaScript PDF merging and rendered before/after review.
- Rendered the SIYA before/after PDFs with Poppler and visually confirmed the intended editorial-quality improvement.
- Rendered the current resume baseline and confirmed a `SELECTED PROJECTS` heading is orphaned at the bottom of page 1, validating the owner’s concern.
- Adopted D003: curated A4 Astro document routes, Playwright/Chromium PDF generation, browser layout audits and all-page PNG review.
- Independent document architecture review rejected a separate Puppeteer, Paged.js, Vivliostyle, react-pdf or PDFKit primary path. Playwright/Chromium is the single renderer and test browser; specialist paged-media tools remain fallback-only.
- `pdfinfo` confirmed the current resume and CV are US Letter. The replacement contract is exact A4.

## 2026-07-31

- Added base-aware favicon, app icons, web manifest, `.nojekyll`, robots and
  sitemap metadata for the `/profile/` GitHub Pages project site.
- Reconciled the route registry with indexing policy: the sitemap now contains
  20 canonical indexable routes and excludes four `noindex` document previews,
  the Bongo Kosa canonical alias and 404.
- Implemented 26 unique 1200-by-630 social cards through
  `scripts/build-social-cards.mjs`. Cards use route-specific copy, IBM Plex Sans
  and the restrained Anzania palette, and are written atomically.
- Built and visually inspected
  `AI-COLLAB/.watch-state/release-previews/social-card-contact-sheet.jpg`.
  All route cards, including long project titles, both names, document variants,
  continuity and 404, remain fully visible without overlap or clipping.
- Added `scripts/write-release-metadata.mjs` and
  `scripts/validate-release-metadata.mjs`. Validation checks the route registry,
  canonicals, unique titles/descriptions/cards, card hashes and dimensions,
  icons, web manifest, sitemap, robots and version metadata.
- Added `.github/workflows/deploy-pages.yml` for a gated main-branch GitHub
  Pages deployment. It installs the pinned Node/pnpm and real browser runtimes,
  runs `pnpm run qa`, uploads the complete `dist` artifact and preserves
  `.nojekyll`. Nothing was pushed or deployed.
- Verification passed: Astro built 26 pages; targeted ESLint and `tsc --noEmit`
  passed; `scripts/validate-release-metadata.mjs` passed with 20 sitemap routes
  and 26 unique route cards.
- Closed the Static View Lighthouse gate with the pinned Chrome-compatible
  `lighthouse@13.3.0` and `pnpm run verify:lighthouse`. The JavaScript runner
  served the production `dist` artifact in-process and ran three simulated
  mobile audits at 390 by 844 against `/profile/` in installed Chrome 150.
- The command exited 0. Per-run performance scores were 79, 95 and 99;
  accessibility, best practices and SEO were 100 in every run. The median gate
  passed at performance 95, accessibility 100, best practices 100, SEO 100,
  LCP 2,339.126 ms, CLS 0.001027 and TBT 73 ms. The slower first-run TBT was
  763.5 ms; the other two were 0 ms and 73 ms, so the required three-run median
  remained below the 200 ms limit without weakening the threshold.
- Raw LHRs and the machine-readable gate result are retained under
  `AI-COLLAB/.watch-state/lighthouse/`. The runner is intentionally available
  as the dedicated `verify:lighthouse` command and is not yet appended to the
  broad `qa` command.
- At 2026-07-31T02:28:04Z, completed the Static View browser QA pass. Replaced
  the hanging external preview process with an in-process, base-aware static
  server and deterministic connection teardown.
- Fixed three browser-confirmed release defects: insufficient contrast on
  capability indices, min-content overflow in the mobile homepage contact
  composition and invalid definition-list children on Contact.
- Chrome passed 32 of 32 desktop and 32 of 32 mobile checks across all routes,
  serious/critical axe findings, no-JavaScript navigation, skip focus, seven
  viewport sizes, direct PDFs and document previews.
- Firefox and WebKit each passed the four-route Overview, Work, Documents and
  Contact smoke matrix. Firefox required one unsandboxed local run because the
  managed Windows sandbox blocked its tab subprocess before navigation.
- At 390 px, both resume and CV previews measured 390 px body/root scroll width
  against 390 px client width. Static View loaded 182,710 encoded bytes on
  desktop and 160,978 on mobile, with zero script elements and zero immersive
  runtime requests.
- Quality evidence passed: lint, Astro/TypeScript check, 51 unit assertions,
  public-output validation, release metadata validation and static budgets.
  The artifact contains zero JavaScript or immersive binary artifacts.
- The clean post-build browser rerun passed 68 of 68 checks across exhaustive
  Chrome desktop, exhaustive Chrome mobile and the WebKit smoke project.
- Completed the current-tree privacy remediation. Removed the retired phone
  from source and legacy HTML, deleted four obsolete legacy PDFs, redacted the
  value from R001 and retained only a clearly fictional `+999` validator
  fixture. The production artifact and current tree contain no retired-phone
  match; historical exposure remains documented in R-026.
- Discovered and audited the complete Desert Nomad v3 canonical handoff. The
  self-contained archive verifies 32 of 32 manifest payloads, defines exactly
  15 identities across three presentations and five representation families,
  and contains no production `.blend`, glTF, FBX, rig, action, texture-map or
  LOD assets. The lightweight archive is transport-only because its copied
  manifest retains three intentionally omitted reference entries.
- Retained exact-hash character-canon source data and provenance under ignored
  `source/private/`, then added strict public Zod contracts and six synthetic
  roster tests. Public character derivatives remain blocked by
  `DN-CHAR-RIGHTS-001` because no explicit ownership, derivative-rights or
  redistribution grant was found in the supplied handoff.
- Used the built-in image-generation workflow to create a private
  DN-M-AFR-01 reconstruction review board, then corrected it to exactly one
  right-side blue tassel and open-toe wrapped footwear. Both drafts remain
  ignored under `source/private/`.
- Added a reproducible Blender 5.2 DN-M-AFR-01 measurement-blockout script.
  The final EEVEE run saved a private `.blend`, report and front/profile/back
  renders. It measured exactly 1.84000 m tall with 0.0 mm height error and
  retained the complete blockout in every orthographic frame.
- Completed the independent pre-commit scan. It found no current-tree release
  blocker, secret, public U+2014 em dash, immersive binary in `dist`, Static
  View import of immersive code or unintended reference/Blender publication.
- Ran the complete CI-equivalent `pnpm run qa` gate after all implementation
  changes. Formatting, lint, Astro/TypeScript, 58 unit tests, the 26-page build,
  four A4 PDFs, public output, release metadata, budgets and all 72 Playwright
  tests passed.
- The final three-run mobile Lighthouse gate passed at median Performance 99,
  Accessibility 100, Best Practices 100 and SEO 100, with LCP 1,508 ms, CLS
  0.001 and TBT 49 ms.
- Updated the current status and handoff to make the complete character, set,
  effect, animation, power, runtime and Blender/browser evaluation scope
  explicit. Claude has no current heartbeat and is offline by protocol; Codex
  continues autonomously while retaining the monitored inbox.
- Published the production Static View through PR 1. Its hosted quality gate
  passed, it merged as `f007d7c84222bc099650538143c2081df54ae398`, and the
  first main-branch Pages deployment completed successfully.
- Updated the Pages actions to their current Node 24-native major versions
  through PR 2. Hosted QA passed without annotations, it merged as
  `e29a4c959c39fff6e93def841c0944db94bf013f`, and warning-clean deployment
  run `30605182973` completed successfully.
- Verified the live production artifact at
  `https://bongo-seakhoa.github.io/profile/`: every one of the 20 sitemap
  routes, all four direct PDFs, `.nojekyll`, sitemap and robots returned HTTP
  200. The live site retained zero client JavaScript outside JSON-LD.
- Downloaded the four live PDFs, rechecked page counts, exact A4 geometry,
  selectable text and identity markers, then raster-inspected the live resume
  and all three CV pages for visual integrity.
- The explicitly selected Chrome extension session could not attach because
  the extension runtime reported that the browser was unavailable. This did
  not weaken the release gate: installed Chrome plus Firefox and WebKit passed
  the local suite, hosted browser QA passed, and the live artifact passed HTTP
  and PDF verification. No claim of extension-driven live visual QA is made.
- Bongo confirmed ownership of the supplied Desert Nomad images, authorized
  creation and public redistribution of approved derivatives for this
  portfolio, and approved the DN-M-AFR-01 v2 silhouette. D010 closes
  `DN-CHAR-RIGHTS-001` and `DN-ORTHO-001` for the recorded scope.
- Opened the private DN-M-AFR-01 measurement blockout in Blender 5.2 and
  confirmed it remains a dimensional greybox rather than a production asset.
  The active vertical slice is now anatomical form, construction garments,
  rig, materials, animation, LODs, runtime export and full-body validation.
- Recorded Bongo's direct approval to publish `+27 73 590 7659` as an
  intentional business contact. D015 supersedes D008 and closes R-026. The
  canonical identity now carries an exact display value and `tel:` URI;
  Contact, every Resume/CV preview and all four PDFs require it. Content, HTML
  and extracted-PDF validation reject any different phone value while retaining
  selectable-text, metadata, A4, page-count and no-em-dash gates.
- Rebuilt 26 Static View pages and all four browser-native PDFs after the phone
  restoration. Fourteen focused unit tests, content validation, formatting,
  lint, TypeScript, Astro diagnostics, extracted-PDF verification and public
  output validation passed. Poppler renders of all ten PDF pages were inspected
  with no clipping, overflow or layout regression; the approved phone is legible
  in every variant's first-page contact block.
- Adopted the owner's physical dressing-order correction as D016 and completed
  the independent A007 review. The pilot now has a binding dependency DAG,
  local occlusion rules, distributed contact and penetration thresholds,
  proxy-to-final parity gates and a neutral/dynamic multi-view evidence matrix.
  Provisional base garments may be used only for smoke diagnostics and cannot
  support an accepted outer-layer proof.
- The v13 diagnostic run stopped correctly before mantle, accessories and
  rendering when the cowl failed with 96.187 mm convergence, 23.426 mm reliable
  penetration and a 269.919 mm pre-weld seam gap. The builder returned to the
  true prerequisite: production-valid sewn tunic and trousers fitted to the
  body before tabard, belt, proxies, cowl or mantle.
- Mirrored the direct phone approval, physical layering correction, D016, A007
  and the v13 diagnostic result into Claude's canonical collaboration inbox.
  Claude remains inside the three-hour heartbeat window; implementation
  continues without blocking on the independent response.
- Added the standalone Blender dressing-stack validator with strict `base` and
  `full` profiles. It checks the canonical graph and metadata, evaluated-mesh
  distributed gaps, signed penetration, connected penetration area,
  attachment roots and proxy-to-final parity while refusing to hide canonical
  layers behind helper exclusions. Ten focused tests, Python compilation and
  Blender 5.2 mesh/BVH smokes pass.
- Added and exercised an atomic multi-root message publisher for the
  collaboration protocol. It writes the same Markdown message to every
  configured recipient inbox and refuses to overwrite a same-named message
  whose SHA-256 differs, closing the manual mirror gap exposed by the missed
  phone and layering updates.
- Reworked the sewn-base smoke path to log every Blender stage, cloth cache and
  gate boundary durably. The v16 isolated-trousers cache completed in about
  121.5 seconds and rejected the garment: 31.487 mm final-window convergence,
  23.480 mm reliable penetration, 48.592 mm maximum pre-weld seam gap and
  9.479 mm mean seam gap. Pin displacement was zero. No render or acceptance
  asset was produced; the next pass must localize the worst seam and
  penetration regions rather than relax the gates.
- Inspected all four v16 failure-only trouser views. Rejected the separated
  crotch, inner-leg and ankle panels, oversized floating waistband, missing
  anatomical rise and seat, rigid unsettled drape and visible simulation
  helper. Reaffirmed the owner-corrected physical dressing rule: an accepted
  fitted base outfit precedes every later garment and named-surface accessory.
- Received Claude message 020. Its controlled tests disproved sewing force 20
  and extra bake frames as solutions. Recorded the response, mirrored it
  through the dual-root inbox and checkpointed the collaboration evidence as
  commit `25ce902`.
- Ran the controlled v17 trousers-only comparison in owned headless Blender
  PID 22628. The topology-preserving body collider removed actual-body
  penetration, but the pass remained rejected at 29.416 mm convergence and
  274.154 mm maximum seam gap, localized to the anatomical-right inner-leg
  rows.
- Loaded the owned v17 recovery in a separate read-only headless Blender
  diagnostic. All 136 seam pairs remained unique zero-face loose edges.
  Anatomical-right outer seams closed to sub-millimetre gaps while its inner
  seams opened to 252 to 274 mm, proving an orientation-specific construction
  defect rather than dropped sewing topology.
- Completed a focused topology canary. A zero-gap control correctly failed
  preflight; a valid 4 mm control retained all 34 sewing edges and passed a
  30-frame helper bake with 0.361 mm convergence, 0.0183 mm maximum seam gap,
  zero reliable penetration and unchanged gates. The next trouser pass uses
  controlled seam offsets plus corrected spatial side detection, front rise,
  back seat and crotch junction.
