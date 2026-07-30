# Profile Upgrade risk and dependency register

**Owner:** Codex  
**Review cadence:** At every milestone exit and before deployment  
**Scale:** Likelihood and impact are Low, Medium or High

| ID | Risk or dependency | Likelihood | Impact | Prevention / mitigation | Trigger and contingency | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | `/profile/` base-path escape creates production 404s. | High | High | Central URL helper, Astro `base`, exact-path tests, reject root-absolute internal links. | Any built link targets domain root; fail build and fix before merge. | Codex | Open |
| R-002 | PDF rendering fails, uses a fallback font, overflows or ships stale files. | Confirmed | High | JavaScript-only Chromium builder, font-ready wait, layout audit, fatal errors, explicit `--skip-documents`, freshness/hash checks. | Browser crash, fallback font, overflow or PDF older than manifest; stop release. | Codex | Open |
| R-003 | Professional facts differ between repository, LinkedIn and current reality. | Medium | High | Keep first-party source baseline, add `last_reviewed`, evidence links and discrepancy report; avoid inferred claims. | Unresolved role/date/status conflict; omit disputed claim or request owner evidence. | Bongo + Codex | Open |
| R-004 | Personal phone or private certificate leaks publicly. | Confirmed | High | Remove phone by default, public-link allowlist, dist privacy scan. | Sensitive pattern in `dist`; fail release and purge artifact. | Codex | Mitigation adopted |
| R-005 | Reference masters are overwritten or accidentally published. | Medium | High | Read-only library, copied derivatives, provenance manifest, dist allowlist. | Source hash changes or reference extension appears in dist; restore backup and stop. | Codex | Open |
| R-006 | Superseded “Zahir” artwork ships. | Medium | High | Verified registry status allowlist and explicit denylist. | Denied hash/name appears in dist; fail build. | Codex | Open |
| R-007 | Generic filenames drift again. | High | Medium | Semantic aliases, source filename/hash provenance, workbook verifier. | Registry file missing/hash changed; require re-audit. | Codex | Mitigation adopted |
| R-008 | 1672 px artwork looks soft full-bleed or exceeds transfer budget. | Medium | Medium | Split editorial layout, capped render width, art-directed crops, AVIF/WebP. | Hero upscale >1.15× or >450 KB; change layout/quality. | Codex + Claude | Open |
| R-009 | JavaScript or CSS hides core content. | Confirmed | High | Static rendered HTML visible by default; no reveal classes; no-JS tests. | Text absent/hidden with JS disabled; block release. | Codex | Open |
| R-010 | Static and immersive modes drift. | Medium | High | One content and route manifest; build assertions. | Destination exists in only one mode; fail build. | Codex | Open |
| R-011 | Accessibility regressions appear over final art surfaces. | Medium | High | Token tests plus per-surface contrast, axe and manual checks. | Serious/critical axe issue or manual failure; block release. | Codex + Claude | Open |
| R-012 | Mobile overflow remains. | Confirmed baseline | High | Mobile-first layout and 320/360 px automated overflow checks. | `scrollWidth > clientWidth`; fail route test. | Codex | Open |
| R-013 | Dependency install or browser downloads are unavailable. | Medium | Medium | Lockfiles, cached CI dependencies, use installed Chrome fallback locally. | Network/install failure; use cache and document external outage. | Codex | Open |
| R-014 | OneDrive contention or partial sync corrupts edits. | Medium | High | Atomic copies, hash checks, frequent commits, staged bulk transforms. | File lock/hash mismatch; stop writer and restore from Git. | Codex | Open |
| R-015 | Claude is unavailable and review blocks progress. | Medium | Medium | Written artefacts, heartbeat protocol, three-hour offline rule. | Heartbeat older than three hours; mark offline and continue self-review. | Codex | Controlled |
| R-016 | Pages settings/cutover causes outage. | Medium | High | Baseline tag, release artifact, manual first deploy, production smoke tests. | Smoke failure; redeploy last known-good artifact. | Codex | Open |
| R-017 | Git safe-directory restrictions prevent commits. | Confirmed | Medium | Use explicit `--git-dir`/`--work-tree` or request narrowly scoped safe-directory approval. | Commit fails; do not weaken global Git safety broadly. | Codex | Open |
| R-018 | LinkedIn blocks automated access. | Confirmed | Medium | Use owner-provided export or existing first-party source; public snippets only corroborate. | Needed fact cannot be verified; omit or request source. | Bongo | External |
| R-019 | Canonical character pack is absent. | Confirmed | High for immersive | Keep immersive outside Release 1; accept only canonical pack before character production. | M7 requested without pack; document external block. | Bongo | External |
| R-020 | Full 15-character roster expands beyond credible schedule. | High | High | Gate through one approved vertical slice and explicit owner scope decision. | Slice fails quality/performance or roster not funded; do not scale. | Bongo + Codex | Deferred |
| R-021 | Blender 5.2 pipeline differs from browser runtime expectations. | Medium | Medium | Versioned headless tests, glTF validator, browser vertical-slice tests. | Export/render mismatch; fix pipeline before asset scale-up. | Codex | Deferred |
| R-022 | Reference assets contain unintended text, marks or likeness issues. | Medium | High | Visual/legal-content review before public-use approval. | Questionable content found; exclude derivative pending owner review. | Bongo + Claude | Open |
| R-023 | Automatic pagination creates orphan headings, awkward section starts or unbalanced pages. | Confirmed baseline | High | Curated A4 page plans, semantic keep groups, DOM overflow/orphan assertions and all-page PNG review. | Page plan no longer fits after content change; fail build and recompose deliberately. | Codex | Mitigation adopted |
| R-024 | Browser PDF looks like an unstyled HTML printout or fails ATS reading order. | Medium | High | Dedicated document tokens/templates, one-column semantic flow, local fonts, text/link extraction and visual regression. | Visual or ATS check fails; block document release and revise template. | Codex + Claude | Open |

## Current external dependencies

| ID | Dependency | Blocks | Resolution |
| --- | --- | --- | --- |
| DEP-CONTENT-001 | Owner-confirmed current professional record or LinkedIn export for disputed facts. | Claims that differ from the current first-party repository source. | Bongo supplies an export or confirms the discrepancy report. |
| DN-CHAR-001 | Canonical character reference pack. | Production character and full immersive roster. | Bongo supplies the approved pack. |
| DEP-ROSTER-001 | Explicit full-roster scope decision. | Scaling beyond one vertical slice. | Bongo chooses roster scope after slice evidence. |

The supplied `/profile/` URL and the corrected Threshold Dunes linkage are treated as resolved working decisions.
