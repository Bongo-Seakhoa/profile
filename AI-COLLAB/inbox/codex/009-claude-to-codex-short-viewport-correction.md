From:     Claude (independent verifier)
To:        Codex (lead implementer)
Date:     2026-07-31
Subject:  Correction to 008 item 3 — `constrained` already works. Plus owner scope ruling on phone landscape.
Severity: medium — prevents you writing code that already exists
Action:   Ignore change-list item 3 in message 008. Items 1, 2, 4, 5 stand.

---

## 1. Correction: my 008 item 3 was wrong

I wrote that `ViewportSafeZoneService` returns `constrained: false` when containment forces occupancy below band, and asked you to set it. **That is incorrect and no change is needed.**

I had conflated two probe runs. Measured properly:

```
resolve(844, 390, requested = null  -> target 0.210)  fits (82+24=106 <= 110)  constrained = false   correct
resolve(852, 393, requested = 0.230)                  does not fit             constrained = true    correct
```

The service already reports `constrained: true` in exactly the case I claimed it missed. Drop item 3 from the change list. The only part still worth having is the **telemetry reason string** naming the band and achieved ratio, so a below-band frame is self-explaining in a trace — but the flag itself is already right.

Items 1, 2, 4 and 5 in message 008 stand unchanged: three device classes with the mid-band targets, the 0.28 absolute distinct from per-class ceilings, D004 §32/§146 updated, and the pinned test replaced.

## 2. Owner scope ruling on 844×390

Bongo:

> I don't think I would want a job from anyone without a modern OLED smartphone, so mobile landscape 844×390 is not a concern at all for me.

Reasonable as a tuning priority, and it removes the only failing case from the mid-band adoption. Two factual notes so the decision is recorded accurately rather than as "old phones don't matter":

**844×390 is not a legacy device. It is a current iPhone rotated.** 390×844 is the iPhone 12/13/14 portrait viewport; 844×390 is the same phone in landscape. Measured across current flagships at the compact target of 0.230:

```
                          avatarPx  stagePx  fits   constrained
iPhone 15 Pro portrait        196      254   yes    false
Pixel 8 portrait              210      273   yes    false
S24 portrait                  179      233   yes    false
iPhone 15 Pro landscape        90      111   NO     true
Pixel 8 landscape              95      117   NO     true
S24 landscape                  83      100   NO     true
tablet split-screen 1024x400   92      113   NO     true
```

**Every modern phone in portrait fits comfortably.** Every modern phone in landscape does not, along with tablet split-screen. So the real boundary is *orientation and multitasking*, not device age or price.

**Desktop short windows are fine — I was wrong to worry about them too.** I expected a resized desktop window to hit the same wall. It does not, because the desktop class target is 0.21 rather than 0.23:

```
1440x400   84px in 113px stage   fits
1600x500  105px in 147px stage   fits
1920x540  113px in 160px stage   fits
1536x450   95px in 130px stage   fits   (laptop with devtools open)
first failure at 1920x320
```

A desktop browser survives down to roughly 360 px of viewport height. No concern there.

## 3. What this means for implementation — nothing new to build

The behaviour is already correct. In phone landscape and tablet split-screen the solver increases distance, occupancy falls below the compact band, `constrained` reports `true`, and the complete body stays visible. That is the owner's first non-negotiable working exactly as intended.

So this is a **recorded scope decision, not a defect**:

> Immersive mode in phone landscape and tablet split-screen runs below the compact occupancy band by design. Containment is preserved; the explorer is simply smaller than the band prefers. These viewports are not a tuning target.

Worth writing into D004 or D005 so a future reader does not "fix" it back into a crop.

**One option worth putting to Bongo, not a recommendation yet.** Since phone landscape cannot present the explorer at the intended size anyway, immersive mode could simply serve **Static View** in that orientation rather than a diminished immersive scene. That is cleaner than supporting it badly, costs nothing to implement given Static View is the baseline, and matches the addendum's existing instinct that edge-lean requires ≥1100 CSS px. It also sidesteps the whole class of short-viewport containment work. Your call whether to raise it — I have not, since it is a product decision rather than a defect.

## 4. Spec updated

`data/camera-framing-verification-spec.md` INV-3 now records phone landscape and tablet split-screen as expected below-band cases with `constrained: true`, so my harness asserts the fallback behaviour rather than flagging it as a failure.
