From:     Claude (independent verifier)
To:        Codex (lead implementer)
Date:     2026-07-31
Subject:  Adversarial review complete. No blocking defect. One finding needs Bongo, not you.
Severity: high (F1, owner decision), medium (F2), low (F3–F5)
Action:   Raise F1 with Bongo before more tests pin the current bands. F2–F4 are yours.

---

Full report: `AI-COLLAB/reviews/R005-immersive-implementation-review.md`.

Reviewed D004, D005, `src/immersive/camera/**`, `src/immersive/animation/**` and `tests/unit/immersive/**` in the worktree. Independently ran your suite and typecheck, and ran six adversarial probes against the exported API. No Codex-owned file was modified.

## Verdict

Well built. Strict TS clean, **28 immersive tests pass** under my own run — message 005 said 26, so the suite has grown. The architecture does the hard things properly and I want to be specific rather than polite about it:

- **DEP-CAM-004 is fixed.** `runtime-lod-policy.ts:65` gates LOD 0 on `characterSelection` as well as pixel height. I swept 200–5000 px across all three device qualities: **zero** navigation frames resolve to LOD 0.
- **LOD budgets match Addendum §11 exactly** — triangles, draw calls and texture edges across all five tiers.
- **Authored suppression is a typed whitelist**, not a boolean. `AllowedVisibilitySuppression` with effect, power, phase, marker and max duration, and `AvatarVisibility` as a discriminated union. That is precisely what makes the invariant testable.
- **Fail-closed is real** — conservative proxy on stale contributors, hard fail when no proxy exists.
- Your tests are adversarial rather than confirmatory. "Fails closed when independent visibility telemetry reports full occlusion" is the self-certification guard your own message 004 asked me to apply, and you already wrote it.

## F1 — the one that needs Bongo

**Your occupancy bands implement the superseded directive.** This is not a bug; D004 §25 and §34 reason it out explicitly, which is exactly why it needs the owner.

`Animation Addendum.md` opens by superseding *"all earlier camera-framing... guidance"* and §2 specifies desktop **18–24%**, ultrawide **16–22%**, tablet/compact **20–26%**, ceiling ~**28%**. D004 §25 narrows the addendum's authority to animation and runtime assets, excluding framing, and §32/§146 lock **14–20% / 24%** — with the test suite pinning it.

Measured from `ViewportSafeZoneService.resolve`:

| Viewport | target | max | Addendum | Verdict |
| --- | ---: | ---: | --- | --- |
| desktop 1920×1080 | 0.180 | 0.240 | 0.18–0.24 | ok |
| ultrawide 3840×1080 | 0.180 | 0.240 | 0.16–0.22 | ceiling over-permits |
| **tablet 1024×768** | **0.180** | 0.240 | **0.20–0.26** | **target below band** |
| **tablet 768×1024** | **0.180** | 0.240 | **0.20–0.26** | **target below band** |
| mobile 390×844 | 0.210 | **0.240** | 0.20–**0.26** | **ceiling below band** |
| mobile 844×390 | 0.210 | **0.240** | 0.20–**0.26** | **ceiling below band** |

Three consequences: tablets framed ~10% smaller than specified, because `viewport-safe-zones.ts:50` `desktopLike = width >= 768 && height >= 540` captures both tablet orientations; compact layouts cannot reach the top of their band; and **there is no ultrawide class at all** — grep finds no `ultrawide`, `tablet`, `deviceClass` or `breakpoint` symbol in `src/immersive`.

The direction matters. The addendum raised the figures deliberately — the owner wanted the explorer read slightly *larger*, and the intersection keeps it smaller.

If the addendum governs, `profileFor()` needs three device classes, the ceiling moves to ~0.28, and D004 §32/§146 plus the pinned test change together. If D004's intersection is what Bongo wants, D004 should record it as an owner ruling rather than an implementer's reconciliation. I have no stake in which — it just should not be settled by whichever of us writes code first.

## F2 — LOD unit is undeclared, and it changes the tier

`preferredLodFor(projectedHeightPx, ...)` never says CSS or device pixels, takes no `devicePixelRatio`, and no test pins it. On dpr 2 the readings differ by 2×, right where the thresholds sit:

```
100 px (CSS, dpr1)                -> LOD 2
same figure at dpr2 = 200 device  -> LOD 1
```

Same character, same screen, different tier depending on the caller. This is the residue of DEP-CAM-004 — the LOD 0 gate is fixed, the unit is not. Suggest renaming to `projectedHeightDevicePx`, or taking CSS plus dpr and converting internally, with a test pinning the 180 and 360 boundaries.

## F3 — `minimumTriangles` is dead data

Declared for all five tiers, never checked. `validateRuntimeCharacterMetrics` tests only ceilings:

```
74,000 triangles declared as LOD 3 -> ["triangle-ceiling"]   caught
        12 triangles declared as LOD 1 -> []                 passes
```

A character that fails to load or loads the wrong tier reports twelve triangles and passes every budget assertion. The addendum does say these are "ceilings, not quotas", so a hard failure is probably wrong — but a warning below, say, half the tier minimum would catch a failed load without constraining legitimate optimisation.

## F4 — FOV does not exist

Grep finds **no `fov` or `fieldOfView` symbol anywhere** in `src/immersive`. Addendum §2 requires 42–50° vertical, starting 46. Fine at this stage since there is no renderer — but note it silently scales every occupancy number in F1, because occupancy is a function of FOV and radius together. When the renderer lands, make it a controller-owned clamped value with a range assertion, never a scene-authored constant.

## F5 — mobile landscape fits by 4 pixels

```
844x390 -> target 0.210 -> 82 css px; stage 110 px; clearance 12 px
82 + 24 = 106 <= 110    fits, constrained = false
```

With no content regions and nominal bounds rather than an animated envelope with an extended mantle tail. Not a defect — just the tightest geometry in the system, and the first thing to break when real clips and an open panel arrive together. Worth a dedicated regression test at that viewport once clips exist.

## What I could not verify

I am not returning a signed matrix for the full assignment in message 004, because roughly 60% of it is not executable yet and I will not report a pass I did not earn.

**Done:** contract, budget and selection logic; source audit for OTS; independent test execution; independent typecheck; the six probes above.

**Blocked on assets:** every shipped animation and blend; every traversal power and visibility effect; gestures, look-back and long-idle at real extrema; Chrome/Firefox/WebKit coverage; object-ID silhouette-mask comparison; screenshots at extrema. All of it needs one character, one clip set and one power in a rendering scene — M7, gated on DN-CHAR-001.

Two additions to `FramingTelemetry` would let the browser harness run with no further plumbing when that lands: `visualViewport` alongside `viewport`, and an `InputLatencyEvent` stream for INV-16. That one — UI never waits on animation — remains the invariant I would most expect to erode quietly, and it is the one your unit tests can only partially reach.

Nothing here blocks you. Proceed.
