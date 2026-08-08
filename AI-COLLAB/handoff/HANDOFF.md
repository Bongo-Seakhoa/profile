# Profile Upgrade handoff

**Updated:** 2026-08-08
**Lead lane:** Codex
**Review lane:** Claude or another independent reviewer when available

## Current release branch

- Working branch: `agent/profile-upgrade-20260808-final`
- Story-mode implementation commit: `b5ebe6b`
- Professional Static View implementation commit: `bde74a4`
- Command-navigation refinement commit: `7b212ef`
- Responsive navigation refinement commit: `34db419`
- Short-viewport reveal refinement commit: `3e98cc5`
- Professional browser-verification record: `49311f6`
- Final responsive and accessibility closure: `4b14e37`
- Target branch: `main`
- Target site: `https://bongo-seakhoa.github.io/profile/`
- Recovery tag: `legacy-pages-baseline-20260730`

## Completed product scope

### Professional Static View

- Astro 6 and TypeScript evidence-led professional record.
- Premium cream, ink, gold, rust and teal systems-cartography design language.
- Route-aware Anzania atmosphere that remains visually subordinate to information.
- Editorial homepage with systems console, evidence ledger and direct conversion paths.
- Redesigned work and contact routes with professional signal graphics.
- Shared content, capability, experience, credential, project and document components.
- Reading progress, active-section beacon, progressive reveals, pointer spotlights and restrained route transitions.
- Accessible command navigator with keyboard shortcuts, filtering and focus return.
- Fully useful semantic no-JavaScript fallback.
- Reduced-motion, forced-colours and print support.

### Explore Anzania

- Eight outer and inner narrative locations.
- Fifteen transparent full-body companions.
- Dune Surfing, Sand Teleportation, Solar Propulsion and Reality Bending.
- Atlas, guide selector, experience options and Static View exits.
- Distant full-body framing controller with responsive safe zones and animated-state containment.
- No OTS path and no authored camera crop.

### Documents and release system

- Four browser-native A4 Resume and CV PDFs generated with JavaScript, Chromium and `pdf-lib`.
- Canonical metadata, sitemap, icons, social cards and GitHub Pages workflow.
- Updated public-output, budget, unit and browser contracts for both runtime lanes.
- Runtime isolation under `public/assets/static/` and `public/assets/immersive/`.

## Authoritative design rules

- Anzania is fictional and must never be presented as Tanzania or another real location.
- The professional record remains central in Static View. Location imagery may support composition as atmosphere, but must not become the main content object.
- Static View and Explore Anzania are equal-quality products with different interaction goals.
- The complete companion bounds, including headwear, hands, scarves, pouches, garment tails and footwear, remain inside the visible frame whenever authored on screen.
- D004 remains the only allowed immersive framing direction. No OTS or OTS variant may exist.
- Resume and CV production remains JavaScript and Chromium based.
- Public copy avoids U+2014 em dashes and unverified claims.

## Verification still required before live publication

1. Run the canonical Node 24.14 and pnpm 11.9 `pnpm qa` suite in a connected build environment.
2. Push the release branch and open the publication pull request.
3. Merge to `main` only after hosted checks pass.
4. Verify the live homepage, `/profile/explore/`, sitemap, social metadata, `version.json` and all four PDFs over HTTPS.

## Recovery

- The prior production site is recoverable from `legacy-pages-baseline-20260730` and GitHub Pages deployment history.
- The professional and immersive runtimes are isolated, allowing either interaction layer to be diagnosed without removing the evidence base or document routes.
- The Pages workflow deploys only a quality-gated `dist` artifact.
- If live verification fails, restore the last known-good deployment, correct the release branch and rerun the complete gate.
