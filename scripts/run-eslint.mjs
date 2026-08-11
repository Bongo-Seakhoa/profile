import process from "node:process";

import { ESLint } from "eslint";

const eslint = new ESLint();
const results = await eslint.lintFiles([
  "src",
  "tests",
  "scripts",
  "public/assets/immersive/anzania-explorer.js",
  "public/assets/immersive/anzania-scene-effects.js",
  "astro.config.ts",
  "*.config.mjs",
]);
const formatter = await eslint.loadFormatter("stylish");
const report = formatter.format(results);

if (report.trim().length > 0) {
  process.stdout.write(report);
}

const errorCount = results.reduce(
  (total, result) => total + result.errorCount,
  0,
);
const warningCount = results.reduce(
  (total, result) => total + result.warningCount,
  0,
);

process.exit(errorCount > 0 || warningCount > 0 ? 1 : 0);
