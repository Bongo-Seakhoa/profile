import { defineCollection } from "astro:content";
import { file } from "astro/loaders";

import {
  capabilitySchema,
  credentialSchema,
  documentManifestSchema,
  educationSchema,
  experienceSchema,
  identitySchema,
  projectSchema,
  routeSchema,
  siteSettingsSchema,
  skillGroupSchema,
} from "@/lib/content/schemas";

const identity = defineCollection({
  loader: file("src/data/profile/identity.json"),
  schema: identitySchema,
});

const capabilities = defineCollection({
  loader: file("src/data/profile/capabilities.json"),
  schema: capabilitySchema,
});

const skills = defineCollection({
  loader: file("src/data/profile/skills.json"),
  schema: skillGroupSchema,
});

const experience = defineCollection({
  loader: file("src/data/profile/experience.json"),
  schema: experienceSchema,
});

const education = defineCollection({
  loader: file("src/data/profile/education.json"),
  schema: educationSchema,
});

const credentials = defineCollection({
  loader: file("src/data/profile/credentials.json"),
  schema: credentialSchema,
});

const projects = defineCollection({
  loader: file("src/data/profile/projects.json"),
  schema: projectSchema,
});

const routes = defineCollection({
  loader: file("src/data/profile/routes.json"),
  schema: routeSchema,
});

const siteSettings = defineCollection({
  loader: file("src/data/profile/site-settings.json"),
  schema: siteSettingsSchema,
});

const documentManifest = defineCollection({
  loader: file("src/data/profile/document-manifest.json"),
  schema: documentManifestSchema,
});

export const collections = {
  identity,
  capabilities,
  skills,
  experience,
  education,
  credentials,
  projects,
  routes,
  siteSettings,
  documentManifest,
};
