import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function beginJourney(page: Page) {
  await page.goto("explore/", { waitUntil: "networkidle" });
  await expect(page.locator("[data-arrival-gate]")).toBeVisible();
  await expect(
    page.getByText("An original fictional world", { exact: false }),
  ).toBeVisible();
  await page.locator("[data-begin-journey]").click();
  await expect(page.locator("[data-explorer]")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-experience-state",
    "exploring",
  );
}

// Framing can change through both the image transform and the companion's
// top/left/size transitions. Wait for active CSS transitions and then require
// several geometrically stable frames before sampling the full-body contract.
async function settleCompanionFrame(page: Page) {
  await page.evaluate(async () => {
    const companion = document.querySelector<HTMLElement>("[data-companion]");
    const image = document.querySelector<HTMLElement>("[data-companion-image]");
    if (!companion || !image) return;

    const nextFrame = () =>
      new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => resolve()),
      );

    // Allow a just-applied state class to instantiate its CSS transitions.
    await nextFrame();
    await nextFrame();

    const transitions = companion
      .getAnimations({ subtree: true })
      .filter((animation) => {
        const isCssTransition =
          typeof CSSTransition !== "undefined" &&
          animation instanceof CSSTransition;
        return (
          isCssTransition &&
          animation.playState !== "finished" &&
          animation.playState !== "idle"
        );
      });
    await Promise.allSettled(
      transitions.map((animation) => animation.finished),
    );

    type FrameSnapshot = {
      transform: string;
      imageTop: number;
      imageLeft: number;
      imageWidth: number;
      imageHeight: number;
      companionTop: number;
      companionLeft: number;
      companionWidth: number;
      companionHeight: number;
    };

    let previous: FrameSnapshot | null = null;
    let stableFrames = 0;
    for (let frame = 0; frame < 120 && stableFrames < 4; frame += 1) {
      const imageRect = image.getBoundingClientRect();
      const companionRect = companion.getBoundingClientRect();
      const current: FrameSnapshot = {
        transform: window.getComputedStyle(image).transform,
        imageTop: imageRect.top,
        imageLeft: imageRect.left,
        imageWidth: imageRect.width,
        imageHeight: imageRect.height,
        companionTop: companionRect.top,
        companionLeft: companionRect.left,
        companionWidth: companionRect.width,
        companionHeight: companionRect.height,
      };
      const stable =
        previous !== null &&
        current.transform === previous.transform &&
        Math.abs(current.imageTop - previous.imageTop) < 0.1 &&
        Math.abs(current.imageLeft - previous.imageLeft) < 0.1 &&
        Math.abs(current.imageWidth - previous.imageWidth) < 0.1 &&
        Math.abs(current.imageHeight - previous.imageHeight) < 0.1 &&
        Math.abs(current.companionTop - previous.companionTop) < 0.1 &&
        Math.abs(current.companionLeft - previous.companionLeft) < 0.1 &&
        Math.abs(current.companionWidth - previous.companionWidth) < 0.1 &&
        Math.abs(current.companionHeight - previous.companionHeight) < 0.1;

      stableFrames = stable ? stableFrames + 1 : 0;
      previous = current;
      await nextFrame();
    }

    if (stableFrames < 4) {
      throw new Error(
        "Companion geometry did not settle before framing was sampled.",
      );
    }
  });
}

async function framingMetrics(page: Page) {
  await settleCompanionFrame(page);
  return page.evaluate(() => {
    const avatar = document
      .querySelector<HTMLElement>("[data-companion-image]")
      ?.getBoundingClientRect();
    const panel = document
      .querySelector<HTMLElement>("[data-chapter-panel]")
      ?.getBoundingClientRect();

    if (!avatar || !panel) return null;
    const overlapsPanel = !(
      avatar.right <= panel.left ||
      avatar.left >= panel.right ||
      avatar.bottom <= panel.top ||
      avatar.top >= panel.bottom
    );

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      avatar: {
        top: avatar.top,
        right: avatar.right,
        bottom: avatar.bottom,
        left: avatar.left,
        width: avatar.width,
        height: avatar.height,
      },
      panel: {
        top: panel.top,
        right: panel.right,
        bottom: panel.bottom,
        left: panel.left,
      },
      ratio: avatar.height / window.innerHeight,
      overlapsPanel,
      frameStatus:
        document.querySelector<HTMLElement>("[data-companion]")?.dataset
          .frameStatus,
    };
  });
}

async function toastCollisionMetrics(page: Page) {
  return page.evaluate(() => {
    const toast = document
      .querySelector<HTMLElement>("[data-experience-toast]")
      ?.getBoundingClientRect();
    if (!toast) return null;

    const namedTargets = [
      ["chapter", "[data-chapter-panel]"],
      ["companion", "[data-companion-image]"],
      ["location", ".location-mark"],
      ["controls", ".traversal-controls"],
      ["topbar", ".explorer-topbar"],
      ["ability", "[data-ability-dock]"],
    ] as const;

    const collisions = namedTargets.flatMap(([name, selector]) => {
      const target = document
        .querySelector<HTMLElement>(selector)
        ?.getBoundingClientRect();
      if (!target) return [];
      const overlaps = !(
        toast.right <= target.left ||
        toast.left >= target.right ||
        toast.bottom <= target.top ||
        toast.top >= target.bottom
      );
      return overlaps ? [name] : [];
    });

    return {
      toast: {
        top: toast.top,
        right: toast.right,
        bottom: toast.bottom,
        left: toast.left,
      },
      viewport: { width: innerWidth, height: innerHeight },
      collisions,
    };
  });
}

function expectCompleteFullBody(
  metrics: Awaited<ReturnType<typeof framingMetrics>>,
) {
  expect(metrics).not.toBeNull();
  if (!metrics) return;

  expect(metrics.avatar.top).toBeGreaterThanOrEqual(-0.5);
  expect(metrics.avatar.left).toBeGreaterThanOrEqual(-0.5);
  expect(metrics.avatar.right).toBeLessThanOrEqual(
    metrics.viewport.width + 0.5,
  );
  expect(metrics.avatar.bottom).toBeLessThanOrEqual(
    metrics.viewport.height + 0.5,
  );
  expect(metrics.ratio).toBeGreaterThanOrEqual(0.2);
  expect(metrics.ratio).toBeLessThanOrEqual(0.49);
  expect(metrics.overlapsPanel).toBe(false);
  expect(metrics.frameStatus).toBe("safe");
}

test.describe("Explore Anzania release experience", () => {
  test("identifies Anzania as fictional and keeps Static View one action away", async ({
    page,
  }) => {
    const response = await page.goto("explore/", { waitUntil: "networkidle" });

    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText("ANZANIA");
    await expect(
      page.getByText("Its places are narrative spaces, not real geography."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Continue in Static View" }),
    ).toHaveAttribute("href", "/profile/");
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 768, height: 1024 },
    { width: 1024, height: 650 },
    { width: 1440, height: 1000 },
  ]) {
    test(`keeps the larger complete guide visible at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await beginJourney(page);
      await expect
        .poll(async () => (await framingMetrics(page))?.frameStatus)
        .toBe("safe");
      expectCompleteFullBody(await framingMetrics(page));
    });
  }

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    test(`keeps guidance toast inside its safe zone at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await beginJourney(page);
      const toast = page.locator("[data-experience-toast]");
      await expect(toast).toHaveClass(/is-visible/);

      const metrics = await toastCollisionMetrics(page);
      expect(metrics).not.toBeNull();
      if (!metrics) return;
      expect(metrics.toast.top).toBeGreaterThanOrEqual(0);
      expect(metrics.toast.left).toBeGreaterThanOrEqual(0);
      expect(metrics.toast.right).toBeLessThanOrEqual(metrics.viewport.width);
      expect(metrics.toast.bottom).toBeLessThanOrEqual(metrics.viewport.height);
      expect(metrics.collisions).toEqual([]);
    });
  }

  test("preserves full-body framing through look-back, traversal and return", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await beginJourney(page);

    const before = await framingMetrics(page);
    expectCompleteFullBody(before);

    await page.keyboard.down("l");
    await expect(page.locator("[data-experience]")).toHaveClass(
      /is-looking-back/,
    );
    const lookingBack = await framingMetrics(page);
    expectCompleteFullBody(lookingBack);
    expect(
      Math.abs((lookingBack?.ratio ?? 0) - (before?.ratio ?? 0)),
    ).toBeLessThan(0.005);
    await page.keyboard.up("l");
    await expect(page.locator("[data-experience]")).not.toHaveClass(
      /is-looking-back/,
    );

    await page.locator('[data-power-id="solar-propulsion"]').click();
    await expect(
      page.locator('[data-power-id="solar-propulsion"]'),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-selected-ability-name]")).toHaveText(
      "Solar Step",
    );

    await page.locator("[data-next-location]").click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-experience-state",
      "traversing",
    );
    await expect(page.locator("[data-experience]")).toHaveClass(
      /is-solar-propelling/,
    );
    expectCompleteFullBody(await framingMetrics(page));
    await expect(page.locator("[data-location-name]")).toHaveText(
      "Stone Pass of Context",
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-experience-state",
      "exploring",
    );
    expectCompleteFullBody(await framingMetrics(page));
  });

  test("opens the atlas, selects an original guide and reveals a deep location record", async ({
    page,
  }) => {
    await beginJourney(page);

    await page.locator("[data-map-button]").click();
    await expect(page.locator("[data-map-dialog]")).toBeVisible();
    await expect(page.locator("[data-map-location-index]")).toHaveCount(8);
    await page.locator("[data-close-dialog]").first().click();

    await page.locator("[data-guide-button]").click();
    await expect(page.locator("[data-guide-dialog]")).toBeVisible();
    await expect(page.locator("[data-guide-id]")).toHaveCount(6);
    await expect
      .poll(() =>
        page
          .locator("[data-guide-id] img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement &&
                image.complete &&
                image.naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    await page.locator('[data-guide-id="dn-f-afr-01"]').click();
    await expect(page.locator("[data-companion-name]")).toHaveText("Zuri");
    await expect(page.locator("[data-guide-specialty]")).toHaveText(
      "Evidence guardian",
    );
    expectCompleteFullBody(await framingMetrics(page));

    await page.locator("[data-portal-button]").click();
    await expect(page.locator("[data-experience]")).toHaveAttribute(
      "data-scene-mode",
      "inner",
    );
    await expect(page.locator("[data-mode-indicator]")).toContainText(
      "Inner place",
    );
    await expect(page.locator("[data-chapter-inside]")).toBeVisible();
    await expect(page.locator("[data-inside-tab]")).toHaveCount(3);
    await expect(page.getByText("MetaPOS Mind", { exact: true })).toBeVisible();

    await page.locator('[data-inside-tab="logic"]').click();
    await expect(
      page.getByText("Make complexity navigable", { exact: true }),
    ).toBeVisible();
  });

  test("has no serious accessibility violations after the crossing opens", async ({
    page,
  }) => {
    await beginJourney(page);
    const accessibility = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = accessibility.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
