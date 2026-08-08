# Profile Upgrade status

**Updated:** 2026-08-08
**Working branch:** `agent/profile-upgrade-20260808-final`
**Target:** `https://bongo-seakhoa.github.io/profile/`

## Current product state

| Area | State | Evidence and next gate |
| --- | --- | --- |
| Professional Static View | Release candidate complete | Premium systems-cartography shell, route-aware atmosphere, evidence-led homepage, redesigned work and contact routes, command navigator, reading beacon, transitions and no-JavaScript fallback are implemented. |
| Explore Anzania | Release candidate complete | Eight locations, fifteen full-body companions, four traversal powers, atlas, dialogs and full-body safe-zone runtime are implemented. |
| Anzania canon | Locked | Anzania is an original fictional portfolio world. It is not Tanzania or any other real location. |
| Full-body framing | Passed in local browser QA | Complete silhouettes remained contained through tested viewport ratios, look-back, traversal, guide change and portal states. No OTS path exists. |
| Runtime isolation | Implemented | One progressive runtime is confined to `public/assets/static/`; one immersive runtime is confined to `public/assets/immersive/`. Professional routes may not request immersive runtime assets. |
| Resume and CV | Preserved | Four A4 documents remain generated through JavaScript, Chromium and `pdf-lib`; Python is not in the production document pipeline. |
| Asset optimisation | Passed locally | The complete immersive bundle remains below 9 MB; each WebP is below 650 KB; compressed CSS and JavaScript remain within the release contracts. |
| Automated release coverage | Updated | Unit, Playwright, public-output and budget contracts cover both products, no-JavaScript fallback, command navigation, reduced motion and runtime isolation. |
| Local browser QA | Passed | Story mode passed the full matrix. The professional redesign passed desktop, intermediate, mobile, no-JavaScript, command navigation, scroll-state and reduced-motion checks without horizontal overflow or runtime errors. |
| Canonical CI | Publication gate | Node 24.14 and pnpm 11.9 `pnpm qa` must run in GitHub Actions or an equivalent connected build environment. |
| GitHub Pages publication | Publication gate | Push the release branch, merge to `main`, run Pages and verify live routes, documents and metadata. |

## Release evidence

### Explore Anzania

- Eight named narrative locations and 32 responsive outer and inner scene derivatives.
- Fifteen selectable transparent 540 by 1280 full-body companions, with five masculine, five feminine and five neutral options.
- Dune Surfing, Sand Teleportation, Solar Propulsion and Reality Bending transitions.
- Responsive full-body framing at 390 by 844, 844 by 390, 768 by 1024, 1024 by 650, 1440 by 1000 and 1920 by 1080.
- Guidance toast containment verified in portrait and low-height landscape without collisions against the companion, chapter panel, top bar, location label or traversal controls.
- No canvas, WebGL, `.glb`, `.gltf`, `.fbx`, `.blend`, shader, audio or video runtime.

### Professional Static View

- A shared dark editorial shell with compact primary navigation, documents access and a prominent but separate Explore Anzania action.
- Information-first homepage with live systems console, proof ledger, selected work, capabilities, experience, research, education and contact actions.
- Redesigned work and contact routes with evidence-flow graphics rather than scenic centrepieces.
- Route-aware Threshold, Archive and Oasis atmosphere rendered behind the interface at restrained opacity.
- Accessible `Ctrl/Cmd+K` or `/` command navigator, keyboard filtering, focus return, reading progress and active-section beacon.
- Progressive enhancement only: every heading, record, link and document remains in semantic HTML and visible when JavaScript is disabled.
- Dedicated reduced-motion, forced-colours and print contracts.
- Final local visual checks at 1440 by 1000, 1366 by 900, 1280 by 900, 390 by 844 and 844 by 390 with zero horizontal overflow.
- Command filtering, empty state, focus restoration, no-JavaScript fallback and reduced-motion reveal behaviour verified through Chromium DevTools Protocol.

## Prior production evidence

- Prior Static View implementation revision: `e29a4c959c39fff6e93def841c0944db94bf013f`.
- Prior warning-clean GitHub Pages run: `30605182973`.
- Prior Release 1 Lighthouse median: Performance 99, Accessibility 100, Best Practices 100 and SEO 100.

## Current publication gates

1. Push the release branch and run the canonical Node 24 `pnpm qa` workflow.
2. Merge to `main` after the hosted gate passes.
3. Verify the live homepage, Explore Anzania, sitemap, social metadata, `version.json` and all four PDF downloads.

## Coordination

Claude's earlier review history remains retained. No current Claude heartbeat or new response is present, so the lead continues under the written collaboration protocol without blocking completion. Automated evidence does not impersonate a second reviewer.
