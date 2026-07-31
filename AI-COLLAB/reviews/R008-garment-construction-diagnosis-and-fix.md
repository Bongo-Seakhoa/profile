# R008 — Why the garments read as paper, and how to fix it

**Author:** Claude (independent verifier)
**Date:** 2026-07-31
**Requested by:** Owner — *"design structure, shapes etc are correct… Codex seems to be struggling with character creation… specifically clothing"*
**Subject:** `tools/blender/build_dn_m_afr_01_mpfb_production.py`, garment construction
**Nature:** Technical assistance, not a defect report. The architecture is sound; the numbers are wrong.

---

## 0. The finding in one line

**The primary garments have fold geometry switched off, and every other garment's folds are three to five times too shallow to be visible on a 1.84 m figure.**

This is not an architectural problem. Lofted control-curve surfaces, solidify for thickness, subsurf for smoothing and nearest-vertex weight transfer are all reasonable choices. The drape parameters are simply an order of magnitude out.

---

## 1. Root cause, with line numbers

### 1.1 Tunic and trousers have no folds at all

```python
# line 1054
def create_body_derived_garment(..., fold_amplitude: float = 0.0, ...)

# line 1068
fold = math.sin(u * math.tau * 3.0 + v * math.pi) * fold_amplitude
```

`fold_amplitude` defaults to **0.0**, and **no caller anywhere in the file passes a value**. So the tunic and trousers — the two garments covering most of the body — are pure body-offset shells with mathematically zero fold displacement.

That is precisely why they read as skin-tight body paint rather than cloth in the review render.

### 1.2 Every other fold amplitude is sub-centimetre

| Garment | Line | Amplitude | On a 1.84 m figure |
| --- | --- | --- | --- |
| Mantle | 1446 | `0.0075` m | **7.5 mm** |
| Tabard | 1517 | `0.008` m | **8 mm** |
| Tabard hem sag | 1519 | `0.008` m | **8 mm** |
| Tunic skirt | 1161 | `0.025` radial multiplier | ~2.5% of radius |

For scale: solidify thickness is 8 mm. **The fold displacement is the same magnitude as the fabric's own thickness.** A fold that is as deep as the cloth is thick is not a fold.

### 1.3 The taper is inverted

```python
# line 1418, mantle
anchor_taper = math.sin(math.pi * u) * math.sin(math.pi * v)
```

`sin(πv)` drives fold amplitude to **zero at v=0 and v=1** — the top edge *and the bottom hem*.

Real drapery behaves the opposite way. Cloth is constrained where it is supported and free where it hangs, so fold amplitude is **minimum at the shoulder and maximum at the free hem**. The current taper suppresses folds exactly where they should be most visible, which is why the hem reads as a straight cut edge.

The tabard's `fold_taper = math.sin(math.pi * u)` (line 1515) has the same issue horizontally, though it is defensible there since both vertical edges are free.

### 1.4 The tabard is geometrically a flat rectangle

```python
# lines 1508-1518
z = 1.02 + (0.58 - 1.02) * v          # linear
half_width = 0.070 + (0.082 - 0.070) * v   # near-constant, 14→16 cm wide
base_y = -0.212 + 0.020 * v            # 2 cm of depth variation, total
x = (u * 2.0 - 1.0) * half_width       # linear
```

Across its entire 44 cm length the panel moves **2 cm** in depth. With an 8 mm ripple on top. That is a plank, and it renders as one — which matches exactly what I saw in the profile view in R006.

### 1.5 Nothing conforms to the body

Zero uses of `SHRINKWRAP` and zero uses of `DATA_TRANSFER` in the entire builder. Garment surfaces are positioned by hardcoded control points in world space rather than derived from the actual body surface, so they float at a fixed offset instead of sitting on shoulders and breaking over the chest.

---

## 2. Calibration against the approved reference

Measured from the approved lineup poster, African-inspired male. The figure spans roughly 1570 px for 1.84 m, giving **≈853 px/m**.

| Feature in the reference | Measured | Metric |
| --- | --- | --- |
| Major scarf fold ridge depth | 15–25 px | **18–29 mm** |
| Fold ridge spacing | 25–40 px | **30–47 mm** |
| Overrobe drape fold depth | 20–30 px | **23–35 mm** |

So target major-fold amplitude is roughly **20–35 mm**, against a current 7.5–8 mm. That is **3 to 5 times deeper**, not the tenfold I first estimated — the taper inversion matters as much as the raw amplitude.

Fold spacing of 30–47 mm around a mantle circumference of roughly 1.4 m implies **30 to 45 fold cycles**, against the current `u * tau * 4.0` — **four**. That is the larger error of the two.

---

## 3. Structural gaps against the approved design

Beyond folds, the reference shows a costume the current build does not yet describe:

| Reference | Current build |
| --- | --- |
| **Long sleeves to the wrist**, blue-grey undertunic | Arms bare shoulder to wrist |
| **Leather bracers on both forearms** | Absent |
| Heavy ochre scarf wrapped neck and shoulders, **dominant silhouette element** | Thin cowl layers |
| **Fringe and tassel trim** on every hanging panel | Absent — a major visual signature of the design |
| **Deliberately asymmetric** — heavy left drape, satchel right, blue tassels right hip | Symmetric control points |
| **Five to six visible layers** — scarf, overrobe, tabard panel, undertunic, belt stack, trousers | Fewer, and they read as one flat pass |
| Tall laced boots up the shin | Open-toe wraps |
| Wide stacked leather belt with pouches, buckles, hanging beads | Present but simpler |

The **sleeves** are the one that also resolves the locked §2.3 coverage requirement from R006. Adding long sleeves to the undertunic fixes the coverage issue and moves toward the reference in a single change.

---

## 4. Concrete fixes, in priority order

**1 — Turn folds on for the primary garments.** Pass a real `fold_amplitude` from `build_garments`. Nothing else in this list matters while the tunic and trousers are at zero.

**2 — Raise fold frequency from 4 to ~32.** This is the single largest visual error. `u * math.tau * 4.0` → `u * math.tau * 32.0`.

**3 — Invert the vertical taper** so amplitude grows toward the free hem:

```python
# was:  anchor_taper = math.sin(math.pi * u) * math.sin(math.pi * v)
hem_growth  = v * v                      # 0 at shoulder, 1 at hem
edge_relief = math.sin(math.pi * u)      # keep horizontal edge easing
anchor_taper = edge_relief * (0.15 + 0.85 * hem_growth)
```

**4 — Raise amplitude to 0.025 m** and break up the regularity with a second, non-harmonic sine so folds do not read as corrugation:

```python
fold = (
    math.sin(u * math.tau * 32.0 + v * math.pi * 1.7) * 0.62
    + math.sin(u * math.tau * 13.0 - v * math.pi * 0.9) * 0.38
) * 0.025 * anchor_taper
```

**5 — Add catenary sag between anchors.** Cloth suspended between two shoulder points hangs; it does not run straight:

```python
sag = -0.055 * math.sin(math.pi * u) * (0.25 + 0.75 * v)
point.z += sag
```

**6 — Increase row count** from 13 to 25 or more. Thirteen rows cannot resolve a fold falloff that is supposed to vary smoothly from shoulder to hem.

**7 — Shrinkwrap the supported region to the body** so the garment sits on the shoulders rather than floating near them. Project mode, negative direction, small offset — applied only above the free-hang line, then blended out.

**8 — Give the tabard real depth.** Its 2 cm of depth variation across 44 cm should become 8–12 cm, with the lower third swinging outward from the body rather than staying parallel to it.

**9 — Add sleeves and bracers.** Extend the undertunic to the wrist. This is both a fidelity fix and the §2.3 coverage resolution.

**10 — Add fringe trim.** In the reference it is a defining signature. Cheap to generate — a strip of alternating-length quads along the hem edge, one draw call, merged into the garment.

---

## 5. What not to change

- **Solidify at 8 mm is correct.** Do not increase it to compensate for shallow folds; that thickens the fabric rather than draping it, and the silhouette gets worse.
- **The lofted control-curve approach is fine.** No need for cloth simulation. Correct parameters on the existing method will get there, and a procedural builder stays reproducible in a way a baked sim does not.
- **Subsurf level 1 / render 2 is reasonable.** Once real folds exist, subdivision will smooth them properly instead of smoothing a flat sheet into a flatter one.
- **Nearest-vertex weight transfer is acceptable.** Blender's Data Transfer modifier would be more robust, but this is not what is making the garments look wrong.

---

## 6. Suggested verification

After the change, the check is a **profile silhouette test**, because profile is where the current build fails most obviously. Render the profile view and confirm:

- the mantle silhouette edge is visibly wavy, not a straight line
- fold depth is measurable at roughly 2–3 cm at the hem
- the tabard swings away from the body in its lower third
- sleeves reach the wrist
- the mantle sits **on** the shoulders, with no visible air gap

I can measure fold amplitude directly from the render silhouette and report the achieved millimetres against the 20–35 mm target, rather than a subjective opinion on whether it looks like cloth.
