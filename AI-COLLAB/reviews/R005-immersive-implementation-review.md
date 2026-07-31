# R005 — Independent adversarial review of the immersive camera and animation implementation

**Author:** Claude (independent verifier)
**Date:** 2026-07-31
**Requested by:** `inbox/claude/004`, `005`, `006`
**Under review:** `src/immersive/camera/**`, `src/immersive/animation/**`, `tests/unit/immersive/**`, D004, D005
**Location:** worktree `C:\Users\Bongo\Documents\Codex\2026-07-30\i-would-like-you-to-look\work\profile-upgrade-impl`
**Method:** source audit, independent test execution, independent typecheck, and six adversarial probes run against the exported API. No Codex-owned file was modified.

---

## 0. Verdict

The implementation is well built. Strict TypeScript compiles clean, 28 immersive tests pass under my own run, and the architecture does the hard things properly — a typed authored-suppression whitelist rather than a boolean, conservative proxy fallbacks that fail closed, predictive envelopes, and a source-level audit that greps for prohibited OTS symbols. DEP-CAM-004 is fixed exactly as recommended.

**One finding is substantive and needs Bongo, not Codex:** the shipped occupancy bands implement the *superseded* camera directive rather than the Animation Addendum, and the divergence is measurable on tablets and compact layouts. It is a documented, deliberate choice in D004, which is why it needs the owner rather than a bug fix.

Four smaller findings follow. Roughly 40% of the assignment in message 004 is currently executable; the rest is blocked on assets that do not exist yet, and I say so explicitly in §5 rather than reporting a pass I did not earn.

---

## 1. F1 — Occupancy bands implement the superseded directive

**Severity: high. Owner decision, not a code defect.**

Two owner documents disagree, and D004 resolved the conflict toward the older one.

`Animation Addendum.md` opens: *"This specification supersedes all earlier camera-framing, interaction-animation and character triangle-budget guidance."* Its §2 then specifies desktop/laptop **18–24%**, ultrawide **16–22%**, tablet/compact **20–26%**, never exceeding approximately **28%**.

D004 §25 narrows that adoption to *"animation, runtime assets and authorised traversal effects"* — excluding camera framing — and §34 reasons that *"the tighter 24% non-selection ceiling remains the controlling intersection of the direct owner correction and the addendum."* §32 and §146 then lock **14–20%** with a **24%** ceiling, and the test suite pins it: *"solves a desktop companion composition inside the 14–20 percent band."*

That is a defensible reading of two conflicting instructions. It is also a unilateral resolution toward the document the newer one says it supersedes, and the newer one raised the figures deliberately — the owner wanted the explorer read slightly larger, not smaller.

**Measured effect** (probe P1, `ViewportSafeZoneService.resolve`, no content regions):

| Viewport | target | min | max | Addendum §2 | Verdict |
| --- | ---: | ---: | ---: | --- | --- |
| desktop 1920×1080 | 0.180 | 0.140 | 0.240 | 0.18–0.24 | ok |
| laptop 1536×864 | 0.180 | 0.140 | 0.240 | 0.18–0.24 | ok |
| ultrawide 3840×1080 | 0.180 | 0.140 | 0.240 | 0.16–0.22 | ceiling over-permits |
| ultrawide 2560×1080 | 0.180 | 0.140 | 0.240 | 0.16–0.22 | ceiling over-permits |
| **tablet landscape 1024×768** | **0.180** | 0.140 | 0.240 | **0.20–0.26** | **target below band** |
| **tablet portrait 768×1024** | **0.180** | 0.140 | 0.240 | **0.20–0.26** | **target below band** |
| mobile portrait 390×844 | 0.210 | 0.120 | **0.240** | 0.20–**0.26** | **ceiling below band** |
| mobile landscape 844×390 | 0.210 | 0.120 | **0.240** | 0.20–**0.26** | **ceiling below band** |

Three concrete consequences:

1. **Tablets are framed roughly 10% smaller than specified.** `viewport-safe-zones.ts:50` classifies `desktopLike = width >= 768 && height >= 540`, which captures both tablet orientations, so they receive the desktop profile and its 0.18 target instead of the addendum's 0.20–0.26.
2. **Compact layouts cannot reach the top of their band.** Every non-selection profile hard-caps at 0.24; the addendum's compact band runs to 0.26.
3. **There is no ultrawide device class at all.** Confirmed by grep — no `ultrawide`, `tablet`, `deviceClass` or `breakpoint` symbol exists in `src/immersive`. Ultrawide inherits the desktop ceiling of 0.24 against a specified 0.22.

**Recommendation.** Ask Bongo which document governs framing. If the Animation Addendum governs — which its own supersession clause asserts — then `profileFor()` needs three device classes with the addendum's bands, the ceiling moves to ~0.28, and D004 §32/§146 plus the pinned test need updating together. If D004's intersection is what Bongo wants, D004 should say so as an owner ruling rather than as an implementer's reconciliation, because it knowingly departs from the newest instruction.

I have no stake in which way it goes. It should not be settled by whichever agent writes code first.

---

## 2. F2 — LOD threshold unit is undeclared, and it changes the selected tier

**Severity: medium.**

`preferredLodFor(projectedHeightPx, deviceQuality, characterSelection)` never declares whether `projectedHeightPx` is CSS or device pixels, takes no `devicePixelRatio`, and no test pins the convention. On a dpr-2 display the two readings differ by a factor of two, and the thresholds sit right where that matters (probe P3):

| Input | nav tier | selection tier |
| --- | --- | --- |
| 100 px (CSS, dpr 1) | LOD 2 | LOD 2 |
| same figure at dpr 2 = 200 device px | **LOD 1** | **LOD 1** |
| 179 px | LOD 2 | LOD 2 |
| 180 px | LOD 1 | LOD 1 |
| 346 px | LOD 1 | LOD 1 |
| 692 px | LOD 1 | **LOD 0** |

The same character on the same screen resolves to a different tier depending on what the caller passes. This is the residue of DEP-CAM-004: the LOD 0 gate is fixed, the unit question is not.

**Recommendation.** Rename to `projectedHeightDevicePx`, or take CSS height plus `devicePixelRatio` and convert internally. Add a test pinning the convention at the 180 and 360 boundaries. My R004 F1 recommended device pixels for the within-navigation selection, under the context gate that now exists.

---

## 3. F3 — `minimumTriangles` is declared but never enforced

**Severity: low, but it hides a real failure mode.**

`CHARACTER_LOD_BUDGETS` defines `minimumTriangles` for all five tiers. `validateRuntimeCharacterMetrics` checks only maximums. Probe P5:

```
74,000 triangles declared as LOD 3  ->  ["triangle-ceiling"]      caught
        12 triangles declared as LOD 1  ->  []                    passes
```

The ceiling check works. But a character that fails to load, loads the wrong tier, or renders an empty mesh reports twelve triangles and passes every budget assertion. Given that §13 requires "no unused high-resolution character remains loaded" and the residency check already exists, a floor check is the natural companion — and the data is already there.

The addendum does say "These values are ceilings, not quotas," so a hard failure may be wrong. A warning at, say, below half the tier minimum would catch a failed load without constraining legitimate optimisation.

---

## 4. F4 — Field of view is unimplemented and unverifiable

**Severity: low now, medium once a renderer exists.**

Addendum §2 requires an initial vertical FOV of approximately 42–50°, starting at 46. D004 §22 correctly states destinations may supply composition hints but never a final FOV.

Grep across `src/immersive` returns **no `fov` or `fieldOfView` symbol anywhere**. Nothing sets it, clamps it, or validates it. That is reasonable at this stage — there is no renderer yet — but it means my INV-7 has nothing to assert against, and an out-of-range FOV would silently change every occupancy figure in F1, since occupancy is a function of FOV and radius together.

**Recommendation.** When the renderer lands, make FOV a controller-owned clamped value with a range assertion, not a scene-authored constant.

---

## 5. F5 — Mobile landscape passes, with 4 px of margin

**Severity: informational, but worth watching.**

My worst case from the verification spec resolves successfully (probe P2):

```
viewport 844x390 -> target 0.210 -> 82 css px tall
stage height 110 px, clearance 12 px, constrained = false
82 + (2 x 12) = 106 <= 110   fits
```

It fits by **4 pixels**, with no active content regions and using the nominal avatar height rather than an animated envelope with an extended scarf or mantle tail. `constrained` reports `false`, so the service does not signal the controller that it is near its limit.

Not a defect today. It is the tightest geometry in the system and the first thing that will break when real animated bounds and an open content panel arrive together. Worth a dedicated regression test at that viewport once clips exist.

---

## 6. What is genuinely good

Stated plainly, because a review that only lists faults is not an accurate report.

- **DEP-CAM-004 is fixed.** `runtime-lod-policy.ts:65` gates LOD 0 on `characterSelection` alongside pixel height. Probe P4 swept pixel heights 200–5000 across all three device qualities: **zero** navigation frames resolve to LOD 0. Exactly the recommended fix.
- **LOD budgets match Addendum §11 precisely** — 55–75k, 28–42k, 14–24k, 7–12k, 3–6k, with draw-call ceilings 12/10/7/5 and texture edges 4096/2048/2048/1024.
- **Authored suppression is a typed whitelist**, not a boolean: `AllowedVisibilitySuppression` carries effect, power, phase, marker and a maximum duration, and `AvatarVisibility` is a discriminated union. This is what makes INV-2 testable and it is what I would have asked for.
- **Fail-closed behaviour is real.** Missing or stale contributors activate a conservative maximum proxy; with no proxy, rendering fails closed rather than silently dropping a contributor.
- **The test suite is adversarial, not confirmatory.** It rejects unlisted or overlong disappearance phases, rejects visible frames with a missing accessory bound, greps source for prohibited close-shoulder symbols, and fails closed when independent visibility telemetry reports full occlusion. That last one is exactly the self-certification guard message 004 asked me to apply.
- **Character-selection band is correct** — 0.45 target, 0.55 ceiling, against the addendum's 0.35–0.55 (probe P6).
- Independent verification: `npx tsc --noEmit` clean; `npx vitest run tests/unit/immersive` → **28 passed** (message 005 said 26 — the suite has grown, not shrunk).

---

## 7. What I could not verify, and why

Message 004 asks for a signed pass/fail matrix across every animation, power, viewport, engine and content state, with silhouette-mask comparison and screenshots. **That is not executable yet**, and I will not report a pass I did not earn.

Blocked on assets that do not exist in the worktree:

| Assignment item | Status |
| --- | --- |
| Every shipped animation, loop, transition, blend | **Blocked** — no clips exist |
| Every traversal power and visibility effect | **Blocked** — no powers implemented |
| Gestures, look-back, long-idle at real extrema | **Blocked** — contract-level only |
| Chrome / Firefox / WebKit engine coverage | **Blocked** — no renderer or page to load |
| Object-ID silhouette-mask comparison | **Blocked** — nothing renders |
| Screenshots and recordings at extrema | **Blocked** |
| Contract, budget and selection logic | **Done** — §1–§6 above |
| Source audit for OTS language | **Done** — Codex's own test covers it; I confirmed no additional symbols |
| Independent test execution and typecheck | **Done** |

Roughly 40% of the assignment is complete. The remainder becomes executable the moment one character, one clip set and one power land in a rendering scene — which is M7, and which depends on DN-CHAR-001.

The framing telemetry contract in `data/camera-framing-verification-spec.md` §1 maps closely onto the existing `FramingTelemetry` type. Two additions would let the browser-stage harness run without further plumbing: `visualViewport` alongside `viewport`, and an `InputLatencyEvent` stream for INV-16, which remains the invariant I would most expect to erode quietly.

---

## 8. Findings summary

| ID | Finding | Severity | Owner |
| --- | --- | --- | --- |
| **F1** | Occupancy bands implement the superseded directive; tablets framed below spec, compact ceiling below spec, no ultrawide class | High | **Bongo** — conflict between two owner documents |
| **F2** | LOD threshold unit undeclared; tier changes with CSS vs device pixels | Medium | Codex |
| **F3** | `minimumTriangles` declared but never enforced; a failed mesh load passes all budget checks | Low | Codex |
| **F4** | FOV unimplemented and unverifiable; it silently scales every occupancy figure | Low now, medium at renderer | Codex |
| **F5** | Mobile landscape fits by 4 px with no content and nominal bounds | Informational | Codex |

No blocking defect. Nothing here should stop Codex proceeding. F1 is the only one that needs an owner ruling, and it should be raised before more tests pin the current numbers.
