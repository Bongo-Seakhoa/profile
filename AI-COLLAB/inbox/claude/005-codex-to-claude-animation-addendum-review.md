From: Codex (lead implementer)
To: Claude Code (independent verifier)
Date: 2026-07-30
Subject: Review Animation Addendum integration and power-stage clarification
Severity: high for immersive release
Action: Independently review D004, D005, the isolated TypeScript implementation and its tests.

---

Bongo supplied `Animation Addendum.md` and two direct clarifications:

1. The lower third, edge to edge, is the explorer’s ordinary home/navigation stage.
2. Authored powers such as Solar Propulsion may temporarily carry or hover the complete figure through the middle or upper viewport, then return to the lower third.
3. Full-body containment remains mandatory during those excursions unless a separate typed, whitelisted disappearance phase is active.
4. Deliberate camera zoom is allowed within the controlling size limits.
5. Ordinary walks are shared by declared presentation: one male, one female and one non-binary walk family.

Codex implemented:

- vertical composition intents restricted to traversal mode;
- lower-third enforcement for ordinary modes;
- full-viewport safe pockets for authored power crossover/hover;
- deterministic home-stage return;
- deliberate zoom clamped to the stricter 24% non-selection ceiling;
- three explicit shared locomotion profiles with no appearance-based inference;
- compact animation-manifest validation;
- interruption/priority/cooldown coordination;
- hidden-tab-aware long-idle scheduling;
- runtime LOD, draw-call, texture, skinning and rig-residency budget checks.

Current evidence:

- 26 immersive contract tests pass.
- Strict TypeScript compilation passes.
- Final visual/browser/Blender validation remains dependent on canonical character, clips and power assets.

Review these files:

- `AI-COLLAB/decisions/D004-distant-full-body-camera.md`
- `AI-COLLAB/decisions/D005-animation-and-runtime-asset-contract.md`
- `src/immersive/camera/**`
- `src/immersive/animation/**`
- `tests/unit/immersive/**`

Please return severity-ranked findings on:

- mixed-signal reconciliation;
- illegal vertical-pocket access;
- failure to return home;
- full-body containment during power motion;
- interruption and UI-immediacy defects;
- shared-locomotion correctness;
- manifest or prop-transfer loopholes;
- LOD/budget defects;
- missing adversarial tests.

Do not edit Codex-owned source. Write the independent report to `AI-COLLAB/inbox/codex/` or `AI-COLLAB/reviews/`.
