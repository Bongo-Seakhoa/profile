import { readFileSync, writeFileSync } from 'node:fs';
const base = 'src/data/profile/';
const read = name => JSON.parse(readFileSync(base + name + '.json', 'utf8'));
const write = (name, value) => writeFileSync(base + name + '.json', JSON.stringify(value, null, 2) + '\n');
const reviewed = '2026-09-08';
const identity = read('identity');
Object.assign(identity[0], {
  valueStatement: 'I build governed AI systems and data pipelines that make decisions traceable, testable and accountable to people.',
  summary: [
    'I work at the intersection of data engineering, governed AI and statistically validated decision systems. At MetaPOS, I build retail data workflows and MetaPOS Mind, a permission-aware context system for people and AI assistants.',
    'My independent work includes OmniMind, a local AI-work control plane, and FXPM, a regime-aware trading research and execution system. I separate implemented controls from measured results, and keep human approval explicit where decisions carry risk.',
    'I am studying Engineering Management at the University of Debrecen. My background combines a completed BSc in Microbiology and Biochemistry, data science training, and technical learning support across distributed teams.'
  ],
  profileHighlights: ['MetaPOS Mind: permission-aware organisational context', 'OmniMind: bounded context and human-controlled AI work', 'FXPM: regime-aware validation and execution engineering', 'Co-author of research accepted for ISM 2026'],
  lastReviewed: reviewed
});
write('identity', identity);
const experience = read('experience');
Object.assign(experience.find(x => x.id === 'blossom-superagent-mentor'), {
  dateEnd: '2025-06', current: false,
  summary: 'Mentored emerging talent pursuing paid freelance work and stronger market readiness.',
  highlights: ['Guided mentees in freelance readiness, client communication and professional positioning.', 'Supported confidence, practical next steps and consistent progress toward paid opportunities.'],
  lastReviewed: reviewed
});
experience.push({
  id: 'appen-internet-analyst', company: 'Appen', role: 'Freelance Internet Analyst', contractType: 'unknown', location: 'Remote', remote: true,
  dateStart: null, dateEnd: null, current: false, dateNote: 'Earlier experience; dates not recorded',
  summary: 'Evaluated online information and supported data-quality assurance through research and analytical review.',
  highlights: ['Applied research techniques and data-quality checks to internet analysis tasks.'],
  tools: ['Internet research', 'Data quality assurance'], evidenceLinks: [], evidenceState: 'owner-supplied-profile', privacyStatus: 'public', featured: false, featuredOrder: null, public: true, lastReviewed: reviewed
});
write('experience', experience);
const education = read('education');
education.push({
  id: 'north-west-university-bsc', institution: 'North-West University', qualification: 'BSc in Microbiology and Biochemistry',
  dateStart: null, dateEnd: null, current: false, dateNote: 'Completed; dates not recorded', location: 'South Africa',
  details: ['Completed undergraduate study in microbiology and biochemistry, providing a foundation in scientific inquiry and evidence-led analysis.'], result: null, evidenceLinks: [], evidenceState: 'owner-supplied-profile', featuredOrder: 2, public: true, lastReviewed: reviewed
});
education.find(x => x.id === 'explore-ai-data-science').featuredOrder = 3;
write('education', education);
const credentials = read('credentials');
for (const entry of credentials) if (entry.featuredOrder !== null) entry.featuredOrder += 1;
credentials.unshift({
  id: 'google-project-management', title: 'Google Project Management Professional Certificate', issuer: 'Google, via Coursera', kind: 'program', category: 'professional', issued: '2026-08', expires: null, status: 'completed', statusLabel: 'Completed August 2026',
  verificationUrl: 'https://www.coursera.org/account/accomplishments/professional-cert/certificate/TN8RXZY8M354', verificationCode: 'TN8RXZY8M354', components: [], evidenceState: 'public-verification-link', featured: true, featuredOrder: 1, public: true, lastReviewed: reviewed
});
write('credentials', credentials);
write('skills', [
  {id: 'core-engineering', label: 'Core engineering', items: ['Python', 'SQL', 'BigQuery / GCP', 'Data modelling and quality', 'Permission-aware AI context', 'Statistical validation'], evidenceProjectIds: ['metapos-app-data-management', 'omnimind', 'fxpm-validation-system']},
  {id: 'regular-delivery', label: 'Regular delivery tools', items: ['Git / GitHub', 'MCP', 'JSON Schema', 'YAML', 'Docker', 'Pandas / NumPy', 'Looker / Power BI'], evidenceProjectIds: ['metapos-app-data-management', 'omnimind']},
  {id: 'additional-experience', label: 'Additional experience', items: ['R', 'AWS', 'Scikit-learn', 'TensorFlow', 'Streamlit', 'Flask', 'Tableau'], evidenceProjectIds: ['visualizing-filters-cnn', 'streamlit-recommender-system', 'regression-predict-api']}
]);
const projects = read('projects');
for (const p of projects) {p.featured = p.id === 'metapos-app-data-management'; p.featuredOrder = p.featured ? 1 : null;}
const meta = projects.find(x => x.id === 'metapos-app-data-management');
Object.assign(meta, {
  problem: 'Company knowledge spread across documents, delivery records and conversations was difficult to turn into current, permission-safe working context.',
  scale: 'Company-context assembly, identity-aware access, delivery handoffs and deterministic work assurance in one internal system.',
  evidenceNotes: ['Client-safe summary of implementation and validation design. Internal company records and operating metrics are not published.'],
  lastReviewed: reviewed
});
projects.push({
  id: 'omnimind', slug: 'omnimind', title: 'OmniMind', type: 'Governed AI systems', status: 'professional', evidenceState: 'client-safe-summary', privacyStatus: 'client-safe-summary',
  summary: 'A local AI-work control plane that compiles bounded, task-specific context and coordinates evidence, provider handoffs and human-approved capabilities without duplicating project data.',
  role: 'System design and AI-assisted implementation',
  problem: 'AI coding sessions can waste context, confuse plans with current state and lose decisions between providers. Smaller prompts alone do not establish correctness.',
  scale: 'Lazy project discovery, structural indexing, line-range retrieval, bounded context compilation, shared coordination and scoped capability routing.',
  constraints: ['Source files remain authoritative; the system is not an autonomous agent or a second project database.', 'Credentials stay in provider or operating-system stores, outside retrieved context and metrics.'],
  contributions: ['Designed task-specific context routing with explicit evidence gaps and a hard context budget.', 'Integrated project-scoped coordination, evidence gates and capability routing across AI providers.', 'Separated context-size estimates from answer quality, provider billing and unsupported adoption claims.'],
  validation: ['The reviewed implementation records bounded context receipts and rejects credential-shaped material from retrieval.', 'An initial calibration pack was rejected after rendered-browser review found missing task-critical evidence. The revised pack was assessed against source rather than accepted for size alone.'],
  outcome: 'A 28 August 2026 local calibration selected 3,600 estimated tokens from an 8,502-token project estimate in 2.199 seconds, reporting a 57.66% context-size reduction.',
  evidenceNotes: ['One task-specific local calibration, documented in the project metrics record. Counts are deterministic estimates, not provider billing.', 'Implementation and calibration documentation reviewed on 8 September 2026. Private source is not presented as a public repository.'],
  limitations: ['The calibration does not establish improved answer quality, complete evidence coverage or lower API cost.', 'Machine-specific timing and one task cannot establish general performance. Independent cross-provider review must be recorded separately from self-review.'],
  technologies: ['Python', 'MCP', 'Context engineering', 'Evidence gates', 'Capability routing'], publicUrl: null, relatedExperienceIds: [], featured: true, featuredOrder: 2, caseStudyDepth: 'full', public: true, lastReviewed: reviewed
});
projects.push({
  id: 'fxpm-validation-system', slug: 'fxpm-validation-system', title: 'FXPM: validation and execution', type: 'Decision-system engineering', status: 'professional', evidenceState: 'client-safe-summary', privacyStatus: 'client-safe-summary',
  summary: 'A production-focused trading research system combining regime-aware strategy selection, stateful optimisation, statistical validation and broker-aware execution controls.',
  role: 'System design, validation research and AI-assisted engineering',
  problem: 'A promising historical strategy is not sufficient evidence for reliable live execution. Selection, transaction costs, changing regimes and broker constraints must be evaluated together.',
  scale: 'The reviewed development baseline spans a 50-strategy pool and four market regimes, with persisted optimisation state, execution checks and a companion dashboard.',
  constraints: ['Research outputs must remain separate from evidence of funded live performance.', 'Execution depends on broker contract metadata, available market data and explicit readiness decisions.'],
  contributions: ['Developed regime-aware candidate selection and persisted optimisation state rather than treating each run as a disconnected experiment.', 'Connected winner evidence, no-trade outcomes and fail-closed readiness checks to the execution path.', 'Investigated validation-gate design, dependence, selection effects and evidence sufficiency as part of continuing research.'],
  validation: ['The development implementation distinguishes tradeable winners from paper-only, blocked and no-trade states.', 'Execution checks cover broker preflight, position sizing, spread quality and margin protection.', 'Research examines simulation and historical evaluation separately, including the limits of observed results.'],
  outcome: 'An integrated development and research system that makes validation and execution constraints explicit. Current work focuses on the strength of selection evidence and reliable live behaviour.',
  evidenceNotes: ['Source-reviewed development architecture and client-safe research summary, 8 September 2026.', 'The linked research record reports acceptance at ISM 2026, not a published proceedings citation or audited trading result.'],
  limitations: ['No profitability, return, win-rate or production-readiness claim is made here.', 'Historical performance and implemented safeguards do not guarantee future results. Strategy selection and calibration remain active research.'],
  technologies: ['Python', 'Numba', 'Optuna', 'MetaTrader 5', 'Statistical validation'], publicUrl: null, relatedExperienceIds: [], featured: true, featuredOrder: 3, caseStudyDepth: 'full', public: true, lastReviewed: reviewed
});
for (const p of projects.filter(x => ['fxpm-1-4-forex-portfolio-manager', 'fxpm-backtester'].includes(x.id))) {
  p.publicUrl = null;
  p.limitations = [...p.limitations, 'Historical work; see the current FXPM validation and execution case study for the later development system.'];
}
write('projects', projects);
write('research', [{
  id: 'ism-2026-validation-gates', title: 'Simulation and Historical Evaluation of Validation-Gate Design in a Regime-Adaptive Decision System', venue: 'ISM 2026', status: 'accepted', statusLabel: 'Accepted for ISM 2026', role: 'Co-author',
  summary: 'Examines how validation gates shape a regime-adaptive decision system, separating simulation from historical evaluation and keeping the limits of both explicit.',
  citationNote: 'Accepted paper. Proceedings details, publication date and DOI are not yet recorded.',
  publicUrl: null, relatedProjectIds: ['fxpm-validation-system'], lastReviewed: reviewed
}]);
const caps = read('capabilities');
const ai = caps.find(x => x.id === 'applied-machine-learning');
ai.title = 'Governed AI and validated decision systems';
ai.evidence = [ai.evidence[0], {label: 'OmniMind bounded context and coordination', collection: 'project', id: 'omnimind'}, {label: 'FXPM validation and execution engineering', collection: 'project', id: 'fxpm-validation-system'}, ai.evidence[1]];
ai.tools = ['Python', 'MCP', 'JSON Schema', 'Context engineering', 'Statistical validation']; ai.lastReviewed = reviewed;
write('capabilities', caps);
const routes = read('routes');
for (const p of projects.filter(x => ['omnimind', 'fxpm-validation-system'].includes(x.id))) routes.push({
  id: 'project-' + p.id, path: 'work/' + p.slug + '/', kind: 'project', label: p.title, title: p.title + ' | Bongo Seakhoa', description: p.summary, navigation: false, navigationOrder: null, sitemap: true, canonicalRouteId: null, entityRef: {collection: 'project', id: p.id}, staticRenderable: true, immersiveDestinationId: 'project-' + p.id
});
routes.find(x => x.id === 'home').description = identity[0].valueStatement;
write('routes', routes);
const settings = read('site-settings');
settings[0].sourcePolicy.primarySource = 'src/data/profile/'; settings[0].defaultDescription = identity[0].valueStatement; settings[0].lastReviewed = reviewed;
write('site-settings', settings);
const manifests = read('document-manifest');
const allSkills = ['core-engineering', 'regular-delivery', 'additional-experience'];
const featuredProjects = ['metapos-app-data-management', 'omnimind', 'fxpm-validation-system'];
const sec = (id, kind, label, itemIds) => ({id, kind, label, itemIds});
const resume = manifests.find(x => x.id === 'resume');
resume.selectionPolicy.research = 'all'; resume.selectionPolicy.education = 'selected';
resume.pages = [
  {number: 1, sections: [sec('resume-identity','identity','Professional profile',['bongo-seakhoa']), sec('resume-profile','profile','Profile',['bongo-seakhoa']), sec('resume-skills','skills','Engineering focus', allSkills), sec('resume-experience','experience','Selected experience',['metapos-data-engineering-scientist','2u-edx-learning-specialist','blossom-superagent-mentor'])]},
  {number: 2, sections: [sec('resume-projects','projects','Selected systems',featuredProjects), sec('resume-research','research','Research',['ism-2026-validation-gates']), sec('resume-education','education','Education',['university-debrecen-engineering-management','north-west-university-bsc','explore-ai-data-science']), sec('resume-credentials','credentials','Selected credentials',['google-project-management','google-associate-cloud-engineer','google-cloud-digital-leader','datacamp-professional-data-scientist','ibm-advanced-data-science','worldquant-applied-data-science-lab'])]}
];
const chosen = resume.pages[1].sections.find(x => x.kind === 'credentials').itemIds;
for (const c of credentials.filter(x => x.featured)) if (!chosen.includes(c.id)) chosen.push(c.id);
const cv = manifests.find(x => x.id === 'cv'); cv.selectionPolicy.research = 'all';
cv.pages[0].sections.find(x => x.kind === 'skills').itemIds = allSkills;
cv.pages[1].sections.find(x => x.kind === 'experience').itemIds.push('appen-internet-analyst');
cv.pages[1].sections.find(x => x.kind === 'projects').itemIds = featuredProjects;
cv.pages[1].sections.push(sec('cv-research','research','Research and publications',['ism-2026-validation-gates']));
cv.pages[2].sections.find(x => x.kind === 'education').itemIds.push('north-west-university-bsc');
cv.pages[2].sections.find(x => x.kind === 'credentials' && x.id === 'cv-professional-credentials').itemIds.unshift('google-project-management');
for (const m of manifests) m.lastReviewed = reviewed;
write('document-manifest', manifests);
console.log('Professional record updated.');
