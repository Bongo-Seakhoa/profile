# Professional Profile Hub

This repository replaces the older Wix portfolio and serves as the main public professional identity hub for **Bongo Seakhoa** and **Bongo Kosa**.

It is designed for GitHub Pages and supports both surname entry points cleanly:

- `/bongo-seakhoa/`
- `/bongo-kosa/`

The root page acts as a discovery hub so visitors can quickly choose the profile link that matches the surname they know.

## What This Repo Contains

- A polished static GitHub Pages profile site with animated aurora background, particle effects, and glassmorphism design
- Dual surname entry points
- A document selector page plus surname-matched resume and CV pages
- Four generated downloadable PDF documents: two resumes and two CVs
- Structured profile content in one source-of-truth file
- Separate sections for education, UC Boulder coursework, certifications, and additional learning
- Maintenance documentation for future prompt-driven updates

## Structure

- `content/profile.json`
  Main source of truth for biography, experience, education, coursework, credentials, links, and featured projects.
- `scripts/build.py`
  Generates the site pages plus the surname-specific resume and CV PDFs.
- `assets/site.css`
  Visual design system: aurora backgrounds, glassmorphism, gradient text, glow effects, staggered animations, responsive layout.
- `assets/site.js`
  Particle canvas, staggered reveal animations, scroll-triggered effects.
- `resume/index.html`
  Document selector page that links to both surname variants and both document types.
- `resume/bongo-seakhoa/index.html`
  Resume page for the Seakhoa surname variant.
- `resume/bongo-kosa/index.html`
  Resume page for the Kosa surname variant.
- `resume/cv/bongo-seakhoa/index.html`
  CV page for the Seakhoa surname variant.
- `resume/cv/bongo-kosa/index.html`
  CV page for the Kosa surname variant.
- `assets/files/bongo-seakhoa-resume.pdf`
  Generated downloadable PDF for the Seakhoa variant.
- `assets/files/bongo-kosa-resume.pdf`
  Generated downloadable PDF for the Kosa variant.
- `assets/files/bongo-seakhoa-cv.pdf`
  Generated downloadable CV PDF for the Seakhoa variant.
- `assets/files/bongo-kosa-cv.pdf`
  Generated downloadable CV PDF for the Kosa variant.
- `source/private/`
  Local-only evidence and raw materials. This folder is gitignored by default.
- `docs/update-playbook.md`
  Repeatable update process and prompt templates.

## Local Workflow

1. Update `content/profile.json`.
2. Run:

   ```powershell
   python scripts/build.py
   ```

3. Preview locally:

   ```powershell
   python -m http.server 8000
   ```

4. Open `http://localhost:8000`.
5. Review:
   - `index.html`
   - `bongo-seakhoa/index.html`
   - `bongo-kosa/index.html`
   - `resume/index.html`
   - `resume/bongo-seakhoa/index.html`
   - `resume/bongo-kosa/index.html`
   - `resume/cv/bongo-seakhoa/index.html`
   - `resume/cv/bongo-kosa/index.html`

## GitHub Pages Publishing

1. Push this repository to GitHub.
2. In repository settings, enable GitHub Pages.
3. Set the source to deploy from the repository root.
4. Your public hub will then expose the root identity selector plus the two surname-specific routes.

## Public vs Private Material

Sensitive raw files should remain in `source/private/` and stay out of the published site.

The public site should link only to safe public credential pages such as:

- Credly
- Coursera profile or accomplishment pages
- Google credential pages
- DataCamp certificate pages

## Notes

- The site intentionally treats **Bongo Seakhoa** and **Bongo Kosa** as the same professional identity.
- Resume and CV generation keep both surname variants aligned from one shared content source, with the surname as the intentional visible difference.
- Public credential links are used instead of exposing raw certificate PDFs.
- The generated documents are aligned with the same structured content used by the site so updates stay consistent.
- Education section reflects the current BSc in Engineering Management at the University of Debrecen.
- UC Boulder coursework completed via Coursera is listed separately under its own section.
