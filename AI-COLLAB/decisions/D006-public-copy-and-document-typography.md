# D006 - Public copy and document typography

**Date:** 2026-07-30
**Owner:** Bongo Seakhoa
**Implementer:** Codex
**Status:** Adopted

## Owner direction

The public website, browser document previews and downloadable PDFs must:

1. contain no em dash characters;
2. use natural, concise writing;
3. avoid repeating the same idea within one paragraph;
4. share one restrained Anzania-inspired visual language;
5. use conventional professional typography rather than novelty display faces; and
6. keep polished PDF downloads directly accessible.

## Implementation contract

- Public content validation rejects U+2014 before build.
- Generated HTML validation rejects U+2014 after build.
- Resume and CV use IBM Plex Sans with Arial as the fallback. Heavy ordinary
  weights provide heading hierarchy without a decorative display font.
- IBM Plex Mono is limited to compact dates, page numbers and technical metadata.
- Document design uses the Static View palette, fine rules and restrained
  geometric motifs. Legibility and information hierarchy take priority.
- Each document route includes a direct matching PDF download action.
- The main Documents route and global site shell include direct PDF access.
- Copy review checks each paragraph for duplicated claims before release.

## Acceptance

- No U+2014 occurs in any generated public HTML.
- No U+2014 occurs in source content that can reach the website or documents.
- Browser inspection confirms that the intended local font loaded.
- Four PDFs are generated from the same content model as their HTML previews.
- PDF page counts, A4 dimensions, metadata, overflow and page composition pass.
- Document links remain usable with JavaScript disabled.
