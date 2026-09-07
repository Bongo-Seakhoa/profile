import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
const get = p => readFileSync(p, 'utf8');
const put = (p,s) => {mkdirSync(dirname(p), {recursive:true}); writeFileSync(p,s);};
function change(p, from, to) {const s=get(p); if(!s.includes(from)) throw new Error(`Patch missing in ${p}: ${from.slice(0,70)}`); put(p,s.replace(from,to));}
function all(p,from,to) {const s=get(p); if(!s.includes(from)) throw new Error(`Patch missing in ${p}: ${from}`); put(p,s.replaceAll(from,to));}
const schema = 'src/lib/content/schemas.ts';
change(schema, '  items: z.array(z.string().min(1)).min(1),', '  items: z.array(z.string().min(1)).min(1),\n  evidenceProjectIds: z.array(recordIdSchema).min(1),');
all(schema, '    dateStart: isoMonthSchema,', '    dateStart: isoMonthSchema.nullable(),\n    dateNote: z.string().min(1).optional(),');
all(schema, 'if (!entry.current && entry.dateEnd === null)', 'if (!entry.current && entry.dateEnd === null && !(entry.dateStart === null && entry.dateNote))');
all(schema, 'if (entry.dateEnd !== null && entry.dateEnd < entry.dateStart)', 'if (entry.dateStart !== null && entry.dateEnd !== null && entry.dateEnd < entry.dateStart)');
all(schema, '    if (entry.current && entry.dateEnd !== null) {', `    if (entry.dateStart === null && (entry.current || entry.dateEnd !== null || !entry.dateNote)) {
      context.addIssue({code: "custom", path: ["dateStart"], message: "Undated records must be completed, have no end date and explain the missing dates"});
    }
    if (entry.current && entry.dateEnd !== null) {`);
change(schema, '    publicUrl: httpsUrlSchema,', '    publicUrl: httpsUrlSchema.nullable(),\n    problem: z.string().min(1).optional(),\n    scale: z.string().min(1).optional(),\n    evidenceNotes: z.array(z.string().min(1)).default([]),');
change(schema, 'export const methodologySchema', `export const researchSchema = z.object({
  id: recordIdSchema,
  title: z.string().min(1),
  venue: z.string().min(1),
  status: z.literal("accepted"),
  statusLabel: z.string().min(1),
  role: z.string().min(1),
  summary: z.string().min(1),
  citationNote: z.string().min(1),
  publicUrl: httpsUrlSchema.nullable(),
  relatedProjectIds: z.array(recordIdSchema).min(1),
  lastReviewed: reviewedDateSchema,
});

export const methodologySchema`);
change(schema, 'export const documentSectionKindSchema = z.enum([', 'export const documentSectionKindSchema = z.enum([\n  "research",');
change(schema, '  selectionPolicy: z.object({', '  selectionPolicy: z.object({\n    research: z.enum(["all", "selected", "none"]),');
change(schema, 'primarySource: z.literal("content/profile.json")', 'primarySource: z.literal("src/data/profile/")');
change(schema, 'projects: z.array(projectSchema).length(10)', 'projects: z.array(projectSchema).min(1),\n  research: z.array(researchSchema).min(1)');
change(schema, 'export type Project =', 'export type Research = z.infer<typeof researchSchema>;\nexport type Project =');
change(schema, '  projects: Project[];', '  projects: Project[];\n  research: Research[];');
const loader='src/lib/content/load-content.ts';
change(loader, '  projects: "projects.json",','  projects: "projects.json",\n  research: "research.json",');
change(loader, '    projects: profileCollectionSchemas.projects.parse(loaded.projects),', '    projects: profileCollectionSchemas.projects.parse(loaded.projects),\n    research: profileCollectionSchemas.research.parse(loaded.research),');
const config='src/content.config.ts';
change(config,'  projectSchema,','  projectSchema,\n  researchSchema,');
change(config,'const methodologies = defineCollection({', 'const research = defineCollection({loader: file("src/data/profile/research.json"), schema: researchSchema});\n\nconst methodologies = defineCollection({');
change(config,'  projects,','  projects,\n  research,');
const validation='src/lib/content/validate-content.ts';
change(validation,'"skills" | "experience" | "projects" | "education" | "credentials";', '"skills" | "experience" | "projects" | "education" | "credentials" | "research";');
change(validation,'const DOCUMENT_SECTION_TO_COLLECTION = {','const DOCUMENT_SECTION_TO_COLLECTION = {\n  research: "research",');
change(validation,'    "projects",','    "projects",\n    "research",');
const countStart=get(validation).indexOf('  if (content.projects.length !== 10) {');
const countEnd=get(validation).indexOf('  const credentialIds =',countStart);
if(countStart<0 || countEnd<0) throw new Error('Project count guard not found');
put(validation,get(validation).slice(0,countStart)+get(validation).slice(countEnd));
change(validation,'if (record.dateStart > currentMonth)', 'if (record.dateStart !== null && record.dateStart > currentMonth)');
change(validation,'if (record.dateEnd !== null && record.dateEnd < record.dateStart)', 'if (record.dateStart !== null && record.dateEnd !== null && record.dateEnd < record.dateStart)');
change(validation,'new URL(project.publicUrl).hostname.toLocaleLowerCase("en")', 'new URL(project.publicUrl ?? "https://invalid.example").hostname.toLocaleLowerCase("en")');
change(validation,'    credentials: content.credentials.map(({ id }) => id),', '    credentials: content.credentials.map(({ id }) => id),\n    research: content.research.map(({ id }) => id),');
change(validation,'  const featuredIds: Record<SelectableCollection, string[]> = {','  const featuredIds: Record<SelectableCollection, string[]> = {\n    research: content.research.map(({id}) => id),');
change(validation,'  checkSourceReviewState(content, issues);', `  checkSourceReviewState(content, issues);
  const projectIds = new Set(content.projects.map(({id}) => id));
  for (const record of [...content.skills.map(skill => ({id: skill.id, refs: skill.evidenceProjectIds})), ...content.research.map(research => ({id: research.id, refs: research.relatedProjectIds}))]) {
    for (const id of record.refs) if (!projectIds.has(id)) addIssue(issues, "BROKEN_EVIDENCE_REFERENCE", "error", record.id, "Missing evidence project: " + id);
  }
  for (const project of content.projects.filter(({featured}) => featured)) {
    if (!project.problem || !project.scale || !project.role || !project.outcome || project.validation.length === 0 || project.evidenceNotes.length === 0 || project.limitations.length === 0) addIssue(issues, "FEATURED_EVIDENCE_GAP", "error", project.id, "Featured systems require problem, responsibility, scale, validation, result, evidence scope and limitations");
  }`);
put('src/lib/content/format-record-dates.ts', `export function formatRecordDates(start: string | null, end: string | null, current: boolean, note?: string): string {
  if (start === null) {
    if (current || end !== null || !note) throw new TypeError("Undated records require an explicit completed-record note");
    return note;
  }
  const formatter = new Intl.DateTimeFormat("en-GB", {month: "short", year: "numeric", timeZone: "UTC"});
  const format = (value: string): string => formatter.format(new Date(value + "-01T00:00:00Z"));
  if (!current && end === null) throw new TypeError("Completed dated records require an end date");
  return format(start) + " to " + (current ? "Present" : format(end!));
}
`);
const exp='src/components/content/ExperienceRecord.astro';
change(exp,'import type { Experience }', 'import { formatRecordDates } from "../../lib/content/format-record-dates";\nimport type { Experience }');
let text=get(exp), start=text.indexOf('const formatter ='), end=text.indexOf('const companyMark =');
put(exp,text.slice(0,start)+'const dateRange = formatRecordDates(experience.dateStart, experience.dateEnd, experience.current, experience.dateNote);\n'+text.slice(end));
const edu='src/pages/education/index.astro';
change(edu,'import ContentStyles', 'import { formatRecordDates } from "../../lib/content/format-record-dates";\nimport ContentStyles');
text=get(edu); start=text.indexOf('const monthFormatter ='); end=text.indexOf('---',start); put(edu,text.slice(0,start)+text.slice(end));
change(edu,`{formatMonth(record.dateStart)} to{" "}
                    {record.current
                      ? "Present"
                      : formatMonth(record.dateEnd ?? record.dateStart)}`, '{formatRecordDates(record.dateStart, record.dateEnd, record.current, record.dateNote)}');
change(edu,'Current undergraduate study, completed data and AI training, and active professional cloud credentials.', 'Current Engineering Management study, a completed science degree, data and AI training, and verified professional credentials.');
change('src/pages/experience/index.astro','right.dateStart.localeCompare(left.dateStart)', '(right.dateStart ?? "").localeCompare(left.dateStart ?? "")');
const overlaps='src/lib/content/experience-overlaps.ts';
change(overlaps,'const ordered = [...experience].sort(', 'const ordered = experience.filter((record): record is Experience & {dateStart: string} => record.dateStart !== null).sort(');
const doc='src/components/documents/ProfessionalDocument.astro';
change(doc,'import "@fontsource', 'import { formatRecordDates as formatRange } from "../../lib/content/format-record-dates";\nimport "@fontsource');
change(doc,'  Project,','  Project,\n  Research,');
change(doc,'const collections = {','const collections = {\n  research: new Map<string, Research>(content.research.map((item) => [item.id, item])),');
text=get(doc); start=text.indexOf('const monthFormatter ='); end=text.indexOf('function isIdentity',start); put(doc,text.slice(0,start)+text.slice(end));
change(doc,'function isIdentity', 'function isResearch(value: unknown): value is Research {\n  return typeof value === "object" && value !== null && "citationNote" in value;\n}\n\nfunction isIdentity');
all(doc,'                                      item.current,','                                      item.current,\n                                      item.dateNote,');
change(doc,'                      {section.kind === "education" && (', `                      {section.kind === "research" && (
                        <div class="record-list">
                          {items.filter(isResearch).map((item) => (
                            <article class="record" data-record-id={item.id}>
                              <h3><a href={withBase("research/")}>{item.title}</a></h3>
                              <p class="record__summary">{item.role}. {item.statusLabel}. {item.summary}</p>
                              <p class="record__tools">{item.citationNote}</p>
                            </article>
                          ))}
                        </div>
                      )}

                      {section.kind === "education" && (`);
change(doc,'                                    <h3>{item.title}</h3>', '                                    <h3><a href={withBase(`work/${item.slug}/`)}>{item.title}</a></h3>');
change(doc,'                                <h3>{item.title}</h3>', '                                <h3><a href={item.verificationUrl}>{item.title}</a></h3>');
const card='src/components/content/ProjectCard.astro';
change(card,'new URL(project.publicUrl).hostname', 'new URL(project.publicUrl ?? "https://invalid.example").hostname');
change(card,'project.status !== "archived" && (','project.publicUrl && project.status !== "archived" && (');
const detail='src/pages/work/[slug]/index.astro';
change(detail,'new URL(record.publicUrl).hostname','new URL(record.publicUrl ?? "https://invalid.example").hostname');
change(detail,': "Company website";', ': record.publicUrl ? "Company website" : "Source-reviewed private implementation";');
change(detail,'      url: record.publicUrl,','      url: canonicalUrl,');
change(detail,'project?.status !== "archived" && (','record.publicUrl && project?.status !== "archived" && (');
change(detail,'            <p>{record.summary}</p>', `            <p>{record.summary}</p>
            {project?.problem && <><h3>Problem</h3><p>{project.problem}</p></>}
            {project?.scale && <><h3>Engineering scope</h3><p>{project.scale}</p></>}`);
change(detail,'          <section class="integrity-note">', `          {project && project.evidenceNotes.length > 0 && <section><h2>Evidence scope</h2><ul>{project.evidenceNotes.map(note => <li>{note}</li>)}</ul></section>}
          <section class="integrity-note">`);
change(detail,'Client confidentiality limits the implementation detail shared\n                  here.', 'Private implementation and confidentiality boundaries limit the detail shared\n                  here.');
const research='src/pages/research/index.astro';
change(research,'const researchIds = new Set([','const acceptedPaper = content.research[0];\nif (!acceptedPaper) throw new Error("Accepted research record is missing.");\n\nconst researchIds = new Set([');
change(research,'<StatusBadge label="Accepted for ISM 2026" tone="public" />','<StatusBadge label={acceptedPaper.statusLabel} tone="public" />');
change(research,`            Simulation and Historical Evaluation of Validation-Gate Design in a
            Regime-Adaptive Decision System`, '            {acceptedPaper.title}');
text=get(research); start=text.indexOf('          <p class="accepted-paper__summary">'); end=text.indexOf('          <div class="accepted-paper__methods"',start);
put(research,text.slice(0,start)+'          <p class="accepted-paper__summary">{acceptedPaper.summary}</p>\n'+text.slice(end));
text=get(research); start=text.indexOf('          <p class="accepted-paper__note">'); end=text.indexOf('          </p>',start)+14;
put(research,text.slice(0,start)+'          <p class="accepted-paper__note">{acceptedPaper.citationNote}</p>'+text.slice(end));
change(research,'  activeRouteId={route.id}', `  activeRouteId={route.id}
  updatedDate={acceptedPaper.lastReviewed}
  structuredData={{"@type": "ScholarlyArticle", name: acceptedPaper.title, abstract: acceptedPaper.summary, creativeWorkStatus: acceptedPaper.statusLabel, author: {"@id": content.siteSettings[0]!.siteUrl + "#person"}, url: content.siteSettings[0]!.siteUrl + "research/"}}`);
const capability='src/pages/capabilities/index.astro';
change(capability,'import ContentStyles','import { sitePath } from "../../lib/urls";\nimport ContentStyles');
change(capability,'  <section\n    class="page-section page-section--surface"', `  <section class="page-section" aria-labelledby="engineering-focus-title">
    <Container size="content">
      <h2 id="engineering-focus-title">Engineering focus and supporting experience</h2>
      {content.skills.map(group => <article class="integrity-note" data-record-id={group.id}>
        <h3>{group.label}</h3><p>{group.items.join(" · ")}</p>
        <p>Evidence: {group.evidenceProjectIds.map((id, index) => {
          const project = content.projects.find(entry => entry.id === id)!;
          return <>{index > 0 && " · "}<a href={sitePath("work/" + project.slug + "/")}>{project.title}</a></>;
        })}</p>
      </article>)}
    </Container>
  </section>
  <section
    class="page-section page-section--surface"`);
const home='src/pages/index.astro';
change(home,'const linkedin =', 'const acceptedPaper = content.research[0]!;\nconst latestCredential = content.credentials.find(entry => entry.id === "google-project-management")!;\nconst linkedin =');
change(home,'MetaPOS Mind, AI systems and retail data engineering','MetaPOS Mind, OmniMind and validation research');
change(home,'<span>BS.2026.08</span>', '<span>BS.{identity.lastReviewed.slice(0, 7).replace("-", ".")}</span>');
change(home,'System profile / live index','System profile / reviewed record');
change(home,'title="AI systems, data products and applied models"','title="Governed AI and validated decision systems"');
change(home,'description="Flagship systems and public projects spanning governed AI, engineering workflows and applied models."','description="Three current systems, with responsibility, engineering decisions, evidence and limitations made explicit."');
change(home,'content.capabilities.map((capability, index)', 'content.capabilities.slice(0, 3).map((capability, index)');
text=get(home); start=text.lastIndexOf('  <section',text.indexOf('aria-labelledby="research-education-title"')); end=text.indexOf('  </section>',start)+12;
const researchSection=`  <section class="page-section page-section--muted" aria-labelledby="research-education-title" data-section-label="Accepted research">
    <Container>
      <SectionIntro id="research-education-title" eyebrow="Research and evidence" title="Validation is part of the system" />
      <div class="home-split-panels">
        <article data-signal-card>
          <p class="home-split-panels__label">{acceptedPaper.statusLabel}</p>
          <h3>{acceptedPaper.title}</h3><p>{acceptedPaper.summary}</p>
          <a href={sitePath("research/")}>Read the research record</a>
        </article>
        <article data-signal-card>
          <p class="home-split-panels__label">Current investigation</p>
          <h3>What counts as sufficient evidence?</h3>
          <p>Selection effects, dependence, transaction costs and changing regimes are part of the question. Implemented controls and historical results are kept separate from claims about live performance.</p>
          <a href={sitePath("work/fxpm-validation-system/")}>Explore the FXPM case study</a>
        </article>
      </div>
    </Container>
  </section>`;
text=text.slice(0,start)+text.slice(end);
const capsStart=text.lastIndexOf('  <section',text.indexOf('aria-labelledby="capabilities-title"'));
const capsEnd=text.indexOf('  </section>',capsStart)+12;
const capSection=text.slice(capsStart,capsEnd); text=text.slice(0,capsStart)+text.slice(capsEnd);
const experienceStart=text.lastIndexOf('  <section',text.indexOf('aria-labelledby="experience-title"'));
text=text.slice(0,experienceStart)+researchSection+'\n\n'+text.slice(experienceStart);
const afterExperience=text.indexOf('  </section>',text.indexOf('aria-labelledby="experience-title"'))+12;
text=text.slice(0,afterExperience)+'\n\n'+capSection+`\n\n  <section class="page-section" aria-labelledby="learning-title" data-section-label="Education and credentials">
    <Container>
      <SectionIntro id="learning-title" eyebrow="Education and credentials" title="A scientific foundation, continuing professional development" />
      <div class="home-split-panels">
        <article data-signal-card><p class="home-split-panels__label">Current study and completed education</p><h3>Engineering Management and scientific training</h3><p>{content.education.map(entry => entry.qualification + " at " + entry.institution).join(". ")}.</p><a href={sitePath("education/")}>View the academic record</a></article>
        <article data-signal-card><p class="home-split-panels__label">{latestCredential.statusLabel}</p><h3>{latestCredential.title}</h3><p>{latestCredential.issuer}. Alongside active Google Cloud credentials, this adds formal project-delivery training to the engineering record.</p><a href={latestCredential.verificationUrl}>Verify the latest certificate</a><p><a href={sitePath("credentials/")}>Browse all credentials</a></p></article>
      </div>
    </Container>
  </section>`+text.slice(afterExperience);
put(home,text);
const tests='tests/unit/content/content-validation.test.ts';
all(tests,'2026-07-31T00:00:00.000Z','2026-09-08T00:00:00.000Z');
change(tests,'expect(canonical.projects).toHaveLength(10);','expect(canonical.projects.length).toBeGreaterThanOrEqual(12);');
for(const path of ['content/profile.json','scripts/build.py','index.html','404.html','bongo-kosa','bongo-seakhoa','resume','robots.txt']) rmSync(path,{recursive:true,force:true});
const pkg=JSON.parse(get('package.json')); pkg.version='2.1.0';
pkg.scripts['validate:content']='node scripts/check-professional-record.mjs && tsx scripts/validate-content.ts';
pkg.scripts['review:record']='node scripts/check-professional-record.mjs --record';
pkg.scripts['build:site'] += ' && node scripts/build-professional-surfaces.mjs';
put('package.json',JSON.stringify(pkg,null,2)+'\n');
change('README.md', 'The older root HTML, asset folders and `scripts/build.py` are retained only as historical rollback material. They are not invoked by package scripts, CI or the GitHub Pages artifact.', 'The split records under `src/data/profile/` are the sole professional-content authority. The retired monolith, root HTML and legacy generator are recoverable from Git history, not editable alternatives. Anzania professional highlights are generated from the same records; its checked-in manifest remains a visual and narrative template. See `docs/update-playbook.md` for the required review and freshness gate.');
put('public/robots.txt', '# Project-site reference copy, not a host-root crawler policy.\n# Search crawlers request /robots.txt at the host root, not /profile/robots.txt.\n'+get('public/robots.txt'));
console.log('Canonical rendering, schema and selection changes applied.');
