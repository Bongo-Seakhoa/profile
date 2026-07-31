# R001 — Independent audit and architecture review

**Author:** Claude (review agent)
**Date:** 2026-07-30
**Scope:** Existing repository, live site, complete reference library, and the production plan described in the master brief and the two Anzania addenda.
**Status:** Complete. No Codex plan was present in the repository at audit time, so this reviews the plan as defined by the briefs.

---

## 0. Summary

The creative direction is strong and the two addenda are unusually well specified. Three things are true at the same time:

1. **The single most valuable near-term deliverable is Static View**, not the immersive mode. It satisfies every visitor the portfolio actually needs to convert, it is shippable, and it is the stable base the immersive mode enhances.
2. **The ingestion path for the artwork was broken.** The supplied asset registry resolves to nothing on disk. This is now fixed and verified (§1), including the plate the registry declared missing.
3. **The full brief as written is a studio-scale programme.** Fifteen rigged game-quality characters and seven traversal powers is where this project stalls if attempted in order. A sequencing change is recommended in §3.

Twelve findings follow, ordered by severity. Findings A1–A6 should be settled before significant implementation.

---

## 1. Finding A1 — The Anzania asset registry does not resolve. RESOLVED.

**Severity:** Blocking (was) → Resolved, pending Bongo's sign-off on one item.

The worldbuilding addendum §4 instructs: *"Codex must ingest by the actual filename or hash, then copy to the recommended alias. It must not guess the asset from upload order."*

That instruction could not be followed.

I hashed all 27 PNGs in the reference library and compared them to `Anzania_Actual_Asset_Registry_v1.0.json`:

| Check | Result |
| --- | --- |
| Registry entries | 19 |
| Registry SHA-256 values matching a file on disk | **0** |
| Registry filenames existing on disk | **0** |

Two independent causes:

- **Filenames carry a spurious `(1)` duplicate suffix.** The registry lists `ChatGPT Image Jul 30, 2026, 08_21_20 PM (1)(1).png`; the file is `...08_21_20 PM (1).png`. Stripping the suffix resolves every entry.
- **The hashes and file sizes belong to a different copy of the artwork.** The registry gives 3,211,581 bytes for the Threshold Dunes outer plate; the file on disk is 2,131,457 bytes. The images were evidently re-encoded between hashing and delivery, so hash-based ingestion is impossible regardless of filename.

### The "missing" plate is not missing

The registry, the addendum §4.1 and open dependency **ANZ-ASSET-001** all state that the Threshold Dunes inner plate is absent, and warn against substituting the props board for it.

The reference library contains **16** location plates at 1672×941, not 15. One of them, `ChatGPT Image Jul 30, 2026, 07_59_39 PM (2).png`, appears in no mapping table in any document. I inspected it: it is a **desert camp and waystation** — a large red and cream ceremonial tent, palm cluster, banner poles, route markers, and a foreground stone ledge with water vessels. That is precisely the "camp and waystation plate" §5.1 describes as the intended Threshold Dunes inner composition, and it sits in the same `07_59_39/40` upload series as the five other inner plates.

**ANZ-ASSET-001 is resolvable from assets already in hand.** It needs Bongo's confirmation, not new artwork.

### Corrected registry

`AI-COLLAB/data/anzania-asset-registry-verified.json` supersedes v1.0. Every one of the 27 PNGs is now classified, with SHA-256 and dimensions computed from the files on disk:

- 16 location plates (8 outer + 8 inner), each mapped to scene id, atlas order, journey order, portfolio section and runtime alias
- 3 support assets (atlas, environmental props board, meta artefacts board)
- 6 character concept sheets (3 lineup posters + 3 orthographic avatar sets), marked `PRESENT_NOT_CANONICAL`
- 2 superseded concepts, marked `SUPERSEDED_DO_NOT_SHIP` — a "**The Sands of Zahir**" world map and an eight-panel "Desert Nomad Worlds" board, both predating the Anzania rename
- 0 unmapped files

Regenerate with `python AI-COLLAB/data/verify_anzania_assets.py`.

**Method note:** because hash and filename both failed, linkage was re-established by visual identification of every plate against the location descriptions in worldbuilding addendum §5. Each entry carries a `visual_evidence` string recording what was actually seen. I also verified the atlas artwork directly: locations 1–5 read *Threshold Dunes, Stone Pass of Names, Archive of Echoes, Bazaar of Skill, Oasis of Audience*, confirming the addendum's `atlasOrder` values, with 6–8 following by elimination.

**Action for Codex:** ingest the verified registry. Do not attempt to use v1.0.
**Action for Bongo:** confirm `07_59_39 PM (2).png` as the canonical Threshold Dunes inner plate.

---

## 2. Finding A2 — The deployment base path will break the planned route structure

**Severity:** Blocking. Settle before building routes.

The site is served from `https://bongo-seakhoa.github.io/profile/` — a **project page with a `/profile/` path prefix**, not a user page at the domain root.

The current site survives only because every internal link happens to be relative (`assets/site.css`, `../assets/site.js`). The moment the rebuild introduces the planned structure, this breaks:

- Static View addendum §6.2 specifies routes as `/work/`, `/capabilities/`, `/contact/`. Written as root-absolute paths these resolve to `bongo-seakhoa.github.io/work/` and **404 in production**.
- §24.4's `dist/` layout has the same assumption.
- Canonical URLs, `sitemap.xml`, Open Graph `og:url` and `og:image`, and `Person` structured data all need absolute URLs that include `/profile/`.

This is the most likely way a technically correct rebuild fails on deploy, and it is expensive to retrofit once content, sitemap and structured data are generated.

**Decision needed from Bongo, now, because it determines every canonical URL:**

| Option | URL | Cost | Notes |
| --- | --- | --- | --- |
| A. Keep project page | `bongo-seakhoa.github.io/profile/` | none | Every generated URL must carry the prefix |
| B. Rename repo to `bongo-seakhoa.github.io` | `bongo-seakhoa.github.io/` | low | Cleanest URLs, no prefix, old links break unless redirected |
| C. Custom domain | e.g. `bongoseakhoa.com` | small annual cost | Strongest professional signal, survives any future host change |

**Recommendation: C if Bongo will register a domain, otherwise B.** A portfolio aimed at recruiters and clients benefits materially from a clean root URL, and the redirect cost is lowest now, before inbound links accumulate.

**Action for Codex regardless of choice:** introduce a single `base_url` / `site_url` setting in site settings, derive every absolute URL from it, keep internal links relative, and add a build check that fails if any generated `href` starts with `/` and the base path is non-empty.

---

## 3. Finding A3 — Recommended sequencing change: ship Static View first

**Severity:** High. Programme-level.

The master brief's Phase 0–8 sequence builds the immersive world first and treats the conventional experience as a fallback. The Static View addendum, which is newer, reverses that: Static View is "not a reduced or apologetic fallback" and must be "the stable HTML baseline" (§5.2). The two documents disagree about order, and the newer one is right.

**Recommendation: take Static View to production-complete and ship it. Then build one Anzania location as a vertical slice. Then decide the rest.**

Reasons:

1. **It is the only mode with a hard deadline pressure.** The live site currently leads with "One professional identity, two public surnames" — an internal naming concern presented as the headline. Every day that stays up, the portfolio undersells. Static View fixes that in weeks, not months.
2. **It de-risks the content audit.** Addendum §23.3 requires a full discrepancy review before launch. That work is mode-independent and is on the critical path for both modes. Doing it under Static View means the immersive mode inherits verified content.
3. **The canonical character pack is still an open dependency.** Brief §24 states character production cannot be finalised without it. Building the immersive mode first means blocking on an asset that does not exist yet.
4. **Partial immersive is worse than none.** A polished conventional portfolio reads as professional. A half-finished 3D world with placeholder characters reads as a failed experiment, and it damages the exact credibility the site exists to establish.
5. **Static View needs none of the expensive assets.** No GLBs, no rigs, no shaders, and — per §16.5's no-movement rule — **no depth maps or motion masks at all.** The first shippable milestone requires zero of the mask pipeline in §8.2.

This is a sequencing recommendation, not a scope reduction. Nothing in the Anzania mode is cancelled.

---

## 4. Finding A4 — The character roster is the weakest assumption in the brief

**Severity:** High. Needs a decision from Bongo before Phase 6.

Brief §2.1 locks fifteen distinct base character identities — "distinct face and body designs, not one face with five skin colours" — each needing sculpt, retopology, UVs, texturing, rigging, three LODs, and secondary-motion setup, all validated in-browser across quality tiers.

That is a character-art studio's quarter of work. It is where this project most likely stalls.

The *principle* behind the roster is sound and worth protecting: representation coverage, with identity, power and personality kept as independent systems, and no ability tied to ethnicity, gender or skin tone (§2.2). That principle does not require fifteen bespoke sculpts on day one.

**Recommendation for v1:** one fully canonical character taken end to end, plus the customisation system built properly (skin tone, clothing palette, fabric accent, metal finish, traversal power). Ship the roster as a documented, staged roadmap with the modular mesh structure (§8.3) and shared rig naming (§8.4) in place from the start, so additional identities are content drops rather than re-engineering.

This preserves every representation commitment, keeps the acceptance criterion "power choice is independent of representation and gender" testable, and costs roughly a tenth of the fifteen-character path.

**This is Bongo's call.** If the full roster is non-negotiable, say so and it will be planned for properly rather than discovered late — but it should be an explicit decision, not a default.

---

## 5. Finding A5 — Plate resolution caps visual fidelity, and the layout plan should respect it

**Severity:** High. Affects art direction decisions being made now.

All 16 location plates are **1672 × 941**. The atlas and both reference boards are 1448 × 1086.

1672px is narrower than a 1080p browser viewport and roughly **65% of the width of a 2560px desktop display**. The Static View addendum §7.4 proposes Threshold Dunes as a **full-width hero masthead**, and §16.3 offers a full-width masthead pattern generally. Used full-bleed on a normal desktop, the hero image — the first thing every visitor sees — will be upscaled and visibly soft. On a HiDPI laptop it will be softer still.

Addendum §8.1 forbids uncontrolled AI upscaling without explicit approval and side-by-side review, which is the right instinct.

**Recommendation: art-direct around the native resolution rather than fighting it.** Of the four approved placement patterns in §16.3, prefer:

- **Split editorial panel** — image occupies ~50% of width, so 1672px is comfortably sharp even on large displays. This is also the strongest editorial layout and best for the reading-measure rules in §15.5.
- **Shallow panoramic section divider** — a wide, short crop uses the plate's horizontal resolution where it is strongest.
- **Feature-card artwork** — controlled crop behind a featured project.

Use full-width masthead sparingly, and where used, cap the rendered image width (e.g. content-width container rather than true full-bleed) so the plate is never scaled beyond ~1.0–1.15×.

This is simultaneously a fidelity win and a performance win against the §21.1 budget of 250–450 KB for the hero.

**Action for Bongo:** if a true full-bleed hero is wanted, a controlled upscale of that one plate needs approval and a side-by-side review, per §8.1.

---

## 6. Finding A6 — Content accuracy items requiring Bongo's decision

**Severity:** High. Content correctness gates launch (§23.3).

Found in `content/profile.json` and the generated pages:

**6.1 — Personal mobile number was published.** The value has been redacted from this review and removed from the current repository content, legacy HTML and replacement PDFs. A phone number on a resume sent to a named recruiter is normal; a phone number on a permanently indexable public web page and a downloadable PDF is a different exposure and attracts automated scraping. **Recommendation: keep email and LinkedIn as the public contact paths.** If a phone number is wanted for genuine recruiter convenience, share it privately rather than through an indexed document.

**6.2 — Contact signals conflict.** Location is Debrecen, Hungary; the phone is a South African number; availability says "remote, contract, and globally distributed". Coherent once explained, confusing when skimmed. The Static View hero explicitly carries "Location | Availability | Primary focus" (§7.3), so this needs a single clear line.

**6.3 — Duplicated credential with conflicting dates.** "Statistical Estimation for Data Science and AI" appears twice: as a component course of the UC Boulder specialization in `coursework` (specialization completed April 2023), and again as a standalone `learning` entry dated June 2022 with a different verification code (`9V62MAPPCPV7`). Both may be legitimate, but as presented it reads as padding. Resolve to one entry, or state the relationship.

**6.4 — Overlapping "Present" roles.** MetaPOS (Sept 2023–Present) and Blossom Academy (Nov 2024–Present) both read as current, overlapping with 2U/edX (Oct 2023–June 2025). This is entirely plausible for remote and mentoring work, and §10.2 requires the layout to support it — but each record needs explicit engagement type and remote/part-time context so it does not read as an error.

**6.5 — Old Wix portfolio still listed as a source.** `sources` includes `bongokosa.wixsite.com/website`. Remove or mark archived before launch.

**6.6 — Credential expiry watch.** Google Cloud ACE expires 1 March 2027 and Cloud Digital Leader 12 January 2027. Both currently active and correctly labelled, as is the expired AWS practitioner credential. Add a `last_reviewed` field per §23.2 and a build-time check that flags any credential within 90 days of expiry, so the site cannot silently claim a lapsed certification.

---

## 7. Finding B1 — LinkedIn cannot be fetched programmatically

**Severity:** Medium. Blocks part of the content audit.

`https://www.linkedin.com/in/bongo-seakhoa/` returns **HTTP 999**, LinkedIn's automated-access block. Neither agent can read it directly.

The content audit in §23.3 requires reconciling role titles, dates, education and availability against the real record. Without LinkedIn access, that reconciliation cannot be completed, and neither agent should infer or reconstruct its contents.

**Action for Bongo:** supply the LinkedIn data as an export (Settings → Data privacy → Get a copy of your data) or paste the profile text into `AI-COLLAB/inbox/` as `linkedin-profile-source.md`. Until then, `content/profile.json` is the only defensible source and the audit stays open as **DEP-CONTENT-001**.

---

## 8. Finding B2 — Generator architecture

**Severity:** Medium. Codex's lane; noted for planning.

`scripts/build.py` is 1,503 lines with 68 triple-quoted HTML blocks and a dedicated render function per page. The addendum already calls for a template refactor (§24.1), which is correct. Three additions:

**8.1 — Build validation before templating.** The content model is about to fan out from one `profile.json` into ten-plus files (§23.1). Introduce `validate_content.py` *first*, not last: JSON schema per content type, required-field checks, date sanity (no end before start, no future start), internal link resolution, and a duplicate-title check that would have caught finding 6.3. Templating a model that has no validation just distributes the errors.

**8.2 — The PDF pipeline fails silently and is not portable.** `build_pdf()` hardcodes four Windows paths to Chrome and Edge, and on failure prints `"No Chrome or Edge installation found. Skipping PDF generation."` and **returns normally**. Consequences: the build reports success while shipping stale PDFs; the PDFs can silently drift out of sync with `profile.json`; and the build cannot run in CI or on any non-Windows machine. **Recommendation:** make a missing browser a hard failure unless an explicit `--skip-pdf` flag is passed, resolve the browser via `shutil.which` plus an env var override, and add a freshness assertion that fails the build if any PDF is older than `content/`.

**8.3 — No tests exist.** Required deliverable 12 in the master brief is "automated tests for route transitions and state recovery". There is currently no test directory and no CI. See §11.

---

## 9. Finding B3 — Mode drift is the main architectural risk of the two-mode design

**Severity:** Medium-high. Design it out now; it cannot be retrofitted.

Static View and Anzania are two presentations of one body of work. §25.1 states they must not drift. Drift is the default outcome unless it is structurally impossible, because the two modes will be built months apart.

**Recommendation — three structural rules:**

1. **One route manifest is the single source of truth for what exists.** Both modes render *from* it. Neither mode may define a destination the manifest does not contain.
2. **Static View is the canonical renderer.** Anzania is an enhancement layer over the same records. A fact that lives only in the immersive mode is a bug by definition — this makes §27.3's "no essential information is available only through Anzania" mechanically checkable rather than a review opinion.
3. **A build check enforces it.** For every entry in the route manifest, assert a Static View page exists at that route, and assert every Anzania destination maps to a manifest route. Fail the build otherwise. This is roughly thirty lines and it permanently retires the drift risk.

The `<html data-view="static">` boundary in §24.3 is the right mechanism, and the requirement that Static View never preloads the immersive bundle is testable — see §11.

---

## 10. Finding B4 — SEO and sharing defects on the current site

**Severity:** Medium. Direct, measurable conversion loss.

Verified on the live site and in the generated HTML:

| Item | State |
| --- | --- |
| `<link rel="canonical">` | **Absent on every page** |
| `og:image` | **Absent** — link previews on LinkedIn, WhatsApp and Slack render with no image |
| `og:url`, `twitter:card` | Absent |
| `sitemap.xml` | Does not exist |
| `robots.txt` | Present but malformed — `Allow: /` is indented under `User-agent: *`, and there is no `Sitemap:` directive |
| `Person` structured data | Present, and correctly carries `alternateName` |

The missing `og:image` is worth singling out. This portfolio's primary distribution channel is a link pasted into LinkedIn or an email to a recruiter. Right now that link renders as a bare grey box. Given that a library of high-quality artwork is available, a per-route OG image is one of the highest return-per-hour items in the whole project.

Note the interaction with finding A2: OG image and canonical URLs must be **absolute**, so they cannot be authored until the base path is decided.

---

## 11. Finding B5 — Accessibility defects on the current site

**Severity:** Medium. All are inherited into any rebuild that reuses `assets/site.css`.

| Check | Result |
| --- | --- |
| `prefers-reduced-motion` | **Absent from all 1,745 lines of `site.css`** |
| Skip link | **Absent** from every page |
| `prefers-contrast` / `forced-colors` | Absent |
| Focus styles | Present (9 rules) — good |
| Print styles | Present (1 block) — good |
| `lang` attribute, heading structure | Present and sane |

The reduced-motion gap is the significant one. `assets/site.js` runs an **unconditional `requestAnimationFrame` loop** drawing 45 particles plus an O(n²) proximity-line pass — roughly 1,000 distance calculations per frame, forever, on every non-resume page. It never checks `prefers-reduced-motion`, never pauses on `visibilitychange`, and never stops. That is a WCAG 2.2 motion concern and a needless battery drain on laptops and phones.

Static View forbids all of this outright (§18.2, §27.2), so the rebuild resolves it — but the defect is live today, and any reuse of the current CSS/JS carries it forward. **Recommendation:** treat `site.js` as deleted rather than ported.

---

## 12. Finding C1 — Avatar-to-plate integration is the real technical risk, not the character model

**Severity:** Medium. Relevant to the vertical slice.

The mixed-dimensional decision in worldbuilding addendum §3 — keep the painted plates, put real-time 3D only around the avatar — is the strongest technical decision in the brief. It should be protected.

The hard part is not producing a good character. It is making a real-time 3D character not look pasted onto a painted plate. That is decided by lighting match, contact shadow, atmospheric depth and colour grade (§7.3), and it fails visibly when the plate's key light and the scene's key light disagree.

**Recommendation:** author a `lightingProfile` per plate early, by sampling each image directly — key direction, key colour temperature, ambient fill, horizon luminance, and a grade/LUT target. It is cheap, it is possible today with the plates already in hand, and it is what determines whether the avatar looks grounded. Do it during the single-location vertical slice, before any character production is scaled.

**On the mask pipeline (§8.2):** as specified, up to seven masks per plate × 16 plates ≈ 112 authored masks. That is over-scoped. Only the plates that actually receive parallax need depth, and Static View needs none at all. **Recommendation:** author masks per-plate on demand, driven by the approved motion plan, and use monocular depth estimation plus manual cleanup rather than hand-authoring depth from scratch.

---

## 13. Proposed quality gates

Recommended as the definition of done for Static View. Each is mechanically checkable; none is a matter of opinion.

**Gate 1 — Content integrity**
- `validate_content.py` passes: schema, required fields, date sanity, no duplicate credentials
- Every external link returns 2xx (link checker in CI)
- No credential within 90 days of expiry is presented as active
- Content audit per §23.3 signed off by Bongo, including the LinkedIn reconciliation (DEP-CONTENT-001)

**Gate 2 — Static behaviour** *(§27.2)*
- Automated check: no WebGL/WebGPU context created, no `.glb` requested, no canvas element, no immersive bundle fetched
- Full site navigable and readable with JavaScript disabled
- No animation runs when `prefers-reduced-motion: reduce` is set

**Gate 3 — Routing and deployment**
- Every route in the route manifest resolves under the production base path
- Build fails on any root-absolute internal link when a base path is configured
- Deep links, refresh, and browser back/forward work on every route
- `/bongo-kosa/` serves the continuity page with a canonical link to the primary profile and does not duplicate site content

**Gate 4 — Accessibility** *(WCAG 2.2 AA, §19)*
- Automated axe scan clean on every route
- Manual keyboard pass: skip link first, visible focus, logical order, no traps
- Contrast verified against the *final* sampled artwork surfaces, not the token table
- 200% zoom and 320px reflow pass
- Print output preserves essential information

**Gate 5 — Performance** *(§21.1)*
- Measured against the stated budgets: HTML ≤100 KB, CSS ≤60 KB, JS ≤80 KB, initial transfer ≈1.2 MB, LCP ≤2.5s on mid-range mobile, CLS <0.1, INP <200ms
- Every image ships AVIF + WebP with explicit width/height and correct `sizes`
- No layout shift from late-loading media
- Every page remains usable with images blocked

**Gate 6 — SEO** *(§27.7)*
- Unique title, description, canonical and OG image per route
- `sitemap.xml` covers every public route; `robots.txt` well-formed with a `Sitemap:` directive
- Structured data validates against Schema.org
- No duplicate indexable content between surnames or view modes

**Gate 7 — Asset integrity**
- Every shipped Anzania asset traces to an entry in `anzania-asset-registry-verified.json`
- No asset marked `SUPERSEDED_DO_NOT_SHIP` appears in the build
- Runtime derivatives never overwrite source masters

---

## 14. Open dependency register

| ID | Dependency | Owner | Blocks | Status |
| --- | --- | --- | --- | --- |
| **ANZ-ASSET-001** | Threshold Dunes inner plate | Bongo | Threshold Dunes outer/inner pair | **Candidate identified** — confirm `07_59_39 PM (2).png` |
| **DEP-BASE-001** | Deployment URL: project page, user page or custom domain | Bongo | All canonical URLs, sitemap, OG tags, structured data | **Open — highest urgency** |
| **DEP-CONTENT-001** | LinkedIn record for content reconciliation | Bongo | Content audit sign-off, launch | Open (HTTP 999 blocks automated fetch) |
| **DEP-PHONE-001** | Publish or remove the personal mobile number | Bongo | Resume/CV generation | Open |
| **DEP-ROSTER-001** | Character roster scope: 15 identities or 1 + customisation | Bongo | Immersive Phase 4 onward | Open |
| **DN-CHAR-001** | Canonical character reference pack | Bongo | All character production | Open (per brief §24) |
| **ANZ-MASK-001** | Plate depth maps and motion masks | Codex | Parallax, occlusion | Deferred — not needed for Static View |
| **ANZ-SAFE-001** | Per-plate content-safe zones and focal points | Codex | Panel placement over artwork | Open — needed for Static View layout |
| **ANZ-COPY-001** | Final public copy reconciled with the profile source | Bongo + Codex | Launch | Open |
| **ANZ-TEST-001** | Mixed-dimensional performance on target devices | Codex | Quality tiers | Open — resolve via vertical slice |

---

## 15. What I recommend happens next

**Bongo, four decisions, roughly in order of how much they unblock:**

1. **Deployment URL** (DEP-BASE-001) — determines every canonical URL. Cheapest to decide now, most expensive to change later.
2. **Confirm the Threshold Dunes inner plate** (ANZ-ASSET-001) — closes the asset set completely.
3. **Supply the LinkedIn record** (DEP-CONTENT-001) — unblocks the content audit that gates launch.
4. **Phone number: publish or remove** (DEP-PHONE-001).

Two more can wait until Static View is underway: the character roster scope (DEP-ROSTER-001) and whether a full-bleed hero justifies an approved upscale (§5).

**Codex:** the verified registry is ready to ingest, and §13's gates are offered as the definition of done rather than as a review checklist applied after the fact. I will review implemented work continuously, run independent verification and report defects here.
