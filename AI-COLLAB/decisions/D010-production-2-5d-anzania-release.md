# D010 - Production Anzania experience uses a high-quality 2.5D medium

**Date:** 2026-08-08
**Owner:** Bongo Seakhoa
**Implementer:** Codex
**Independent reviewer:** Claude or a second reviewer when available
**Status:** Adopted and implemented

> Scope update, 2026-08-10: the medium, camera and quality decision remains authoritative. Its 15-companion asset contract is superseded by the six-guide production roster, with four authored action poses per guide.

## Owner direction

The owner explicitly authorised a high-quality 2.5D or 2D implementation when
full 3D would prevent completion, provided the finished portfolio remains
exceptional, polished and complete.

## Decision

Release the immersive portfolio journey as a cinematic 2.5D experience built
from the approved Anzania world plates and complete full-body companion
silhouettes.

This decision supersedes D007 only where D007 made full Blender and runtime 3D
production mandatory. It does not weaken the quality, camera, interaction,
accessibility, fallback, performance or testing requirements.

## Production contract

- Anzania remains an original fictional portfolio world. It is not Tanzania or
  any other real location.
- The route contains eight outer and inner location scenes, fifteen selectable
  companions and four authored traversal treatments.
- The avatar remains a distant full-body companion rather than the dominant
  subject.
- The complete silhouette, including accessories, remains inside the viewport.
- The camera never becomes over-the-shoulder.
- Look-back, presenting, idle, travel and portal transitions preserve the same
  full-body containment contract.
- Static View remains complete with or without JavaScript. Its single progressive-enhancement runtime is isolated from the immersive runtime and may never own or conceal professional content.
- Resume and CV generation remains browser-native JavaScript and Chromium.
- No low-quality pseudo-3D, unoptimised 3D runtime or unfinished Blender asset
  is shipped merely to claim a 3D implementation.

## Acceptance

The 2.5D medium satisfies the immersive end goal when the route passes the
release manifest, responsive geometry, interaction, accessibility, output and
bundle-budget gates documented in `docs/PROFILE-UPGRADE-2-5D-RELEASE.md`.
