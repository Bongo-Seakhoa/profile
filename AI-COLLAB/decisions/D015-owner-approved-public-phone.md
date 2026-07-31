# D015 - Owner-approved public business phone

**Date:** 2026-07-31
**Owner:** Bongo Seakhoa
**Implementer:** Codex
**Status:** Adopted; supersedes D008

## Owner ruling

Bongo directly approved publishing the existing South African number as an
intentional client and recruiter contact. The portfolio exists to make direct
professional contact possible, and the same number is already public on the
owner's LinkedIn profile.

## Exact public contract

- Display value: `+27 73 590 7659`
- Telephone URI: `tel:+27735907659`
- Canonical source field: `identity.publicPhone`
- Publication surfaces: Contact page, all Resume previews, all CV previews and
  all four downloadable PDFs

The schema fixes both values exactly. Content, HTML and extracted-PDF checks
require the approved value and reject any different phone-like value or
telephone link. This prevents accidental drift while preserving direct client
access.

## Preserved quality gates

- PDF text must remain selectable and sufficiently complete.
- PDF metadata, tagged structure, embedded fonts, A4 geometry and page counts
  remain required.
- Public copy and extracted PDF text must not contain U+2014 em dashes.
- Unapproved personal data and raw private documents remain prohibited.

## History boundary

The same approved number appears in earlier public Git history. Because the
owner now confirms that publication is intentional, this is no longer a
privacy-remediation dependency and no history rewrite is required. R-026 is
closed as owner-intended exposure.
