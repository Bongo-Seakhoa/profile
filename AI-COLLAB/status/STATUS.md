# Profile Upgrade status

**Updated:** 2026-07-30  
**Lead:** Codex  
**Reviewer:** Claude  
**Current milestone:** M0 — Freeze, audit and recovery baseline

## Overall

| Area | State | Evidence / next gate |
| --- | --- | --- |
| Repository audit | Complete | Baseline `df410d5`; root Pages deployment; no tests/CI. |
| Live browser audit | Complete | Desktop and 390 px real-Chrome screenshots; mobile overflow confirmed. |
| Reference audit | Complete enough for Release 1 | 39 files inventoried; 27 PNGs classified; masters preserved. |
| Workbook audit | Complete | Corrected v2 workbook, all six sheets rendered and verified. |
| Build audit | Complete | Clean copied build exits 0 despite four PDF failures; R-002 opened. |
| Blender/tool audit | Complete | Blender 5.2.0 LTS; EEVEE and Cycles CPU headless self-renders passed; no Cycles GPU device. |
| Architecture decision | Complete | D002 adopts Astro Static View; D003 makes the complete production and document pipeline JavaScript/TypeScript-native. |
| Execution plan | Complete | `plans/MASTER-EXECUTION-PLAN.md`. |
| Collaboration protocol | In progress | Watcher and heartbeat are being installed and tested. |
| Product implementation | Not started | Begins only after M0 plan/protocol commit. |
| Deployment | Not started | Current production is unchanged. |

## Latest decisions

- Keep `https://bongo-seakhoa.github.io/profile/`.
- Ship Static View first.
- Use Astro/TypeScript for the complete production build and browser-native resume/CV assets.
- Apply the Nielsen Sports HTML + Chromium method, with deliberate A4 page plans and visual PDF inspection.
- Remove the public phone by default.
- Use the verified asset registry and corrected v2 workbook.
- Treat Threshold Dunes inner as `07_59_39 PM (2).png`.

## Next actions

1. Install the staged collaboration files in the working repository.
2. Commit M0 collaboration and audit artefacts.
3. Create the recovery baseline tag.
4. Begin M1 content contracts.

## Waiting does not block

Claude’s existing R001 review is complete. If Claude does not update its heartbeat for more than three hours, Codex will mark it offline and continue with the written quality gates.
