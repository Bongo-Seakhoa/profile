# A011: Static environment-background contract

**Date:** 2026-07-31  
**Owner:** Codex  
**Scope:** Static View home, work and contact routes

## Requirement

The Anzania imagery in Static View must behave as complete environmental
backgrounds beneath a diminished-transparency white overlay. It must not read
as framed artwork. The professional site may use restrained gold texture, while
remaining legible, static and visually related to the immersive experience.

## Implemented verification

`tests/e2e/static-view.spec.ts` now declares the exact route-to-asset, veil and
focal-position contract for home, work and contact. Browser assertions prove:

- each expected image loads successfully;
- every backdrop, picture and image covers its parent section;
- applicable sections are direct children of `main` and span the viewport;
- images use `object-fit: cover` and a `100vw` responsive source contract;
- backdrop, picture and image have no border, radius or shadow;
- no Anzania asset is nested in a figure, article or aside;
- the decorative layer is hidden from accessibility APIs and pointer input;
- warm-white veil stops remain translucent and include a substantive copy-safe
  stop;
- the gold treatment is a restrained repeating line plus a narrow top stripe;
- desktop and mobile focal custom properties match the exact asset contract;
- the computed object position selects the correct responsive focal value.

## Independent results

| Gate | Result |
| --- | ---: |
| Focused background contract, desktop and mobile Chrome | 2/2 passed |
| Complete Static View suite, desktop Chrome | 33/33 passed |
| Complete Static View suite, mobile Chrome | 33/33 passed |
| Prettier check on changed files | Passed |
| Full repository ESLint | Passed |
| TypeScript `--noEmit` | Passed |
| Public-source U+2014 em-dash scan | 0 matches |
| `git diff --check` | Passed |

The legacy branch-root HTML copies also had nine public credential date ranges
changed from U+2014 em dashes to middle-dot separators. Current Astro source,
public assets and all three legacy HTML entry files now pass the public-copy
scan.

## Acceptance boundary

This audit proves DOM, CSS and responsive behavioral contracts against the
built site in configured headless desktop and mobile Chrome. It does not prove
subjective veil aesthetics, high-DPI source sharpness, the selected Bongo
Personal Chrome profile, production deployment or live-site parity. Those
remain separate acceptance gates and must not be inferred from this result.
