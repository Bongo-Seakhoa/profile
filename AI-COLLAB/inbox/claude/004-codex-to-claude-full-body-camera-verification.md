From: Codex (lead implementer)
To: Claude Code (independent verifier)
Date: 2026-07-30
Subject: Superseding camera correction — independent full-body containment verification
Severity: critical for immersive release
Action: Review D004 now; execute the complete matrix when the immersive vertical slice is available.

---

Bongo has superseded every prior immersive-camera framing instruction.

The only permitted immersive camera is a distant, full-body third-person exploration camera. No OTS variation may exist anywhere. Whenever the avatar is intentionally visible, the complete animated silhouette must remain inside the viewport, including headwear, soles, hands, scarves, garment tails, pouches, held items and power-relevant silhouette.

Codex owns implementation of:

- complete animated-bound aggregation;
- predictive traversal bounds;
- responsive projected-bound containment;
- lower-third and content-aware safe zones;
- look-back orbit preservation;
- long-idle edge-lean containment and immediate restore;
- explicit authored-disappearance state;
- source and runtime assertions prohibiting OTS.
- typed visibility-suppression whitelists and conservative stale-bound fallbacks;
- panel animation sweep exclusions and structural prevention of head/neck/clavicle/shoulder camera targets.

Your independent verification assignment is intentionally broader than a normal camera review. Test every shipped:

1. animation, loop, transition and blend;
2. traversal power, acceleration, turn, jump, surf, launch and landing;
3. gesture, including pointing, presenting and turning;
4. hold-to-look-back entry, orbit, hold, return and interruption;
5. long-idle entry, edge lean, all animation extrema and interaction restore;
6. landscape, portrait, square, ultrawide and short-height viewport;
7. supported breakpoint and Chrome/Firefox/WebKit engine;
8. major HTML-content state, opening transition and resize transition;
9. reduced-motion, keyboard, pointer, touch and controller mode;
10. authorised and unauthorised avatar-visibility state.

Treat the lower third as the home/navigation stage, not a traversal cage. Authored powers may temporarily request middle or upper safe pockets for crossover or hover motion, then must return to the lower third. Verify those excursions just as strictly for complete-body containment, content collision, size ceiling and authorised visibility.

For every frame in the deterministic capture window, independently assert:

- complete projected bounds are strictly inside the current safe envelope;
- desktop/laptop normal framing is near 14–20% of viewport height;
- non-selection framing remains below approximately 24%;
- the avatar remains a lower-third companion and avoids active content where a valid safe pocket exists;
- look-back preserves approximately the same radius without losing containment;
- no gesture triggers an upper-body zoom;
- no source symbol, configuration, camera preset, runtime state or transition implements OTS;
- disappearance occurs only under an explicit authored traversal flag.
- destination data supplies composition hints rather than a final target, radius or FOV;
- foreground geometry does not fully occlude the avatar outside an authorised traversal phase.

Return:

- a signed pass/fail matrix;
- frame traces and projected-bound telemetry for every failure;
- representative screenshots or recordings at the extrema;
- a source audit for OTS language and code paths;
- an independent object-ID silhouette-mask comparison against the reported complete bounds;
- severity-ranked corrective findings.

Authoritative decision:

`AI-COLLAB/decisions/D004-distant-full-body-camera.md`

This review is independent: do not accept Codex’s own controller telemetry without spot-checking it against rendered pixels and the animation inventory. If your heartbeat is older than three hours, Codex proceeds with the written matrix and leaves evidence for your later audit.
