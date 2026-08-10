# Update Playbook

This repository is designed for repeatable, structured maintenance.

## Source of Truth

The main editable profile source is:

- `content/profile.json`

If something changes, update the structured data there first and then rebuild the site.

## Data Sections

The `profile.json` file contains these key sections:

- `identity` - Name, headline, summary, and highlights
- `entry_points` - Dual surname routing configuration
- `links` - External profile links
- `focus_areas` - Professional strength areas
- `experience` - Work history
- `education` - Formal qualifications
- `coursework` - UC Boulder courses completed via Coursera
- `learning` - Other individual course completions
- `certifications` - Grouped credentials with public verification links
- `projects` - Portfolio items
- `resume` - Resume and CV copy plus surname-matched generation settings
- `seo` - Page metadata

## Standard Update Flow

1. Place any new supporting material in `source/private/`.
2. Add or revise public-safe links in `content/profile.json`.
3. Update the relevant section.
4. Rebuild:

   ```powershell
   python scripts/build.py
   ```

5. Review the generated pages and document outputs.
6. Commit the updated structured data and generated output together.

Generated document outputs include:

- `resume/index.html`
- `resume/bongo-seakhoa/index.html`
- `resume/bongo-kosa/index.html`
- `resume/cv/bongo-seakhoa/index.html`
- `resume/cv/bongo-kosa/index.html`
- `assets/files/bongo-seakhoa-resume.pdf`
- `assets/files/bongo-kosa-resume.pdf`
- `assets/files/bongo-seakhoa-cv.pdf`
- `assets/files/bongo-kosa-cv.pdf`

## Rules for Future Updates

- Keep both surnames supported unless explicitly asked to remove one.
- Do not publish raw transcripts or sensitive certificate files.
- Prefer linking to public credential pages rather than uploading the certificate itself.
- If a certification expires, note the exact expiry date instead of presenting it as current.
- Keep tone professional, concise, and evidence-backed.
- Favor the strongest current positioning over outdated portfolio language.
- When adding Coursera courses from UC Boulder, place them in the `coursework` section. Other courses go in `learning`.
- Use specific Coursera verification URLs such as `coursera.org/account/accomplishments/verify/CODE` rather than generic profile links.
- Keep the surname-specific resume and CV variants aligned from the same shared content source. The visible surname is the intended difference between them.

## Reusable Update Briefs

Use concise briefs like these for future maintenance:

### Add a New Certification

```text
Add this new certification to my profile repo. Update content/profile.json, refresh the professional summary if needed, regenerate the site, and keep the same tone and structure. Use only the public credential link, not the raw certificate file.
```

### Update a Role

```text
Update my current role in the profile repo using this new information. Refresh the summary, experience section, resume, CV, and any related project or credential references so everything stays consistent.
```

### Add a Project

```text
Add this project to my professional profile repo. Choose whether it belongs in selected work, learning, or both. Keep the public-facing description professional and concise, and rebuild the site.
```

### Add a Coursera Course

```text
Add this completed Coursera course to my profile. If it is from UC Boulder, add it to the coursework section. Otherwise add it to learning. Include the verification code and direct verification link. Rebuild the site.
```

### Refresh the Whole Profile

```text
Review the entire professional profile repo against the latest files and links I provide. Tighten wording, remove outdated content, preserve both surnames, keep only safe public links, rebuild the site, and summarize what changed.
```

## Suggested Review Checklist

- Do both surname entry points still work?
- Does the root page clearly explain the naming duality?
- Are all credential links public and safe?
- Do the resume and CV match the website content?
- Are dates still accurate?
- Is expired certification status clearly labeled?
- Is the profile still coherent as one professional identity?
- Does the coursework section accurately reflect UC Boulder courses only?
- Do both surname-specific resume and CV pages and PDFs still build correctly?
