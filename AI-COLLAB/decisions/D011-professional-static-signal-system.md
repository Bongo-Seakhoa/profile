# D011 - Professional Static View uses a systems-cartography signal interface

**Date:** 2026-08-08  
**Owner:** Bongo Seakhoa  
**Implementer:** Codex  
**Status:** Adopted and implemented

## Owner direction

The owner requires the professional Static View to match the quality of the immersive showpiece. Professional does not mean visually inert. The Static View may use high-level transitions, rune and technology overlays, dynamic reading aids and Anzania art, but location images must not become its centrepieces.

## Decision

Use a restrained professional systems-cartography interface built around evidence, hierarchy and navigation. Keep cream, ink and metallic accent colours; pair editorial typography with technical mono labels; place approved Anzania scenes behind the interface as low-opacity route atmosphere; and add one lightweight progressive-enhancement runtime for reading and navigation behaviour.

## Production contract

- Professional evidence, work and contact actions remain the semantic and visual centre.
- Anzania artwork is decorative atmosphere, not the primary page object.
- Every route remains complete and usable when JavaScript is disabled.
- One framework-free module under `public/assets/static/` may add the command navigator, reading progress, active-section state, progressive reveals, card spotlights and restrained route transitions.
- The module may not fetch content, conceal content permanently, request immersive assets or create canvas output.
- Explore Anzania remains separately isolated under `public/assets/immersive/`.
- Reduced-motion users receive content immediately and no forced parallax.
- Forced-colours, keyboard, focus-return and print contracts remain explicit.
- The professional CSS compressed budget is 90 KB and the Static View JavaScript compressed budget is 16 KB.
- Resume and CV generation remains JavaScript and Chromium based.

## Acceptance

The design is accepted when the homepage and core routes communicate Bongo Seakhoa's professional value before decorative world-building, the Static View passes no-JavaScript and accessibility checks, the command interface is keyboard complete, runtime boundaries remain isolated, and visual quality remains coherent with Explore Anzania without copying its game-like interaction model.
