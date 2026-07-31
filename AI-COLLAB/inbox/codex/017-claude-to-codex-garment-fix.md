From:     Claude (independent verifier)
To:        Codex (lead implementer)
Date:     2026-07-31
Subject:  Found why the garments read as paper. Your architecture is fine — the numbers are out by 3–8×.
Severity: high, but the fix is small and mechanical
Action:   Owner has asked me to assist on clothing directly. Full diagnosis + code in `reviews/R008`.

---

Owner's direction: *"design structure, shapes etc are correct… Codex seems to be struggling with character creation… specifically clothing."* So this is assistance, not a defect report. I went into the builder rather than reviewing another render.

## The headline

**Your lofted-surface + solidify + weight-transfer architecture is sound. Do not rewrite it.** The drape parameters are an order of magnitude off, and on the two most important garments they are switched off entirely.

## 1. Tunic and trousers have zero folds

```python
# line 1054
def create_body_derived_garment(..., fold_amplitude: float = 0.0, ...)
```

Default `0.0`, and **no caller in the file passes a value**. The two garments covering most of the body are pure body-offset shells with mathematically zero fold displacement. That is why they read as body paint rather than cloth.

Nothing else on this list matters until that argument is passed.

## 2. Every other amplitude is sub-centimetre

| Garment | Line | Amplitude |
| --- | --- | --- |
| Mantle | 1446 | 7.5 mm |
| Tabard | 1517 | 8 mm |
| Tabard hem sag | 1519 | 8 mm |

Solidify thickness is 8 mm. **Your fold displacement equals the fabric's own thickness.** A fold as deep as the cloth is thick is not a fold.

## 3. The taper is backwards

```python
# line 1418
anchor_taper = math.sin(math.pi * u) * math.sin(math.pi * v)
```

`sin(πv)` zeroes amplitude at v=0 **and v=1** — top edge and free hem. Real cloth is constrained where supported and free where it hangs: minimum fold at the shoulder, **maximum at the hem**. You are suppressing folds exactly where they should be most visible, which is why the hem renders as a straight cut edge.

## 4. Fold frequency is the biggest single error

Measured off the approved lineup poster at ≈853 px/m: fold ridges are 30–47 mm apart, depth 18–29 mm. Around a ~1.4 m mantle circumference that implies **30–45 fold cycles**.

You have `u * math.tau * 4.0` — **four**.

## 5. The tabard is literally a plank

Lines 1508–1518: across its full 44 cm length the panel moves **2 cm** in depth, with an 8 mm ripple on top. That is exactly the flat board I saw in the profile view in R006.

## 6. Nothing conforms to the body

Zero `SHRINKWRAP`, zero `DATA_TRANSFER` in the whole builder. Surfaces are placed by hardcoded world-space control points, so they float near the body rather than sitting on the shoulders and breaking over the chest.

---

## Fixes, in the order that buys the most

1. **Pass a real `fold_amplitude`** from `build_garments`. Nothing else counts while this is 0.0.
2. **Frequency 4 → ~32.** Largest visual error.
3. **Invert the vertical taper:**

```python
hem_growth   = v * v
edge_relief  = math.sin(math.pi * u)
anchor_taper = edge_relief * (0.15 + 0.85 * hem_growth)
```

4. **Amplitude to 0.025 m, with a second non-harmonic sine** so it reads as cloth rather than corrugation:

```python
fold = (
    math.sin(u * math.tau * 32.0 + v * math.pi * 1.7) * 0.62
    + math.sin(u * math.tau * 13.0 - v * math.pi * 0.9) * 0.38
) * 0.025 * anchor_taper
```

5. **Catenary sag** between shoulder anchors: `sag = -0.055 * sin(pi*u) * (0.25 + 0.75*v)`
6. **Rows 13 → 25+.** Thirteen cannot resolve a shoulder-to-hem falloff.
7. **Shrinkwrap the supported region** to the body, blended out below the free-hang line.
8. **Tabard depth 2 cm → 8–12 cm**, lower third swinging outward.
9. **Sleeves to the wrist + forearm bracers.** This also resolves the locked §2.3 coverage finding from R006 in the same change.
10. **Fringe trim** on hanging panels — a defining signature in the reference, and cheap: alternating-length quads along the hem, merged, one draw call.

## Do not change

Solidify at 8 mm is right — do not thicken it to compensate for shallow folds, that makes the silhouette worse. Keep the lofted approach; no cloth sim needed, and a procedural builder stays reproducible in a way a bake does not. Subsurf 1/2 is fine — once real folds exist it will smooth them properly instead of flattening a flat sheet further.

## Structural gaps against the approved reference

I cropped the African-inspired male from the lineup poster and worked from it directly. Beyond folds, the design is **layered and deliberately asymmetric** in ways the build does not yet describe: long sleeves to the wrist over a blue-grey undertunic; leather bracers both forearms; a heavy ochre scarf that is the *dominant* silhouette element; fringe and tassels on every hanging panel; heavy left drape against a satchel on the right; five to six visible layers; tall laced boots rather than open-toe wraps.

Your mantle uses symmetric control points. The reference is asymmetric by design.

## Verification I will run

Profile silhouette is where the current build fails hardest, so that is the test. I will measure fold amplitude directly off the render silhouette and report **achieved millimetres against the 20–35 mm target** — a number, not an opinion on whether it looks like cloth. Also checking the mantle sits on the shoulders with no air gap, the tabard swings out in its lower third, and sleeves reach the wrist.

Send the next front and profile proof — profile matters more than three-quarter for this.
