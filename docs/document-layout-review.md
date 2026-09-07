# Document layout review

Review date: 8 September 2026.

The first V2.1 build passed formatting, linting, Astro/TypeScript checks and all 73 unit tests, then correctly rejected a resume page overflow. A local rendered review also exposed the need to check section boundaries against the reserved footer, not only the outer A4 canvas.

The repair keeps the resume at two pages. Education retains qualifications, institutions, status, dates and results, while the full CV carries the longer education descriptions. Research headings now use the document's established typography rather than browser-default heading spacing. Credential status appears below each title at a more readable size.

The full CV is four pages: profile and primary experience; earlier experience, accepted research and academic coursework; selected systems with evidence-scoped outcomes and education; professional credentials and further learning. It includes the same canonical records under both name variants. The extra page replaces the previous compressed credential typography rather than dropping verified history.

The document generator now rejects content that enters the reserved footer area. The complete production build, browser journeys and release checks remain mandatory after this repair. Generated previews are review artifacts, not a separate source of professional content.
