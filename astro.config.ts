import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

const NON_INDEXABLE_PATHS = [
  "/profile/bongo-kosa/",
  "/profile/documents/cv/bongo-kosa/",
  "/profile/documents/cv/bongo-seakhoa/",
  "/profile/documents/resume/bongo-kosa/",
  "/profile/documents/resume/bongo-seakhoa/",
];

export default defineConfig({
  site: "https://bongo-seakhoa.github.io",
  base: "/profile",
  output: "static",
  trailingSlash: "always",
  compressHTML: true,
  build: {
    format: "directory",
    assets: "assets",
  },
  vite: {
    build: {
      cssCodeSplit: false,
    },
  },
  integrations: [
    sitemap({
      filter: (page) =>
        !NON_INDEXABLE_PATHS.some((path) => new URL(page).pathname === path),
    }),
  ],
});
