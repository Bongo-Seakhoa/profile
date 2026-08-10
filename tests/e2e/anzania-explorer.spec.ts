import { createHash } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

async function beginJourney(page: Page) {
  await page.goto("explore/", { waitUntil: "networkidle" });
  await expect(page.locator("[data-arrival-gate]")).toBeVisible();
  await expect(
    page.getByText("Anzania is a fictional place.", { exact: true }),
  ).toBeVisible();
  await page.locator("[data-begin-journey]").click();
  await expect(page.locator("[data-explorer]")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-experience-state",
    "exploring",
  );
}

async function waitForTwoPaintFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => resolve()),
        ),
      ),
  );
}

function pairwiseMeanDifferences(frames: readonly Buffer[]) {
  const differences: number[] = [];
  for (let left = 0; left < frames.length; left += 1) {
    for (let right = left + 1; right < frames.length; right += 1) {
      const leftFrame = frames[left];
      const rightFrame = frames[right];
      if (!leftFrame || !rightFrame) continue;
      let difference = 0;
      for (let channel = 0; channel < leftFrame.length; channel += 1) {
        const leftValue = leftFrame[channel];
        const rightValue = rightFrame[channel];
        if (leftValue === undefined || rightValue === undefined) continue;
        difference += Math.abs(leftValue - rightValue);
      }
      differences.push(difference / leftFrame.length);
    }
  }
  return differences;
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
      page.getByText("Anzania is a fictional place.", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Tanzania");
    await expect(
      page.getByRole("link", { name: "Continue in Static View" }),
    ).toHaveAttribute("href", "/profile/");
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect(page.locator("[data-scene-effects]")).toHaveCount(1);
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
    await expect(page.locator("[data-experience]")).toHaveClass(
      /is-solar-propelling/,
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-experience-state",
      "traversing",
    );
    await page.keyboard.press("m");
    await page.keyboard.press("g");
    await expect(page.locator("[data-map-dialog]")).not.toBeVisible();
    await expect(page.locator("[data-guide-dialog]")).not.toBeVisible();
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

  test("renders four distinct scene-first crossings without decorative overlays", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const testViewport =
      testInfo.project.name === "chrome-mobile"
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 };
    await page.setViewportSize(testViewport);
    await beginJourney(page);

    await expect(
      page.locator(
        "[data-power-transition], .scene__sky, .scene__light-rays, .scene__weather, .scene__environment, .scene__cursor-field",
      ),
    ).toHaveCount(0);

    const abilities = [
      {
        id: "dune-surfing",
        className: "is-dune-surfing",
        duration: "2100ms",
      },
      {
        id: "sand-teleportation",
        className: "is-sand-teleporting",
        duration: "2350ms",
      },
      {
        id: "solar-propulsion",
        className: "is-solar-propelling",
        duration: "2250ms",
      },
      {
        id: "reality-bending",
        className: "is-reality-bending",
        duration: "2400ms",
      },
    ] as const;
    const signatures = new Set<string>();
    const startSignatures = new Set<string>();
    const endSignatures = new Set<string>();
    const frameSamples: Buffer[] = [];
    const sceneCanvas = page.locator("[data-scene-effects]");

    for (const ability of abilities) {
      await page.locator(`[data-power-id="${ability.id}"]`).click();
      const outgoingBackground = await page
        .locator("[data-scene-current]")
        .evaluate((element) => (element as HTMLElement).style.backgroundImage);

      await page.evaluate(() => {
        type TransitionTraceEntry = {
          phase: "departure" | "arrival";
          className: string;
          duration: string;
          renderer: string;
          canvasWidth: number;
          canvasHeight: number;
          canvasOpacity: string;
          previousAnimation: string;
          currentAnimation: string;
          previousBackground: string;
          currentBackground: string;
        };
        type TraceWindow = typeof window & {
          __anzaniaTransitionTrace?: TransitionTraceEntry[];
          __anzaniaTransitionObserver?: MutationObserver;
        };

        const traceWindow = window as TraceWindow;
        const experience =
          document.querySelector<HTMLElement>("[data-experience]");
        const canvas = document.querySelector<HTMLCanvasElement>(
          "[data-scene-effects]",
        );
        const previous = document.querySelector<HTMLElement>(
          "[data-scene-previous]",
        );
        const current = document.querySelector<HTMLElement>(
          "[data-scene-current]",
        );
        if (!experience || !canvas || !previous || !current) {
          throw new Error(
            "Transition recorder could not find the scene layers.",
          );
        }

        traceWindow.__anzaniaTransitionObserver?.disconnect();
        traceWindow.__anzaniaTransitionTrace = [];

        const recordPhase = () => {
          const phase = experience.dataset.transitionPhase;
          if (phase !== "departure" && phase !== "arrival") return;
          if (
            traceWindow.__anzaniaTransitionTrace?.some(
              (entry) => entry.phase === phase,
            )
          ) {
            return;
          }

          const rect = canvas.getBoundingClientRect();
          traceWindow.__anzaniaTransitionTrace?.push({
            phase,
            className: experience.className,
            duration: getComputedStyle(document.documentElement)
              .getPropertyValue("--ability-duration")
              .trim(),
            renderer: experience.dataset.effectRenderer ?? "css-fallback",
            canvasWidth: rect.width,
            canvasHeight: rect.height,
            canvasOpacity: getComputedStyle(canvas).opacity,
            previousAnimation: getComputedStyle(previous).animationName,
            currentAnimation: getComputedStyle(current).animationName,
            previousBackground: previous.style.backgroundImage,
            currentBackground: current.style.backgroundImage,
          });
        };

        const observer = new MutationObserver(recordPhase);
        observer.observe(experience, {
          attributes: true,
          attributeFilter: ["data-transition-phase", "class"],
        });
        traceWindow.__anzaniaTransitionObserver = observer;
      });

      await page.locator("[data-next-location]").click();
      const experience = page.locator("[data-experience]");
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const traceWindow = window as typeof window & {
                __anzaniaTransitionTrace?: Array<{ phase: string }>;
              };
              return Boolean(
                traceWindow.__anzaniaTransitionTrace?.some(
                  (entry) => entry.phase === "departure",
                ),
              );
            }),
          { timeout: 10_000 },
        )
        .toBe(true);
      await expect(page.locator("html")).toHaveAttribute(
        "data-experience-state",
        "exploring",
        { timeout: 12_000 },
      );
      await expect(experience).not.toHaveAttribute("data-transition-phase");

      const trace = await page.evaluate(() => {
        type TransitionTraceEntry = {
          phase: "departure" | "arrival";
          className: string;
          duration: string;
          renderer: string;
          canvasWidth: number;
          canvasHeight: number;
          canvasOpacity: string;
          previousAnimation: string;
          currentAnimation: string;
          previousBackground: string;
          currentBackground: string;
        };
        const traceWindow = window as typeof window & {
          __anzaniaTransitionTrace?: TransitionTraceEntry[];
          __anzaniaTransitionObserver?: MutationObserver;
        };
        traceWindow.__anzaniaTransitionObserver?.disconnect();
        return traceWindow.__anzaniaTransitionTrace ?? [];
      });

      expect(trace.map((entry) => entry.phase)).toEqual([
        "departure",
        "arrival",
      ]);
      const departure = trace[0];
      const arrival = trace[1];
      if (!departure || !arrival) {
        throw new Error(`Missing transition phases for ${ability.id}`);
      }
      expect(departure.className).toContain(ability.className);
      expect(departure.duration).toBe(ability.duration);
      expect(departure.canvasWidth).toBeGreaterThanOrEqual(
        testViewport.width - 1,
      );
      expect(departure.canvasHeight).toBeGreaterThanOrEqual(
        testViewport.height - 1,
      );
      expect(departure.previousBackground).toBe(outgoingBackground);
      expect(departure.currentBackground).not.toBe(outgoingBackground);
      expect(arrival.className).toContain(ability.className);
      expect(departure.renderer).toBe("webgl");
      expect(arrival.renderer).toBe("webgl");
      expect(departure.canvasOpacity).toBe("1");
      expect(arrival.canvasOpacity).toBe("1");
      await expect(sceneCanvas).toHaveCSS("opacity", "0");
      await expect(sceneCanvas).not.toHaveClass(/is-active/);

      await page.mouse.move(testViewport.width / 2, testViewport.height / 2);
      await waitForTwoPaintFrames(page);
      const preview = await page.evaluate(async (powerId) => {
        const debugWindow = window as typeof window & {
          __ANZANIA_DEBUG__: {
            previewTransition: (options: {
              powerId: string;
              fromIndex: number;
              toIndex: number;
              progress: number;
            }) => Promise<{ available: boolean }>;
          };
        };
        return debugWindow.__ANZANIA_DEBUG__.previewTransition({
          powerId,
          fromIndex: 0,
          toIndex: 1,
          progress: 0.5,
        });
      }, ability.id);

      expect(preview.available).toBe(true);
      await expect(sceneCanvas).toHaveCSS("opacity", "1");
      await waitForTwoPaintFrames(page);
      const frame = await sceneCanvas.screenshot({
        animations: "disabled",
      });
      signatures.add(createHash("sha256").update(frame).digest("hex"));
      const sample = await sharp(frame)
        .resize(64, 36, { fit: "fill" })
        .removeAlpha()
        .raw()
        .toBuffer();
      const mean =
        sample.reduce((total, value) => total + value, 0) / sample.length;
      const standardDeviation = Math.sqrt(
        sample.reduce((total, value) => total + Math.pow(value - mean, 2), 0) /
          sample.length,
      );
      expect(standardDeviation).toBeGreaterThan(12);
      frameSamples.push(sample);

      for (const endpoint of [
        { progress: 0, signatures: startSignatures },
        { progress: 1, signatures: endSignatures },
      ]) {
        const endpointPreview = await page.evaluate(
          async ({ powerId, progress }) => {
            const debugWindow = window as typeof window & {
              __ANZANIA_DEBUG__: {
                previewTransition: (options: {
                  powerId: string;
                  fromIndex: number;
                  toIndex: number;
                  progress: number;
                }) => Promise<{
                  available: boolean;
                  signature: string;
                  opaquePixels: number;
                  pixelCount: number;
                }>;
              };
            };
            return debugWindow.__ANZANIA_DEBUG__.previewTransition({
              powerId,
              fromIndex: 0,
              toIndex: 1,
              progress,
            });
          },
          { powerId: ability.id, progress: endpoint.progress },
        );
        expect(endpointPreview.available).toBe(true);
        expect(endpointPreview.opaquePixels).toBeGreaterThan(
          endpointPreview.pixelCount * 0.99,
        );
        endpoint.signatures.add(endpointPreview.signature);
      }

      await page.evaluate(() => {
        (
          window as typeof window & {
            __ANZANIA_DEBUG__: { clearTransitionPreview: () => void };
          }
        ).__ANZANIA_DEBUG__.clearTransitionPreview();
      });
      await expect(sceneCanvas).toHaveCSS("opacity", "0");
    }

    expect(signatures.size).toBe(abilities.length);
    expect(startSignatures.size).toBe(1);
    expect(endSignatures.size).toBe(1);
    const frameDifferences = pairwiseMeanDifferences(frameSamples);
    expect(Math.min(...frameDifferences)).toBeGreaterThan(1);
    expect(pageErrors).toEqual([]);
  });

  test("keeps a painted crossing when WebGL is unavailable", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chrome-desktop",
      "The controlled fallback check runs once on desktop Chrome.",
    );
    await page.addInitScript({
      content: `(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (type === "webgl" || type === "experimental-webgl") return null;
          return original.call(this, type, ...args);
        };
      })();`,
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await beginJourney(page);

    await page.locator('[data-power-id="reality-bending"]').click();
    await page.locator("[data-next-location]").click();
    const experience = page.locator("[data-experience]");
    await expect(experience).toHaveAttribute(
      "data-effect-renderer",
      "css-fallback",
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-experience-state",
      "traversing",
    );
    await page.waitForTimeout(420);

    const fallbackFrame = await page.evaluate(() => {
      const style = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing fallback layer: ${selector}`);
        return getComputedStyle(element);
      };
      const previous = style(".scene__image--previous");
      const current = style(".scene__image--current");
      const previousForeground = style(".scene__foreground--previous");
      const currentForeground = style(".scene__foreground--current");
      return {
        backgroundOpacity: Number(previous.opacity) + Number(current.opacity),
        foregroundOpacity:
          Number(previousForeground.opacity) +
          Number(currentForeground.opacity),
        previousAnimation: previous.animationName,
        currentAnimation: current.animationName,
        previousForegroundAnimation: previousForeground.animationName,
        currentForegroundAnimation: currentForeground.animationName,
        canvasOpacity: style("[data-scene-effects]").opacity,
      };
    });

    expect(fallbackFrame.backgroundOpacity).toBeGreaterThan(0.8);
    expect(fallbackFrame.foregroundOpacity).toBeGreaterThan(0.5);
    expect(fallbackFrame.previousAnimation).toContain("cinematic-fold-out");
    expect(fallbackFrame.currentAnimation).toContain("cinematic-fold-in");
    expect(fallbackFrame.previousForegroundAnimation).toContain(
      "cinematic-foreground-out",
    );
    expect(fallbackFrame.currentForegroundAnimation).toContain(
      "cinematic-foreground-in",
    );
    expect(fallbackFrame.canvasOpacity).toBe("0");

    await expect(page.locator("html")).toHaveAttribute(
      "data-experience-state",
      "exploring",
      { timeout: 12_000 },
    );
    await expect(page.locator("[data-location-name]")).toHaveText(
      "Stone Pass of Context",
    );
  });

  test("hands an active crossing to the CSS fallback after context loss", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chrome-desktop",
      "The controlled context-loss check runs once on desktop Chrome.",
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await beginJourney(page);
    await page.locator('[data-power-id="dune-surfing"]').click();
    await page.locator("[data-next-location]").click();

    const experience = page.locator("[data-experience]");
    const sceneCanvas = page.locator("[data-scene-effects]");
    await expect(experience).toHaveAttribute("data-effect-renderer", "webgl");
    await sceneCanvas.dispatchEvent("webglcontextlost");
    await expect(experience).toHaveAttribute(
      "data-effect-renderer",
      "css-fallback",
    );
    await expect(experience).not.toHaveClass(/has-scene-effects/);
    await expect(sceneCanvas).toHaveCSS("opacity", "0");

    const paintedOpacity = await page.evaluate(() => {
      const opacity = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        return element ? Number(getComputedStyle(element).opacity) : 0;
      };
      return (
        opacity(".scene__image--previous") + opacity(".scene__image--current")
      );
    });
    expect(paintedOpacity).toBeGreaterThan(0.5);

    await expect(page.locator("html")).toHaveAttribute(
      "data-experience-state",
      "exploring",
      { timeout: 12_000 },
    );
  });

  test("reveals the unobstructed scene while held and explains both hold controls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await beginJourney(page);

    const experience = page.locator("[data-experience]");
    const sceneButton = page.locator("[data-view-scene-button]");
    const sceneStatus = page.locator("[data-scene-view-status]");
    const lookBackButton = page.locator("[data-look-back-button]");

    await expect(sceneButton).toHaveAttribute("aria-keyshortcuts", "V");
    await expect(lookBackButton).toHaveAttribute("aria-keyshortcuts", "L");
    await expect(lookBackButton).toContainText("Hold button or L");

    await sceneButton.hover();
    await page.mouse.down();
    await expect(experience).toHaveClass(/is-viewing-scene/);
    await expect(sceneButton).toHaveAttribute("aria-pressed", "true");
    await expect(sceneStatus).toHaveAttribute("aria-hidden", "false");
    await expect
      .poll(() =>
        page
          .locator("[data-chapter-panel]")
          .evaluate((element) => getComputedStyle(element).opacity),
      )
      .toBe("0");
    for (const selector of [
      ".scene__veil",
      ".scene__vignette",
      ".scene__grain",
      ".scene__horizon-line",
      "[data-scene-effects]",
    ]) {
      await expect(page.locator(selector)).toHaveCSS("opacity", "0");
    }
    await expect(page.locator("[data-scene-current]")).toHaveCSS(
      "filter",
      "none",
    );
    await page.mouse.up();
    await expect(experience).not.toHaveClass(/is-viewing-scene/);
    await expect(sceneButton).toHaveAttribute("aria-pressed", "false");

    await page.keyboard.down("v");
    await expect(experience).toHaveClass(/is-viewing-scene/);
    await page.keyboard.up("v");
    await expect(experience).not.toHaveClass(/is-viewing-scene/);

    await page.evaluate(() => {
      (
        window as typeof window & {
          __ANZANIA_DEBUG__: { setSceneView: (active: boolean) => void };
        }
      ).__ANZANIA_DEBUG__.setSceneView(true);
    });
    await expect(experience).toHaveClass(/is-viewing-scene/);
    await sceneButton.dispatchEvent("pointercancel", { pointerId: 19 });
    await expect(experience).not.toHaveClass(/is-viewing-scene/);
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
    await expect(page.locator("[data-guide-id]")).toHaveCount(12);
    const selectedGuideImage = page.locator(
      '[data-guide-id][aria-pressed="true"] img',
    );
    await expect(selectedGuideImage).toHaveAttribute("loading", "eager");
    await expect
      .poll(() =>
        selectedGuideImage.evaluate(
          (image) =>
            image instanceof HTMLImageElement &&
            image.complete &&
            image.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(
      page.locator('[data-guide-id="dn-m-pac-01"] img'),
    ).toHaveAttribute("loading", "lazy");
    const finalGuide = page.locator('[data-guide-id="dn-n-sea-01"]');
    await finalGuide.evaluate((element) =>
      element.scrollIntoView({ block: "nearest" }),
    );
    await finalGuide.focus();
    await expect(finalGuide).toBeFocused();
    const companionRemainsPainted = page.evaluate(async () => {
      const image = document.querySelector<HTMLImageElement>(
        "[data-companion-image]",
      );
      if (!image) return false;
      for (let frame = 0; frame < 90; frame += 1) {
        if (!image.complete || image.naturalWidth <= 0) return false;
        await new Promise<void>((resolve) =>
          window.requestAnimationFrame(() => resolve()),
        );
      }
      return true;
    });
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-companion-name]")).toHaveText("Sol");
    await expect(page.locator("[data-guide-specialty]")).toHaveText(
      "Signal interpreter",
    );
    expect(await companionRemainsPainted).toBe(true);
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
