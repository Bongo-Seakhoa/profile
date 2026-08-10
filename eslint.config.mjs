import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import astro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      ".astro/**",
      "AI-COLLAB/**",
      "artifacts/**",
      "assets/**",
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "output/**",
      "playwright-report/**",
      "test-results/**",
      "tmp/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ["**/*.astro"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".astro"],
      },
    },
  },
  {
    files: ["scripts/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        document: "readonly",
        getComputedStyle: "readonly",
        HTMLElement: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["public/assets/immersive/*.js"],
    languageOptions: {
      globals: {
        console: "readonly",
        CSS: "readonly",
        document: "readonly",
        fetch: "readonly",
        HTMLCanvasElement: "readonly",
        HTMLElement: "readonly",
        HTMLImageElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLSelectElement: "readonly",
        HTMLTextAreaElement: "readonly",
        Image: "readonly",
        performance: "readonly",
        ResizeObserver: "readonly",
        URL: "readonly",
        window: "readonly",
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
