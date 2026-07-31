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

const anzaniaBackgroundContracts = [
  {
    route: "",
    backgrounds: [
      {
        assetId: "threshold-dunes-outer",
        veil: "copy-left",
        desktopFocal: "53% 52%",
        mobileFocal: "53% 52%",
      },
      {
        assetId: "archive-echoes-outer",
        veil: "balanced",
        desktopFocal: "60% 55%",
        mobileFocal: "60% 55%",
      },
      {
        assetId: "oasis-audience-inner",
        veil: "quiet",
        desktopFocal: "50% 50%",
        mobileFocal: "50% 50%",
      },
    ],
  },
  {
    route: "work/",
    backgrounds: [
      {
        assetId: "archive-echoes-outer",
        veil: "balanced",
        desktopFocal: "60% 55%",
        mobileFocal: "60% 55%",
      },
    ],
  },
  {
    route: "contact/",
    backgrounds: [
      {
        assetId: "oasis-audience-inner",
        veil: "quiet",
        desktopFocal: "50% 50%",
        mobileFocal: "50% 50%",
      },
    ],
  },
] as const;

test.describe("Static View route and accessibility contract", () => {
  for (const route of [...coreRoutes, ...projectRoutes]) {
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

    await page.goto("http://127.0.0.1:4321/profile/contact/");
    await expect(
      page.getByRole("link", { name: "+27 73 590 7659" }),
    ).toHaveAttribute("href", "tel:+27735907659");

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
});

test.describe("Responsive layout", () => {
  for (const viewport of [
    { width: 320, height: 720 },
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
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
        heroImage: (() => {
          const box = document
            .querySelector('[data-anzania-asset="threshold-dunes-outer"] img')
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
      expect(result.heroImage?.width ?? 0).toBeGreaterThan(0);
      expect(result.h1?.right ?? 0).toBeLessThanOrEqual(viewport.width + 1);
      expect(result.heroImage?.right ?? 0).toBeLessThanOrEqual(
        viewport.width + 1,
      );
    });
  }
});

test("Anzania environments render as full, unframed section backgrounds", async ({
  page,
}) => {
  for (const contract of anzaniaBackgroundContracts) {
    const { route, backgrounds: expectedBackgrounds } = contract;
    await page.goto(route, { waitUntil: "networkidle" });

    const backdropLocator = page.locator(
      '[data-anzania-presentation="environmental-background"]',
    );
    await expect(backdropLocator).toHaveCount(expectedBackgrounds.length);

    for (const backdrop of await backdropLocator.all()) {
      await backdrop.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          backdrop
            .locator("img")
            .evaluate(
              (image) =>
                image instanceof HTMLImageElement &&
                image.complete &&
                image.naturalWidth > 0,
            ),
        )
        .toBe(true);
    }

    const presentations = await backdropLocator.evaluateAll((backdrops) =>
      backdrops.map((backdrop) => {
        const section = backdrop.parentElement;
        const picture = backdrop.querySelector("picture[data-anzania-asset]");
        const image = picture?.querySelector("img");
        const backdropBox = backdrop.getBoundingClientRect();
        const sectionBox = section?.getBoundingClientRect();
        const pictureBox = picture?.getBoundingClientRect();
        const imageBox = image?.getBoundingClientRect();
        const rootWidth = document.documentElement.clientWidth;
        const backdropStyle = getComputedStyle(backdrop);
        const pictureStyle = picture ? getComputedStyle(picture) : null;
        const imageStyle = image ? getComputedStyle(image) : null;
        const overlayStyle = getComputedStyle(backdrop, "::before");
        const goldStyle = getComputedStyle(backdrop, "::after");
        const isMobileFocalMode = matchMedia("(max-width: 47.999rem)").matches;

        const boxDifference = (
          candidate: DOMRect | undefined,
          reference: DOMRect | undefined,
        ): number => {
          if (!candidate || !reference) return Number.POSITIVE_INFINITY;

          return Math.max(
            Math.abs(candidate.left - reference.left),
            Math.abs(candidate.right - reference.right),
            Math.abs(candidate.top - reference.top),
            Math.abs(candidate.bottom - reference.bottom),
            Math.abs(candidate.width - reference.width),
            Math.abs(candidate.height - reference.height),
          );
        };

        const colourAlphas = (
          serializedGradient: string,
          red: number,
          green: number,
          blue: number,
        ): number[] => {
          const pattern = new RegExp(
            `rgba?\\(\\s*${red}(?:\\s*,\\s*|\\s+)${green}(?:\\s*,\\s*|\\s+)${blue}(?:\\s*(?:,|/)\\s*|\\s+)([\\d.]+)(%)?\\s*\\)`,
            "giu",
          );

          return [...serializedGradient.matchAll(pattern)].map((match) => {
            const alpha = Number(match[1]);
            return match[2] === "%" ? alpha / 100 : alpha;
          });
        };

        const frameStyles = [backdropStyle, pictureStyle, imageStyle].filter(
          (style): style is CSSStyleDeclaration => style !== null,
        );
        const firstGoldLayerSize = goldStyle.backgroundSize
          .split(",", 1)[0]
          ?.trim();
        const goldStripeHeight = firstGoldLayerSize
          ? Number.parseFloat(firstGoldLayerSize.split(/\s+/u).at(-1) ?? "")
          : Number.NaN;
        const desktopFocal = imageStyle
          ? `${imageStyle.getPropertyValue("--anzania-focal-desktop-x").trim()} ${imageStyle.getPropertyValue("--anzania-focal-desktop-y").trim()}`
          : "";
        const mobileFocal = imageStyle
          ? `${imageStyle.getPropertyValue("--anzania-focal-mobile-x").trim()} ${imageStyle.getPropertyValue("--anzania-focal-mobile-y").trim()}`
          : "";

        return {
          assetId: picture?.getAttribute("data-anzania-asset"),
          className: backdrop.className,
          position: backdropStyle.position,
          pointerEvents: backdropStyle.pointerEvents,
          ariaHidden: backdrop.getAttribute("aria-hidden"),
          overlay: backdrop.getAttribute("data-anzania-overlay"),
          overlayImage: overlayStyle.backgroundImage,
          whiteStopAlphas: colourAlphas(
            overlayStyle.backgroundImage,
            255,
            253,
            248,
          ),
          goldImage: goldStyle.backgroundImage,
          goldLineAlphas: colourAlphas(goldStyle.backgroundImage, 128, 96, 32),
          goldStripeHeight,
          goldRepeat: goldStyle.backgroundRepeat,
          directMainSection: section?.parentElement?.tagName === "MAIN",
          insideFramedLandmark: Boolean(
            backdrop.closest("article, aside, figure"),
          ),
          sectionViewportDifference: sectionBox
            ? Math.max(
                Math.abs(sectionBox.left),
                Math.abs(sectionBox.right - rootWidth),
                Math.abs(sectionBox.width - rootWidth),
              )
            : Number.POSITIVE_INFINITY,
          backdropCoverageDifference: boxDifference(backdropBox, sectionBox),
          pictureCoverageDifference: boxDifference(pictureBox, backdropBox),
          imageCoverageDifference: boxDifference(imageBox, backdropBox),
          objectFit: imageStyle?.objectFit,
          responsiveSizes: image?.getAttribute("sizes"),
          unframed: frameStyles.every(
            (style) =>
              style.borderTopWidth === "0px" &&
              style.borderRightWidth === "0px" &&
              style.borderBottomWidth === "0px" &&
              style.borderLeftWidth === "0px" &&
              style.borderRadius === "0px" &&
              style.boxShadow === "none",
          ),
          desktopFocal,
          mobileFocal,
          activeFocal: imageStyle?.objectPosition.replace(/\s+/gu, " ").trim(),
          isMobileFocalMode,
        };
      }),
    );

    expect(presentations.map(({ assetId }) => assetId)).toEqual(
      expectedBackgrounds.map(({ assetId }) => assetId),
    );

    for (const [index, presentation] of presentations.entries()) {
      const expected = expectedBackgrounds[index];
      expect(expected).toBeDefined();
      expect(presentation.className).toContain(
        `anzania-backdrop--${expected?.veil}`,
      );
      expect(presentation.position).toBe("absolute");
      expect(presentation.pointerEvents).toBe("none");
      expect(presentation.ariaHidden).toBe("true");
      expect(presentation.directMainSection).toBe(true);
      expect(presentation.insideFramedLandmark).toBe(false);
      expect(presentation.sectionViewportDifference).toBeLessThanOrEqual(1);
      expect(presentation.backdropCoverageDifference).toBeLessThanOrEqual(1);
      expect(presentation.pictureCoverageDifference).toBeLessThanOrEqual(1);
      expect(presentation.imageCoverageDifference).toBeLessThanOrEqual(1);
      expect(presentation.objectFit).toBe("cover");
      expect(presentation.responsiveSizes).toBe("100vw");
      expect(presentation.unframed).toBe(true);

      expect(presentation.overlay).toBe("translucent-white");
      expect(presentation.overlayImage).toContain("linear-gradient");
      expect(presentation.whiteStopAlphas.length).toBeGreaterThanOrEqual(2);
      expect(
        presentation.whiteStopAlphas.every(
          (alpha) => alpha >= 0.18 && alpha <= 0.96,
        ),
      ).toBe(true);
      expect(presentation.whiteStopAlphas.some((alpha) => alpha >= 0.68)).toBe(
        true,
      );

      expect(presentation.goldImage).toContain("linear-gradient");
      expect(presentation.goldImage).toContain("repeating-linear-gradient");
      expect(presentation.goldRepeat).toContain("no-repeat");
      expect(presentation.goldLineAlphas.length).toBeGreaterThanOrEqual(1);
      expect(
        presentation.goldLineAlphas.every(
          (alpha) => alpha > 0 && alpha <= 0.07,
        ),
      ).toBe(true);
      expect(presentation.goldStripeHeight).toBeGreaterThan(0);
      expect(presentation.goldStripeHeight).toBeLessThanOrEqual(4);

      expect(presentation.desktopFocal).toBe(expected?.desktopFocal);
      expect(presentation.mobileFocal).toBe(expected?.mobileFocal);
      expect(presentation.activeFocal).toBe(
        presentation.isMobileFocalMode
          ? expected?.mobileFocal
          : expected?.desktopFocal,
      );
    }

    await expect(page.locator("figure [data-anzania-asset]")).toHaveCount(0);
  }
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
    await expect(
      page.getByRole("link", { name: "+27 73 590 7659" }),
    ).toHaveAttribute("href", "tel:+27735907659");
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
