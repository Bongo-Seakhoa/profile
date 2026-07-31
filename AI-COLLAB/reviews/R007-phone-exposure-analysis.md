# R007 — R-026 phone exposure: read-only analysis

**Author:** Claude (independent verifier)
**Date:** 2026-07-31
**Requested by:** `inbox/claude/011` — *"Continue the read-only exposure analysis, but do not rewrite history."*
**Scope:** Read-only. No history was rewritten, no ref moved, no remote operation performed beyond anonymous HTTP GETs.

---

## 0. Finding

**The current-tree remediation worked. The historical exposure is real, live and confirmed by HTTP 200 right now.**

Verified reachable anonymously, this session:

```
HTTP 200  phone-hits=1  raw.githubusercontent.com/Bongo-Seakhoa/profile/df410d5/resume/bongo-seakhoa/index.html
HTTP 200  phone-hits=1  raw.githubusercontent.com/Bongo-Seakhoa/profile/2a9983a/content/profile.json
HTTP 200                raw.githubusercontent.com/Bongo-Seakhoa/profile/df410d5/assets/files/bongo-seakhoa-cv.pdf
```

Repository `Bongo-Seakhoa/profile` is **PUBLIC**, created 2026-03-23, last pushed 2026-07-31T05:31Z.

---

## 1. What is clean

| Surface | State |
| --- | --- |
| Live site `/profile/` | Clean. New Static View deployed; no phone. |
| `/profile/resume/bongo-seakhoa/` | 404 — route retired |
| `/profile/assets/files/*.pdf` | 404 — old PDFs no longer served |
| `origin/main` tip | 0 text files with the phone, 0 PDFs in tree |
| `origin/profile-upgrade-impl` tip | Clean |
| `origin/agent/static-release-record` tip | Clean |
| `origin/agent/pages-actions-node24` tip | Clean |

D008's working-tree remediation is confirmed effective. Nothing currently *served* carries the number.

## 2. What is exposed

Both phone-bearing commits are ancestors of **every pushed ref**, so they are permanently reachable by SHA:

| Commit | Reachable from | Phone in |
| --- | --- | --- |
| `df410d5` | main, profile-upgrade-impl, agent/static-release-record | `content/profile.json`, `resume/bongo-kosa/index.html`, `resume/bongo-seakhoa/index.html`, `resume/cv/bongo-kosa/index.html`, `resume/cv/bongo-seakhoa/index.html` |
| `2a9983a` | main, profile-upgrade-impl, agent/static-release-record | `content/profile.json`, `resume/bongo-kosa/index.html`, `resume/bongo-seakhoa/index.html` |

Plus four PDF blobs added across those two commits — `bongo-{seakhoa,kosa}-{resume,cv}.pdf` — each containing the contact line:

```
Debrecen, Hungary · bongokosa@gmail.com · +27 73 590 7659 · linkedin.com/in/bongo-seakhoa
```

Access vectors, all anonymous: `git clone` of full history; GitHub blob view by SHA; `raw.githubusercontent.com` by SHA (verified 200 above); GitHub REST API by blob SHA.

**Forks: 0. Stars: 0.** That materially simplifies any remediation — there are no downstream copies to chase.

---

## 3. A methodology finding that matters more than the exposure

**My first scan of the PDFs returned a false all-clear.** A raw byte scan plus zlib decompression of every `stream` object found nothing — the text is behind font subsetting and per-glyph encoding, so the literal digits never appear in the decompressed stream.

Only proper text extraction found it. Both agree:

```
pdftotext -layout  ->  "+27 73 590 7659" present in cv.pdf and resume.pdf
pypdf extract_text ->  "590 7659" present: True   digit-run 5907659: True
```

**Action for Codex:** if `verify-documents.mjs` or any privacy scan checks PDFs by grepping bytes, it will report clean while the number is present. The check must extract text. This is worth verifying immediately — it is a privacy gate that can silently pass.

Poppler is already a stated dependency, so `pdftotext` is available in the pipeline.

---

## 4. Honest risk assessment

Three things should temper how much weight a history rewrite is given:

**The number was published on a live, indexed, public site for roughly four months.** Repository created 2026-03-23; the phone was present from the first commit and served at `/profile/resume/…` until the Static View deployment. Anything that scrapes public GitHub Pages or crawls GitHub has had ample opportunity. **Rewriting history cannot un-publish that.**

**GitHub retains unreachable objects.** After a force-push, orphaned commits remain accessible by SHA on github.com until garbage collection, which GitHub does not guarantee on any timeline. The documented remedy is to contact GitHub Support and request cached-view purging *after* the rewrite. A rewrite alone is not sufficient.

**Search-engine and archive caches are independent of git.** Any indexed copy of the old resume pages persists on its own schedule and needs separate removal requests.

So the realistic benefit of a rewrite is *reducing future casual discovery*, not undoing exposure.

---

## 5. Options for Bongo — his decision, not ours

Presented neutrally with real costs.

**Option A — stop here.** Working tree and live site are clean; no new exposure accrues. History keeps the number, discoverable by anyone who looks at old commits. Zero risk of breaking anything.

**Option B — rewrite history.** `git filter-repo` to purge the phone from the five text paths and the four PDF blobs across both commits, force-push all four refs, then request cached-view purge from GitHub Support. Costs: rewrites every commit SHA, invalidates existing clones, requires a tagged backup first, and the Pages deployment must be re-verified afterward. Zero forks makes this cleaner than usual. **Codex was right to refuse this unilaterally** — it is destructive and needs an explicit decision plus a recovery plan.

**Option C — treat the number as disclosed.** If the concern is spam or unwanted contact rather than principle, changing the number is more effective than rewriting history, because it addresses copies already harvested. Can be combined with A or B.

My read, stated as a recommendation and not a decision: **A or C is proportionate.** Option B has real cost and delivers less than it appears to, given four months of live public indexing. If B is chosen, it must include the GitHub Support purge request or it is largely theatre.

Whatever is chosen, the **methodology finding in §3 should be fixed regardless** — a privacy gate that greps PDF bytes will keep passing while PDFs carry personal data.

---

## 6. Also confirmed this session

The **new Static View is live** at `https://bongo-seakhoa.github.io/profile/`. Hero reads *"Bongo Seakhoa — I turn complex information into reliable data systems, practical analysis and decisions people can act on."* Navigation is the addendum's eight routes: Overview, Work, Capabilities, Experience, Research, Education, About, Contact. The dual-surname hero is gone and the alternate-name note now sits quietly in the footer, as the Static View addendum §4.2 requires.

That is the R001 §D2 positioning problem resolved and the addendum's identity hierarchy implemented. Worth recording as a genuine milestone.

I have not yet reviewed the deployed Static View against the Gate 1–6 criteria in R001 §13. That is the next substantial piece of work available to me and I will take it unless Codex has it in hand.
