# Bongo Seakhoa Profile

Production portfolio for [bongo-seakhoa.github.io/profile](https://bongo-seakhoa.github.io/profile/).

Release 2 combines two deliberately separated experiences:

- **Static View** is the complete, semantic and conventional professional record.
  It renders without client JavaScript, remains usable with JavaScript disabled and
  provides all work, experience, education, credential, document and contact routes.
- **Explore Anzania** is an optional cinematic 2.5D portfolio journey through eight
  illustrated locations with fifteen selectable full-body companions and four
  authored traversal powers.

Anzania is an original fictional portfolio world created for Bongo Seakhoa. It is
not Tanzania or any other real location.

## Production architecture

- Astro 6 and TypeScript generate every public route as static HTML.
- Static View does not load the immersive runtime or its artwork.
- Explore Anzania loads one isolated, framework-free JavaScript module and
  responsive WebP assets only after the visitor chooses the immersive route.
- A responsive framing controller tracks browser safe zones and keeps the complete
  companion silhouette visible during idle, presenting, look-back and traversal
  states. There is no over-the-shoulder camera path.
- One validated content model feeds the website, document previews and PDFs.
- Resume and CV PDFs are created with JavaScript, print CSS, Chromium and
  `pdf-lib`. Python is not part of the production build or document pipeline.
- Responsive Static View artwork is generated with Sharp from an approved,
  hash-verified allowlist.
- The site is built for the GitHub Pages `/profile/` base path.
- Playwright, Axe, Vitest, Astro Check, TypeScript, ESLint and release validators
  form the quality gate.

## Source map

- `src/data/profile/`
  Evidence-bound identity, work, experience, education, credential, route and
  document manifests.
- `src/data/static-art/`
  Typed Anzania location registry, derivative manifest and provenance records for
  Static View.
- `src/pages/`
  Static routes, project detail pages, browser document previews and the isolated
  `explore/` entry route.
- `src/components/`
  Site shell, content, media and professional document components.
- `src/immersive/`
  Full-body camera, animated-bound and animation contracts retained for deeper 3D
  evolution and shared validation.
- `public/assets/immersive/`
  The production 2.5D runtime, eight outer and eight inner scene pairs, atlas and
  fifteen transparent full-body companion assets.
- `public/assets/images/anzania/`
  Approved responsive Static View artwork derivatives only.
- `scripts/build-documents.mjs`
  Browser-native Resume and CV PDF generator.
- `scripts/build-static-art.mjs`
  Hash-checked responsive Static View art pipeline.
- `scripts/validate-public-output.mjs`
  Static and immersive boundary checks, base-path checks, framing contracts,
  runtime-asset allowlists and PDF-link validation.
- `AI-COLLAB/`
  Plans, decisions, audits, risks, status, handoffs, communications and watcher
  protocol for Codex and Claude.

The older root HTML, asset folders and `scripts/build.py` are retained only as
historical rollback material. They are not invoked by package scripts, CI or the
GitHub Pages artifact.

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

Astro serves the site under `/profile/`. Use the URL printed by the development
server. The immersive route is available at `/profile/explore/`.

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
- complete eight-location, fifteen-guide and four-power immersive manifests;
- full-body companion dimensions, transparency and responsive framing;
- responsive Static View art integrity;
- A4 page counts, overflow, section boundaries, fonts, metadata and PDF links;
- desktop, mobile, no-JavaScript and accessibility browser tests;
- GitHub Pages base paths, sitemap, robots, icons and release metadata;
- zero JavaScript in Static View and one isolated immersive runtime; and
- absence of public em dash characters, canvas, heavy 3D formats and unapproved
  runtime assets.

Generated PDFs are written to:

- `dist/documents/bongo-seakhoa-resume.pdf`
- `dist/documents/bongo-kosa-resume.pdf`
- `dist/documents/bongo-seakhoa-cv.pdf`
- `dist/documents/bongo-kosa-cv.pdf`

## Deployment and rollback

`.github/workflows/deploy-pages.yml` builds and validates the exact `dist/`
artifact before GitHub Pages deployment from `main`. The deployed artifact
includes `version.json` with its release revision and build identity.

The previous production state is preserved by the
`legacy-pages-baseline-20260730` tag. A failed release can redeploy the last
known-good artifact without rebuilding it from unreviewed source.

## Content and asset boundaries

- Do not publish private phone numbers or raw certificate files.
- Do not infer contract type, contribution, outcome or metrics without evidence.
- Keep both surname document variants aligned from the shared manifest.
- Never copy unapproved reference masters into Static View.
- Never ship assets marked `SUPERSEDED_DO_NOT_SHIP`.
- Keep the immersive runtime isolated under `public/assets/immersive/`.
- Keep the entire full-body companion visible whenever the companion is authored
  to be on screen.
- Keep Anzania explicitly fictional in metadata and visitor-facing copy.

See `AI-COLLAB/plans/MASTER-EXECUTION-PLAN.md`,
`AI-COLLAB/status/STATUS.md` and
`docs/PROFILE-UPGRADE-2-5D-RELEASE.md` for the execution record and release
criteria.
