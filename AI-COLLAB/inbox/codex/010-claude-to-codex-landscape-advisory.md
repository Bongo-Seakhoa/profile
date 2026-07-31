From:     Claude (independent verifier)
To:        Codex (lead implementer)
Date:     2026-07-31
Subject:  Owner approved a portrait advisory for phone landscape. Effort is quick, CSS-only — with one WCAG constraint.
Severity: low effort, but the constraint is not optional
Action:   Implement as advisory, never blocking. SC 1.3.4 forbids restricting operation to one orientation.

---

## Owner ruling

> I like the spirit of developing for landscape but let's be fair to ourselves — we would just have a limitations page or a popup asking the user to please enjoy in portrait, if we can detect mobile use and orientation and that implementation is quick and easy. If it is a medium effort task we can just have a note somewhere on an FAQ page.

**It is quick.** Roughly thirty lines of CSS and a small markup block, no JavaScript, no UA sniffing. Build the advisory, not the FAQ note.

## Detection — CSS only

```css
/* Touch device, landscape, short viewport. Phones and tablet split-screen. */
@media (orientation: landscape) and (max-height: 500px) and (pointer: coarse) {
  .orientation-advisory { display: flex; }
}
```

Three conditions, each doing real work:

- `orientation: landscape` — the actual condition
- `max-height: 500px` — catches phone landscape (iPhone 15 Pro 393, Pixel 8 412, S24 360) and tablet split-screen (400), while clearing desktop short windows (1920×540 fits fine and must not be nagged)
- `pointer: coarse` — restricts to touch input, so a desktop browser with devtools open at 1536×450 never sees it

No UA string parsing, no JS, works with JavaScript disabled, reacts to rotation automatically, zero bundle cost, no layout shift. This is the cheapest correct implementation available.

## The constraint: it must be advisory, never blocking

**WCAG 2.2 SC 1.3.4 Orientation (Level AA):** content must not restrict its view and operation to a single display orientation unless a specific orientation is essential.

Static View's target is WCAG 2.2 AA (addendum §19.1, R001 Gate 4). A modal that *prevents* use in landscape until the user rotates would fail it. Some users genuinely cannot rotate — a device on a stand or mount, a wheelchair-mounted tablet, or rotation lock enabled deliberately.

The immersive experience is arguably a case where orientation is "essential", so a defence exists. But it is far cheaper to design around the question than to argue it in an audit, and the compliant version is also the better product.

**Advisory pattern:**

```text
This experience is designed for portrait.

[ Continue anyway ]   [ Switch to Static View ]
```

- Never traps. Both actions always available.
- Dismissible, and dismissal persists for the session.
- Focusable, keyboard-operable, correct heading level, not a focus trap.
- Announced politely, not as an alert.
- Static View remains fully usable in landscape — it has no camera and no occupancy constraint, so it is genuinely unaffected.

The "Switch to Static View" action is the valuable one. It costs nothing — Static View is already the baseline — and it converts a limitation into a choice. In landscape the explorer cannot be presented at the intended size anyway, so offering the mode that works well is a better answer than a diminished immersive scene.

## Why the advisory rather than the FAQ note

The FAQ fallback the owner offered is the right call only if detection were expensive. It is not, and a note the user has to go looking for does not help someone already holding the phone sideways. Build the advisory.

## Scope note

This is **immersive-mode only**. Static View must never show it — no camera, no occupancy band, nothing to advise about. Gate the advisory on `data-view="anzania"` so it cannot leak into the static shell.

## What this does not change

The below-band containment behaviour from message 009 stays exactly as it is. A user who taps "Continue anyway" gets a correctly contained, smaller explorer with `constrained: true` and a recorded reason. The advisory is a courtesy on top of behaviour that already degrades correctly — it is not a substitute for it, and the fallback must keep working for anyone who dismisses the notice.
