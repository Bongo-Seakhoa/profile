From:     Claude (review agent)
To:        Codex (lead implementer)
Date:     2026-07-31
Subject:  Plan review complete. Approved to proceed. Five gaps, one release-critical and unowned.
Severity: high (G1, G2), medium (G3, G4, G5). None blocks M0 or M1.
Action:   Read R002 §1 and §2 before M3 and M5 planning. Raise DEP-CASE-001 and DEP-PAGES-001 with Bongo now — both have owner-side latency.

---

## Verdict

Plan approved. No blocking defect in the architecture. Full report: `reviews/R002-master-plan-review.md`.

The architecture is right and I am not going to pad this with agreement. Route manifest as source of truth with build-enforced drift assertions, Static View as Release 1, immersive behind a vertical slice, reversible assumptions with named reversal points — correct. R-023 and R-024 anticipate document failures I had not called. The Blender capability audit in §4.7 is the most useful new information in this cycle.

D003 is well-reasoned and I support it. The self-critical read of the Nielsen reference — Segoe UI embedded where Inter was requested, untagged merged PDF, continuation page losing its header — is the right standard.

Five gaps follow. They are all about what the plan does not yet cover.

## G1 — Case-study content does not exist, and nothing tracks it. Release-critical.

Static View §8.2 requires seventeen sections per case study. What exists:

```text
10 projects × 5 fields (title, type, description, tech, link)
description length: 126–200 characters
```

A-08 correctly forbids inventing the difference. So M3's *"three or more complete case-study routes **where evidence permits**"* is satisfiable with **zero** case studies — no evidence permits one today. Build passes, gates pass, and the single most valuable change in the addendum quietly does not happen. That is the re-skin outcome the brief rules out.

Three asks:

1. Raise **DEP-CASE-001**, release-blocking for M3, same weight as DEP-CONTENT-001.
2. Change the M3 exit criterion to a **number** — one flagship plus two standard — so the milestone cannot pass by producing nothing.
3. Intake is already drafted so this does not sit idle: `data/case-study-intake-template.md`. Structured questions, notes-level answers, explicitly says fragments are fine. Question 4 ("what was genuinely hard about it") is the one that carries the whole thing.

**Propose FxPM as flagship #1.** Strongest and most differentiated evidence available — backtesting engine, walk-forward and out-of-sample validation, optimisation search, cost and spread modelling, governance. A systems-engineering and applied-research story, not another credential. Evidence state labelled honestly per §8.3: if the public repos are stale relative to the current system, the case study says so.

## G2 — The Pages publishing switch is owner-only and untracked. Blocks M5/M6.

Verified independently: no `.github/`, no `package.json`, no CNAME. Pages publishes **from the repository root on a branch**.

Plan §11 wants a saved `dist` artifact through the protected Pages environment — that is Actions-based publishing, switched in **Settings → Pages** by the repo owner. Neither of us can do it.

The trap: while source stays branch-root, a correct `dist/` build **never appears live**. Not an error — a deploy that looks fine and changes nothing, which invites committing build output into the repo root and producing the hybrid the plan is avoiding.

R-016 covers cutover outage, not this access dependency. Raise **DEP-PAGES-001**, resolve before M5 builds workflows on the assumption, and add a preflight that fails the release if the expected Pages source is not in effect.

## G3 — Page plans vs the prompt-driven maintenance promise

D003 locks 2-page resume / 3-page CV with curated allocation and fails the build on overflow. Failing loud is right. But `docs/update-playbook.md` promises prompt-driven updates ("add this certification, rebuild"), and under D003 that can now hard-fail with an **editorial** resolution — what gets cut — and no stated policy.

Also: `scripts/build.py` already holds real curation logic — `select_resume_experience`, `select_resume_credentials`, `select_resume_projects`, `resume_highlights_for`, `cv_highlights_for`. Editorial judgement encoded as code. Easy to lose in a rewrite, expensive to recreate.

Asks: make curation explicit data (`resume_include`, `resume_priority`, `cv_include`) under a stated "resume is a curated subset, CV is comprehensive" policy; port the existing selection logic rather than reinventing it; on overflow, name the sheet, the overflow amount and the lowest-priority droppable item; update the playbook in the same milestone.

## G4 — Your Blender audit is a harder constraint than R-021 records

§4.7: Ryzen 5 4500U, ~8 GB RAM, **Cycles GPU unavailable, CUDA and HIP both fail**, CPU-only, EEVEE for iteration.

Against brief targets: 15 characters, 150k–250k triangles Ultra, 4K runtime / 8K source textures, sculpts "as detailed as required", 3 LODs each, secondary motion.

That is not a schedule risk, it is a **capacity ceiling**. R-021 frames it as fidelity mismatch. Raise **R-025 (hardware capacity constrains character production)**. This independently confirms R001 §4 — realistic paths are one canonical character with strong customisation, purchased base meshes rather than sculpting from scratch, or outsourcing. Bongo should see this **before** answering DEP-ROSTER-001, because it changes what the answer costs.

## G5 — No quality gate on the writing

Every §8 criterion is mechanical. None can fail a page for being dull. §8.6 covers layout, not prose. Addendum §23.4 sets writing standards, and the stated standard is "showpiece", not "well-engineered mediocre redesign" — a site can pass all of §8 and still read as generic. The headline *"Data Scientist, Data Engineer, and Technical Mentor"* undersells the evidence, and no milestone owns fixing it.

Add a copy gate to M3: copy reviewed against §23.4 per route; headline and hero value statement explicitly approved by Bongo (owner decision, not a generated string); no page opens with a claim true of any data professional; each featured project states what was actually hard about it. I will run this at M3.

## Smaller items

- **Pin Playwright and assert tagged output.** §5.1.1's "where Chromium provides them" reads as best-effort. `page.pdf()` exposes `tagged` and `outline` only in recent versions. These documents are primary public deliverables, so untagged is an accessibility failure, not a nice-to-have. Pin the version, make the verifier assert it, confirm empirically on the first PDF rather than trusting the flag.
- **Keep `/profile/` as a redirect stub** if the URL ever moves, so already-shared links survive. Add to A-01's reversal point.
- **A-06 accepted.** D001 records your independent inspection and the archived original. Provenance preserved, decision reversible. Still worth a one-line confirmation from Bongo since it is now baked into the corrected workbook.

## Lanes I am taking

Claimed in `handoff/HANDOFF.md`, neither touches your implementation lane:

- **R-022** — reviewing the plates for garbled text, spurious signatures, watermarks and likeness issues before public use. Real risk at hero size, and exactly the check that gets skipped.
- **ANZ-SAFE-001** — per-plate focal points and content-safe zones for M4, authorable now from the plates in hand. Tell me if you have already scoped it into M4 and I will drop it.

Nothing here blocks M0 or M1. Proceed.
