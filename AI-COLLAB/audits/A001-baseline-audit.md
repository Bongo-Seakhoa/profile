# A001 — Repository, reference, tool and deployment baseline

**Date:** 2026-07-30  
**Lead auditor:** Codex  
**Independent review:** Claude R001  
**Status:** Complete for Release 1 planning

## Repository

- Path: the portfolio repository root.
- Branch: `main`.
- HEAD: `df410d5` (`Upgrade resume and CV document suite`).
- Origin: `https://github.com/Bongo-Seakhoa/profile.git`.
- Existing public files are generated at repository root.
- Only two commits existed at audit time.
- No project package manifest, lockfile, tests, CI, sitemap, CNAME or `.openai/hosting.json`.
- The `.nojekyll` marker is present.

## Current implementation

- `scripts/build.py` is a monolithic Python static generator with large inline HTML/CSS fragments and page-specific render functions.
- `content/profile.json` contains the current professional source baseline.
- `assets/site.js` creates a permanent particle loop and reveal behaviour.
- Core content can be hidden when JavaScript does not execute.
- The root page centres a dual-surname choice rather than professional evidence.
- Resume/CV routes exist for Bongo Seakhoa and Bongo Kosa.
- Current resume and CV PDFs use US Letter pages.
- The resume visually orphans `SELECTED PROJECTS` at the foot of page 1.
- The CV continues Education onto page 3 without a repeated section label.
- The current font subsets are Type 3, so the replacement must validate embedded fonts and ATS extraction explicitly.

## Build evidence

An isolated copy of the current repository was built with Python 3.12.10.

Result:

- All four PDF render attempts failed in Chrome.
- The generator still exited with status 0.
- It printed `Site generated on 2026-07-30`.
- No output hash changed, so stale PDFs remained in place.

Conclusion:

PDF failure must be fatal unless an explicit `--skip-pdf` flag is used. A release must prove document freshness and manifest consistency.

## Live browser evidence

- `https://bongo-seakhoa.github.io/profile/` returned HTTP 200.
- Live HTML matched the checked-out root page.
- Desktop Chrome showed the current dark glass/aurora identity selector.
- Chrome at 390×844 showed clipped hero content, crowded navigation and horizontal overflow.
- Canonical tags, social image metadata and sitemap are absent.
- The connected in-app browser timed out during attachment; installed Chrome headless with an isolated profile is the verified local fallback.

## Deployment constraints

- This is a GitHub Pages project page under `/profile/`.
- Root-absolute route links would escape the project and 404.
- Canonical, sitemap, social-image and structured-data URLs must include the project base.
- Target Astro settings:

```js
site: "https://bongo-seakhoa.github.io"
base: "/profile"
trailingSlash: "always"
build: { format: "directory" }
```

## Front-end environment

- Git: 2.36.1.windows.1.
- Python: 3.12.10.
- Bundled Node: 24.14.0.
- Bundled pnpm: 11.9.0.
- Bundled Playwright library: 1.61.1.
- Bundled Sharp: 0.34.5 with libvips 8.17.3.
- Installed Chrome: 150.0.7871.187.
- Installed Edge: 150.0.4078.105.
- Astro, Vite, TypeScript, `@playwright/test`, axe-core and Lighthouse are not project dependencies yet.

## Blender environment

- Binary: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`.
- Version: Blender 5.2.0 LTS.
- Build: `fbe6228777e7`, Windows Release, 2026-07-14 01:35:40.
- Engines: EEVEE, Workbench and Cycles.
- Enabled core add-ons include Cycles, BVH, SVG, UV layout, FBX, glTF 2 and pose library.
- Available modules include Node Wrangler, Rigify, Hydra Storm, UI Translate and VR Preview.
- glTF, USD, FBX and Alembic operators are available.
- Cycles device: AMD Ryzen 5 4500U CPU only.
- CUDA and HIP device initialization fail; Cycles GPU rendering is unavailable.
- Headless EEVEE self-test: 64×64 PNG, passed.
- Headless Cycles CPU self-test: 32×32, one sample, passed.
- Approximately 8 GB RAM requires conservative asset budgets.

## Reference library

- Path: the owner's private reference library.
- 39 files totalling approximately 256 MiB.
- 27 PNGs, 2 PDFs, 2 ZIPs, 3 Markdown files, 2 workbooks, 2 JSON files and 1 CSV.
- No loose Blender, GLB, FBX, video, audio, texture or font file.
- The Static View addendum is the highest authority for Release 1.
- The worldbuilding addendum defines plate semantics.
- The canonical PDF and character brief govern later character work.

## Asset linkage and workbook

- The shipped v1 registry matched 0 of 19 filenames and 0 of 19 hashes.
- All stale mappings carried an extra terminal duplicate suffix.
- Actual source images have one terminal ordinal.
- Sixteen location plates and three support boards are verified.
- `07_59_39 PM (2).png` visually matches the Threshold Dunes inner camp/waystation.
- Six character sheets are non-canonical references.
- Two “Zahir”/old-panel concepts are marked `SUPERSEDED_DO_NOT_SHIP`.
- `Anzania_Asset_Linkage_Actual_Filenames_v2.0.xlsx` is corrected in place.
- The original workbook is archived byte-for-byte under `AI-COLLAB/archive/reference-originals/`.

## Primary findings carried into the plan

1. Ship Static View first.
2. Keep `/profile/` explicit everywhere.
3. Replace the HTML renderer; retain Python contracts/documents.
4. Make PDF failures fatal.
5. Remove public phone by default.
6. Use one route and professional-content manifest.
7. Delete decorative motion from Static View.
8. Use semantic, traceable image derivatives.
9. Keep production untouched until the release artifact passes.
10. Treat the missing character pack as an immersive-only external dependency.
