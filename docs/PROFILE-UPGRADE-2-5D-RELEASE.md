# Profile Upgrade production release record

**Product owner:** Bongo Seakhoa  
**Release branch:** `portfolio-wow-ai-upgrade`

**Release date:** 2026-08-10
**Target:** `https://bongo-seakhoa.github.io/profile/`

## 1. Outcome

This release completes the portfolio as two connected products with one evidence base and no quality hierarchy between them:

1. **Professional Static View** is a premium systems-cartography interface for the complete professional record. Information, evidence and conversion actions remain central. Anzania appears as low-opacity atmosphere, route-aware geometry and restrained visual continuity rather than as a page-filling attraction.
2. **Explore Anzania** is an optional cinematic 2.5D journey through eight illustrated locations, twelve selectable full-body companions, four authored poses per companion and four traversal powers.

Anzania is a cinematic portfolio world created for Bongo Seakhoa.

The selected 2.5D architecture turns approved world plates and full-body character concepts into a coherent browser experience while preserving polish, responsive performance and complete delivery.

## 2. Audit summary

### Repository and build

- Astro 6 and TypeScript generate a static GitHub Pages site under `/profile/`.
- One validated content registry feeds pages, documents, social metadata and PDFs.
- Resume and CV files use a JavaScript, Chromium and `pdf-lib` pipeline.
- The production workflow installs Node.js 24.14 and pnpm 11.9, runs `pnpm qa`, then publishes the validated `dist/` artifact through GitHub Pages.
- Static View now uses one small framework-free progressive-enhancement module. Semantic content, links and downloads remain available when JavaScript is disabled.
- Explore Anzania uses a separate runtime and asset boundary.

### Reference library

The approved reference archive contained eight Anzania locations with outer and inner views, a complete illustrated atlas, masculine, feminine and gender-neutral character concept lineups, identity and traversal specifications, and supporting artefact boards.

Only approved responsive derivatives required by the public experiences were copied into runtime directories. Reference masters remain outside the deployed bundle.

## 3. Scope and boundaries

### Professional Static View

- Complete professional routes for home, about, work, project detail, experience, capabilities, research, education, credentials, documents and contact.
- A high-contrast editorial information hierarchy using Source Serif, IBM Plex Sans and IBM Plex Mono.
- Route-aware Anzania atmosphere used behind the interface at restrained opacity.
- Cartographic rune geometry, evidence-flow diagrams and technical signal patterns.
- Progressive section reveals and card spotlights that never hide content without JavaScript.
- Reading progress, active-section beacon and an accessible command navigator opened with `Ctrl/Cmd+K` or `/`.
- Reduced-motion, forced-colours, print and keyboard interaction contracts.
- Direct Resume and CV previews and downloads.

### Explore Anzania

- One opt-in `/explore/` route with clear authorship and narrative-world framing.
- Eight narrative locations: Threshold Dunes, Stone Pass of Context, Garden of Origins, Archive of Echoes, Forge of Resolve, Bazaar of Skill, Observatory of Horizons and Oasis of Audience.
- Outer and inner scene plates at 1600 by 900 and 960 by 540.
- Twelve selectable transparent full-body companions with idle, presenting, travel and look-back poses.
- Four authored traversal treatments: Dune Surfing, Sand Teleportation, Solar Propulsion and Reality Bending.
- Interactive route atlas, guide and experience-option dialogs.
- Keyboard, pointer and touch controls.
- Responsive full-body framing, look-back, presenting, traversal pullback and long-idle edge lean.

### Excluded

- WebGL, canvas, `.glb`, `.gltf`, `.fbx`, `.blend`, shaders and runtime 3D engines.
- Audio that is not rights-cleared.
- A contact-form backend or private data collection.
- Publication of source reference boards or raw character concept sheets.
- Any camera path that crops the character or becomes over-the-shoulder.
- A Static View design in which location images become the primary content or interaction target.

## 4. Architecture

```text
Professional Static View routes
        |
        +--> Astro semantic HTML
        +--> Shared evidence-bound content
        +--> Approved responsive atmosphere
        +--> public/assets/static/static-runtime.js
        |       +--> command navigator
        |       +--> reading and section state
        |       +--> progressive reveals
        |       +--> restrained route transitions
        +--> Browser-native Resume and CV pipeline
        +--> Complete no-JavaScript fallback

Explore Anzania route
        |
        +--> Standalone Astro HTML shell
        +--> public/assets/immersive/anzania-explorer.css
        +--> public/assets/immersive/anzania-explorer.js
        +--> runtime-manifest.json
                +--> 8 locations
                +--> 4 powers
                +--> 12 companions
                +--> 48 authored poses
                +--> interactive atlas
```

The two runtimes are framework-free and isolated. Professional pages may link to `/explore/` but may not request immersive runtime assets. The public-output validator allows exactly one approved Static View module and exactly one approved Explore Anzania module, enforces the `/profile/` base path and rejects canvas or heavy 3D formats.

## 5. Full-body framing contract

The complete companion is treated as a screen-space rectangle derived from the full 640 by 960 transparent asset. The controller:

- targets approximately 18 percent viewport height on normal desktop layouts;
- targets approximately 19 percent on compact layouts;
- uses 16 to 17 percent on short viewports;
- pulls back during traversal;
- remains within the normal 14 to 20 percent range unless a dedicated selection view requires more;
- tracks top bar, chapter panel, location mark, rail and bottom controls as expanded collision rectangles;
- scores multiple screen-space positions and selects the lowest-overlap result;
- clamps the entire silhouette inside viewport and safe-area insets;
- recalculates on resize, orientation change, content resize and state changes;
- keeps look-back at approximately the same radius;
- restores idle edge lean immediately after interaction; and
- exposes frame status and geometry for automated verification.

The companion normally occupies the lower composition and moves away from active HTML content. Compact layouts use the clear scene pocket above the bottom chapter panel. No OTS or upper-body crop path exists.

## 6. Milestones and ownership

| Milestone                         | Acceptance condition                                                      | State            |
| --------------------------------- | ------------------------------------------------------------------------- | ---------------- |
| Repository and reference audit    | Build, deployment, tools and canon recorded                               | Complete         |
| 2.5D architecture                 | Static and immersive boundaries defined                                   | Complete         |
| Scene derivative production       | 32 responsive scene assets plus atlas                                     | Complete         |
| Companion derivative production   | 48 transparent full-body pose assets                                      | Complete         |
| Explore route and runtime         | Eight-location journey is functional                                      | Complete         |
| Full-body framing controller      | Safe-zone and animated-state containment implemented                      | Complete         |
| Professional Static View redesign | Evidence-led pages, shell, atmosphere and enhancement runtime implemented | Complete         |
| JavaScript document pipeline      | Four browser-native A4 PDFs remain integrated                             | Complete         |
| Automated release tests           | Unit, Playwright, output and budget contracts added                       | Complete         |
| GitHub Pages publication          | Branch merged to `main` and Pages workflow passes                         | Publication gate |

## 7. Acceptance criteria

The release is acceptable only when all of the following are true:

- Anzania is described consistently as an original portfolio world.
- The complete professional record remains reachable without entering the journey.
- Static View remains complete and readable with JavaScript disabled.
- Static View contains exactly one approved progressive-enhancement runtime and no immersive runtime request.
- Its atmosphere supports rather than displaces professional information.
- Command navigation, reading state, focus return and reduced motion work across supported breakpoints.
- Every immersive location has a unique outer and inner scene.
- All twelve companions load with four transparent full-body poses.
- The complete companion remains inside the viewport at tested ratios and states.
- The companion does not overlap active chapter content.
- Look-back, traversal and return preserve full-body framing.
- Explore Anzania contains exactly one isolated JavaScript runtime.
- No canvas, WebGL or heavy 3D runtime format ships.
- Resume and CV production remains JavaScript and Chromium based.
- GitHub Pages URLs remain base-aware under `/profile/`.
- Social metadata and sitemap include `/explore/`.
- The complete artifact remains within the release budget.

## 8. Test matrix

### Source and manifest

- JavaScript syntax validation for both runtimes and validators.
- JSON parsing and schema-shape checks.
- Eight unique locations and 32 responsive scene paths.
- Four unique traversal powers.
- Twelve unique companion IDs, each with idle, presenting, travel and look-back artwork.
- 640 by 960 dimensions and alpha channel for each companion pose.
- Asset existence and minimum byte-size checks.
- Static atmosphere allowlist and runtime isolation checks.

### Professional browser experience

- Homepage, work and contact visual checks at desktop and mobile ratios.
- Final homepage renders at 1440 by 1000, 1366 by 900, 1280 by 900, 390 by 844 and 844 by 390 with zero horizontal overflow.
- Accessible command dialog open, filter, empty-state, close and focus-return behaviour.
- Reading progress and active-section state.
- Reduced-motion behaviour with every record visible.
- Complete no-JavaScript content and navigation fallback.
- Keyboard focus and serious or critical accessibility scans.

### Explore Anzania browser experience

- Arrival and Static View fallback.
- Full-body framing at 390 by 844, 844 by 390, 768 by 1024, 1024 by 650, 1440 by 1000 and 1920 by 1080.
- Guidance toast containment in portrait and low-height landscape, with no collision against the companion or active interface safe zones.
- Look-back hold and release.
- Traversal to the next location.
- Outer-to-inner portal transition.
- Interactive atlas and twelve-guide selector.
- Serious and critical accessibility scan.

### Release output

- Every professional route contains exactly one approved Static View runtime.
- Every professional route remains complete with JavaScript disabled.
- No professional route requests immersive runtime assets.
- Explore Anzania contains exactly one approved immersive runtime.
- No canvas or heavy 3D extension is present.
- All `/profile/` paths remain base-aware.
- Anzania authorship and narrative-world metadata remain consistent.
- Runtime framing contracts remain present.
- All four direct PDF downloads remain linked and non-empty.

### Budgets

- 100 KB maximum compressed HTML per route.
- 90 KB maximum compressed professional CSS.
- 16 KB maximum compressed Static View JavaScript.
- 24 KB maximum compressed immersive CSS.
- 80 KB maximum compressed immersive JavaScript.
- 650 KB maximum per immersive WebP.
- 9 MB maximum total immersive bundle.
- 25 MB maximum complete release artifact.

## 9. Recovery

1. The Static View and Explore Anzania runtimes live in separate asset directories and have separate validators.
2. The 2.5D experience is a separate route. A runtime failure can be contained without removing the professional record.
3. The previous production release remains recoverable through the documented Git tag and GitHub Pages artifact history.
4. Route manifests, social cards and sitemap rebuild deterministically.
5. Resume and CV outputs remain generated from the shared content model and are not coupled to either interaction runtime.
6. No source reference master is overwritten by a runtime derivative process.

## 10. Publication sequence

1. Run `pnpm install --frozen-lockfile` under Node.js 24.14.
2. Run `pnpm run qa`.
3. Review failure screenshots and traces if a browser contract fails.
4. Merge the release branch to `main`.
5. Confirm the GitHub Pages build and deployment jobs pass.
6. Verify `/profile/`, `/profile/explore/`, sitemap, social cards and all four PDF downloads over HTTPS.
7. Record the deployed `version.json` revision in `AI-COLLAB/status/STATUS.md`.
