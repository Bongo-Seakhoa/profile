import { ZodError } from "astro/zod";

import { loadProfileContent } from "../src/lib/content/load-content";
import { validateProfileContent } from "../src/lib/content/validate-content";

function formatZodError(error: ZodError): string[] {
  return error.issues.map(
    (issue) =>
      `[schema] ${issue.path.length > 0 ? issue.path.join(".") : "$"}: ${issue.message}`,
  );
}

async function main(): Promise<void> {
  let content;

  try {
    content = await loadProfileContent();
  } catch (error) {
    if (error instanceof ZodError) {
      for (const line of formatZodError(error)) console.error(line);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  const result = validateProfileContent(content);
  for (const issue of result.issues) {
    const write = issue.severity === "error" ? console.error : console.warn;
    write(`[${issue.severity}] ${issue.code} ${issue.path}: ${issue.message}`);
  }

  console.log(
    `Validated ${content.projects.length} projects, ${content.methodologies.length} methodologies, ${content.credentials.length} credentials, ${content.routes.length} routes and ${content.documentManifest.length} document plans.`,
  );
  console.log(
    `Derived ${result.overlaps.length} experience overlap(s) from published month ranges; contract types remain evidence-bound.`,
  );

  if (result.errors.length > 0) {
    console.error(
      `Content validation failed with ${result.errors.length} error(s).`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Content validation passed with ${result.warnings.length} owner-review warning(s).`,
  );
}

await main();
