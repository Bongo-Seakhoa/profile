import { beforeAll, describe, expect, it } from "vitest";

import { deriveExperienceOverlaps } from "../../../src/lib/content/experience-overlaps";
import { loadProfileContent } from "../../../src/lib/content/load-content";
import type { ProfileContent } from "../../../src/lib/content/schemas";
import { validateProfileContent } from "../../../src/lib/content/validate-content";

let canonical: ProfileContent;

beforeAll(async () => {
  canonical = await loadProfileContent();
});

function copyContent(): ProfileContent {
  return structuredClone(canonical);
}

describe("profile content contract", () => {
  it("accepts the canonical migration with owner-review warnings only", () => {
    const result = validateProfileContent(canonical, {
      now: new Date("2026-07-31T00:00:00.000Z"),
    });

    expect(result.errors).toEqual([]);
    expect(result.warnings.map(({ code }) => code)).toEqual([
      "OWNER_REVIEW_CONTRACT_TYPES",
      "OWNER_REVIEW_LINKEDIN",
      "OWNER_REVIEW_PROJECT_EVIDENCE",
    ]);
  });

  it("keeps Statistical Estimation as one canonical nested component", () => {
    const target = "statistical estimation for data science and ai";
    const titles = canonical.credentials.flatMap((credential) => [
      credential.title.toLocaleLowerCase("en"),
      ...credential.components.map((component) =>
        component.title.toLocaleLowerCase("en"),
      ),
    ]);

    expect(titles.filter((title) => title === target)).toHaveLength(1);
    const specialization = canonical.credentials.find(
      ({ id }) => id === "statistical-inference-specialization",
    );
    expect(
      specialization?.components.find(
        ({ id }) => id === "statistical-estimation-data-science-ai",
      ),
    ).toMatchObject({
      issued: "2022-06",
      verificationCode: "9V62MAPPCPV7",
    });
  });

  it("derives overlapping chronology without inferring contract types", () => {
    const overlaps = deriveExperienceOverlaps(canonical.experience);

    expect(overlaps).toContainEqual({
      leftId: "turing-freelance-data-scientist",
      rightId: "1eight-data-analyst-consultant",
      dateStart: "2022-12",
      dateEnd: "2023-04",
      leftContractType: "unknown",
      rightContractType: "unknown",
      basis: "published-month-ranges",
    });
    expect(
      overlaps.every(({ basis }) => basis === "published-month-ranges"),
    ).toBe(true);
  });

  it("accepts the approved public phone and rejects arbitrary phone drift", () => {
    expect(canonical.identity[0]?.publicPhone).toEqual({
      display: "+27 73 590 7659",
      href: "tel:+27735907659",
    });

    const content = copyContent();
    content.identity[0]!.summary.push(
      "Call +999 000 000 000 or visit https://bongokosa.wixsite.com/website",
    );

    const codes = validateProfileContent(content).errors.map(
      ({ code }) => code,
    );
    expect(codes).toContain("UNAPPROVED_PUBLIC_PHONE");
    expect(codes).toContain("WIX_SOURCE_FORBIDDEN");
  });

  it("rejects em dashes in public copy", () => {
    const content = copyContent();
    content.identity[0]!.valueStatement =
      "Clear systems — practical decisions.";

    const codes = validateProfileContent(content).errors.map(
      ({ code }) => code,
    );
    expect(codes).toContain("PUBLIC_EM_DASH");
  });

  it("rejects em dashes in public content", () => {
    const content = copyContent();
    content.routes[0]!.description = "A public sentence\u2014with an em dash.";

    const codes = validateProfileContent(content).errors.map(
      ({ code }) => code,
    );
    expect(codes).toContain("PUBLIC_EM_DASH");
  });

  it("rejects broken evidence and internal references", () => {
    const content = copyContent();
    content.capabilities[0]!.evidence[0]!.id = "missing-project";
    content.projects[1]!.evidenceState = "public-repository";
    content.projects[1]!.publicUrl = "https://example.com/not-a-repository";

    const codes = validateProfileContent(content).errors.map(
      ({ code }) => code,
    );
    expect(codes).toContain("BROKEN_CONTENT_REFERENCE");
    expect(codes).toContain("REPOSITORY_EVIDENCE_MISMATCH");
  });

  it("rejects project route drift", () => {
    const content = copyContent();
    content.routes = content.routes.filter(
      ({ id }) => id !== "project-fxpm-backtester",
    );

    const codes = validateProfileContent(content).errors.map(
      ({ code }) => code,
    );
    expect(codes).toContain("PROJECT_ROUTE_DRIFT");
  });

  it("rejects incomplete all-policy document selections", () => {
    const content = copyContent();
    const cv = content.documentManifest.find(({ id }) => id === "cv")!;
    const credentialSection = cv.pages[2]!.sections.find(
      ({ id }) => id === "cv-additional-learning",
    )!;
    credentialSection.itemIds = credentialSection.itemIds.filter(
      (id) => id !== "data-analysis-r-programming",
    );

    const codes = validateProfileContent(content).errors.map(
      ({ code }) => code,
    );
    expect(codes).toContain("INCOMPLETE_DOCUMENT_SELECTION");
  });

  it("rejects active credentials after expiry", () => {
    const content = copyContent();
    const result = validateProfileContent(content, {
      now: new Date("2028-01-01T00:00:00.000Z"),
    });

    expect(result.errors.map(({ code }) => code)).toContain(
      "EXPIRED_ACTIVE_CREDENTIAL",
    );
  });
});
