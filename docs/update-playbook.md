# Update Playbook

This repository is designed for repeatable, evidence-backed maintenance.

## Sources of truth

Public profile data lives in `src/data/profile/`:

- `identity.json` for names, positioning and public links
- `experience.json` for roles and evidence boundaries
- `projects.json` for portfolio records
- `capabilities.json` and `skills.json` for professional strengths
- `education.json` and `credentials.json` for learning and verification
- `routes.json` and `site-settings.json` for site structure and policy
- `document-manifest.json` for the curated Resume and CV page plans

Do not edit generated files in `dist/`. Put private evidence and authoring
material under `source/private/`, which is excluded from public output.

## Requirements

- Node.js 24.14.x
- pnpm 11.9.0
- Google Chrome or a compatible Playwright Chromium runtime
- `pdftotext` from Poppler for extracted-text privacy verification

Python is not part of the production website, Resume or CV pipeline.

## Standard update flow

1. Add new evidence under `source/private/`.
2. Update only the relevant JSON source files in `src/data/profile/`.
3. Keep claims concise, professional and traceable to evidence.
4. Validate the content model:

   ```powershell
   pnpm run validate:content
   ```

5. Build the site and all four browser-native documents:

   ```powershell
   pnpm run build
   ```

6. Run the complete release suite:

   ```powershell
   pnpm run qa
   ```

7. Review the generated pages, all PDF pages and any changed visual assets.
8. Commit source changes and deterministic public derivatives together. Do not
   commit private authoring sources or runtime watcher state.

## Generated documents

The JavaScript and Chromium document pipeline writes:

- `dist/documents/bongo-seakhoa-resume.pdf`
- `dist/documents/bongo-kosa-resume.pdf`
- `dist/documents/bongo-seakhoa-cv.pdf`
- `dist/documents/bongo-kosa-cv.pdf`

The build fails on page-count drift, non-A4 geometry, overflow, missing fonts,
missing tags or links, insufficient selectable text, a missing or changed
approved business phone, another phone-like value or a public em dash.

## Rules for future updates

- Keep both surname document variants aligned from one shared manifest.
- Use Bongo Seakhoa as the primary public identity and keep Bongo Kosa as quiet
  continuity information.
- Publish only the exact owner-approved business phone. Do not publish another
  personal number, raw transcript, private certificate or unapproved reference
  master.
- Prefer public credential verification pages over uploaded certificates.
- State exact credential expiry dates and never present an expired credential
  as current.
- Keep public copy concise, natural and evidence-backed.
- Do not use U+2014 em dashes in public website or document copy.
- Use direct credential and project URLs instead of generic profile links.
- Keep Static View usable without JavaScript.
- Do not publish an immersive character, environment or animation asset until
  its production gate passes and the derivative is explicitly approved.

## Prompt templates

### Add a certification

```text
Add this certification to the profile repository. Update the evidence-backed
credential data, use only its public verification link, rebuild the site and
documents, and report any expiry or source warning.
```

### Update a role

```text
Update this role from the supplied evidence. Reconcile the experience record,
Resume, CV and related project entries without inventing contract type,
outcomes or dates. Rebuild and verify all outputs.
```

### Add a project

```text
Add this project to the professional profile. State Bongo's role, contribution,
evidence and privacy boundary clearly. Rebuild the site and documents, then run
the complete release checks.
```

### Refresh the profile

```text
Review the profile against the current evidence I provide. Tighten wording,
remove stale claims, preserve the identity hierarchy, keep private sources out
of public output, rebuild everything and summarize the validation evidence.
```

## Review checklist

- Do all canonical routes build under `/profile/`?
- Are claims supported and dates still accurate?
- Are credential links public, specific and current?
- Do both Resume and CV variants match the website data?
- Are all four PDFs exact A4, selectable, tagged and visually balanced?
- Does extracted PDF text contain the exact approved business phone, no other
  phone-like value and no em dashes?
- Are direct PDF downloads present?
- Is Static View readable without JavaScript?
- Are public artifacts free of private source paths and immersive authoring
  assets?
