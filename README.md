# Bongo Seakhoa Profile

Production portfolio for [bongo-seakhoa.github.io/profile](https://bongo-seakhoa.github.io/profile/).

The portfolio contains two deliberately separated, equal-quality experiences:

- **Professional Static View** is the complete evidence-led professional record. It uses a restrained systems-cartography language, route-aware Anzania atmosphere, progressive section reveals, a reading beacon and an accessible command navigator. Every route remains fully useful when JavaScript is disabled.
- **Explore Anzania** is an optional cinematic 2.5D journey through eight illustrated locations with twelve selectable full-body companions, four authored poses per companion and four traversal powers.

Anzania is a cinematic portfolio world created for Bongo Seakhoa.

## Production architecture

- Astro 6 and TypeScript generate every public route as static HTML.
- Static View loads one small framework-free progressive-enhancement module from `public/assets/static/`. The module adds navigation, motion and reading-state features without owning content or blocking access.
- Anzania location art is used as restrained atmosphere in Static View. The professional record, evidence and navigation remain the visual and semantic centre.
- Explore Anzania loads one separately isolated framework-free runtime and responsive WebP assets only after the visitor chooses the immersive route.
- A responsive framing controller tracks browser safe zones and keeps the complete companion silhouette visible during idle, presenting, look-back and traversal states. There is no over-the-shoulder camera path.
- One validated content model feeds the website, document previews and PDFs.
- Resume and CV PDFs are created with JavaScript, print CSS, Chromium and `pdf-lib`. Python is not part of the production build or document pipeline.
- Responsive Static View artwork is generated with Sharp from an approved, hash-verified allowlist.
- The site is built for the GitHub Pages `/profile/` base path.
- Playwright, Axe, Vitest, Astro Check, TypeScript, ESLint and release validators form the quality gate.

## Source map

- `src/data/profile/`
  Evidence-bound identity, work, experience, education, credential, route and document manifests.
- `src/data/static-art/`
  Typed Anzania location registry, derivative manifest and provenance records.
- `src/pages/`
  Professional routes, project detail pages, browser document previews and the isolated `explore/` entry route.
- `src/components/`
  Site shell, content, media and professional document components.
- `src/styles/static-system.css`
  Professional systems-cartography layer, route atmosphere, reading beacon, command interface and motion contracts.
- `src/immersive/`
  Full-body camera, animated-bound and animation contracts retained for shared validation and future deeper 3D evolution.
- `public/assets/static/`
  The single progressive-enhancement runtime used by professional routes.
- `public/assets/immersive/`
  The isolated 2.5D runtime, eight outer and eight inner scene pairs, interactive route atlas and 48 transparent full-body companion pose assets.
- `public/assets/images/anzania/`
  Approved responsive Anzania artwork derivatives used as professional atmospheric support.
- `scripts/build-documents.mjs`
  Browser-native Resume and CV PDF generator.
- `scripts/build-static-art.mjs`
  Hash-checked responsive art pipeline.
- `scripts/validate-public-output.mjs`
  Static and immersive boundary checks, base-path checks, framing contracts, runtime allowlists and PDF-link validation.
- `AI-COLLAB/`
  Plans, decisions, audits, risks, status, handoffs, communications and watcher protocol.

The older root HTML, asset folders and `scripts/build.py` are retained only as historical rollback material. They are not invoked by package scripts, CI or the GitHub Pages artifact.

## Requirements

- Node.js 24.14.x
- pnpm 11.9.0
- Google Chrome or a compatible Playwright Chromium runtime

Install dependencies:

```powershell
pnpm install --frozen-lockfile
```

## Local development

```powershell
pnpm run dev
```

Astro serves the site under `/profile/`. Use the URL printed by the development server. Explore Anzania is available at `/profile/explore/`.

## Build and quality gates

Create the production site, four PDFs and release metadata:

```powershell
pnpm run build
```

Run the complete release-quality suite:

```powershell
pnpm run qa
```

The full gate covers:

- content and route integrity;
- formatting, linting and TypeScript;
- complete eight-location, twelve-guide, 48-pose and four-power immersive manifests;
- full-body companion dimensions, transparency and responsive framing;
- professional Static View enhancement and no-JavaScript fallback contracts;
- accessible command navigation, reduced motion, forced colours and print output;
- responsive Static View art integrity and atmospheric-only usage;
- A4 page counts, overflow, section boundaries, fonts, metadata and PDF links;
- desktop, mobile, no-JavaScript and accessibility browser tests;
- GitHub Pages base paths, sitemap, robots, icons and release metadata;
- exactly one approved Static View runtime and one separately isolated immersive runtime; and
- absence of public em dash characters, canvas, heavy 3D formats and unapproved runtime assets.

Generated PDFs are written to:

- `dist/documents/bongo-seakhoa-resume.pdf`
- `dist/documents/bongo-kosa-resume.pdf`
- `dist/documents/bongo-seakhoa-cv.pdf`
- `dist/documents/bongo-kosa-cv.pdf`

## Deployment and rollback

`.github/workflows/deploy-pages.yml` builds and validates the exact `dist/` artifact before GitHub Pages deployment from `main`. The deployed artifact includes `version.json` with its release revision and build identity.

The previous production state is preserved by the `legacy-pages-baseline-20260730` tag. A failed release can redeploy the last known-good artifact without rebuilding it from unreviewed source.

## Content and asset boundaries

- Do not publish private phone numbers or raw certificate files.
- Do not infer contract type, contribution, outcome or metrics without evidence.
- Keep both surname document variants aligned from the shared manifest.
- Never copy unapproved reference masters into the public site.
- Never ship assets marked `SUPERSEDED_DO_NOT_SHIP`.
- Keep the Static View runtime isolated under `public/assets/static/`.
- Keep the immersive runtime isolated under `public/assets/immersive/`.
- Keep the entire full-body companion visible whenever the companion is authored to be on screen.
- Keep Anzania authorship and narrative framing consistent in metadata and visitor-facing copy.

See `AI-COLLAB/plans/MASTER-EXECUTION-PLAN.md`, `AI-COLLAB/status/STATUS.md` and `docs/PROFILE-UPGRADE-2-5D-RELEASE.md` for the execution record and release criteria.
