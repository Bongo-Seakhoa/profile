# A005 - Professional Static View browser QA

**Date:** 2026-08-08  
**Implementer:** Codex  
**Scope:** Professional Static View progressive enhancement and responsive composition  
**Result:** Passed locally

## Render matrix

| Viewport | Result | Evidence |
| --- | --- | --- |
| 1440 by 1000 | Passed | Editorial desktop shell, complete hero, systems console and command trigger rendered without overflow. |
| 1366 by 900 | Passed | Full desktop navigation remained contained; the view indicator correctly yielded space. |
| 1280 by 900 | Passed | Intermediate shell switched to the compact menu while keeping direct document and Anzania actions. |
| 390 by 844 | Passed | Full mobile hero, calls to action and compact navigation rendered without horizontal clipping. |

All four checks reported `scrollWidth === clientWidth` and no captured runtime errors.

## Interaction checks

- `Ctrl/Cmd+K` opens the command navigator.
- The search input receives focus when the dialog opens.
- Filtering `research` leaves only the Research route visible.
- An unmatched query exposes the live empty state.
- Closing the dialog clears the query, restores all routes and returns focus to the trigger.
- Scrolling updates reading progress and the active-section beacon.
- The filtered result grid collapses to one column rather than leaving an empty visual cell.

## Accessibility and resilience

- With JavaScript disabled, the complete semantic homepage remains visible and readable.
- The command trigger stays hidden when its runtime is unavailable.
- At 390 pixels wide, the no-JavaScript page has no horizontal overflow.
- Under `prefers-reduced-motion: reduce`, all pending reveals are resolved and no content remains opacity-hidden.
- No runtime error was captured during full-motion or reduced-motion checks.

## Boundary

This is implementer browser QA, not an independent second review. The canonical Node 24.14 and pnpm 11.9 suite remains the hosted publication gate.
