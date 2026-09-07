import { expect, test } from "@playwright/test";

test("current professional record is consistent across public surfaces", async ({
  page,
}, testInfo) => {
  await page.goto("./");
  await expect(page.locator(".featured-work-grid")).toContainText("OmniMind");
  await expect(page.locator(".featured-work-grid")).toContainText(
    "FXPM: validation and execution",
  );
  await expect(page.locator("main")).toContainText("Accepted for ISM 2026");
  await expect(page.locator("main")).toContainText(
    "Google Project Management Professional Certificate",
  );
  await page.screenshot({
    path: testInfo.outputPath("homepage.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("experience/");
  const blossom = page.locator('[data-record-id="blossom-superagent-mentor"]');
  await expect(blossom).toContainText("Nov 2024 to Jun 2025");
  await expect(blossom).not.toContainText("Present");
  await expect(blossom).not.toContainText("Current role");
  await page.goto("credentials/");
  await expect(
    page.locator('[data-record-id="google-project-management"] a'),
  ).toHaveAttribute("href", /TN8RXZY8M354/);
  for (const kind of ["resume", "cv"]) {
    for (const name of ["bongo-seakhoa", "bongo-kosa"]) {
      await page.goto(`documents/${kind}/${name}/`);
      await expect(
        page.locator('[data-record-id="blossom-superagent-mentor"]'),
      ).toContainText("Jun 2025");
      await expect(
        page.locator('[data-record-id="blossom-superagent-mentor"]'),
      ).not.toContainText("Present");
      await expect(
        page.locator('[data-record-id="google-project-management"] a'),
      ).toHaveAttribute("href", /TN8RXZY8M354/);
      await expect(
        page.locator('[data-record-id="ism-2026-validation-gates"]'),
      ).toContainText("Accepted for ISM 2026");
    }
  }
  await page.goto("work/omnimind/");
  await expect(page.locator("main")).toContainText("57.66%");
  await expect(page.locator("main")).toContainText(
    "does not establish improved answer quality",
  );
  await expect(
    page.getByRole("link", { name: "View repository", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("omnimind-case-study.png"),
    fullPage: true,
    animations: "disabled",
  });
});
