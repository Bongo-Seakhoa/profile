# R002 — Review of the master execution plan, D002, D003 and the risk register

**Author:** Claude (review agent)
**Date:** 2026-07-31
**Reviewed:** `plans/MASTER-EXECUTION-PLAN.md`, `decisions/D002`, `decisions/D003`, `risks/RISK-REGISTER.md`, `audits/A001`, `status/STATUS.md`
**Requested by:** `inbox/claude/002` and `inbox/claude/003`
**Verdict:** Approved to proceed. No blocking defect in the architecture. Five gaps below, one of which is release-critical and unowned.

---

## 0. Assessment

The plan is sound and the architecture is right. Astro + TypeScript as sole renderer, one route manifest as source of truth with build-enforced drift checks, Static View as Release 1, immersive deferred behind a vertical slice, reversible working assumptions with named reversal points — all correct. The risk register is better than the one I would have written: R-023 and R-024 anticipate document failures I had not called, and the Blender capability audit in §4.7 is genuinely useful work.

D003 is well-reasoned and I support it. The owner's judgement is right on the substance: the current PDFs read as HTML-to-PDF conversions, and shared HTML/CSS with Chromium print is the correct method. The self-critical audit of the Nielsen reference — noting it embedded Segoe UI while requesting Inter, that the merged PDF is untagged, that a continuation page loses its header — is exactly the standard this project needs.

My findings are about what the plan does not yet cover. Four of the five are things that will not surface until the milestone they damage.

---

## 1. G1 — Case-study content does not exist, and no dependency tracks it

**Severity: release-critical. Unowned. This is the finding that matters most.**

Static View addendum §8.2 specifies seventeen required sections per case study: summary, context, problem, role, constraints, research, architecture, key decisions, implementation, validation, outcome, evidence, technologies, lessons, related work, public links, confidentiality statement.

What actually exists in `content/profile.json`:

```text
10 projects × 5 fields  (title, type, description, tech, link)
description length: 126–200 characters
```

A 200-character blurb cannot become a seventeen-section case study. And A-08 correctly forbids inventing the difference.

The plan's M3 deliverable reads *"Three or more complete case-study routes **where evidence permits**."* That qualifier makes the milestone exit criteria satisfiable with **zero** case studies, because no evidence permits one today. The build would pass, the gates would pass, and the single most valuable change the addendum asks for — replacing ten equal-weight cards with evidence-led case studies and a genuine hierarchy — would silently not happen.

That is the difference between a re-skin and an actual upgrade. It is also precisely the outcome the owner's brief rules out.

The dependency register tracks DEP-CONTENT-001 (LinkedIn), DN-CHAR-001 (character pack) and DEP-ROSTER-001 (roster scope). It does not track this.

**Recommendation:**

1. Raise **DEP-CASE-001** as an owner dependency, release-blocking for M3, with the same weight as DEP-CONTENT-001.
2. Change the M3 exit criterion from "where evidence permits" to a number — at minimum one flagship plus two standard case studies — so the milestone cannot pass by producing nothing.
3. Make the intake cheap for Bongo. A seventeen-section template is intimidating; a short structured questionnaire per project is not. I will draft one (§6) so this does not sit idle.
4. **Propose FxPM as flagship case study #1.** It is by a wide margin the strongest and most differentiated evidence available: a real quantitative trading platform with a backtesting engine, walk-forward and out-of-sample validation, optimisation search, cost and spread modelling, and institutional-grade governance. It is a systems-engineering and applied-research story, and it is far more distinctive than the credential list that currently carries the site. Evidence state must be labelled honestly per §8.3 — if the public repositories are stale or private relative to the current work, the case study says so.

---

## 2. G2 — The GitHub Pages publishing switch is an owner-only action and is not tracked

**Severity: high. Blocks M5 and M6.**

Audit §4.1 confirms, and I verified independently: no `.github/` directory, no workflow, no `package.json`, no CNAME. Pages currently publishes **from the repository root on a branch**.

Plan §11 requires deploying "only a saved `dist` artifact through the protected GitHub Pages environment" — that is Actions-based Pages publishing. Moving from *Deploy from a branch* to *GitHub Actions* is a change in **Settings → Pages**, in the GitHub web UI, performed by the repository owner. Neither agent can make it.

There is also a quiet trap: while the source remains branch-root, a correctly built `dist/` never appears on the live site. The failure mode is not an error, it is a deploy that looks successful and changes nothing — which invites committing build output back into the repository root and producing exactly the hybrid the plan is trying to avoid.

R-016 covers cutover *outage*. It does not cover this *access* dependency.

**Recommendation:** raise **DEP-PAGES-001**, resolve it before M5 builds workflows against an unverified assumption, and have Bongo confirm the publishing model. Add a preflight check that fails the release if the expected Pages source is not in effect.

---

## 3. G3 — Fixed page plans collide with the prompt-driven maintenance promise

**Severity: medium. Design it now; it is cheap now and annoying later.**

D003 locks resume to two pages and CV to three, with curated content allocation and a build that fails on overflow. Failing loud is right.

But `docs/update-playbook.md` promises prompt-driven maintenance, with templates like *"Add this new certification… regenerate the site."* Under D003, that routine addition can now hard-fail the build, and resolving it is an **editorial** decision — what gets cut from a two-page resume — not a mechanical one. An agent or a future maintainer hitting that failure has no stated policy to apply.

Also worth preserving: `scripts/build.py` already contains real curation logic — `select_resume_experience`, `select_resume_credentials`, `select_resume_projects`, `resume_highlights_for`, `cv_highlights_for`. That is editorial judgement encoded as code. In a rewrite it is easy to lose and expensive to recreate.

**Recommendation:**

1. Make curation explicit **data**, not template logic: `resume_include`, `resume_priority`, `cv_include` on each record, with the stated policy *"the resume is a curated subset; the CV is comprehensive."*
2. Port the existing selection logic rather than reinventing it.
3. On overflow, the build error must name the sheet, the amount of overflow, and the lowest-priority included item — so the fix is obvious rather than a hunt.
4. Update `docs/update-playbook.md` in the same milestone. Otherwise it becomes documentation that describes a workflow that no longer works.

---

## 4. G4 — The Blender audit result is a harder constraint than R-021 records

**Severity: medium now, high at M7. Strengthens the roster recommendation.**

Audit §4.7 is the most useful new information in this cycle: Ryzen 5 4500U, approximately 8 GB RAM, **Cycles GPU unavailable — CUDA and HIP both fail to initialise**, CPU-only rendering, EEVEE for iteration.

Set that against the brief's targets: fifteen characters, Ultra tier 150,000–250,000 triangles, 4K runtime textures, 8K source textures, source sculpts "as detailed as required", three LODs each, plus secondary-motion setup.

Sculpting, texturing and baking a fifteen-character roster at those targets on 8 GB of shared memory with no GPU acceleration is not a schedule risk. It is a capacity ceiling. Even a single canonical character with full 4K texture sets and bake passes will be painful.

R-021 frames this as "Blender pipeline differs from browser runtime expectations" — a *fidelity* risk. The real risk is *capacity*, and it is not recorded.

**Recommendation:** raise **R-025 (hardware capacity constrains character production)**. This is independent confirmation of R001 §4: on this hardware the realistic paths are one canonical character with a strong customisation system, base meshes or purchased starting geometry rather than sculpting from scratch, or outsourced character production. Bongo should see this before DEP-ROSTER-001 is answered, because it changes what the answer costs.

---

## 5. G5 — There is no quality gate on the writing

**Severity: medium. Directly tied to the stated standard.**

Every acceptance criterion in §8 is mechanical: schemas, dates, contrast ratios, axe violations, transfer budgets, page counts, font inventories. Those are necessary and they are well chosen.

None of them can fail a page for being *dull*. §8.6 covers layout — "no repetitive wall of identical cards", 60–75 character measure — not prose.

The addendum sets writing standards in §23.4 (natural language, no em dashes, no inflated adjectives, separate fact from aspiration, state limitations honestly, explain technical work for both technical and non-technical readers), and the brief's standard is "a polished, production-ready showpiece", not a well-engineered mediocre redesign. A site can pass every gate in §8 and still read as generic.

There is also an unresolved positioning question from R001: the current headline, *"Data Scientist, Data Engineer, and Technical Mentor"*, undersells relative to the actual evidence, and no milestone owns fixing it.

**Recommendation:** add a copy gate to M3:

- Every public route's copy is reviewed against §23.4 and recorded.
- The headline and hero value statement are explicitly approved by Bongo. This is an owner decision, not a generated string.
- No page opens with a generic claim that would be true of any data professional.
- Each featured project states what was actually hard about it. That single sentence is usually the entire difference between a portfolio and a list.

I will run this review at M3 and report against it.

---

## 6. Smaller items

**6.1 — Pin Playwright for tagged PDF output.** §5.1.1 says tagged output and outline are used "where Chromium provides them", which reads as best-effort. Playwright's `page.pdf()` exposes `tagged` and `outline` options only in recent versions. Since the resume and CV are primary public deliverables, an untagged PDF is a real accessibility failure, not a nice-to-have. Pin the Playwright version explicitly, and make the verifier **assert** the PDF is tagged rather than accept whatever Chromium produced. Worth confirming empirically on the first generated PDF rather than trusting the flag.

**6.2 — Preserve `/profile/` if the URL ever moves.** A-01's reversal point is "change `site` and `base` before release-candidate sign-off." Add: if the URL moves to a user page or custom domain, the `profile` repository keeps serving a redirect stub, so any link already shared survives. Cheap insurance, and the reason to decide the URL question early stands.

**6.3 — R-022 is well spotted, and I will take it.** Reviewing generated artwork for garbled text, spurious signatures, watermarks and likeness issues is a genuine risk at hero size and the sort of thing that is embarrassing rather than fatal — which means it gets skipped. I have the plates and it does not touch Codex's lane. Claimed in `handoff/HANDOFF.md`.

**6.4 — ANZ-SAFE-001 offer stands.** Per-plate focal points and content-safe zones are a real Static View dependency for M4, authorable now from the plates in hand. I will take it unless Codex has already scoped it into M4.

**6.5 — A-06 status noted.** D001 has been updated to record that Codex independently inspected the Threshold Dunes candidate and applied Bongo's workbook-correction request, with the original archived. Provenance is preserved and the decision is reversible. Accepted. It remains worth a one-line confirmation from Bongo, since it is now baked into the corrected workbook.

---

## 7. What I am not challenging, and why

To be explicit, so silence is not read as an oversight:

- **Astro + TypeScript.** Correct choice for typed content, directory routes, base-path handling, image derivatives and a clean future boundary for an opt-in immersive bundle.
- **D003's rejection of Python for documents.** The owner's reasoning holds and the Nielsen method is proven. Retaining Python only as an audit utility is the right disposition.
- **`/profile/` as the working base (A-01).** Reversible, centrally configured, with a named reversal point. Deferring it is defensible now that the helper and the escape test are in the plan.
- **Removing the phone by default (A-05).** Correct default, reversible on owner approval.
- **Three-hour offline rule.** Sensible. Review should never block implementation, and every one of my outputs is a written artefact that survives my absence.

---

## 8. Summary of requested additions

| ID | Item | Severity | Owner |
| --- | --- | --- | --- |
| **DEP-CASE-001** | Case-study source content does not exist; M3 can pass while producing none | Release-critical | Bongo (intake drafted by Claude) |
| **DEP-PAGES-001** | Pages publishing-source switch is an owner-only UI action | High | Bongo |
| **R-025** | Hardware capacity ceiling on character production (8 GB, no GPU) | Medium now, high at M7 | Codex + Bongo |
| G3 | Page-plan durability vs prompt-driven maintenance; port curation logic as data | Medium | Codex |
| G5 | No copy or positioning quality gate; headline undersells | Medium | Bongo + Codex |

Nothing here blocks M0 or M1. G1 and G2 should be raised with Bongo now, because both have owner-side latency and both bite at M3 and M5 respectively.
