# R009 — Pattern-and-sew garment workflow: feasibility, tested

**Author:** Claude (independent verifier)
**Date:** 2026-07-31
**Question from owner:** is the proposed 2D-pattern → sew → simulate → bake → weight-transfer workflow feasible?
**Method:** not an opinion. Built a headless sewing simulation in the project's actual Blender 5.2 install, on the actual target hardware, and measured it.

---

## 0. Verdict

**Feasible, and the proposal is technically correct.** Verified empirically, not assumed.

Adopt it — with three conditions in §3 and a sequencing recommendation in §5.

---

## 1. Evidence

Test rig: two 0.42 × 0.72 m panels placed 320 mm apart around an elliptical torso collider at human scale, joined by loose sewing edges down both side seams, shoulder line pinned, Blender 5.2 LTS headless on the project machine (Ryzen 5 4500U, 6 threads, ~8 GB RAM, no GPU).

**API availability** — all present in Blender 5.2 LTS:
`use_sewing_springs`, `sewing_force_max`, `shrink_min`, `pin_stiffness`, `vertex_group_mass`, `quality`, collision settings.

**Does sewing actually close seams?**

| Config | Seam gap, free-hanging region | Wrap depth |
| --- | ---: | ---: |
| Control, sewing **off**, 90 frames | **320.0 mm** (unchanged) | 320 mm |
| Sewing **on**, stiffness 5, 90 frames | **2.4 mm** | 240 mm |
| Sewing **on**, stiffness 5, 200 frames | 2.7 mm | 240 mm |

The control is the important row: without sewing the panels never approach each other. With it they close to **2.4 mm** — effectively sewn shut — and the garment wraps inward around the collider by 80 mm.

**Convergence:** 200 frames gives no improvement over 90. **~90 frames is enough.**

**Determinism** — three identical runs:

```
run 1: 31.9 s   checksum 29226.63489
run 2: 31.1 s   checksum 29226.63489
run 3: 35.1 s   checksum 29226.63489
```

Bit-identical. Cloth sim on this machine is reproducible, so it does not destroy the deterministic-build property.

**Performance:**

| Panel resolution | Vertices | 90-frame bake | Seam closure |
| --- | ---: | ---: | ---: |
| 40 × 40 | 3,200 | 32 s | 2.4 mm |
| 70 × 70 | 9,800 | 115 s | 2.2 mm |

Roughly 12 ms per vertex per bake. A full five-layer costume at 20–30k vertices, simulated layer by layer, lands around **6–15 minutes per complete pass**. Entirely workable as an authoring step. The 8 GB constraint does not bite here — cloth sim of tens of thousands of vertices is modest memory. That constraint bites on sculpting and texture baking, not this.

---

## 2. The proposal is technically right

Confirming the owner's own framing, which is accurate:

- **Hybrid split is correct.** Soft goods (tunic, robe, scarf, mantle) simulate; rigid goods (belts, buckles, jewellery, pouches, footwear fittings) stay conventionally modelled. Simulating a buckle is wasted effort and worse geometry.
- **Layer-by-layer ordering is correct**, and it is how Marvelous Designer and every production garment pipeline works. Each layer takes the body plus previously-baked layers as collision.
- **The stated failure mode is exactly right:** *"bad only if the flat panels are simply positioned around the character and parented in place without sewing, draping, thickness, cleanup and weight testing."* That is precisely the current defect from R008 — the existing panels are placed by hardcoded world-space control points and never conform to anything.
- **Baking rather than running cloth in the browser is correct** and matches Addendum §13's prohibition on real-time cloth simulation for the website character.

---

## 3. Three conditions

**3.1 — It must be an authoring step, never a build step.**

Bake once, commit the result as a versioned garment asset. If cloth simulation runs on every build, build time goes from seconds to many minutes and a deterministic pipeline becomes a fragile one.

This changes the architecture D012 describes. Right now the builder *generates* the character from code. Under this workflow it becomes a two-stage pipeline:

```
Stage 1  authoring, run rarely, human-supervised
         pattern -> sew -> simulate -> bake -> cleanup -> commit garment asset

Stage 2  build, run often, headless, deterministic
         load baked garments + procedural rigid items -> fit -> weights -> LOD -> export
```

That is a legitimate and normal architecture. It just needs recording, because D012 currently promises something different.

**3.2 — Headless iteration is the real cost, not compute.**

Panel placement, seam pairing and pin-group selection are artistic decisions normally made with a viewport. Codex works headless. The loop becomes script → sim (30–120 s) → render (~60 s) → inspect → adjust: roughly **2–4 minutes per iteration**, and garment work typically needs many. Compute is cheap here; the blind iteration loop is what will hurt.

Worth considering whether this one character is authored with an interactive Blender session and the *result* committed as the asset, rather than driving the whole thing from script.

**3.3 — Post-bake topology cleanup is unavoidable.**

Sewn seams produce stretched and irregular quads. LOD1 needs clean deformation topology at 28–42k triangles, so retopology or cleanup after bake is required. D012's own garment clause already anticipates this — it should be planned time, not a surprise.

---

## 4. What this does not fix by itself

Cloth simulation produces drape. It does **not** produce:

- **Coverage.** Sleeves have to be authored as pattern pieces. The locked §2.3 requirement is a pattern-drafting decision, not a simulation outcome.
- **Asymmetry.** The approved reference is deliberately asymmetric — heavy left drape, satchel right. That is pattern design.
- **Fringe and tassel trim**, a defining signature in the reference. Conventional modelling.
- **Layer count.** Five to six visible layers means five to six pattern sets.

Simulation makes the cloth *behave*; the pattern determines what the costume *is*.

---

## 5. Sequencing recommendation

**Do R008 first, then adopt sewing for the production pass.**

The R008 fixes — fold amplitude 7.5 mm → 25 mm, frequency 4 → 32, inverted taper, catenary sag, shrinkwrap — are hours of work with no architecture change, and would substantially improve the current result. They also validate the *silhouette direction* cheaply before committing to a heavier pipeline.

**One piece of context worth weighing.** In the shipped experience the character renders at **18–24% of viewport height** — roughly 230–300 CSS pixels, about 600 device pixels on a retina display. The review renders being judged are 720 × 960, where the character fills the frame. At delivery size the difference between simulated drape and well-parameterised procedural folds is largely imperceptible; what reads is silhouette, fold *frequency* and hem behaviour.

Where simulation genuinely earns its cost is the **character-selection view at 35–55% of viewport**, and in the longevity of the source asset. Both are real reasons to do it. Neither is a reason to do it before the cheap fixes.

So: adopt it as the formal workflow, sequence it behind R008, and judge the result at delivery size as well as in the review render.
