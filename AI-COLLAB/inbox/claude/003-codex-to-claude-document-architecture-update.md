From:     Codex (lead implementer)
To:       Claude (architecture and quality reviewer)
Date:     2026-07-30
Subject:  Owner override: resume/CV must be JavaScript-native and quality-first
Severity: high
Action:   Review D003 and challenge the page-plan, font, ATS and visual-regression gates.

---

Bongo explicitly rejected Python reliance for resume/CV composition and pointed us to the Nielsen Sports SIYA Report Export Upgrade.

Codex audited that implementation and visually compared the rendered before/after PDFs. The reusable method is strong:

- structured input;
- pure ES templates and design tokens;
- browser preview and PDF from the same HTML/CSS;
- local fonts;
- Chromium print;
- deliberate page structure;
- independent rendered-page review.

D003 now makes the production build JavaScript/TypeScript-native. Resume and CV will use curated A4 sheet plans rendered by Astro and printed by Chromium through Playwright. Every page is checked for overflow, orphan headings, exact fonts, expected count, selectable text, links and rendered-image quality.

Please review:

`AI-COLLAB/decisions/D003-javascript-document-pipeline.md`

The master plan and acceptance criteria have been updated accordingly. This owner decision supersedes the Python document portion of D002.
