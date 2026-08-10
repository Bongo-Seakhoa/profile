import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { profileCollectionSchemas, type ProfileContent } from "./schemas";

const CONTENT_FILES = {
  identity: "identity.json",
  capabilities: "capabilities.json",
  skills: "skills.json",
  experience: "experience.json",
  education: "education.json",
  credentials: "credentials.json",
  projects: "projects.json",
  methodologies: "methodologies.json",
  routes: "routes.json",
  siteSettings: "site-settings.json",
  documentManifest: "document-manifest.json",
} as const;

type ContentCollectionName = keyof typeof CONTENT_FILES;

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

export async function loadProfileContent(
  repositoryRoot = process.cwd(),
): Promise<ProfileContent> {
  const contentDirectory = join(repositoryRoot, "src", "data", "profile");
  const loaded = {} as Record<ContentCollectionName, unknown>;

  await Promise.all(
    Object.entries(CONTENT_FILES).map(async ([collection, fileName]) => {
      loaded[collection as ContentCollectionName] = await readJson(
        join(contentDirectory, fileName),
      );
    }),
  );

  return {
    identity: profileCollectionSchemas.identity.parse(loaded.identity),
    capabilities: profileCollectionSchemas.capabilities.parse(
      loaded.capabilities,
    ),
    skills: profileCollectionSchemas.skills.parse(loaded.skills),
    experience: profileCollectionSchemas.experience.parse(loaded.experience),
    education: profileCollectionSchemas.education.parse(loaded.education),
    credentials: profileCollectionSchemas.credentials.parse(loaded.credentials),
    projects: profileCollectionSchemas.projects.parse(loaded.projects),
    methodologies: profileCollectionSchemas.methodologies.parse(
      loaded.methodologies,
    ),
    routes: profileCollectionSchemas.routes.parse(loaded.routes),
    siteSettings: profileCollectionSchemas.siteSettings.parse(
      loaded.siteSettings,
    ),
    documentManifest: profileCollectionSchemas.documentManifest.parse(
      loaded.documentManifest,
    ),
  };
}
