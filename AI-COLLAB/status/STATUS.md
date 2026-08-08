# Profile Upgrade status

**Updated:** 2026-08-08
**Lead:** Codex
**Independent reviewer:** Claude or a second reviewer when available
**Current milestone:** Release 2 final verification and publication

## Overall

| Area | State | Evidence / next gate |
| --- | --- | --- |
| Repository, references, build and deployment audit | Complete | Astro, JavaScript document pipeline, GitHub Pages constraints, reference canon and local tool limits recorded. |
| Static View | Complete and live | Release 1 remains the complete, accessible, script-free professional record. |
| Resume and CV | Complete | Browser-native JavaScript, Chromium and `pdf-lib` pipeline remains authoritative. |
| Anzania production medium | Adopted | D010 authorises a production-quality 2.5D implementation instead of blocking completion on full Blender production. |
| Explore Anzania route | Release candidate complete | Eight locations, outer and inner scenes, atlas, fifteen companions, four traversal treatments and Static View fallback implemented. |
| Full-body framing | Browser verified | Safe-zone controller passed portrait, landscape, tablet, short laptop, desktop and wide desktop geometry checks with no body or caption crop. |
| Runtime isolation | Complete | Static View keeps zero client JavaScript. The sole immersive runtime is confined to `public/assets/immersive/`. |
| Asset optimisation | Passed | Complete immersive bundle is below 9 MB; each WebP is below 650 KB; compressed CSS and JavaScript remain far below their release budgets. |
| Automated release coverage | Implemented | Unit, Playwright, public-output and budget contracts cover the 2.5D route and prior Static View guarantees. |
| Local browser QA | Passed | Chromium 144 completed arrival, six viewport ratios, look-back, traversal, atlas, fifteen-guide selection and portal checks with zero runtime or console errors. |
| Canonical CI | Pending publication environment | Node 24.14 and pnpm 11.9 `pnpm qa` must run in GitHub Actions or an equivalent connected build environment. |
| GitHub Pages publication | Pending repository write access | Merge the final branch to `main`, run Pages, then verify live routes, documents and metadata. |

## Release 2 implementation evidence

- Anzania is stated as an original fictional portfolio world and explicitly not
  Tanzania or any other real location.
- The route contains eight named narrative locations and 32 responsive scene
  plates: outer and inner views at 1600 by 900 and 960 by 540.
- Fifteen selectable guides ship as transparent 540 by 1280 full-body WebP
  silhouettes, with five masculine, five feminine and five neutral options.
- Dune Surfing, Sand Teleportation, Solar Propulsion and Reality Bending drive
  authored route and portal transitions.
- The responsive framing controller targets 14 to 20 percent of viewport height,
  tracks active content as collision rectangles and snaps safely on resize or
  orientation change before restoring authored easing.
- Browser geometry passed at 390 by 844, 844 by 390, 768 by 1024, 1024 by 650,
  1440 by 1000 and 1920 by 1080.
- Full-body containment also passed during look-back, traversal, guide change and
  the outer-to-inner portal transition.
- Browser QA reported zero runtime errors, zero console errors and zero captured
  unhandled errors.
- The immersive directory is approximately 6.8 MB. Its compressed JavaScript is
  approximately 9 KB and compressed CSS approximately 8 KB.
- No canvas, WebGL, `.glb`, `.gltf`, `.fbx`, `.blend`, shader, audio or video
  runtime is shipped.

## Static View release evidence

- Production: `https://bongo-seakhoa.github.io/profile/`
- Main Release 1 implementation revision: `e29a4c959c39fff6e93def841c0944db94bf013f`.
- Warning-clean Release 1 deployment: GitHub Actions run `30605182973`.
- All Release 1 sitemap routes, four direct PDFs, `.nojekyll`, sitemap and robots
  returned HTTP 200 after deployment.
- Release 1 passed formatting, linting, Astro, TypeScript, unit, Playwright,
  document, metadata, budget and Lighthouse gates.
- Release 1 Lighthouse median remained Performance 99, Accessibility 100, Best
  Practices 100 and SEO 100.

## Current publication gates

1. Run `pnpm install --frozen-lockfile` with Node.js 24.14 and pnpm 11.9.
2. Run the complete `pnpm qa` command.
3. Obtain an independent visual review where a second reviewer is available.
4. Merge the release branch to `main` and allow the existing GitHub Pages
   workflow to publish `dist/`.
5. Verify `/profile/`, `/profile/explore/`, sitemap, social metadata and all four
   PDF downloads over HTTPS.
6. Record the deployed `version.json` revision here.

## Coordination

Claude's earlier review history remains retained. No current Claude heartbeat or
new response is present, so the lead continued under the collaboration protocol
without blocking completion. Automated evidence does not impersonate a second
reviewer.
