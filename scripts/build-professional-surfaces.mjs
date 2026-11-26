import { readFile, writeFile } from "node:fs/promises";

const load = async (name) =>
  JSON.parse(await readFile(`src/data/profile/${name}.json`, "utf8"));
const [identity] = await load("identity");
const allProjects = await load("projects");
const projects = allProjects
  .filter((project) => project.featured)
  .sort((a, b) => a.featuredOrder - b.featuredOrder);
const education = await load("education");
const learningRole = (await load("experience")).find(
  (record) => record.id === "2u-edx-learning-specialist",
);
if (!learningRole) throw new Error("Missing Anzania learning role");
const projectManagementCertificate = (await load("credentials")).find(
  (record) => record.id === "google-project-management",
);
if (!projectManagementCertificate)
  throw new Error("Missing Anzania project management credential");
const [paper] = await load("research");
const path = "dist/assets/immersive/runtime-manifest.json";
const manifest = JSON.parse(await readFile(path, "utf8"));
const location = (id) => {
  const value = manifest.locations.find((record) => record.id === id);
  if (!value) throw new Error(`Missing Anzania location: ${id}`);
  return value;
};
const threshold = location("threshold-dunes");
threshold.signalValue = projects.map((project) => project.title).join(" · ");
threshold.deepDive.now = projects.map((project) => ({
  status: "Professional case study",
  title: project.title,
  detail: project.role,
  path: `work/${project.slug}/`,
}));
const archive = location("archive-echoes");
archive.deepDive.now = [
  ["omnimind", "Professional case study"],
  ["visualizing-filters-cnn", "Public code"],
].map(([slug, status]) => {
  const project = allProjects.find((record) => record.slug === slug);
  if (!project) throw new Error(`Missing Archive evidence: ${slug}`);
  return {
    status,
    title: project.title,
    detail: project.summary,
    path: `work/${project.slug}/`,
  };
});
const garden = location("garden-origins");
garden.evidence = education.map((record) => ({
  label: record.institution,
  value: record.dateEnd
    ? `${record.qualification}, completed in ${record.dateEnd.slice(0, 4)}`
    : `${record.qualification} (${record.current ? "current study" : "completed"})`,
}));
garden.deepDive.now = [
  ...education.map((record) => ({
    status: record.current ? "Current study" : "Completed",
    title: record.qualification,
    detail: `${record.institution}. ${record.details[0]}`,
  })),
  {
    status: "Professional experience",
    title: `${learningRole.company} ${learningRole.role}`,
    detail: learningRole.summary,
  },
  {
    status: projectManagementCertificate.statusLabel,
    title: projectManagementCertificate.title,
    detail: projectManagementCertificate.issuer,
    path: "credentials/",
  },
];
const observatory = location("observatory-horizons");
observatory.deepDive.now = [
  { status: paper.statusLabel, title: paper.title, detail: paper.summary },
  {
    status: "Publication status",
    title: "Publication details",
    detail: paper.citationNote,
  },
];
manifest.professionalRecord = {
  canonicalSource: "src/data/profile/",
  reviewedOn: identity.lastReviewed,
};
await writeFile(path, JSON.stringify(manifest) + "\n");
console.log(
  "Built Anzania professional highlights from canonical records; scene design is unchanged.",
);
