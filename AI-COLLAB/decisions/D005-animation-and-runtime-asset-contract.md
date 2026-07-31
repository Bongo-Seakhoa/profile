# D005 — Compact animation library and runtime character budgets

**Date:** 2026-07-30
**Owner:** Bongo Seakhoa
**Implementer:** Codex
**Independent verifier:** Claude Code
**Status:** Adopted
**Authority:** `Animation Addendum.md` plus the owner’s direct lower-third and shared-locomotion clarification

## Precedence and reconciliation

The Animation Addendum supersedes earlier interaction-animation and character-budget guidance. D004 remains the camera authority. Where their camera tuning ranges differ, implementation uses the safe intersection:

- steady desktop/laptop navigation targets approximately 18–20% of visual-viewport height;
- ultrawide navigation targets approximately 16–20%;
- compact/tablet navigation targets approximately 20–24%;
- pullback may reduce these values to preserve containment;
- deliberate non-selection zoom may approach but never exceed 24%;
- character selection may use the addendum’s 35–55% full-body range.

This is stricter than the addendum’s older outer navigation ceiling and therefore cannot exceed it.

## Lower-third home stage

The lower third of the visual viewport, from the safe left edge to the safe right edge, is the explorer’s normal home stage.

- Every idle, ordinary step, walk, gesture, prop interaction, look-back pose, arrival and recovery is framed inside that stage.
- Runtime root movement may travel horizontally across the stage.
- HTML safe zones, browser safe-area insets and full-character breathing room remain inside the stage.
- A content conflict causes step-aside, layout gutter reservation or camera pullback; it never crops or hides the explorer.
- Edge lean uses the full clip envelope and stops 24–40 CSS pixels inside the safe viewport edge.
- Dedicated character selection is exempt from the lower-third placement but never from full-body containment.

Authored power traversal is the deliberate exception. Solar Propulsion and other powers may carry or hover the complete figure through the middle or upper viewport for the duration of their authored phase. The power supplies a vertical composition intent (`lower-third`, `middle` or `upper`); the D004 solver still owns camera radius and containment. Arrival or recovery returns the explorer to the lower-third home stage. Ordinary navigation, content gestures and decorative idles cannot request a middle or upper pocket.

## Shared locomotion

Ordinary locomotion uses exactly three shared walk families:

- `walk-male-shared`;
- `walk-female-shared`;
- `walk-nonbinary-shared`.

Each canonical character record explicitly selects one locomotion presentation. Runtime must never infer it from name, mesh proportions or appearance. Every character with the same declared presentation uses the same base walk family, retargeted to the shared humanoid rig. Character scale and authored proportions remain unchanged; root displacement is runtime-controlled.

No per-character walk clip is required unless the owner later approves a genuinely identity-defining movement exception. Such an exception cannot change camera containment, navigation speed or accessibility behaviour.

## Compact animation library

The required reusable families are:

1. base idle;
2. weight-shift idle;
3. garment adjustment;
4. present/open hand;
5. point;
6. hourglass draw;
7. hourglass inspect loop;
8. hourglass stow;
9. short local step;
10. edge-lean enter;
11. edge-lean hold;
12. edge-lean exit;
13. short sand-recall recovery.

Gestures use additive upper-body control and procedural left/centre/right targeting. Feet remain planted except for one corrective step. Ordinary clips are in place; the runtime owns root movement. Normal blends begin at 150–250 ms. The library excludes eye movement, eye tracking, blinking, lip sync, dialogue facial animation and unnecessary facial blend shapes.

## Interaction and interruption

The UI acts immediately. Animation may acknowledge an action but never delays click, route change, focus, content opening or form submission.

Priority is:

1. traversal;
2. look back;
3. interaction gesture;
4. idle recovery;
5. long idle;
6. base idle.

The explicit state set is:

`NAV_IDLE`, `INTERACTION_GESTURE`, `LOOK_BACK_ENTER`, `LOOK_BACK_HOLD`, `LOOK_BACK_EXIT`, `HOURGLASS_DRAW`, `HOURGLASS_INSPECT`, `HOURGLASS_STOW`, `EDGE_MOVE`, `EDGE_LEAN_ENTER`, `EDGE_LEAN_HOLD`, `EDGE_LEAN_EXIT`, `IDLE_RECOVERY`, `TRAVERSAL_ANTICIPATION`, `TRAVERSAL_ACTIVE`, `TRAVERSAL_ARRIVAL`.

Obsolete gestures are discarded, not queued. Traversal cancels decorative idles. A route request during look back resolves the camera before traversal. Interaction cancels idle. Prop transfers and edge movement cannot stack.

## Long idle

- Base idle loops calmly for roughly 8–12 seconds.
- Weight shift lasts roughly 1.5–2.5 seconds and occurs no more frequently than every 15–30 seconds.
- Garment adjustment lasts roughly 1.5–2.5 seconds and does not play during rapid navigation.
- Hourglass consideration begins after 45–60 seconds of genuine inactivity.
- Edge lean is considered after 100–120 seconds, only at viewport widths of at least roughly 1100 CSS pixels and only when the layout reports a safe edge.
- Edge lean is disabled on mobile and in reduced-motion mode.
- Tab-hidden time does not advance idle timers.
- Any meaningful input immediately restores UI control and starts the shortest safe visual recovery.

Hourglass attachment, visibility and transfer use named sidecar event markers and belt/hand sockets. The runtime cannot show two hourglasses.

## Look back

Hold-to-look-back follows D004 and the addendum:

- R key, visible compass control and accessible touch equivalent;
- 160–180° orbit over roughly 300–450 ms;
- approximately stable radius and full-body height;
- previous world represented by a cached reduced-cost plate/layer set;
- 220–350 ms controlled return;
- no route change;
- disabled during traversal, authorised invisibility, critical modal focus, text-entry use of R or an unsafe previous-location state;
- reduced motion uses still crossfades instead of orbit.

## Runtime asset ceilings

The complete-character triangle ceilings are:

| Tier  | Use                                 |                                         Visible triangles |
| ----- | ----------------------------------- | --------------------------------------------------------: |
| LOD 0 | Character selection/inspection only |                                             55,000–75,000 |
| LOD 1 | High-quality navigation             | 28,000–42,000; 45,000 absolute only with measured benefit |
| LOD 2 | Standard navigation                 |                                             14,000–24,000 |
| LOD 3 | Mobile/low power                    |                                              7,000–12,000 |
| LOD 4 | Very distant/emergency              |                          3,000–6,000 or approved impostor |

Projected-height starting thresholds are: above 360 px LOD 0 where permitted; 180–360 px LOD 1; 100–180 px LOD 2; 60–100 px LOD 3; below 60 px LOD 4/impostor. Selection uses the lowest visually indistinguishable tier. LOD switching uses 10–15% hysteresis and unions outgoing/incoming bounds for camera containment.

Navigation textures use KTX2: 2K high, 1K–2K standard, approximately 1K mobile, and 4K only for the larger selection tier. Draw-call ceilings are 12/10/7/5 for LOD 0/1/2/3. Rigging uses at most four skin influences per vertex, limited secondary bones and no full real-time cloth simulation.

Only the selected explorer remains resident at its active tier. The complete roster may not remain loaded.

## Acceptance

- Animation manifests validate required families, durations, in-place policy, named events and sockets.
- Every canonical character declares exactly one shared locomotion presentation.
- UI actions are immediate in every animation state.
- Priority, interruption, cooldown, visibility and prop-transfer invariants pass deterministic tests.
- Every ordinary animation and transition stays inside the D004 lower-third home envelope; authored power phases may use middle/upper safe pockets and must return home.
- All LODs remain recognisable, preserve identity silhouettes and meet triangle/draw-call/material/rig budgets.
- No visible LOD pop, deformation collapse, duplicated prop, unused high-resolution resident character or animation-state leak is observed.
- Claude independently reviews visual quality, interruption, home-stage return, power excursions, performance and canonical consistency.
