import { readFile, writeFile } from "node:fs/promises";

const load = async (name) =>
  JSON.parse(await readFile(`src/data/profile/${name}.json`, "utf8"));
const [identity] = await load("identity");
const projects = (await load("projects"))
  .filter((project) => project.featured)
  .sort((a, b) => a.featuredOrder - b.featuredOrder);
const credentials = await load("credentials");
const education = await load("education");
const [paper] = await load("research");
const path = "dist/assets/immersive/runtime-manifest.json";
const manifest = JSON.parse(await readFile(path, "utf8"));
const location = (id) => {
  const value = manifest.locations.find((record) => record.id === id);
  if (!value) throw new Error(`Missing Anzania location: ${id}`);
  return value;
};
const threshold = location("threshold-dunes");
threshold.lead = identity.valueStatement;
threshold.signalValue = projects.map((project) => project.title).join(" · ");
threshold.evidence[0].value = identity.profileHighlights[0];
threshold.deepDive.now = projects.map((project) => ({
  status: "Current work",
  title: project.title,
  detail: project.summary,
}));
const archive = location("archive-echoes");
archive.deepDive.now = projects.map((project) => ({
  status: "Source-reviewed summary",
  title: project.title,
  detail: project.summary,
}));
archive.actions = projects.map((project) => ({
  label: `Read ${project.title}`,
  path: `work/${project.slug}/`,
}));
const garden = location("garden-origins");
garden.evidence = education.map((record) => ({
  label: record.institution,
  value:
    record.qualification +
    (record.current ? " (current study)" : " (completed)"),
}));
garden.deepDive.now = credentials
  .filter((record) => record.featured)
  .slice(0, 3)
  .map((record) => ({
    status: record.statusLabel,
    title: record.title,
    detail: record.issuer,
  }));
const observatory = location("observatory-horizons");
observatory.deepDive.now = [
  { status: paper.statusLabel, title: paper.title, detail: paper.summary },
  {
    status: "Publication status",
    title: "Acceptance is not publication",
    detail: paper.citationNote,
  },
];
manifest.professionalRecord = {
  canonicalSource: "src/data/profile/",
  reviewedOn: identity.lastReviewed,
};
await writeFile(path, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  "Built Anzania professional highlights from canonical records; scene design is unchanged.",
);
