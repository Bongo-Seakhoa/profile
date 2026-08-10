import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const coreRoutes = [
  "",
  "work/",
  "capabilities/",
  "experience/",
  "research/",
  "education/",
  "credentials/",
  "about/",
  "documents/",
  "contact/",
  "bongo-kosa/",
] as const;

const projectRoutes = [
  "work/metapos-app-data-management/",
  "work/fxpm-1-4-forex-portfolio-manager/",
  "work/streamlit-recommender-system/",
  "work/regression-predict-api/",
  "work/visualizing-filters-cnn/",
  "work/airqo-environmental-data/",
  "work/mql5-expert-advisor/",
  "work/fxpm-backtester/",
  "work/institutional-ls-sr-trading-ea/",
  "work/openai-trader-experiment/",
] as const;

const methodologyRoutes = ["work/human-governed-ai-delivery-method/"] as const;

const workRoutes = [...projectRoutes, ...methodologyRoutes] as const;

const documentRoutes = [
  "documents/resume/bongo-seakhoa/",
  "documents/resume/bongo-kosa/",
  "documents/cv/bongo-seakhoa/",
  "documents/cv/bongo-kosa/",
] as const;

const pdfRoutes = [
  "documents/bongo-seakhoa-resume.pdf",
  "documents/bongo-kosa-resume.pdf",
  "documents/bongo-seakhoa-cv.pdf",
  "documents/bongo-kosa-cv.pdf",
] as const;

test.describe("Static View route and accessibility contract", () => {
  for (const route of [...coreRoutes, ...workRoutes]) {
    test(`${route || "overview"} renders semantic, static content`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      await expect(page.locator("main h1")).toHaveCount(1);
      await expect(page.locator("header.site-header")).toHaveCount(1);
      await expect(page.locator("footer.site-footer")).toHaveCount(1);
      await expect(page.locator("canvas")).toHaveCount(0);
      await page.waitForFunction(
        () => document.documentElement.dataset.staticReady === "true",
      );

      const staticState = await page.evaluate(() => ({
        bodyText: document.body.innerText,
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        enhanced:
          document.documentElement.classList.contains("static-enhanced"),
        scriptSources: Array.from(document.scripts)
          .map((script) => script.getAttribute("src"))
          .filter(Boolean),
      }));

      expect(staticState.bodyText).not.toContain("\u2014");
      expect(staticState.horizontalOverflow).toBeLessThanOrEqual(1);
      expect(staticState.enhanced).toBe(true);
      expect(staticState.scriptSources).toEqual([
        "/profile/assets/static/static-runtime.js",
      ]);
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);

      if (projectRoutes.includes(route as (typeof projectRoutes)[number])) {
        await expect(
          page.getByRole("heading", { name: "Technology stack", exact: true }),
        ).toHaveCount(1);
        expect(
          await page.locator(".technology-list li").count(),
        ).toBeGreaterThan(0);
      }

      if (
        methodologyRoutes.includes(route as (typeof methodologyRoutes)[number])
      ) {
        await expect(
          page.getByRole("heading", { name: "Delivery stack", exact: true }),
        ).toHaveCount(1);
        expect(
          await page.locator(".technology-list li").count(),
        ).toBeGreaterThan(0);
      }

      const accessibility = await new AxeBuilder({ page }).analyze();
      const seriousOrCritical = accessibility.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      );
      expect(seriousOrCritical).toEqual([]);
    });
  }

  test("work index gives every project a summary and clearly separates the methodology", async ({
    page,
  }) => {
    await page.goto("work/", { waitUntil: "networkidle" });

    const cards = page.locator(".project-card");
    await expect(cards).toHaveCount(workRoutes.length);

    for (const card of await page
      .locator('.project-card[data-record-kind="project"]')
      .all()) {
      await expect(card.locator(".project-card__summary")).toHaveCount(1);
      await expect(
        card.getByText("Technology stack", { exact: true }),
      ).toHaveCount(1);
      expect(await card.locator(".technology-list li").count()).toBeGreaterThan(
        0,
      );
    }

    const methodologyCard = page.locator(
      '.project-card[data-record-kind="methodology"]',
    );
    await expect(methodologyCard).toHaveCount(methodologyRoutes.length);
    await expect(methodologyCard.locator(".project-card__summary")).toHaveCount(
      1,
    );
    await expect(
      methodologyCard.getByText("Delivery stack", { exact: true }),
    ).toHaveCount(1);
    expect(
      await methodologyCard.locator(".technology-list li").count(),
    ).toBeGreaterThan(0);
  });

  test("related work requires real technology overlap", async ({ page }) => {
    await page.goto("work/metapos-app-data-management/", {
      waitUntil: "networkidle",
    });

    let relatedWork = page.getByRole("region", { name: "Related work" });
    await expect(relatedWork).toContainText(
      "Streamlit-Based Recommender System",
    );
    await expect(relatedWork).toContainText("Regression Predict API");
    await expect(relatedWork).not.toContainText("Visualizing Filters of a CNN");
    await expect(relatedWork).not.toContainText("FxPM 1.4");

    await page.goto("work/institutional-ls-sr-trading-ea/", {
      waitUntil: "networkidle",
    });
    relatedWork = page.getByRole("region", { name: "Related work" });
    await expect(relatedWork).toContainText("MQL5 Expert Advisor");
    await expect(relatedWork).not.toContainText("MetaPOS Mind");
    await expect(relatedWork).not.toContainText("Visualizing Filters of a CNN");

    for (const route of [
      "work/visualizing-filters-cnn/",
      "work/human-governed-ai-delivery-method/",
    ]) {
      await page.goto(route, { waitUntil: "networkidle" });
      await expect(
        page.getByRole("region", { name: "Related work" }),
      ).toHaveCount(0);
    }
  });

  test("methodology publishes HowTo metadata and methodology social naming", async ({
    page,
  }) => {
    await page.goto("work/human-governed-ai-delivery-method/", {
      waitUntil: "networkidle",
    });

    const jsonLd = JSON.parse(
      (await page
        .locator('script[type="application/ld+json"]')
        .textContent()) ?? "{}",
    ) as { "@graph"?: Array<Record<string, unknown>> };
    const methodology = jsonLd["@graph"]?.find(
      (entry) => entry.name === "Human-Governed AI Delivery Method",
    );

    expect(methodology).toMatchObject({
      "@type": "HowTo",
      name: "Human-Governed AI Delivery Method",
    });
    expect(JSON.stringify(methodology)).not.toContain("CreativeWork");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/assets\/social\/methodology-human-governed-ai-delivery-method\.jpg$/,
    );
  });

  test("key routes remain complete without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    for (const route of ["", "work/", "documents/", "contact/"]) {
      const response = await page.goto(
        new URL(route, "http://127.0.0.1:4321/profile/").href,
      );
      expect(response?.status()).toBe(200);
      await expect(page.locator("main h1")).toHaveCount(1);
      expect(await page.locator('a[href^="mailto:"]').count()).toBeGreaterThan(
        0,
      );
    }

    await page.goto("http://127.0.0.1:4321/profile/documents/");
    for (const pdfRoute of pdfRoutes) {
      expect(
        await page.locator(`a[href="/profile/${pdfRoute}"]`).count(),
      ).toBeGreaterThan(0);
    }

    await context.close();
  });

  test("skip link reaches the main landmark", async ({ page }) => {
    await page.goto("");
    await page.keyboard.press("Tab");
    const skipLink = page.locator(".skip-link");
    await expect(skipLink).toBeFocused();
    await skipLink.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("command navigator opens, filters and closes accessibly", async ({
    page,
  }) => {
    await page.goto("", { waitUntil: "networkidle" });
    await page.waitForFunction(
      () => document.documentElement.dataset.staticReady === "true",
    );
    await page.keyboard.press("Control+K");

    const dialog = page.locator("[data-command-dialog]");
    await expect(dialog).toBeVisible();
    await expect(page.locator("[data-command-search]")).toBeFocused();

    await page.locator("[data-command-search]").fill("research");
    await expect(
      page.locator(
        '[data-command-item]:not([hidden]) a[href="/profile/research/"]',
      ),
    ).toHaveCount(1);
    await expect(page.locator("[data-command-item]:not([hidden])")).toHaveCount(
      1,
    );

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(page.locator("[data-command-trigger]")).toBeFocused();
  });

  test("reduced motion keeps every record visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("", { waitUntil: "networkidle" });
    await page.waitForFunction(
      () => document.documentElement.dataset.staticReady === "true",
    );

    await expect(page.locator('html[data-motion="reduced"]')).toHaveCount(1);
    await expect(page.locator('[data-reveal-state="pending"]')).toHaveCount(0);
    const hiddenRecords = await page.evaluate(
      () =>
        Array.from(
          document.querySelectorAll("main section, [data-signal-card]"),
        ).filter((element) => getComputedStyle(element).opacity === "0").length,
    );
    expect(hiddenRecords).toBe(0);
  });
});

test.describe("Responsive layout", () => {
  for (const viewport of [
    { width: 320, height: 720 },
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1280, height: 900 },
    { width: 1366, height: 650 },
    { width: 1440, height: 1000 },
  ]) {
    test(`overview contains content at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("", { waitUntil: "networkidle" });

      const result = await page.evaluate(() => ({
        overflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        overflowSources: Array.from(document.body.querySelectorAll("*"))
          .map((element) => {
            const box = element.getBoundingClientRect();
            return {
              selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${element.classList.length ? `.${Array.from(element.classList).join(".")}` : ""}`,
              left: Math.round(box.left),
              right: Math.round(box.right),
              width: Math.round(box.width),
            };
          })
          .filter(
            (element) =>
              element.left < -1 || element.right > window.innerWidth + 1,
          )
          .slice(0, 12),
        h1: (() => {
          const box = document.querySelector("h1")?.getBoundingClientRect();
          return box
            ? { left: box.left, right: box.right, width: box.width }
            : null;
        })(),
        signalLedger: (() => {
          const box = document
            .querySelector(".home-hero__ledger")
            ?.getBoundingClientRect();
          return box
            ? { left: box.left, right: box.right, width: box.width }
            : null;
        })(),
      }));

      expect(
        result.overflow,
        `Overflow sources: ${JSON.stringify(result.overflowSources)}`,
      ).toBeLessThanOrEqual(1);
      expect(result.h1?.width ?? 0).toBeGreaterThan(0);
      expect(result.signalLedger?.width ?? 0).toBeGreaterThan(0);
      expect(result.h1?.right ?? 0).toBeLessThanOrEqual(viewport.width + 1);
      expect(result.signalLedger?.right ?? 0).toBeLessThanOrEqual(
        viewport.width + 1,
      );
    });
  }

  test("professional header switches cleanly at laptop breakpoints", async ({
    page,
  }) => {
    for (const scenario of [
      { width: 1280, height: 900, desktop: false },
      { width: 1366, height: 900, desktop: true },
      { width: 1440, height: 1000, desktop: true },
    ]) {
      await page.setViewportSize({
        width: scenario.width,
        height: scenario.height,
      });
      await page.goto("", { waitUntil: "networkidle" });

      const headerState = await page.evaluate(() => {
        const header = document.querySelector(".site-header");
        const desktopNavigation = document.querySelector(".desktop-navigation");
        const mobileNavigation = document.querySelector(".mobile-navigation");
        const utilities = document.querySelector(".site-header__utilities");
        const box = header?.getBoundingClientRect();
        const utilityBox = utilities?.getBoundingClientRect();
        return {
          overflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          headerRight: box?.right ?? 0,
          utilitiesRight: utilityBox?.right ?? 0,
          desktopDisplay: desktopNavigation
            ? getComputedStyle(desktopNavigation).display
            : "none",
          mobileDisplay: mobileNavigation
            ? getComputedStyle(mobileNavigation).display
            : "none",
        };
      });

      expect(headerState.overflow).toBeLessThanOrEqual(1);
      expect(headerState.headerRight).toBeLessThanOrEqual(scenario.width + 1);
      expect(headerState.utilitiesRight).toBeLessThanOrEqual(
        scenario.width + 1,
      );
      expect(headerState.desktopDisplay === "block").toBe(scenario.desktop);
      expect(headerState.mobileDisplay === "block").toBe(!scenario.desktop);
    }
  });
});

test("document previews and direct PDFs are available", async ({
  page,
  request,
}) => {
  for (const route of documentRoutes) {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    const expectedPages = route.includes("/cv/") ? 3 : 2;
    await expect(page.locator("[data-document-page]")).toHaveCount(
      expectedPages,
    );
    await expect(page.locator(".document-toolbar__download")).toHaveAttribute(
      "href",
      /\/profile\/documents\/.+\.pdf$/,
    );
  }

  for (const route of pdfRoutes) {
    const response = await request.get(`/profile/${route}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    expect((await response.body()).byteLength).toBeGreaterThan(10_000);
  }
});

test("document previews remain contained at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of [
    "documents/resume/bongo-seakhoa/",
    "documents/cv/bongo-seakhoa/",
  ]) {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);

    const containment = await page.evaluate(() => ({
      bodyClientWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      rootClientWidth: document.documentElement.clientWidth,
      rootScrollWidth: document.documentElement.scrollWidth,
    }));

    expect(
      containment.bodyScrollWidth - containment.bodyClientWidth,
    ).toBeLessThanOrEqual(1);
    expect(
      containment.rootScrollWidth - containment.rootClientWidth,
    ).toBeLessThanOrEqual(1);
  }
});
