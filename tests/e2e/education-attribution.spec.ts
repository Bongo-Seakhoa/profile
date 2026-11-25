import { expect, test } from "@playwright/test";

test("education correction is consistent across profile and document surfaces", async ({
  page,
  request,
}, testInfo) => {
  for (const route of [
    "",
    "about/",
    "bongo-kosa/",
    "education/",
    "documents/resume/bongo-seakhoa/",
    "documents/resume/bongo-kosa/",
    "documents/cv/bongo-seakhoa/",
    "documents/cv/bongo-kosa/",
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).not.toContainText(
      /microbiolog|biochem|completed science degree/i,
    );
    await expect(
      page.locator('[data-record-id="north-west-university-bsc"]'),
    ).toHaveCount(0);
    if (route === "bongo-kosa/") {
      await expect(
        page.getByRole("heading", { level: 1, name: "Bongo Kosa" }),
      ).toBeVisible();
    } else {
      await expect(page.locator("body")).toContainText(
        "Engineering Management",
      );
    }
  }
  await page.goto("education/");
  await expect(page.locator("main")).toContainText("Explore AI Academy");
  await page.screenshot({
    path: testInfo.outputPath("corrected-education.png"),
    fullPage: true,
    animations: "disabled",
  });
  const response = await request.get(
    "/profile/assets/immersive/runtime-manifest.json",
  );
  expect(response.status()).toBe(200);
  const text = await response.text();
  expect(text).not.toMatch(
    /microbiolog|biochem|north-west-university-bsc|scientific roots|a foundation in science/i,
  );
  expect(text).toContain("Google Project Management Professional Certificate");
});
