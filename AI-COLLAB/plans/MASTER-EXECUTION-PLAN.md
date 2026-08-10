# Profile Upgrade master execution plan

**Plan owner:** Codex, lead implementation agent
**Review owner:** Claude Code, independent architecture and quality reviewer
**Product owner:** Bongo Seakhoa
**Plan date:** 2026-07-30
**Plan status:** Approved for staged execution by the lead, pending continuous Claude review
**Working repository:** portfolio repository root
**Reference library:** owner's private reference library

## 1. Outcome

Deliver a production-grade professional portfolio at:

`https://bongo-seakhoa.github.io/profile/`

Release 1 is a complete, fast, accessible and evidence-led Static View with Anzania art direction. It replaces the current surname-selector landing page, dark aurora, glass cards and continuous particle canvas.

The release must:

- Establish Bongo Seakhoa as the primary public identity.
- Make the strongest professional evidence understandable in the first screen.
- Provide conventional, shareable routes for work, capabilities, experience, research, education, credentials, about, documents and contact.
- Remain complete with JavaScript disabled.
- Use approved Anzania still artwork as an editorial design system.
- Preserve Bongo Kosa as a quiet, canonicalised continuity route and document option.
- Produce current resume and CV files from the same approved content record.
- Be deterministic, testable, recoverable and deployable through GitHub Pages.
- Leave a clean, opt-in loading boundary for a future immersive Anzania bundle.

## 2. Decisions and working assumptions

These assumptions keep work moving and are deliberately reversible.

| ID   | Decision or assumption                                                              | Rationale                                                                                                                                                                                                                             | Reversal point                                                                          |
| ---- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A-01 | Keep the supplied production URL and `/profile/` base path.                         | The owner named this URL as the upgrade target and did not request a domain or repository rename.                                                                                                                                     | Change `site` and `base` before release-candidate sign-off.                             |
| A-02 | Static View is Release 1 and the canonical renderer.                                | The newest addendum makes it first-class; it satisfies users, search engines and accessibility without unresolved character dependencies.                                                                                             | The required immersive mode follows Release 1 as an opt-in enhancement.                 |
| A-03 | Astro + TypeScript own the complete production build.                               | Best fit for typed content, static routes, images, SEO, documents, base paths and future isolated Anzania loading.                                                                                                                    | A legacy build remains recoverable until one stable production cycle passes.            |
| A-04 | Resume and CV are browser-native JavaScript assets.                                 | The owner explicitly prioritised editorial quality over the current Python-to-browser pipeline. The Nielsen Sports method proves that shared HTML, print CSS and headless Chromium can produce small, selectable, brand-quality PDFs. | Templates and page plans remain versioned and previewable in the browser.               |
| A-05 | Personal phone is removed from indexable HTML and generated public PDFs by default. | Privacy-safe and reversible; email and LinkedIn remain direct contact paths.                                                                                                                                                          | Restore only after explicit owner approval.                                             |
| A-06 | `07_59_39 PM (2).png` is the Threshold Dunes inner plate.                           | Independent filename audit plus direct visual inspection show the exact camp/waystation described by the brief.                                                                                                                       | Registry and workbook retain source provenance for correction.                          |
| A-07 | Reference masters remain outside the public site.                                   | The library contains large PDFs, ZIPs, source PNGs, workbooks and specifications that are not public runtime assets.                                                                                                                  | Only approved, traceable derivatives are copied into the repository.                    |
| A-08 | No invented metrics, job facts, publications or outcomes.                           | Programmatic LinkedIn access is blocked; existing first-party content remains the baseline until owner-supplied evidence improves it.                                                                                                 | New claims enter through the content review workflow with evidence.                     |
| A-09 | Full immersive roster and character production follow Release 1.                    | The canonical character reference pack is absent and the approved roster is studio-scale.                                                                                                                                             | Begin after Release 1 and receipt of the canonical pack; this work remains required.    |
| A-10 | Blender is an audited production tool, not a Static View runtime dependency.        | Static View is explicitly still, HTML-first and WebGL-free.                                                                                                                                                                           | Blender output may enter the later immersive asset pipeline or approved static renders. |
| A-11 | Immersive mode has one distant full-body exploration camera and no OTS variation.   | The owner explicitly superseded all previous camera-framing language. Complete animated bounds, not root position or fixed distance, govern the responsive composition.                                                               | Locked product direction; changes require a later explicit owner correction.            |

Decision details live in `AI-COLLAB/decisions/`.

## 3. Scope

### 3.1 Included in Release 1

- Repository, content, reference, workbook, build, deployment, browser and Blender audits.
- A versioned content model, schemas and validation.
- A language-neutral compiled content manifest and one route manifest.
- Astro static renderer with base-aware URLs and directory routes.
- Editorial Anzania design tokens and responsive, still image treatment.
- Overview, Work, project case-study, Capabilities, Experience, Research, Education, Credentials, About, Documents, Contact, Bongo Kosa continuity and 404 routes.
- Three to five genuinely evidence-rich featured project treatments, subject to available evidence.
- Search, social sharing and structured metadata.
- Resume and CV HTML and PDF generation from the shared content.
- Phone privacy remediation.
- Asset provenance, semantic aliases and responsive AVIF/WebP derivatives.
- No-JavaScript, accessibility, responsive, performance, print, SEO, link and cross-browser validation.
- GitHub Actions build, test, Pages artifact deployment and manual rollback.
- `AI-COLLAB` protocol, heartbeat, watcher, plans, decisions, status, risks, messages and logs.
- A production tag, reproducible release artifact and post-deploy smoke test.

### 3.2 Deferred from Release 1

- Controllable avatar navigation.
- The 15-character production roster.
- Traversal powers, shaders, audio, haptics, parallax, animated plates and WebGL.
- Depth maps, motion masks and other immersive-only plate outputs.
- Contact form backend or private data collection.
- A custom domain purchase or repository rename.
- Publication of private certificates, reference PDFs, spreadsheets, JSON specifications or ZIP handoffs.

### 3.3 Explicit boundaries

- Static View does not import, preload or request an immersive bundle.
- Professional facts live in one content source; templates may not hard-code resume facts.
- Runtime assets are derivatives. Source masters are never overwritten.
- `SUPERSEDED_DO_NOT_SHIP` assets fail the asset-integrity check.
- Bongo Kosa pages do not duplicate the complete site.
- Current production remains untouched until a release candidate passes the full gate set.

## 4. Baseline audit

### 4.1 Repository

- Branch: `main`.
- Baseline commit: `df410d5` (`Upgrade resume and CV document suite`).
- Remote: `https://github.com/Bongo-Seakhoa/profile.git`.
- Deployment: GitHub Pages project site from repository-root static files.
- Current build: one 1,300+ line Python generator with large inline HTML/CSS blocks.
- Current JavaScript: perpetual particle animation and reveal behaviour.
- Current worktree before collaboration files: clean.
- No package manifest, lockfile, CI workflow, test suite, sitemap, CNAME or Sites hosting configuration.
- Existing generated files are committed directly at repository root.

### 4.2 Current live experience

- Production responds successfully at `/profile/`.
- Live HTML matches the repository baseline.
- Mobile at 390 px shows horizontal clipping and crowded navigation.
- Core reveal styling can hide content when JavaScript is unavailable.
- Canonical tags, social image metadata and sitemap are absent.
- The Bongo Kosa path duplicates too much identity content.

### 4.3 Build system

- Python 3.12.10.
- A clean copied build exits with status 0 even when all four Chrome PDF renders crash.
- Failed PDF generation leaves stale PDFs in place and reports the site as generated.
- This silent success is a release blocker.

### 4.4 Front-end and browser tools

- Bundled Node.js: 24.14.0.
- Bundled pnpm: 11.9.0.
- Playwright library and Sharp are available in the Codex runtime.
- Astro, TypeScript, Lighthouse, axe-core, Vitest and `@playwright/test` are not yet project dependencies.
- Installed Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- Installed Edge: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
- Real Chrome headless rendering works when launched with an isolated profile and GPU disabled.
- The connected in-app browser could not attach during the audit; Chrome CLI is the verified fallback.

### 4.5 Reference library

- 39 files, approximately 256 MiB.
- 27 PNGs, 2 PDFs, 2 ZIPs, 3 Markdown briefs, 2 XLSX workbooks, 2 JSON files and 1 CSV.
- No loose GLB, FBX, Blender, video, audio, texture or font files.
- Sixteen 1672×941 location plates, three support boards, six non-canonical character sheets and two superseded concepts are classified.
- Generic source filenames are unsuitable for public runtime use; semantic derivative aliases are required.

### 4.6 Asset-linkage workbook

`Anzania_Asset_Linkage_Actual_Filenames_v2.0.xlsx` was checked cell by cell and corrected:

- Extra terminal duplicate `(1)` suffixes were removed.
- Threshold Dunes inner now maps to `ChatGPT Image Jul 30, 2026, 07_59_39 PM (2).png`.
- Dashboard totals now show 16 verified location plates, 0 missing, 3 support assets and 19 total mappings.
- Registry byte sizes and SHA-256 hashes now match files on disk.
- All six sheets render without formula-error markers.
- The exact original is preserved in `AI-COLLAB/archive/reference-originals/`.

### 4.7 Blender 5.2

- Binary: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`.
- Version: Blender 5.2.0 LTS, build `fbe6228777e7`, Windows Release, built 2026-07-14.
- EEVEE, Workbench and Cycles engines are selectable in factory-startup background mode.
- glTF 2, FBX, USD and Alembic import/export capabilities are available.
- Rigify and Node Wrangler modules are installed; they are not assumed active without a project-specific enable step.
- Cycles detects the AMD Ryzen 5 4500U CPU only. CUDA and HIP initialization fail, so Cycles GPU acceleration is unavailable.
- EEVEE 64×64 and Cycles CPU 32×32 headless self-renders both passed.
- EEVEE is the iteration engine. Cycles is reserved for bounded CPU final renders with recorded samples, seed, resolution, output hash and time.
- The machine has approximately 8 GB RAM; geometry, texture and render budgets must be conservative.

## 5. Target architecture

```text
content/ + TypeScript schemas
        |
        v
TypeScript validator and manifest compiler
        |
        +----> generated/site-manifest.json
        |                 |
        |                 +----> Astro static renderer ----> dist/
        |                 |
        |                 +----> Document preview routes
        |                                  |
        |                                  v
        |                         Playwright / Chromium
        |                                  |
        |                                  v
        |                     public/assets/files/*.pdf
        |
Verified Anzania registry
        |
        +----> approved semantic source copies
                        |
                        v
                 Astro image derivatives

Future src/immersive/
        |
        +----> separate opt-in bundle; never imported by Static View
```

### 5.1 Runtime and build boundaries

**Astro owns:**

- Semantic public HTML.
- Physical directory routes.
- Shared layouts and components.
- Base-aware internal URLs.
- Canonical URLs, Open Graph, Twitter metadata and structured data.
- Sitemap, robots and 404 output.
- Responsive image derivatives.
- Minimal enhancement JavaScript.

**TypeScript and browser-native document tooling own:**

- Schema and business-rule validation.
- Content normalization and compiled manifest generation.
- Duplicate/date/privacy/credential-expiry checks.
- Resume and CV preview routes.
- Fixed A4 page plans, print CSS and layout validation.
- Playwright/Chromium PDF generation.
- PDF metadata, page count, link and rendered-page verification.

The existing Python asset-registry script remains an audit utility. Python is not required by the production site or document build.

### 5.1.1 Resume and CV rendering contract

The Nielsen Sports export-upgrade project supplies the method:

1. Preserve structured data rather than flattening it.
2. Render the same pure HTML/CSS document for screen preview and PDF.
3. Use local, deterministic fonts and wait for `document.fonts.ready`.
4. Print with headless Chromium rather than drawing text primitives.
5. Keep colour, spacing and typography as design tokens.
6. Render every PDF page to PNG and inspect it.
7. Fail on missing fonts, page overflow, stale files or mismatched content.

For this portfolio:

- Resume and CV routes render curated A4 `.sheet` pages from the shared manifest.
- Resume targets two deliberate pages; CV targets three deliberate pages unless the approved content requires a different reviewed plan.
- Page assignment is a versioned editorial plan, not uncontrolled browser auto-pagination.
- Section headings may not be orphaned at a page foot.
- Experience and project blocks break only at approved semantic boundaries.
- Each sheet has a fixed content box and an in-document footer with page X of Y.
- The build fails when a content box overflows, a required section under-runs its minimum content, a font falls back or an unexpected page count appears.
- PDF output uses `preferCSSPageSize`, `printBackground`, tagged output and document outline support where Chromium provides them.
- Seakhoa and Kosa variants use the identical page plan and content; only the approved name field changes.
- PDF text remains selectable, links remain clickable and ATS parsing is checked from extracted text.
- No raster screenshot is used for body text.

**Browser test harness owns:**

- Route/deep-link checks at the exact `/profile/` base.
- JavaScript-disabled checks.
- Accessibility scans.
- Responsive overflow, console and network checks.
- Performance-budget collection.

**Blender owns, later:**

- Approved 3D asset creation and validation.
- Geometry, UV, material, rig, LOD and glTF export checks.
- It is not invoked by the Static View CI path.

### 5.2 Deployment settings

```js
site: "https://bongo-seakhoa.github.io";
base: "/profile";
trailingSlash: "always";
build: {
  format: "directory";
}
```

All internal links use one helper. A generated-output test rejects links that escape the configured project base.

### 5.3 Content model

```text
content/
├── identity.json
├── profile.json
├── capabilities.json
├── experience.json
├── education.json
├── credentials.json
├── research.json
├── route-manifest.json
├── site-settings.json
└── projects/
    └── <project-slug>.json
```

Required common metadata:

- `status`
- `featured`
- `featured_order`
- `public`
- `privacy_status`
- `evidence_links`
- `last_reviewed`
- `date_start`
- `date_end`
- `current`
- `tags`
- `related_projects`
- `related_research`
- `seo`
- `static_view`
- `anzania_view`

The validator rejects invalid dates, duplicate identifiers, duplicate credentials, expired active credentials, invalid evidence links, missing required public fields and mode/route drift.

### 5.4 Route manifest rule

The route manifest is the source of truth for public destinations. It drives:

- Astro route generation.
- Navigation.
- Breadcrumbs.
- Sitemap.
- Structured data.
- Document links.
- Future Anzania location-to-route mapping.

A professional fact available only in Anzania is a build defect.

## 6. Required resources

### 6.1 Project dependencies

- Node.js 22 LTS in CI.
- pnpm with a committed lockfile.
- Astro and TypeScript.
- A TypeScript schema validator.
- Sharp through Astro image handling.
- Playwright test runner and browser binaries.
- `pdf-lib` only for JavaScript metadata or merging if the final design needs multiple print passes.
- Pixel comparison tooling for rendered-page regression.
- axe-core integration.
- Lighthouse CI or equivalent reproducible runner.
- Chrome/Chromium for deterministic PDF output.
- Poppler command-line tools for page rendering, font inspection and text/layout verification.

All dependency versions are pinned. Installation is performed only after this plan is committed.

### 6.2 Source resources

- `content/profile.json` as migration baseline.
- User-supplied LinkedIn URL as a corroborating source; no blocked/private content is inferred.
- Corrected workbook and verified Anzania registry.
- Static View addendum as highest authority for Release 1.
- Worldbuilding addendum for asset semantics.
- Canonical reference bible for future character/art review.

### 6.3 Human responsibilities

| Owner       | Responsibilities                                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex       | Lead architecture, implementation, content migration, testing, commits, release and recovery.                                                              |
| Claude Code | Independent plan review, architecture critique, focal/safe-zone review, adversarial QA, complete-avatar camera verification and gate verification.         |
| Bongo       | Owner authority for disputed professional facts, optional phone publication, new domain decisions, canonical character pack and final creative acceptance. |

Claude silence never blocks Codex. If no Claude heartbeat is observed for more than three hours, status changes to offline and Codex proceeds from written review artefacts.

## 7. Milestones, ownership and exit criteria

### M0 — Freeze, audit and recovery baseline

**Owner:** Codex
**Reviewer:** Claude
**Status:** In progress

Deliverables:

- Record baseline commit, live routes, screenshots, hashes, tools and constraints.
- Preserve the original corrected-workbook input.
- Tag the baseline before deployment settings change.
- Establish collaboration protocol, watcher, heartbeat, plan, decision, risk and status files.

Exit:

- Audit evidence is written.
- Baseline tag resolves to `df410d5`.
- Current production can be reproduced as a legacy artifact.
- No public source has been changed.

Commit intent:

`chore: establish collaboration and audited recovery baseline`

### M1 — Content safety and build contracts

**Owner:** Codex
**Reviewer:** Claude content discrepancy review

Deliverables:

- Split and normalize content records.
- Add schemas and validation.
- Add privacy and evidence metadata.
- Remove public phone by default.
- Resolve duplicated credential representation.
- Clarify concurrent engagement types without inventing facts.
- Create route and compiled manifests.
- Replace Python document composition with shared Astro/TypeScript document preview routes.
- Add curated page-plan metadata for the two-page resume and three-page CV.
- Make any Chromium PDF failure fatal unless `--skip-documents` is explicit.
- Add font-ready, overflow, orphan-heading, freshness and manifest-consistency checks.

Exit:

- Content validation passes.
- Every public claim traces to a source record.
- No duplicate credentials or invalid dates.
- PDFs are newly generated or the build fails.

Commit intent:

`feat: establish validated content and document contracts`

### M2 — Static shell and design system

**Owner:** Codex
**Reviewer:** Claude design-system and accessibility critique

Deliverables:

- Astro scaffold, locked dependencies and project-base configuration.
- Header, footer, skip link, breadcrumbs, mode boundary and 404.
- Warm editorial tokens, type scale, layout grid, forced-colour and print rules.
- Mobile navigation without content gating.
- Delete the current aurora, particles, scroll reveals and glassmorphism from the new renderer.

Exit:

- Root and 404 build physically under the correct base.
- Site remains complete with JavaScript disabled.
- 320 px reflow and keyboard smoke tests pass.
- No canvas/WebGL/immersive request occurs.

Commit intent:

`feat: build the accessible static portfolio shell`

### M3 — Homepage and professional routes

**Owner:** Codex
**Reviewer:** Claude information-architecture review

Deliverables:

- High-signal homepage.
- Work index and evidence-tiered project system.
- Three or more complete case-study routes where evidence permits.
- Capabilities, Experience, Research, Education, Credentials, About, Documents and Contact.
- Bongo Kosa continuity route with canonical metadata.

Exit:

- Every manifest route resolves and is reachable within two meaningful actions.
- No duplicate full identity site exists.
- Archive work has lower visual hierarchy than featured work.
- Every page has a unique heading, title and description.

Commit intent:

`feat: add evidence-led portfolio routes and case studies`

### M4 — Anzania still-asset integration

**Owner:** Codex
**Reviewer:** Claude safe-zone and art-direction review

Deliverables:

- Ingest only the verified registry.
- Copy approved sources under semantic aliases.
- Record source filename, hash, dimensions, transform and public-use status.
- Produce responsive AVIF/WebP derivatives and mobile crops.
- Integrate the Threshold Dunes hero and restrained section art.
- Fence off all superseded and non-canonical assets.

Exit:

- Every shipped derivative is traceable.
- Source masters remain byte-identical.
- No source PNG is served directly.
- Hero remains sharp within the source-width constraint and meets its size budget.
- Text never relies on the image for legibility.

Commit intent:

`feat: integrate verified Anzania editorial artwork`

### M5 — Documents, SEO and automation

**Owner:** Codex
**Reviewer:** Claude metadata and document consistency review

Deliverables:

- Browser-previewable resume/CV HTML and deterministic Chromium PDFs generated entirely through JavaScript.
- Local font embedding, curated A4 page plans and visual-regression baselines.
- Canonical URLs, OG/Twitter metadata and per-route images.
- Valid Person/ProfilePage/CreativeWork/Breadcrumb structured data.
- Sitemap, robots and human-readable index.
- GitHub Actions build/test/Pages workflows.
- Manual release-ref rollback workflow and version metadata.

Exit:

- Documents match the manifest and contain no public phone.
- Metadata validation passes.
- CI builds from a clean checkout.
- Pages artifact contains only intended public files.

Commit intent:

`feat: harden documents seo and release automation`

### M6 — Full quality gate and controlled cutover

**Owner:** Codex
**Independent verifier:** Claude

Deliverables:

- Multi-browser and responsive browser reports.
- axe and manual accessibility evidence.
- No-JavaScript and image-failure evidence.
- Lighthouse and transfer-budget reports.
- Broken-link, console, SEO, print and PDF checks.
- Production deployment and smoke-test report.

Exit:

- All Release 1 acceptance criteria pass.
- Deployed SHA is recorded.
- Production works at root and deep links under `/profile/`.
- Rollback artifact is deployable.

Commit intent:

`release: publish production static portfolio`

### M7 — Immersive vertical-slice gate

**Owner:** Codex
**Reviewer:** Claude
**Dependency:** canonical character pack and approved roster/slice inputs

Deliverables after dependencies arrive:

- One Threshold Dunes location.
- One production canonical character.
- Per-plate lighting profile.
- Blender-to-glTF validation.
- Opt-in, lazy immersive bundle that preserves route and Static View.
- `AnimatedBoundsTracker` that samples after skinning/secondary motion and unions meshes, LOD transitions, accessories, authored motion proxies and power silhouettes for every visible frame.
- `FullBodyFramingController` that solves target, radius and elevation from the complete projected bounds rather than a fixed distance.
- `ViewportSafeZoneService` and DOM bridge that use the visual viewport, safe-area insets and complete panel animation sweep rectangles to keep ordinary states in a lower-third home pocket away from active HTML content.
- Predictive traversal pullback, full-body look-back orbit and a safely cancellable long-idle edge lean.
- Authored power composition intents that may temporarily use safe middle/upper pockets and deterministically return to the lower-third home stage.
- Typed, duration-limited authored visibility-suppression rules and conservative maximum fallbacks for missing or stale bound contributors.
- Compact animation manifest, explicit interruption state machine, three owner-directed shared locomotion profiles and measured LOD/runtime budgets from D005.
- Debug telemetry and a deterministic full-animation, traversal, viewport, content-state and browser test matrix.
- Structural and runtime assertions that reject every OTS preset or fallback, shoulder-relative target and head/neck/clavicle/shoulder camera target.

Exit:

- Production-quality browser/Blender gate passes.
- Static View metrics are unaffected when Anzania is not selected.
- Every intentionally visible animation frame contains the complete avatar, including accessories and power-relevant silhouette.
- Steady desktop/laptop framing is browser-tuned near 14–20% of visual-viewport height; containment may pull below 14%, while every non-selection state remains at or below 24%.
- Gestures, look-back, traversal and idle edge lean preserve the same distant full-body composition without upper-body zoom.
- Ordinary states stay in the lower-third home stage; power crossover/hover phases may use middle or upper safe pockets while preserving containment and returning home.
- Claude independently signs the cross-browser, cross-animation containment matrix, or Codex completes the same written matrix after the heartbeat timeout for later Claude audit.
- The slice is approved before asset production scales. A failed slice returns
  to implementation and review; it does not remove immersive production from
  project scope.

### M8 - Canonical character production

**Owner:** Codex
**Independent reviewer:** Claude
**Dependency:** `DN-CHAR-001`, the approved canonical character reference pack

Scope:

- Evaluate every supplied character source against the canon, silhouette,
  cultural, gender-presentation and production-readiness requirements.
- Record accept, revise or reject decisions with source hashes and review images.
- Build the complete approved roster rather than substituting one recoloured
  base model.
- Sculpt/model, retopologise, UV, texture, shade and rig every canonical
  character in Blender 5.2.
- Build required headwear, scarves, garments, garment tails, pouches, footwear,
  tools and power-relevant accessories.
- Produce selection-view presentation plus LOD0, LOD1 and LOD2 runtime variants.
- Create shared rig conventions while preserving distinct faces, bodies and
  silhouettes.
- Create the declared shared male, female and nonbinary locomotion profiles
  without implying a gender identity that the approved character record does not
  assign.
- Export versioned glTF assets with material, skeleton, morph, scale, orientation
  and naming checks.

Acceptance:

- Every approved character matches its canonical reference turnarounds.
- No noncanonical concept sheet or superseded character ships.
- Complete full-body bounds include every accessory at every LOD.
- Skinning, cloth proxies, garment clearance and facial shapes pass deformation
  poses and representative animations.
- Geometry, texture, draw-call, joint and material budgets pass D005.
- Character-selection presentation is readable and remains within its dedicated
  35 to 55 percent framing envelope.
- Source `.blend`, export settings, glTF files, hashes and review renders are
  recorded for every character.

### M9 - Location sets, lighting and background enhancement

**Owner:** Codex
**Independent reviewer:** Claude
**Dependencies:** verified plate registry and M7 lighting-profile approval

Scope:

- Evaluate all 16 approved Anzania location plates and classify the 3D set,
  projection, collision, occlusion, motion-mask and effect requirements.
- Build the complete location-set geometry needed for exploration, interactions
  and traversal while preserving the painted plate composition.
- Author foreground anchors, walkable surfaces, contact shadows, proxy collision,
  depth partitions and authored camera-safe corridors.
- Match plate-specific key direction, colour temperature, horizon luminance,
  ambient fill, fog and grade.
- Add restrained environmental motion, atmosphere, particles, cloth, water,
  dust, light shafts and background effects where the location brief calls for
  them.
- Build entrance, exit and inter-location transitions.
- Create quality tiers and fallbacks so low-power devices retain the composition
  without essential motion or costly effects.

Acceptance:

- Every set is traceable to the verified workbook and source hash.
- The avatar is grounded by lighting, scale, shadow and contact cues.
- Background enhancement never obscures HTML, causes unreadable contrast or
  changes the professional facts.
- Depth and occlusion behaviour agree with authored masks and collision.
- No plate is upscaled beyond its approved presentation.
- EEVEE review renders, representative browser captures and quality-tier
  comparisons are approved for each location.

### M10 - Animation, interaction, traversal and power effects

**Owner:** Codex
**Independent reviewer:** Claude
**Dependencies:** M8 rig contract, Animation Addendum and D005

Scope:

- Implement the complete compact animation library: locomotion, gestures, idles,
  traversal, interaction, impact, recovery, selection and state transitions.
- Build shared walk cycles for the declared male, female and nonbinary
  presentation groups and character-specific adjustments only where canon or
  silhouette requires them.
- Implement pointing, presenting and turning without changing the distant
  full-body composition.
- Implement hold-to-look-back as an orbit around the avatar at approximately the
  same radius.
- Implement long-idle hourglass and safe edge-lean behaviour with immediate
  interaction recovery.
- Implement Solar Propulsion, Sand Teleportation, surfing, launches, landings
  and every other approved traversal power.
- Author power-specific silhouette proxies, particles, trails, light, distortion,
  sound hooks and state markers.
- Permit typed Solar and other authored power excursions through middle or upper
  screen safe zones, followed by deterministic return to the lower-third home
  stage.
- Permit visibility suppression only for named, duration-limited authored phases
  such as Sand Teleportation.

Acceptance:

- Every clip has named state, loop policy, priority, blend timings, cancellation
  rule and reduced-motion behaviour.
- No unapproved animation can move the complete bounds outside the visual
  viewport.
- Power effects are reviewed with the avatar mask so glow or particles cannot
  hide clipping.
- Launch, acceleration, turns, jump apex, landing and recovery pass predictive
  camera pullback.
- Blends have no foot slide, limb pop, garment collision or unintended
  disappearance at tested playback rates.
- Audio remains optional and never carries essential information.

### M11 - Immersive browser runtime, streaming and fallbacks

**Owner:** Codex
**Independent reviewer:** Claude
**Dependencies:** M8 to M10 approved runtime assets

Scope:

- Integrate the asset loader, scene state machine, selection flow, location
  routing, interaction system, camera controller and animation coordinator.
- Keep the immersive bundle opt-in and absent from every Static View request.
- Stream characters, locations, animation clips, audio and effects by destination
  with cancellation, retry and recovery.
- Implement GPU and memory budgets, LOD switching, texture residency, effect
  scaling, reduced-motion mode and low-power fallback.
- Preserve the current professional route when entering and leaving Anzania.
- Restore Static View after WebGL loss, load failure, unsupported hardware or an
  explicit user exit.
- Add instrumentation for asset timing, frame time, memory pressure, animation
  state, camera envelope and recovery.

Acceptance:

- Static View bundle and performance remain unchanged when immersive mode is not
  selected.
- No essential content exists only in Anzania.
- First interaction, progressive load and destination changes meet the written
  budgets on the target device matrix.
- WebGL loss, failed chunk, offline revisit and back/forward navigation recover
  without losing the professional route.
- Low-power and reduced-motion modes remain complete, stable and honest.

### M12 - Full immersive evaluation and production release

**Owner:** Codex
**Independent reviewer:** Claude
**Dependencies:** M8 to M11 exit gates

Evaluation matrix:

- every canonical character;
- every LOD and quality tier;
- every location and transition;
- every animation, interaction and power;
- every supported desktop, laptop, tablet and mobile viewport ratio;
- ordinary, opening, open, closing and planned HTML content rectangles;
- keyboard, pointer, touch, reduced-motion and visibility recovery;
- Chrome plus the supported Firefox and WebKit paths;
- Blender source scenes, EEVEE review renders and exported browser assets.

Required evidence:

- object-ID and silhouette-mask containment reports for every tested frame;
- reference-to-model turntable comparisons;
- animation contact sheets and blend reviews;
- set lighting, atmosphere and effect comparisons;
- browser screenshots and videos at the required viewport matrix;
- performance traces, transfer reports, memory and LOD evidence;
- accessibility and fallback reports;
- asset provenance, hashes, Blender versions and export logs;
- independent Claude review, or a queued written review if Claude is offline
  under the three-hour protocol.

Exit:

- No avatar crop, unapproved disappearance, OTS path, unsafe HTML overlap or
  power-effect framing failure remains.
- Characters, sets, materials, lighting, effects and animation meet the visual
  review bar as one coherent world.
- Runtime performance and recovery gates pass on the agreed device matrix.
- Static View remains the complete professional fallback.
- The deployed immersive release SHA and rollback artifact are recorded.

## 8. Acceptance criteria

### 8.1 Content integrity

- Schemas and business rules pass.
- No duplicated credentials or impossible dates.
- Every claim is traceable; no invented metrics.
- Current/expired/in-progress/confidential statuses are literal.
- Public PDFs match the shared manifest.
- Private phone and raw certificates do not ship.
- Credential expiry within 90 days is a build warning or release blocker.

### 8.2 Static and no-JavaScript behaviour

- No WebGL/WebGPU context, canvas, GLB, immersive bundle, audio or decorative animation is requested.
- Every essential route, document and contact path works without JavaScript.
- Project filters are progressive enhancement; all work remains visible without them.
- Images may fail without hiding content.

### 8.3 Routing and deployment

- Every manifest route resolves under `/profile/`.
- Deep links, refresh, browser history and 404 work.
- Generated internal links cannot escape to the domain root.
- Bongo Kosa canonicalises to the Bongo Seakhoa identity.
- View query parameters canonicalise to the route.

### 8.4 Accessibility

- WCAG 2.2 AA target.
- Zero serious or critical axe violations.
- Skip link is first and useful.
- Visible focus, logical focus order and no keyboard traps.
- 320 px reflow and 200% zoom pass.
- Contrast is measured on final surfaces.
- Forced-colour and print output preserve essential content.
- Touch targets and form/error semantics pass.

### 8.5 Performance

- Initial compressed HTML ≤100 KB per route.
- Initial compressed CSS ≤60 KB.
- Initial JavaScript ≤80 KB and preferably substantially lower.
- Hero AVIF approximately 250–450 KB where visual quality permits.
- Initial page transfer approximately ≤1.2 MB.
- Mobile LCP ≤2.5 s, CLS <0.1 and INP <200 ms.
- Lighthouse mobile: performance ≥90; accessibility, SEO and best practices ≥95.
- Static View never preloads immersive assets.

### 8.6 Visual and responsive quality

- Intentional layouts at 360, 768, 1024 and 1440 px.
- No horizontal overflow.
- Content order outranks decorative imagery on mobile.
- No repetitive wall of identical cards.
- Prose stays near 60–75 characters per line.
- Artwork uses explicit dimensions, focal metadata and appropriate crops.
- The interface remains coherent with images blocked.

### 8.7 Browser, SEO and release quality

- Chrome, Firefox and WebKit automated route coverage.
- Real Chrome screenshot review at required viewports.
- No console errors or broken resources.
- Unique title, description, canonical and social image per public route.
- Sitemap covers the route manifest.
- Structured data validates.
- Build is deterministic from a clean checkout.
- Production SHA and artifact hash are recorded.
- Production smoke tests pass before completion is declared.

### 8.8 Asset and Blender integrity

- Every shipped Anzania asset traces to the verified registry.
- No `SUPERSEDED_DO_NOT_SHIP` asset is in `dist`.
- Reference masters remain byte-identical.
- Blender work, when active, records source `.blend`, tool version, geometry/material/rig checks, export settings and glTF validation.
- Static View does not depend on Blender at runtime or build time.

### 8.9 Resume and CV quality

- The production document build contains no Python renderer or Python-to-HTML conversion step.
- Browser preview and PDF use the same TypeScript data, template and CSS.
- Resume and CV have deliberate, separately reviewed editorial page plans.
- No section title is orphaned at the bottom of a page.
- No experience, education, project or credential record is clipped or split at an unapproved boundary.
- Every page has intentional balance; overflow and unexplained excessive underfill fail the build.
- Approved local fonts are embedded and no fallback font appears in the PDF font inventory.
- Text is selectable and extracts in a sensible ATS reading order.
- Email, LinkedIn, GitHub and public evidence links remain clickable.
- Page numbers, document title, person name, dates and variant metadata are correct.
- All four variants have the expected page count and matching content apart from the approved name field.
- All pages are rendered to PNG after every meaningful design change and receive visual inspection.
- The final page images show no clipping, collision, black boxes, broken glyphs, widows, orphan headings or accidental HTML-browser chrome.

### 8.10 Immersive character and rig quality

- Every canonical character has approved model, materials, rig, accessories and
  LODs.
- Distinct faces, bodies and silhouettes are preserved.
- Shared locomotion is mapped only through the approved presentation groups.
- Deformation, garment clearance, morphs, skeleton naming and glTF export pass.
- Complete animated bounds include skin, accessories, cloth, power proxies and
  LOD transition extrema.

### 8.11 Environment, animation and effects quality

- Every approved location has evaluated depth, collision, lighting, atmosphere
  and camera-safe space.
- Environmental effects strengthen the plate without obscuring content.
- Every animation and power has a versioned manifest entry, state transition,
  cancellation path, bounds proxy and reduced-motion treatment.
- Solar Propulsion and other approved powers may travel through middle or upper
  safe zones only during their authored phases, then return to the lower-third
  home stage.
- Sand Teleportation and any other disappearance use only typed, timed visibility
  suppression markers.

### 8.12 Immersive runtime and evaluation quality

- Immersive assets load only after explicit selection.
- Streaming, retry, WebGL-loss recovery, back/forward history and Static View
  fallback pass.
- Every character, location, animation, power, viewport and quality tier appears
  in the automated and visual review matrix.
- Browser frame-time, memory, transfer, texture, draw-call and LOD budgets pass.
- Object-ID mask checks prove full silhouette containment for every intentionally
  visible frame.
- Blender sources and exported browser assets remain reproducible and traceable.
- The PDF file carries title, author, subject, keywords, language and producer metadata.

### 8.10 Immersive camera and avatar containment

- Immersive mode contains no OTS configuration, code path, transition, cinematic shot or fallback, and the camera cannot parent to or target a head, neck, clavicle or shoulder node.
- Powers, destinations and animation clips provide bounded composition hints only; the framing solver is the sole authority for final target and radius.
- The full animated avatar envelope remains inside the responsive safe zone on every intentionally visible frame.
- The envelope is sampled after animation/world-matrix/secondary-motion updates and includes headwear, soles, hands, scarves, garment tails, pouches, held objects, LOD/blend unions and power-relevant silhouette proxies.
- Missing or stale contributors activate a conservative maximum fallback and a recorded pullback; absence of a registered fallback fails closed.
- Steady desktop/laptop framing is approximately 14–20% of visual-viewport height. Pullback below 14% is permitted for containment; every non-selection state has a hard 24% ceiling.
- The avatar’s home/navigation composition is the lower third with clear space above and below and an offset from active HTML content whenever a valid safe pocket exists.
- Only authored traversal power phases may request middle or upper safe pockets; every arrival/recovery returns to the lower-third home pocket.
- Panel/menu opening and closing use their complete transition sweep rectangles before motion begins; no one-frame overlap or side oscillation is allowed.
- Pointing, presenting and turning remain visible without an upper-body zoom.
- Hold-to-look-back preserves full-body containment through the orbit, hold and return at approximately the same radius.
- Acceleration, turning, jumping, surfing, launching and landing trigger predictive pullback when needed; no fast-movement crop is allowed.
- Only a typed, whitelisted traversal phase with matching power, phase, marker and maximum duration may temporarily hide the avatar; a generic Boolean is invalid.
- The complete long-idle edge-lean animation stays on screen and interaction restores the normal composition immediately.
- Foreground environment geometry never fully hides the avatar outside an authorised traversal phase.
- Landscape, portrait, square, ultrawide and short-height matrices pass across supported browser engines, breakpoints, animation blends and major HTML-content states.
- Each test run records projected bounds, safe-zone insets, viewport ratio, framing ratio, camera radius, active state and any authorised visibility suppression.
- Independent avatar/accessory/power object-ID masks agree with the complete-bounds telemetry; controller telemetry cannot certify itself.

## 9. Test strategy

| Layer            | Checks                                                                                                                                                                                                                                                     | Tooling                                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Content          | Schema, dates, duplicates, privacy, expiry, evidence, route drift                                                                                                                                                                                          | TypeScript unit tests and validator                                                                                                              |
| Components       | Render states, long/missing fields, semantics                                                                                                                                                                                                              | Astro/TypeScript tests and static inspection                                                                                                     |
| Build            | Clean build, deterministic manifest, no drift, asset allowlist                                                                                                                                                                                             | pnpm scripts and TypeScript                                                                                                                      |
| Routes           | Status, deep link, refresh, back/forward, exact base path                                                                                                                                                                                                  | Playwright                                                                                                                                       |
| No-JS            | Readability, links, documents, contact, filters fallback                                                                                                                                                                                                   | Playwright with JavaScript disabled                                                                                                              |
| Accessibility    | axe, keyboard, focus, landmarks, zoom, reflow, contrast, print                                                                                                                                                                                             | axe + Playwright + manual review                                                                                                                 |
| Visual           | Required viewports, image failure, long content, screenshots                                                                                                                                                                                               | Real Chrome and Playwright                                                                                                                       |
| Performance      | Budgets, LCP, CLS, INP, transfer, unrequested immersive assets                                                                                                                                                                                             | Lighthouse CI + performance assertions                                                                                                           |
| SEO              | Metadata uniqueness, canonical, sitemap, robots, JSON-LD                                                                                                                                                                                                   | Static validators + browser                                                                                                                      |
| Documents        | Fonts, overflow, orphan headings, freshness, page count, selectable text, links, phone absence, page images                                                                                                                                                | Playwright/Chromium + Poppler + JavaScript checks                                                                                                |
| Assets           | Hash, dimensions, status allowlist, derivative provenance                                                                                                                                                                                                  | TypeScript verifier; legacy Python verifier is an audit cross-check                                                                              |
| Blender          | Headless file open, dependency scan, render/export, glTF checks                                                                                                                                                                                            | Blender 5.2 CLI and browser                                                                                                                      |
| Immersive camera | Complete animated-bound containment, post-skinning/LOD/proxy coverage, hard size ceiling, sweep-safe pockets, look-back, traversal pullback, idle restore, typed suppression, structural no-OTS rules, occlusion and independent silhouette-mask agreement | TypeScript unit/property tests + Playwright frame telemetry + Chrome/Firefox/WebKit recordings + Blender animation inventory and object-ID masks |
| Production       | URL/deep-link smoke, resource paths, version SHA                                                                                                                                                                                                           | Playwright against GitHub Pages                                                                                                                  |

Every milestone adds tests before its release commit. Final QA runs from a fresh checkout and against the deployed URL.

## 10. Risk and dependency controls

The live register is `AI-COLLAB/risks/RISK-REGISTER.md`. Release-blocking risks include:

- `/profile/` base-path escape.
- Silent/stale PDF success.
- Inaccurate or unverifiable professional claims.
- Personal-data exposure.
- Image softness or oversized PNG delivery.
- JavaScript hiding content.
- Mode drift.
- Superseded artwork shipping.
- Missing Claude response.
- Pages configuration or deployment failure.
- OneDrive file contention.
- Missing canonical character pack.
- Avatar cropping, unauthorised disappearance or accidental OTS camera drift.

Each risk has a trigger, prevention, contingency, owner and recovery action.

## 11. Recovery and rollback

1. Tag the baseline commit before any Pages-source change.
2. Preserve a legacy packager that can create the current public artifact from the baseline tag.
3. Develop the new renderer without replacing the current public root until the release candidate passes.
4. Deploy only a saved `dist` artifact through the protected GitHub Pages environment.
5. Embed commit SHA, build time and content-manifest hash in `version.json`.
6. Keep the last known-good artifact and the baseline artifact.
7. If smoke tests fail, redeploy the last known-good artifact through the same Actions path.
8. Do not toggle between branch-root and Actions publishing during an incident.
9. Preserve reference masters and the original workbook independently of runtime derivatives.
10. If OneDrive locks a file, stop the writer, verify hashes and retry from a clean staging copy; never overwrite an unresolved conflict.

## 12. Commit and change-control policy

- Commit after each milestone-sized coherent change.
- Never mix unrelated user work into a commit.
- Record consequential decisions in `AI-COLLAB/decisions/`.
- Claim a file lane in `handoff/HANDOFF.md` before editing.
- Include exact verification commands or report paths in commit notes and `logs/WORKLOG.md`.
- Do not push or deploy an unverified working tree.
- The release commit must be reproducible from its lockfiles and documented tool versions.

## 13. Claude collaboration protocol

- Codex posts review requests to `AI-COLLAB/inbox/claude/`.
- Claude posts findings to `AI-COLLAB/inbox/codex/` and full reports to `reviews/`.
- Both agents update `heartbeats/<agent>.json` while active.
- `scripts/watch-collab.ps1` watches the recipient inbox and reports peer heartbeat age.
- A three-hour heartbeat age marks the peer offline.
- Offline status releases all review waiting; Codex continues and records self-review evidence.
- Claude may resume later from written handoffs without invalidating completed work.

## 14. Definition of project completion

Release 1 is complete only when:

- M0 through M6 exit criteria pass.
- The production URL serves the recorded release SHA.
- The workbook correction and original backup are preserved.
- The corrected filename registry is the only ingestion source.
- All acceptance criteria have evidence.
- Remaining immersive work is either scheduled with its dependencies present or documented as blocked by a genuine external dependency.

The full immersive roster is not declared complete without the canonical character pack and explicit owner approval of roster scope.

## Release 2 addendum - production 2.5D Anzania journey

**Adopted:** 2026-08-08
**Authority:** D010
**State:** Implementation complete, final publication gates pending

The owner authorised a high-quality 2.5D or 2D result when full 3D would prevent
completion. The production implementation therefore uses the approved Anzania
world plates and full-body companion concepts as a cinematic 2.5D route rather
than shipping unfinished or low-quality pseudo-3D.

Release 2 adds:

- `/explore/` as an opt-in original fictional-world journey;
- eight locations with responsive outer and inner scene plates;
- fifteen selectable full-body companions;
- four authored traversal treatments;
- atlas, guide and options interfaces;
- a responsive animated-bound framing controller with no over-the-shoulder path;
- look-back, presenting, idle, travel and portal states;
- route, homepage, header, footer, sitemap and social-card integration;
- unit, Playwright, public-output and release-budget gates; and
- complete Static View and document-pipeline isolation.

The final publication sequence and recovery plan are defined in
`docs/PROFILE-UPGRADE-2-5D-RELEASE.md`. D010 supersedes D007 only where full
Blender and browser 3D were mandatory. All quality, full-body camera,
accessibility, fallback and recovery requirements remain in force.
