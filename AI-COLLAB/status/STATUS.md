# Profile Upgrade status

**Updated:** 2026-07-31
**Lead:** Codex
**Independent reviewer:** Claude, active through the dual-root heartbeat protocol
**Current milestone:** DN-M-AFR-01 production pilot

## Overall

| Area | State | Evidence / next gate |
| --- | --- | --- |
| Repository, references, build and deployment audit | Complete | Baseline `df410d5`; recovery tag `legacy-pages-baseline-20260730`; GitHub Pages project-site constraints recorded. |
| Collaboration protocol | Active | Shared plans, decisions, risks, handoffs, inboxes, ignored runtime heartbeats and watcher are under `AI-COLLAB/`. |
| Asset-linkage workbook | Complete | Corrected v2 workbook verified across all six sheets; reference original preserved. |
| Static View implementation | Complete | Astro/TypeScript site builds 26 pages with 0 bytes of client JavaScript. |
| Resume and CV | Complete | JavaScript/Chromium pipeline produces four exact-A4, selectable PDFs: two 2-page resumes and two 3-page CVs. |
| Static release QA | Passed | 58 unit tests, 72 browser tests, public-output validation, metadata validation, budgets and three-run Lighthouse median passed. |
| Public contact and privacy review | Exact-value contract active | D015 records owner approval for `+27 73 590 7659`; Contact, Resume and CV require that exact number while arbitrary phone drift, private documents and U+2014 em dashes remain blocked. R-026 is closed as owner-intended exposure. |
| Deployment | Last known-good Static release live; current revision pending | Static View implementation revision `e29a4c9` is live; warning-clean Pages run `30605182973` and post-deploy HTTP/PDF verification passed. The later exact-phone, environmental-background and production-gate revision is checkpointed on `agent/static-release-record` but is not yet claimed as live. |
| Canonical character discovery | Complete | Desert Nomad v3 self-contained handoff verifies 32 of 32 manifest entries and defines the exact 15-character roster. |
| Pilot reconstruction | Approved | Bongo approved the DN-M-AFR-01 v2 silhouette; its Blender measurement blockout remains the dimensional base for production. |
| Public character derivatives | Authorized for portfolio scope | D010 records owner image rights and authorization to create, publish and redistribute approved portfolio derivatives. Raw masters remain private. |
| Full immersive production | Pilot active | DN-M-AFR-01 modelling, rigging, materials, animation, LOD and export validation are the active vertical slice before roster scale-up. |
| Full-body camera source controller | Source gate passed; runtime gate open | Commit `baaf558` provides canonical silhouette registries, stateful authored-disappearance enforcement, predictive bounds, responsive safe zones, real perspective AABB projection, fixed full-visibility epsilon, controller-owned look-back baselines and no OTS path. Independent reruns pass 42 focused, 73 immersive and 101 full unit tests. Production renderer mounting, object-ID-mask agreement and real-browser verification remain required. |
| DN-M-AFR-01 physical layering | Rejected; v18 base-seam correction active | A007 returned the builder to production-valid base garments. v16 and v17 both failed the trouser gate. v17 removed actual-body penetration but exposed a 274.154 mm orientation-specific inner seam failure. A controlled nonzero seam-offset canary passed, and no outer-layer proof, LOD or runtime package may advance until both sewn tunic and trousers pass. |

## Static View release evidence

- Production: `https://bongo-seakhoa.github.io/profile/`
- Main revision: `e29a4c959c39fff6e93def841c0944db94bf013f`.
- Warning-clean deployment: GitHub Actions run `30605182973`.
- All 20 sitemap routes, four direct PDFs, `.nojekyll`, sitemap and robots returned HTTP 200 after deployment.
- Live PDFs remained exact A4, selectable and visually intact after download and raster review.
- Formatting and linting passed.
- Astro and TypeScript reported 0 errors.
- 58 unit tests passed, including character canon, full-body camera and animation-runtime contracts.
- 72 Playwright checks passed across desktop Chrome, mobile Chrome, Firefox and WebKit.
- 26 pages, 20 canonical sitemap routes and 26 unique social cards were built and validated.
- Four direct-download PDFs passed page-count, A4, metadata, text-selection, link and layout checks.
- Static budgets passed at 9,160 bytes maximum HTML gzip, 9,795 bytes CSS gzip and 0 bytes JavaScript gzip.
- Lighthouse median passed at Performance 99, Accessibility 100, Best Practices 100 and SEO 100.
- Median Lighthouse field proxies: LCP 1,508 ms, CLS 0.001 and TBT 49 ms.

## Immersive production contract

The immersive work is explicitly required by
`plans/IMMERSIVE-PRODUCTION-EVALUATION-MATRIX.md` and D007. It includes:

1. Canonical creation, rigging, materials, accessories and LODs for all 15 characters.
2. Shared male, female and nonbinary locomotion families plus character-safe retargeting.
3. Gesture, idle, interaction, traversal and power animations.
4. Solar Propulsion, Sand Teleportation, surfing, launches, landings, look-back and edge-lean behaviour.
5. Construction and enhancement of every required location set.
6. Lighting, atmosphere, particles, environmental movement, background effects and transitions.
7. Distant full-body animated-bound camera containment with no OTS path.
8. Browser streaming, performance tiers, fallbacks and recovery.
9. Blender and browser evaluation across characters, powers, locations, ratios, breakpoints and quality levels.

## Resolved owner gates

1. D010 records Bongo's ownership of the supplied Desert Nomad images and authorization to create, publish and redistribute approved derivatives for this portfolio.
2. D010 records approval of the private DN-M-AFR-01 v2 silhouette for production.

## Current character authoring gate

- D014 adopts two-dimensional garment patterns, Blender sewing and
  layer-by-layer cloth simulation as an authoring workflow. Approved baked
  garments become versioned source assets and are not resimulated during the
  website build.
- A006 passed the Blender 5.2 sewn-cloth canary twice with identical metrics and
  pixels. The mean seam gap closed from 171.6 mm to 0.680 mm before welding.
- D016 requires physical dressing order and explicit attachment dependencies.
  Base garments must pass first; tabard and belt establish the waist stack;
  cowl and mantle solve against the accepted lower stack and relevant accessory
  proxies; jewellery and trim attach only to final dressed surfaces.
- A007 records the exact binding dependency DAG, local occlusion rules,
  distributed contact thresholds and neutral/dynamic evidence matrix. Its
  reviewed builder snapshot failed because the visible base was provisional,
  final accessories lacked layer and named-target data, bracers and trim were
  absent, and footwear order was incorrect. The active refactor now authors
  real sewn base patterns, but those new garments remain candidates until the
  base validator and four-view visual gate pass.
- The standalone Blender 5.2 dressing-stack validator now enforces the
  canonical 18-layer graph, a strict body/tunic/trousers base profile,
  evaluated-mesh contact and penetration evidence, attachment roots and
  proxy-to-final parity. Ten focused tests and its Blender mesh/BVH smokes
  pass. It cannot be used to waive seam, fold, canon or visual-pose review.
- DN-M-AFR-01 v1 through v8b remain rejected visual evidence. Physical-stack
  smoke v10 and v11 failed at the tabard. Diagnostic v13 passed its tabard
  cleanup step but failed at the cowl with 96.187 mm convergence, 23.426 mm
  reliable penetration and a 269.919 mm pre-weld seam gap. It rendered
  nothing. No accepted current outer stack exists and no rejected run may
  enter LOD, animation or the public runtime package.
- The clean v16 failure views confirmed a visibly open crotch, inner-leg and
  ankle construction, a floating hoop-like waistband and simulation helper
  geometry obscuring the garment. The owner reaffirmed that a real fitted base
  outfit must be accepted before any later garment or accessory is authored.
- The controlled v17 trouser run measured zero penetration against the full
  MPFB body, but failed with 29.416 mm convergence and a 274.154 mm maximum
  seam gap. All 136 seam pairs survived as zero-face loose edges. A focused
  canary proved that degenerate zero-length seam starts and incorrect spatial
  side/orientation logic caused the failure: its valid 4 mm control passed at
  0.361 mm convergence and 0.0183 mm maximum seam gap. v18 must use the
  corrected seam offset, rise, seat and crotch junction without weakening any
  gate.

## Remaining owner decisions

1. Bongo may provide a LinkedIn export or current professional record to close the remaining evidence-only content warnings.

## Claude coordination

Claude's R001 through R005 reviews are retained. The split-inbox failure was
resolved and both agents now publish heartbeats and messages across the
implementation worktree and canonical OneDrive collaboration roots. Claude's
heartbeat is active. Codex continues implementation without blocking while
Claude independently reviews the production pilot, framing contract, public
asset gate and Static View background correction.
