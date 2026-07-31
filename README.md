# Bongo Seakhoa Profile

Production portfolio for [bongo-seakhoa.github.io/profile](https://bongo-seakhoa.github.io/profile/).

Release 1 is a complete, semantic Static View with an Anzania-inspired editorial
system, conventional professional routes, and polished browser-native Resume and
CV downloads. The opt-in immersive Anzania experience follows as required
production work; Static View remains its accessible and professional fallback.

## Production architecture

- Astro 6 and TypeScript generate every public route as static HTML.
- Static View renders without client JavaScript, canvas, WebGL, decorative
  animation or immersive asset requests.
- One validated content model feeds the website, document previews and PDFs.
- Resume and CV PDFs are created with JavaScript, print CSS, Chromium and
  `pdf-lib`. Python is not part of the production build or document pipeline.
- Responsive Anzania artwork is generated with Sharp from an approved,
  hash-verified allowlist.
- The site is built for the GitHub Pages `/profile/` base path.
- Playwright, Axe, Vitest, Astro Check, TypeScript, ESLint and release validators
  form the quality gate.

## Source map

- `src/data/profile/`
  Evidence-bound identity, work, experience, education, credential, route and
  document manifests.
- `src/data/static-art/`
  Typed Anzania location registry, derivative manifest and provenance records.
- `src/pages/`
  Static routes, project detail pages and browser document previews.
- `src/components/`
  Site shell, content, media and professional document components.
- `src/immersive/`
  Full-body camera and animation runtime contracts for the later opt-in mode.
- `public/assets/images/anzania/`
  Approved responsive artwork derivatives only.
- `scripts/build-documents.mjs`
  Browser-native Resume and CV PDF generator.
- `scripts/build-static-art.mjs`
  Hash-checked responsive art pipeline.
- `scripts/validate-public-output.mjs`
  Public artifact, base-path, PDF-link and prohibited-output checks.
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
server.

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
- immersive camera and animation contract tests;
- responsive static-art integrity;
- A4 page counts, overflow, section boundaries, fonts, metadata and PDF links;
- desktop, mobile, no-JavaScript and accessibility browser tests;
- GitHub Pages base paths, sitemap, robots, icons and release metadata; and
- absence of public em dash characters, canvas, decorative motion and
  unrequested immersive assets.

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
- Never copy reference masters directly into `public/`.
- Never ship assets marked `SUPERSEDED_DO_NOT_SHIP` or noncanonical character
  concepts.
- Full character production waits for the approved canonical character reference
  pack. This dependency does not remove the required immersive milestones.

See `AI-COLLAB/plans/MASTER-EXECUTION-PLAN.md` and
`AI-COLLAB/status/STATUS.md` for the current production sequence and blockers.
