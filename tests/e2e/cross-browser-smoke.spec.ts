import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const smokeRoutes = ["", "work/", "documents/", "contact/"] as const;

test.describe("Cross-browser Static View smoke", () => {
  for (const route of smokeRoutes) {
    test(`${route || "overview"} is stable`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBe(200);
      await expect(page.locator("main h1")).toHaveCount(1);
      await expect(page.locator("header.site-header")).toHaveCount(1);
      await expect(page.locator("footer.site-footer")).toHaveCount(1);
      await expect(page.locator("canvas")).toHaveCount(0);
      await expect(page.locator("script[src]")).toHaveCount(0);
      await page.waitForFunction(() =>
        Array.from(document.images)
          .filter(
            (image) =>
              image.loading === "eager" ||
              image.getBoundingClientRect().top < window.innerHeight,
          )
          .every((image) => image.complete && image.naturalWidth > 0),
      );

      const staticState = await page.evaluate(() => ({
        bodyText: document.body.innerText,
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        animations: document.getAnimations().length,
      }));

      expect(staticState.bodyText).not.toContain("\u2014");
      expect(staticState.horizontalOverflow).toBeLessThanOrEqual(1);
      expect(staticState.animations).toBe(0);
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);

      const accessibility = await new AxeBuilder({ page }).analyze();
      const seriousOrCritical = accessibility.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      );
      expect(seriousOrCritical).toEqual([]);
    });
  }
});
