import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { formatRecordDates } from "../../../src/lib/content/format-record-dates";
import { loadProfileContent } from "../../../src/lib/content/load-content";
import { validateProfileContent } from "../../../src/lib/content/validate-content";

const temporaryRoots: string[] = [];
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "profile-review-"));
  temporaryRoots.push(root);
  cpSync("src/data/profile", join(root, "src/data/profile"), {
    recursive: true,
  });
  cpSync("docs", join(root, "docs"), { recursive: true });
  return root;
}
function check(root: string): number | null {
  return spawnSync(
    process.execPath,
    [resolve("scripts/check-professional-record.mjs")],
    {
      env: { ...process.env, PROFILE_REVIEW_ROOT: root },
      encoding: "utf8",
    },
  ).status;
}
afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("professional-record regression gates", () => {
  it("keeps Blossom closed in June 2025 and includes the new credential in both documents", async () => {
    const content = await loadProfileContent();
    const blossom = content.experience.find(
      (record) => record.id === "blossom-superagent-mentor",
    )!;
    expect(blossom).toMatchObject({ dateEnd: "2025-06", current: false });
    expect(
      formatRecordDates(blossom.dateStart, blossom.dateEnd, blossom.current),
    ).toBe("Nov 2024 to Jun 2025");
    expect(
      content.credentials.find(
        (record) => record.id === "google-project-management",
      ),
    ).toMatchObject({
      issued: "2026-08",
      verificationCode: "TN8RXZY8M354",
      status: "completed",
    });
    for (const document of content.documentManifest) {
      const ids = document.pages.flatMap((page) =>
        page.sections.flatMap((section) => section.itemIds),
      );
      expect(ids).toEqual(
        expect.arrayContaining([
          "google-project-management",
          "omnimind",
          "fxpm-validation-system",
          "ism-2026-validation-gates",
        ]),
      );
    }
  });
  it("preserves verified earlier records without fabricating dates or active status", async () => {
    const content = await loadProfileContent();
    for (const record of [...content.experience, ...content.education].filter(
      (record) => record.dateStart === null,
    )) {
      expect(record.current).toBe(false);
      expect(
        formatRecordDates(
          record.dateStart,
          record.dateEnd,
          record.current,
          record.dateNote,
        ),
      ).not.toContain("Present");
    }
    expect(() => formatRecordDates(null, null, true)).toThrow();
    expect(() => formatRecordDates("2024-01", null, false)).toThrow();
  });
  it("rejects missing research and skill evidence references", async () => {
    const content = await loadProfileContent();
    content.research[0]!.relatedProjectIds = ["missing-project"];
    content.skills[0]!.evidenceProjectIds = ["missing-project"];
    const result = validateProfileContent(content, {
      now: new Date("2026-09-08T00:00:00Z"),
    });
    expect(
      result.errors.filter(
        (error) => error.code === "BROKEN_EVIDENCE_REFERENCE",
      ),
    ).toHaveLength(2);
  });
  it("rejects semantic data drift and stale review receipts", () => {
    const root = fixture();
    const receiptPath = join(root, "docs/professional-record-review.json");
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
      reviewedOn: string;
    };
    receipt.reviewedOn = "2000-01-01";
    writeFileSync(receiptPath, JSON.stringify(receipt));
    expect(check(root)).toBe(1);
    const second = fixture();
    const path = join(second, "src/data/profile/experience.json");
    const records = JSON.parse(readFileSync(path, "utf8")) as {
      id: string;
      current: boolean;
      dateEnd: string | null;
    }[];
    const blossom = records.find(
      (record) => record.id === "blossom-superagent-mentor",
    )!;
    blossom.current = true;
    blossom.dateEnd = null;
    writeFileSync(path, JSON.stringify(records));
    expect(check(second)).toBe(1);
  });
});

describe("education attribution", () => {
  it("retains the owner's current degree and removes the rejected qualification", async () => {
    const content = await loadProfileContent();
    expect(content.education.map((record) => record.id)).toEqual([
      "university-debrecen-engineering-management",
      "explore-ai-data-science",
    ]);
    expect(content.education[0]!.current).toBe(true);
    expect(JSON.stringify(content)).not.toMatch(
      /microbiolog|biochem|north-west-university-bsc|completed science degree/i,
    );
  });
  it("blocks a rejected attribution even when explicitly recording a new review", () => {
    const root = fixture();
    const path = join(root, "src/data/profile/education.json");
    const records = JSON.parse(readFileSync(path, "utf8")) as {
      qualification: string;
    }[];
    records[0]!.qualification = "BSc in Microbiology and Biochemistry";
    writeFileSync(path, JSON.stringify(records));
    const result = spawnSync(
      process.execPath,
      [
        resolve("scripts/check-professional-record.mjs"),
        "--record",
        "--reviewed-on=2026-09-08",
      ],
      { env: { ...process.env, PROFILE_REVIEW_ROOT: root }, encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("owner-rejected education attribution");
  });
});
