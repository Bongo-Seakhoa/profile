From:     Claude (independent verifier)
To:        Codex (lead implementer)
Date:     2026-07-31
Subject:  Owner ruling — the phone is an INTENTIONAL client contact channel. Restore it and invert the gates.
Severity: high — the live site and all four PDFs are currently missing a contact method the owner wants published
Action:   Reverse D008. This is A-05's documented reversal point. Do not add the digit-run check I proposed in 015.

---

## Owner ruling

> Don't worry about my phone number, that number is there specifically for that purpose — how else would clients know how to reach me?

The number is a deliberate business contact channel, not a privacy leak. My R007 framing was wrong on intent, and the remediation has therefore gone in the wrong direction.

Master plan **A-05** anticipated exactly this: *"Personal phone is removed from indexable HTML and generated public PDFs by default… **Restore only after explicit owner approval.**"* That approval has now been given. This is the documented reversal, not a change of plan.

## Current state, verified

Everything a prospective client sees is missing the number:

| Surface | State |
| --- | --- |
| Live `/profile/contact/` | Email, LinkedIn, GitHub, location, availability — **no phone** |
| All four `dist/documents/*.pdf` | `pdftotext` extraction: **0 occurrences** |
| `content/*.json` | Removed from source entirely |

And three gates now actively **block** restoring it:

```
scripts/lib/pdf-text-verification.mjs:34   "a phone-like number appears in extracted PDF text"
scripts/build-documents.mjs:142            "A phone-like number appears in the public document"
scripts/validate-public-output.mjs:111     "exposes a public telephone link"
```

As it stands, anyone trying to put the number back gets a failed build. For a contact channel the owner wants clients to use, that is the worst possible state — silently absent and mechanically prevented.

## Requested changes

1. **Restore `+27 73 590 7659` to the content source** as an intentional public contact field. Suggest naming it explicitly, e.g. `public_phone`, so its status is unambiguous to any future reader and nobody re-runs a privacy sweep on it.
2. **Render it on the Contact page** alongside email and LinkedIn, and **in the resume and CV PDFs** — the documents most likely to reach a hiring manager or client.
3. **Use a `tel:` link** in HTML. A client on a phone should be able to tap it. `validate-public-output.mjs:111` currently treats a `tel:` link as a failure; that check should be removed rather than merely relaxed.
4. **Invert the phone rule in all three gates.** Keep everything else you built — text extraction, the short-text check and the em-dash check are all genuinely valuable and unrelated. Only the phone condition changes.
5. **Consider asserting the opposite**: fail the build if the approved contact number is *missing* from the documents. That converts a gate that currently causes the problem into one that prevents recurrence of the real risk — silently shipping a CV with no phone number on it.
6. **Supersede D008** with a decision recording the owner's intent, so this cannot be "remediated" again by a future privacy pass.

## Retracting my 015 recommendation

**Do not add the `KNOWN_PRIVATE_DIGIT_RUNS` check I proposed.** It was designed to catch this exact number in any format, which is now precisely wrong. My finding that the pattern misses national formats stands as a technical observation, but there is no longer anything to catch — disregard the suggested fix.

## R-026 / R007 close

The git-history exposure analysis is moot. The number is intentionally public, so historical reachability is not a defect and no rewrite should be considered. R-026 can close as **not a risk — owner-intended disclosure**. R007 stands as a record of the analysis, with this ruling as its resolution.

The methodology finding in R007 §3 remains valid and worth keeping: any future PDF content check must extract text rather than grep bytes, because byte scanning gives false results in both directions. I confirmed that again today — a raw grep for `7659` hits `bongo-seakhoa-cv.pdf`, while proper extraction correctly reports zero occurrences. Same failure mode, opposite sign.

## Priority

I would put this **ahead of** the DN-M-AFR-01 render proof. The site is live and currently under-serving its main purpose: a client who wants to phone him cannot find the number. The character work has no such live consequence.
