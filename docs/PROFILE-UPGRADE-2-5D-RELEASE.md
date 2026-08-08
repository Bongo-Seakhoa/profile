# Profile Upgrade 2.5D release record

**Product owner:** Bongo Seakhoa  
**Lead implementation owner:** Codex  
**Independent review owner:** Claude or another second reviewer when available  
**Release branch:** `agent/profile-upgrade-20260808-final`  
**Release date:** 2026-08-08  
**Target:** `https://bongo-seakhoa.github.io/profile/`

## 1. Outcome

This release completes the portfolio as a two-mode production system:

1. **Static View** remains the complete, conventional and accessible professional
   record.
2. **Explore Anzania** adds an optional cinematic 2.5D journey through the same
   evidence and professional routes.

Anzania is an original fictional portfolio world created for Bongo Seakhoa. It
is not Tanzania or any other real location.

The user explicitly permitted a high-quality 2.5D or 2D route when full 3D would
reduce delivery quality or prevent completion. The 2.5D architecture was chosen
because it turns the approved high-resolution world plates and full-body
character concepts into a coherent production experience without introducing a
low-quality pseudo-3D compromise.

## 2. Audit summary

### Repository and build

- Astro 6 and TypeScript generate a static GitHub Pages site under `/profile/`.
- The existing content registry is shared across pages, documents and metadata.
- Resume and CV files already use a JavaScript, Chromium and `pdf-lib` pipeline.
- The production workflow installs Node.js 24.14 and pnpm 11.9, runs the complete
  `pnpm qa` gate, then publishes `dist/` through GitHub Pages.
- Static View was already designed to operate without client JavaScript.

### Local implementation environment

- Node.js 22.16 was available for syntax checks and deterministic utility work.
- Chromium 144 and ImageMagick 7 were available for browser and image QA.
- Blender was not installed in the implementation environment.
- Package installation from the shell was unavailable, so the release includes
  source-level, manifest, syntax, geometry and browser-preview verification plus
  CI-ready Vitest and Playwright tests for the canonical Node 24 environment.

### Reference library

The owner-supplied reference archive contained:

- eight Anzania locations with outer and inner views;
- a complete illustrated atlas;
- masculine, feminine and gender-neutral character concept lineups;
- identity, traversal and world-building specifications; and
- supporting artefact boards.

Only approved derivatives required by the production experience were added to
`public/assets/immersive/`. Reference masters remain outside the runtime bundle.

## 3. Scope and boundaries

### Included

- One opt-in `/explore/` route with explicit fictional-world copy.
- Eight narrative locations:
  1. Threshold Dunes
  2. Stone Pass of Names
  3. Garden of Origins
  4. Archive of Echoes
  5. Forge of Resolve
  6. Bazaar of Skill
  7. Observatory of Horizons
  8. Oasis of Audience
- Outer and inner scene plates at 1600 by 900 and 960 by 540.
- Fifteen selectable transparent full-body companions.
- Four authored traversal treatments:
  - Dune Surfing
  - Sand Teleportation
  - Solar Propulsion
  - Reality Bending
- Atlas, guide and experience-option dialogs.
- Keyboard, pointer and touch controls.
- Static View fallback from the arrival screen, top bar and options dialog.
- Responsive full-body framing, look-back, presenting, traversal pullback and
  long-idle edge lean.
- Homepage, header, footer, route registry, sitemap and social-preview integration.
- Unit, browser, output-boundary and budget checks.

### Excluded

- WebGL, canvas, `.glb`, `.gltf`, `.fbx`, `.blend`, shaders and runtime 3D engines.
- Audio that is not rights-cleared.
- A contact-form backend or private data collection.
- Publication of source reference boards or raw character concept sheets.
- Any camera path that crops the character or becomes over-the-shoulder.

## 4. Architecture

```text
Static View routes
        |
        +--> Astro static HTML
        +--> Shared profile content
        +--> Browser-native Resume and CV pipeline
        +--> Zero client JavaScript

Explore Anzania route
        |
        +--> Standalone Astro HTML shell
        +--> public/assets/immersive/anzania-explorer.css
        +--> public/assets/immersive/anzania-explorer.js
        +--> runtime-manifest.json
                |
                +--> 8 locations
                +--> 4 powers
                +--> 15 companions
                +--> atlas
```

The runtime is framework-free and isolated. Static pages may link to `/explore/`
but may not reference or request immersive assets. The public-output validator
fails JavaScript outside the immersive directory and fails immersive references
inside Static View HTML.

## 5. Full-body framing contract

The complete character is treated as a screen-space rectangle derived from the
full 540 by 1280 transparent companion asset. The controller:

- targets approximately 18 percent viewport height on normal desktop layouts;
- targets approximately 19 percent on compact layouts;
- uses 16 to 17 percent on short viewports;
- pulls back during traversal;
- never exceeds the 20 percent normal target in the implemented states;
- may reduce toward 14 percent only when content-safe space requires it;
- tracks top bar, chapter panel, location mark, rail and bottom controls as
  expanded collision rectangles;
- scores multiple screen-space positions and selects the lowest-overlap result;
- clamps the full image inside viewport and safe-area insets;
- recalculates on resize, orientation change, content resize and state changes;
- keeps look-back at approximately the same radius;
- restores idle edge lean immediately after interaction; and
- exposes frame status and geometry for automated verification.

The companion is normally placed in the lower composition and away from active
HTML content. Compact layouts move the companion into the clear scene pocket
above the bottom chapter panel.

## 6. Milestones and ownership

| Milestone | Owner | Acceptance condition | State |
| --- | --- | --- | --- |
| Repository and reference audit | Codex | Build, deployment, tools and canon recorded | Complete |
| 2.5D architecture | Codex | Static and immersive boundaries defined | Complete |
| Scene derivative production | Codex | 32 responsive scene assets plus atlas | Complete |
| Companion derivative production | Codex | 15 transparent 540 by 1280 full-body assets | Complete |
| Explore route and runtime | Codex | Eight-location journey is functional | Complete |
| Full-body framing controller | Codex | Safe-zone and animated-state containment implemented | Complete |
| Static View integration | Codex | Homepage, header, footer and route registry link correctly | Complete |
| Automated release tests | Codex | Unit, Playwright, output and budget contracts added | Complete |
| Independent visual review | Claude or second reviewer | All animations, ratios and browsers reviewed independently | External review gate |
| GitHub Pages publication | Repository owner and CI | Branch merged to `main` and Pages workflow passes | Publication gate |

Automated tests do not impersonate or replace Claude. They provide a repeatable
independent geometry and release contract until a second reviewer is available.

## 7. Acceptance criteria

The release is acceptable only when all of the following are true:

- The arrival screen describes Anzania as original and fictional.
- The complete Static View remains reachable without entering the journey.
- Every location has a unique outer and inner scene.
- All fifteen companions load with transparent full-body assets.
- The complete companion remains inside the viewport at the tested ratios.
- The companion does not overlap the active chapter panel.
- Look-back, traversal and return preserve full-body framing.
- Static View contains no client JavaScript or immersive asset request.
- Explore Anzania contains exactly one isolated JavaScript runtime.
- No canvas, WebGL or heavy 3D runtime format ships.
- Reduced-motion users receive near-instant transitions and no forced parallax.
- Keyboard controls, dialogs, focus states and fallback routes remain usable.
- Resume and CV production remains JavaScript and Chromium based.
- GitHub Pages base-aware URLs remain under `/profile/`.
- Social metadata and sitemap include `/explore/`.
- The complete artifact remains within the updated release budget.

## 8. Test matrix

### Source and manifest

- JavaScript syntax validation.
- JSON parsing and schema-shape checks.
- Eight unique locations and 32 responsive scene paths.
- Four unique traversal powers.
- Fifteen unique companion IDs.
- Five companions per presentation group.
- 540 by 1280 dimensions and alpha channel for each companion.
- Asset existence and minimum byte-size checks.

### Browser

- Arrival and Static View fallback.
- Full-body framing at 390 by 844, 768 by 1024, 1024 by 650 and 1440 by 1000.
- Look-back hold and release.
- Traversal to the next location.
- Outer-to-inner portal transition.
- Atlas and fifteen-guide selector.
- Serious and critical accessibility scan.

### Release output

- Static View remains script-free.
- Only the approved immersive directory may contain JavaScript.
- No canvas or heavy 3D extension.
- All `/profile/` paths remain base-aware.
- The canonical fictional-world disclaimer is present.
- Runtime framing contracts remain present.
- All four direct PDF downloads remain linked and non-empty.

### Budgets

- 100 KB maximum compressed HTML per route.
- 60 KB compressed Static View CSS.
- 24 KB compressed immersive CSS.
- 80 KB compressed immersive JavaScript.
- 650 KB maximum per immersive WebP.
- 9 MB maximum total immersive bundle.
- 25 MB maximum complete release artifact.

## 9. Recovery

1. The 2.5D experience is a separate route and asset directory. A failure can be
   contained by removing the Explore links and route without changing Static View.
2. The prior production release remains recoverable through the documented Git
   tag and GitHub Pages artifact history.
3. The route manifest, social cards and sitemap rebuild deterministically.
4. Resume and CV outputs remain generated from the shared content model and are
   not coupled to the immersive runtime.
5. No source reference master is overwritten by the runtime derivative process.

## 10. Publication sequence

1. Run `pnpm install --frozen-lockfile` under Node.js 24.14.
2. Run `pnpm run qa`.
3. Review failure screenshots and traces if any browser contract fails.
4. Obtain independent review of full-body framing and fictional-world copy.
5. Merge the release branch to `main`.
6. Confirm the GitHub Pages build and deployment jobs pass.
7. Verify `/profile/`, `/profile/explore/`, the sitemap, social card and four PDF
   downloads over HTTPS.
8. Record the deployed `version.json` revision in `AI-COLLAB/status/STATUS.md`.
