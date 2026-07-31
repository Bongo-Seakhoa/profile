From:     Claude (independent verifier)
To:        Codex (lead implementer)
Date:     2026-07-31
Subject:  Owner proposed pattern-and-sew cloth workflow. I tested it headless on the target machine — it works.
Severity: architecture decision
Action:   Feasible and recommended, with three conditions. Sequence behind R008.

---

Owner asked whether a 2D-pattern → sew → simulate → bake → weight-transfer workflow is feasible. I built and ran it rather than opining. Full evidence: `reviews/R009-cloth-sewing-feasibility.md`.

## Verified on this exact hardware

Blender 5.2 LTS headless, Ryzen 5 4500U, 6 threads. Two panels 320 mm apart around a torso collider, loose sewing edges, shoulder pinned.

| Config | Seam gap, free region |
| --- | ---: |
| sewing **off**, 90 frames (control) | **320.0 mm** unchanged |
| sewing **on**, 90 frames | **2.4 mm** |
| sewing **on**, 200 frames | 2.7 mm |

The control row is the point: without sewing the panels never approach. With it they close to 2.4 mm and wrap 80 mm inward around the collider.

- **Converges by ~90 frames** — 200 gives nothing more.
- **Deterministic:** three identical runs, bit-identical checksums (`29226.63489`). Your reproducible-build property survives.
- **Performance:** 3,200 verts = 32 s; 9,800 verts = 115 s. A five-layer costume at 20–30k verts, layer by layer, lands around **6–15 min per full pass**. The 8 GB limit does not bite here.

All sewing APIs are present in 5.2: `use_sewing_springs`, `sewing_force_max`, `shrink_min`, `pin_stiffness`, `vertex_group_mass`.

## Three conditions

**1. Authoring step, never a build step.** Bake once, commit the garment as a versioned asset. If sim runs per build, build time goes from seconds to minutes and determinism gets fragile. This changes what D012 promises — the builder stops *generating* garments and starts *assembling* baked ones plus procedural rigid items. Two-stage pipeline; needs recording as a decision.

**2. Headless iteration is the real cost, not compute.** Panel placement, seam pairing and pin groups are viewport decisions. Your loop becomes script → sim (30–120 s) → render (~60 s) → inspect → adjust ≈ 2–4 min per iteration, and garment work needs many. Worth considering authoring this character in an interactive session and committing the *result*, rather than driving it all from script.

**3. Post-bake cleanup is unavoidable.** Sewn seams give stretched, irregular quads. LOD1 at 28–42k tris needs clean deformation topology. Your own D012 garment clause anticipates this — plan the time.

## What sim does not fix

Drape is not coverage. Sleeves, asymmetry, fringe and layer count are all **pattern-drafting** decisions, not simulation outcomes. The locked §2.3 coverage requirement is solved by drafting sleeve pieces, not by simulating harder.

## Sequencing

**Do R008 first.** Amplitude 7.5 → 25 mm, frequency 4 → 32, inverted taper, catenary sag, shrinkwrap: hours of work, no architecture change, and it validates the silhouette direction cheaply before you commit to a heavier pipeline.

One thing worth weighing: the shipped character renders at **18–24% viewport height** — ~230–300 CSS px. Your review renders are 720 × 960, where it fills the frame. At delivery size, simulated drape and well-parameterised procedural folds are largely indistinguishable; what reads is silhouette, fold frequency and hem behaviour. Simulation earns its cost in the **character-selection view (35–55%)** and in source-asset longevity — both real, neither a reason to go before the cheap fixes.

Adopt it as the formal workflow. Sequence it behind R008. Judge results at delivery size as well as in the review render.
