# Profile Upgrade status

**Updated:** 2026-07-31
**Lead:** Codex
**Independent reviewer:** Claude, currently offline by heartbeat protocol
**Current milestone:** Static View release, followed by the DN-M-AFR-01 pilot gate

## Overall

| Area | State | Evidence / next gate |
| --- | --- | --- |
| Repository, references, build and deployment audit | Complete | Baseline `df410d5`; recovery tag `legacy-pages-baseline-20260730`; GitHub Pages project-site constraints recorded. |
| Collaboration protocol | Active | Shared plans, decisions, risks, handoffs, inboxes, ignored runtime heartbeats and watcher are under `AI-COLLAB/`. |
| Asset-linkage workbook | Complete | Corrected v2 workbook verified across all six sheets; reference original preserved. |
| Static View implementation | Complete | Astro/TypeScript site builds 26 pages with 0 bytes of client JavaScript. |
| Resume and CV | Complete | JavaScript/Chromium pipeline produces four exact-A4, selectable PDFs: two 2-page resumes and two 3-page CVs. |
| Static release QA | Passed | 58 unit tests, 72 browser tests, public-output validation, metadata validation, budgets and three-run Lighthouse median passed. |
| Privacy review | Passed for current tree | Retired phone removed from current tree and `dist`; no secrets or U+2014 em dashes found. Historical Git exposure is separately recorded in R-026. |
| Deployment | Ready to commit | Production remains unchanged until the gated main-branch workflow completes and live smoke tests pass. |
| Canonical character discovery | Complete | Desert Nomad v3 self-contained handoff verifies 32 of 32 manifest entries and defines the exact 15-character roster. |
| Pilot reconstruction | Private review draft complete | DN-M-AFR-01 v2 orthographic reconstruction and Blender measurement blockout exist under ignored `source/private/`. |
| Public character derivatives | Blocked externally | Bongo must confirm ownership or derivative and redistribution rights before public character art, meshes or textures ship. |
| Full immersive production | Required, not started at scale | Character roster, sets, effects, animations, powers, runtime integration and the complete Blender/browser matrix remain mandatory milestones. |

## Static View release evidence

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

## Current external decisions

1. Bongo confirms ownership or permission to create and publicly redistribute derivatives from the Desert Nomad canonical references.
2. Bongo approves or comments on the private DN-M-AFR-01 v2 silhouette before final sculpt work scales to the remaining roster.
3. Bongo may provide a LinkedIn export or current professional record to close the remaining evidence-only content warnings.
4. Bongo decides whether historical Git phone exposure should be removed through a separately planned history rewrite.

## Claude coordination

Claude's R001 review is retained. Nine Codex-to-Claude messages document later architecture, camera, animation, immersive-scope and release-review requests. No current Claude heartbeat or new response is present. Under the three-hour protocol, Claude is marked offline and Codex continues without blocking; the inbox watcher remains available for immediate resumption.
