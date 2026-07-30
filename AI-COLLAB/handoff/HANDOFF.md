# Handoff and lane claims

Live coordination state. Update this file when claiming or releasing work.

## Active lane claims

| Agent | Files / area held | Since | Status |
| --- | --- | --- | --- |
| Claude | `AI-COLLAB/**` only | 2026-07-30 | Released |
| Codex | `AI-COLLAB/**` coordination and M0 baseline | 2026-07-30 | Active until M0 commit |

**No source file outside `AI-COLLAB/` has been modified by Claude.** The repository is in the same state as commit `df410d5` apart from the addition of `AI-COLLAB/`.

## Repository state at handoff

- Branch: `main`, clean apart from the new `AI-COLLAB/` directory
- Last commit: `df410d5` "Upgrade resume and CV document suite"
- Live site: `https://bongo-seakhoa.github.io/profile/` — unchanged, still the pre-upgrade version
- Nothing has been deployed, deleted or rewritten

## Where the project stands

Phase 0 (audit) of the Static View addendum is **complete** — see `reviews/R001-independent-audit.md`. It covers the repository inspection, route inventory, duplicate-surname content, outdated visual code and the discrepancy report that §26 Phase 0 asks for.

Phase 1 (content model) has **not** started. Neither has any implementation.

Codex has completed the systematic execution plan and adopted Astro/TypeScript for the complete production build. D003 records Bongo’s owner override: resume and CV are curated browser-native JavaScript assets generated through Playwright/Chromium, not Python. Product source implementation remains unstarted until the M0 collaboration and baseline commit lands.

## Immediate path forward

**Bongo — four decisions, in order of how much they unblock:**

1. `DEP-BASE-001` Deployment URL: keep `/profile/` project page, rename to a user page, or a custom domain. Determines every canonical URL, the sitemap, OG image URLs and structured data. Cheapest now, most expensive after content is generated.
2. `ANZ-ASSET-001` Confirm `ChatGPT Image Jul 30, 2026, 07_59_39 PM (2).png` as the canonical Threshold Dunes inner plate. Closes the environment asset set completely.
3. `DEP-CONTENT-001` Supply the LinkedIn record — export or pasted text into `AI-COLLAB/inbox/`. Gates the content audit, which gates launch.
4. `DEP-PHONE-001` Publish or remove the personal mobile number, currently on 4 public pages and in 4 public PDFs.

**Codex — recommended order once 1 is answered:**

1. Ingest `data/anzania-asset-registry-verified.json`. Copy sources to runtime aliases without touching the masters.
2. Write `scripts/validate_content.py` before the template refactor.
3. Restructure content per §23.1 with the metadata fields in §23.2, including `last_reviewed`.
4. Establish the route manifest as the single source of truth, with the drift check from R001 §9.
5. Build the Static View design system, then the homepage, then the detail routes.
6. Fix the carried-forward defects: delete `site.js` rather than porting it, add the skip link, add canonical/OG/sitemap, make `build_pdf()` fail loudly.

## Open items Claude can take if Codex does not want them

- `ANZ-SAFE-001` — per-plate content-safe zones and focal points, authored from the plates in hand. A real Static View dependency and independent of Codex's implementation lane.
- Per-route OG image generation from the plate library.
- The Gate 1–6 verification harness in `reviews/R001-independent-audit.md` §13.

Claim in this file before starting so neither agent duplicates the other.

## Continuation note

If Claude is unavailable, nothing is blocked. Every Claude output is a written artefact in `AI-COLLAB/`, no source file is held, and no implementation depends on Claude resuming. The verified registry is regenerable from `data/verify_anzania_assets.py` without Claude.
