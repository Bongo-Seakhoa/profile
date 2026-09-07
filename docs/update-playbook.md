# Professional-record update playbook

## One authority

Edit professional facts only in `src/data/profile/`. Identity, experience, education, skills, credentials, projects, accepted research, routes and document selections are validated together. The retired `content/profile.json`, root HTML and old generator must not be restored as competing authoring paths. Historical releases remain in Git history.

Every credential is entered once. Its title, issuer, date precision, status and verification URL flow into the Credentials page and selected resume/CV sections. The name variants use the same records. Accepted research likewise supplies the homepage, Research page, Anzania highlights and document research sections.

## Review a career-state change

1. Review the source evidence and update the relevant canonical records. Preserve historical job titles. Completed roles have an end date and `current: false`. When an earlier record is verified but its dates are not, use null dates with an explicit `dateNote`, never invented months or `Present`.
2. Reconcile featured work, capability evidence, skill evidence, homepage highlights, research status and both document selections. A CV policy of `all` must select every record in that collection. Featured systems require problem, responsibility, scope, validation, result, evidence scope and limitations.
3. Complete the source review and explicitly record its date: `pnpm review:record --reviewed-on=YYYY-MM-DD`. This records semantic hashes, not new professional facts. It is never run automatically by the normal build.
4. Run `pnpm qa`, inspect desktop/mobile captures and every generated PDF page, then review the diff before merging. CI deploys only the tested main release and verifies the live revision and critical content.

The normal build rejects an unreviewed semantic content change, a second professional-record source or a review older than 90 days. A weekly scheduled check detects staleness even without a new commit. A passing hash check proves consistency with the recorded review, not truth about events outside the repository. New qualifications or employment changes still need to be supplied or deliberately reconciled.

## Evidence and privacy

Publish summaries of private work, not private code, customer records, mail, tokens or account metadata. Label local estimates and single-task calibrations precisely. A smaller context pack is not proof of better answers or lower billed cost. Accepted research is not described as published without a proceedings citation. Trading controls are not advertised as profitability or live-readiness evidence.

The September 2026 review restored Appen and the completed North-West University BSc from owner-supplied history. Exact start/end months remain unrecorded; their displayed notes preserve that limitation rather than guessing. Contract modalities and external LinkedIn reconciliation remain explicitly evidence-bound.

## Search and external identities

The supported production address remains `https://bongo-seakhoa.github.io/profile/`. Keep canonical URLs, social metadata and sitemap entries on that base. The project-local robots file is not a host-root policy. A missing host-root robots file does not itself block crawling. Do not migrate the site merely to repair an obsolete search snippet.

A root-site/custom-domain migration requires control of that separate host configuration and must preserve existing links. Search Console submission or re-indexing and edits to LinkedIn/Coursera profiles require the relevant account access. A successful deployment does not establish that a search engine has re-indexed it.

Primary reference: https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec
