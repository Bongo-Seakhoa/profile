import { createHash } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

async function beginJourney(page: Page, location?: string) {
  await page.goto(location ? `explore/#${location}` : "explore/", {
    waitUntil: "networkidle",
  });
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

function pairwiseDifferenceProfiles(frames: readonly Buffer[]) {
  const differences: Array<{
    rootMeanSquare: number;
    changedChannelRatio: number;
  }> = [];
  for (let left = 0; left < frames.length; left += 1) {
    for (let right = left + 1; right < frames.length; right += 1) {
      const leftFrame = frames[left];
      const rightFrame = frames[right];
      if (!leftFrame || !rightFrame) continue;
      let squaredDifference = 0;
      let changedChannels = 0;
      for (let channel = 0; channel < leftFrame.length; channel += 1) {
        const leftValue = leftFrame[channel];
        const rightValue = rightFrame[channel];
        if (leftValue === undefined || rightValue === undefined) continue;
        const delta = Math.abs(leftValue - rightValue);
        squaredDifference += delta * delta;
        if (delta >= 2) changedChannels += 1;
      }
      differences.push({
        rootMeanSquare: Math.sqrt(squaredDifference / leftFrame.length),
        changedChannelRatio: changedChannels / leftFrame.length,
      });
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
    { width: 1900, height: 800 },
    { width: 1280, height: 720 },
  ]) {
    test(`keeps the scene story and crossing dock clear at ${viewport.width}x${viewport.height}`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "chrome-desktop");
      await page.setViewportSize(viewport);
      await beginJourney(page);

      for (const location of [
        {
          name: "Threshold Dunes",
          chapter: "AI and data systems built for decisions people can trust.",
        },
        {
          waypoint: '[data-pilot-action="journey-next"]',
          name: "Stone Pass of Context",
          chapter: "MetaPOS Mind gives AI assistants governed company context.",
        },
      ]) {
        await test.step(location.name, async () => {
          if (location.waypoint) {
            await page.locator(location.waypoint).click();
            await expect(page).toHaveURL(/#stone-pass$/);
            await expect(page.locator("html")).toHaveAttribute(
              "data-experience-state",
              "exploring",
            );
          }
          await page.evaluate(async () => {
            await document.fonts.ready;
          });

          const story = page.locator(".location-mark");
          const dock = page.locator("[data-ability-dock]");
          const chapter = page.locator("[data-chapter-panel]");

          await expect(story.locator("[data-location-name]")).toHaveText(
            location.name,
          );
          await expect(chapter).toBeVisible();
          await expect(chapter).not.toHaveAttribute("inert");
          await expect(page.locator("[data-pilot-notes]")).toHaveCount(0);
          for (const part of [
            story.locator("[data-location-name]"),
            story.locator("[data-scene-brief]"),
          ]) {
            await expect(part).toBeInViewport({ ratio: 0.99 });
            await expect(part).toHaveCSS("overflow", "visible");
            await expect(part).toHaveCSS("-webkit-line-clamp", "none");
          }
          await expect(dock).toBeInViewport({ ratio: 0.99 });
          const storyBounds = await chapter.boundingBox();
          const dockBounds = await dock.boundingBox();
          expect(
            storyBounds &&
              dockBounds &&
              (storyBounds.x + storyBounds.width <= dockBounds.x ||
                dockBounds.x + dockBounds.width <= storyBounds.x ||
                storyBounds.y + storyBounds.height <= dockBounds.y ||
                dockBounds.y + dockBounds.height <= storyBounds.y),
          ).toBe(true);

          const chapterTitle = chapter.locator("[data-chapter-title]");
          await expect(chapterTitle).toHaveText(location.chapter);
          await expect(chapterTitle).toBeVisible();
        });
      }
    });
  }

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

    const shortcutsDispatched = await page.evaluate(
      () =>
        new Promise<boolean>((resolve, reject) => {
          const experience =
            document.querySelector<HTMLElement>("[data-experience]");
          const nextButton = document.querySelector<HTMLButtonElement>(
            "[data-next-location]",
          );
          if (!experience || !nextButton) {
            reject(new Error("Traversal shortcut probe could not start."));
            return;
          }

          const timeout = window.setTimeout(() => {
            observer.disconnect();
            reject(new Error("Traversal shortcut probe timed out."));
          }, 10_000);

          const observeTraversal = () => {
            if (
              document.documentElement.dataset.experienceState !==
                "traversing" ||
              !experience.classList.contains("is-traversing") ||
              !experience.classList.contains("is-solar-propelling")
            ) {
              return;
            }

            for (const key of ["m", "g"]) {
              window.dispatchEvent(
                new KeyboardEvent("keydown", {
                  key,
                  code: `Key${key.toUpperCase()}`,
                  bubbles: true,
                }),
              );
            }
            window.clearTimeout(timeout);
            observer.disconnect();
            resolve(true);
          };

          const observer = new MutationObserver(observeTraversal);
          observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-experience-state"],
          });
          observer.observe(experience, {
            attributes: true,
            attributeFilter: ["class"],
          });
          observeTraversal();
          nextButton.click();
        }),
    );
    expect(shortcutsDispatched).toBe(true);
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
    await page.route(
      /\/immersive\/pilot\/(?:dune-wake|sand-veil|solar-plume|fold-seam)\.webp$/,
      (route) => route.abort(),
    );
    await beginJourney(page, "garden-origins");

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
    const midpointSignatures = new Set<string>();
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
          fromIndex: 2,
          toIndex: 3,
          progress: 0.5,
        });
      }, ability.id);

      expect(preview.available).toBe(true);
      expect(preview.opaquePixels).toBeGreaterThan(preview.pixelCount * 0.99);
      midpointSignatures.add(preview.signature);
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
              fromIndex: 2,
              toIndex: 3,
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
    expect(midpointSignatures.size).toBe(abilities.length);
    expect(startSignatures.size).toBe(1);
    expect(endSignatures.size).toBe(1);
    const frameDifferences = pairwiseDifferenceProfiles(frameSamples);
    expect(
      Math.min(...frameDifferences.map(({ rootMeanSquare }) => rootMeanSquare)),
    ).toBeGreaterThan(3);
    expect(
      Math.min(
        ...frameDifferences.map(
          ({ changedChannelRatio }) => changedChannelRatio,
        ),
      ),
    ).toBeGreaterThan(0.05);
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
    await page.route("**/immersive/pilot/fold-seam.webp", (route) =>
      route.abort(),
    );
    await beginJourney(page, "garden-origins");

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
      "Archive of Echoes",
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
    await page.route("**/immersive/pilot/dune-wake.webp", (route) =>
      route.abort(),
    );
    await beginJourney(page, "garden-origins");
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
    const story = page.locator(".location-mark");
    const reading = page.locator("[data-chapter-panel]");
    await expect(story).toHaveCSS("opacity", "0");
    await expect(reading).toHaveAttribute("inert");
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
    await expect(reading).not.toHaveAttribute("inert");

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

    await page.locator("[data-scene-portal]").click();
    await expect(page.locator("[data-experience]")).toHaveAttribute(
      "data-scene-mode",
      "inner",
    );
    await expect(page.locator("[data-mode-indicator]")).toContainText(
      "Inner place",
    );
    await expect(page.locator("[data-chapter-inside]")).toBeVisible();
    await expect(page.locator("[data-inside-tab]")).toHaveCount(3);
    await expect(page.locator("[data-scene-evidence]")).toHaveAttribute(
      "href",
      /\/work\/metapos-app-data-management\/$/,
    );
    for (const [name, slug] of [
      ["OmniMind", "omnimind"],
      ["FXPM: validation and execution", "fxpm-validation-system"],
    ]) {
      await expect(
        page.locator("[data-chapter-actions]").getByRole("link", { name }),
      ).toHaveAttribute("href", new RegExp(`/work/${slug}/$`));
    }

    await page.locator('[data-inside-tab="logic"]').click();
    await expect(
      page.getByText("Make complexity navigable", { exact: true }),
    ).toBeVisible();
  });

  test("keeps the Observatory guide on its lit stage and opens the accepted research", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chrome-desktop");
    await page.setViewportSize({ width: 1900, height: 800 });
    await beginJourney(page, "observatory-horizons/inside");

    const guide = page.locator("[data-companion]");
    const reading = page.getByRole("region", {
      name: "Location and project evidence",
    });
    const research = page.locator("[data-scene-evidence]");
    const stageFoot = async () => {
      await settleCompanionFrame(page);
      return guide.evaluate((figure) => {
        const scene = document.querySelector<HTMLElement>(
          "[data-scene-current]",
        );
        if (!scene) throw new Error("The Observatory scene is missing.");
        const actor = figure.getBoundingClientRect();
        const backdrop = scene.getBoundingClientRect();
        const [focusX = 0.5, focusY = 0.5] = getComputedStyle(scene)
          .backgroundPosition.split(" ")
          .map((value) => Number.parseFloat(value) / 100);
        const coverWidth = Math.max(
          scene.clientWidth,
          (scene.clientHeight * 16) / 9,
        );
        const coverHeight = (coverWidth * 9) / 16;
        const x =
          ((actor.left + actor.width / 2 - backdrop.left) * scene.clientWidth) /
          backdrop.width;
        const y =
          ((actor.bottom - backdrop.top) * scene.clientHeight) /
          backdrop.height;
        return {
          x: (x - (scene.clientWidth - coverWidth) * focusX) / coverWidth,
          y: (y - (scene.clientHeight - coverHeight) * focusY) / coverHeight,
        };
      });
    };

    await expect(guide).toHaveAttribute("data-grounded");
    await expect(guide).toHaveAttribute("data-scene-lit");
    await expect(guide).toHaveAttribute("data-frame-status", "safe");
    await expect(guide.locator(".companion__ground")).toBeVisible();
    await expect(guide.locator("[data-companion-image]")).toHaveCSS(
      "filter",
      /brightness\(0\.\d+\).*saturate\(0\.\d+\).*drop-shadow/,
    );
    await expect(reading).toBeVisible();
    await expect(reading.locator("[data-scene-brief]")).toContainText(
      "separate FXPM case study",
    );
    const before = await stageFoot();
    expect(before.x).toBeGreaterThan(0.64);
    expect(before.x).toBeLessThan(0.74);
    expect(before.y).toBeGreaterThan(0.82);
    expect(before.y).toBeLessThan(0.88);
    const frame = await framingMetrics(page);
    expect(frame?.ratio).toBeLessThan(0.25);
    expect(frame?.overlapsPanel).toBe(false);

    await reading.getByRole("tab", { name: "Questions" }).click();
    await expect(guide).toHaveAttribute("data-grounded");
    const after = await stageFoot();
    expect(after.x).toBeCloseTo(before.x, 2);
    expect(after.y).toBeCloseTo(before.y, 2);

    await expect(research).toHaveAttribute(
      "href",
      new URL("/profile/research/#accepted-paper-title", page.url()).href,
    );
    await research.click();
    await expect(page).toHaveURL(/\/research\/#accepted-paper-title$/);
    await expect(page.locator("#accepted-paper-title")).toBeVisible();
  });

  test("keeps the Garden, Forge and compact Archive guides grounded and clear of the reading panel", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chrome-desktop");
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const [location, width, height] of [
      ["garden-origins", 1440, 900],
      ["forge-resolve/inside", 1440, 900],
      ["archive-echoes", 1024, 768],
    ] as const) {
      await test.step(location, async () => {
        await page.goto("about:blank");
        await page.setViewportSize({ width, height });
        await beginJourney(page, location);
        await expect(page.locator("[data-companion]")).toHaveAttribute(
          "data-grounded",
        );
        const frame = await framingMetrics(page);
        expect(frame?.frameStatus).toBe("safe");
        expect(frame?.overlapsPanel).toBe(false);
        expect(frame?.ratio).toBeGreaterThan(0.1);
        expect(frame?.ratio).toBeLessThan(0.2);
      });
    }
  });

  test("opens the deep-linked Context Chamber and inspects its three objects", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(
      testInfo.project.name === "chrome-mobile"
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
    );
    await beginJourney(page, "context-chamber");

    const experience = page.locator("[data-experience]");
    const reading = page.getByRole("region", {
      name: "Location and project evidence",
    });
    const dialog = page.locator("[data-chamber-dialog]");
    await expect(page).toHaveURL(/#context-chamber$/);
    await expect(experience).toHaveAttribute("data-scene-mode", "inner");
    await expect(experience).toHaveAttribute("data-pilot-setting", "chamber");
    await expect(page.locator("[data-scene-current]")).not.toHaveCSS(
      "background-image",
      "none",
    );
    await expect(page.locator("[data-scene-foreground]")).toHaveCSS(
      "visibility",
      "hidden",
    );
    await expect(reading).toBeVisible();
    await expect(reading.locator("[data-scene-brief]")).toContainText(
      "same fictional project request as two different roles",
    );
    await expect(page.locator("[data-pilot-notes]")).toHaveCount(0);
    await expect
      .poll(async () => (await framingMetrics(page))?.frameStatus)
      .toBe("safe");
    expectCompleteFullBody(await framingMetrics(page));

    for (const artifact of [
      { action: "workbench", title: "Trace a request" },
      { action: "source-books", title: "The source books" },
      { action: "validation-scroll", title: "The validation scroll" },
    ]) {
      const trigger = page.locator(`[data-pilot-action="${artifact.action}"]`);
      if (artifact.action === "workbench") {
        await trigger.focus();
        await page.keyboard.press("Enter");
      } else {
        await trigger.locator("[data-pilot-pin]").click();
      }
      await expect(dialog).toHaveAttribute("open");
      await expect(
        dialog.getByRole("heading", { name: artifact.title, exact: true }),
      ).toBeVisible();

      if (artifact.action === "workbench") {
        const result = dialog.locator("[data-chamber-result]");
        const sources = dialog.locator("[data-chamber-sources]");
        const contributor = dialog.getByRole("radio", {
          name: "Project contributor",
        });
        await expect(contributor).toBeChecked();
        await expect(result).toHaveAttribute("data-access", "granted");
        await expect(sources).toContainText("Delivery note 18");
        await expect(sources).toContainText("Readiness checklist");

        await dialog
          .getByRole("radio", { name: "Outside the project" })
          .check();
        await expect(result).toHaveAttribute("data-access", "limited");
        await expect(result).toContainText(
          "No project records are available to this role.",
        );
        await expect(sources).toBeHidden();
        await expect(
          dialog.locator('[data-chamber-route="limited"]'),
        ).toHaveAttribute("aria-current", "true");

        await contributor.check();
        await expect(result).toHaveAttribute("data-access", "granted");
        await expect(sources).toBeVisible();
      } else if (artifact.action === "source-books") {
        await expect(
          dialog
            .locator('[data-chamber-panel="source-books"]')
            .getByText("Delivery note 18", { exact: true }),
        ).toBeVisible();
      } else {
        await expect(
          dialog.getByRole("link", {
            name: "Read the MetaPOS Mind case study",
          }),
        ).toHaveAttribute("href", "/profile/work/metapos-app-data-management/");
      }

      await dialog.locator("[data-chamber-close]").click();
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    }

    const fieldRecord = page.locator("[data-chapter-inside]");
    await expect(fieldRecord).toBeVisible();
    await fieldRecord.locator('[data-inside-tab="logic"]').click();
    await expect(
      fieldRecord.getByText("Permission-aware context", { exact: true }),
    ).toBeVisible();
  });

  test("paints the authored pilot crossing and supports Skip and browser history", async ({
    page,
  }) => {
    await beginJourney(page);
    const experience = page.locator("[data-experience]");
    const skip = page.locator("[data-pilot-skip]");

    await page.locator('[data-pilot-action="journey-next"]').click();
    await expect(experience).toHaveAttribute(
      "data-effect-renderer",
      "authored-pilot",
    );
    await expect(experience).toHaveAttribute("data-pilot-crossing", /.+/);
    const effect = page.locator("[data-pilot-effect-far]");
    await expect(effect).toHaveAttribute("src", /\.webp$/);
    await expect(effect).toBeVisible();
    await skip.click();
    await expect(page).toHaveURL(/#stone-pass$/);
    await expect(experience).toHaveAttribute("data-pilot-setting", "pass");
    await expect(experience).not.toHaveAttribute("data-pilot-crossing");
    await expect(skip).toBeHidden();

    await page.locator('[data-pilot-action="chamber-enter"]').click();
    await skip.click();
    await expect(page).toHaveURL(/#context-chamber$/);
    await expect(experience).toHaveAttribute("data-pilot-setting", "chamber");

    await page.goBack();
    await expect(page).toHaveURL(/#stone-pass$/);
    await expect(experience).toHaveAttribute("data-pilot-setting", "pass");
    await expect(experience).toHaveAttribute("data-scene-mode", "outer");

    await page.goForward();
    await expect(page).toHaveURL(/#context-chamber$/);
    await expect(experience).toHaveAttribute("data-pilot-setting", "chamber");
    await expect(experience).toHaveAttribute("data-scene-mode", "inner");
  });

  test("keeps Archive context available on the approach and after entering", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(
      testInfo.project.name === "chrome-mobile"
        ? { width: 390, height: 640 }
        : { width: 1440, height: 900 },
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await beginJourney(page, "archive-echoes");

    const reading = page.getByRole("region", {
      name: "Location and project evidence",
    });
    const context = reading.locator("[data-scene-brief]");
    await expect(reading).toBeVisible();
    await expect(context).toContainText("public code");
    await expect(page.locator("[data-pilot-notes]")).toHaveCount(0);
    await expect(reading.getByRole("tab")).toHaveText([
      "Evidence",
      "Design logic",
      "Questions",
    ]);
    await expect(
      reading.getByRole("heading", { name: "OmniMind", exact: true }),
    ).toBeVisible();
    await expect(
      reading.getByRole("heading", { name: "Visualizing Filters of a CNN" }),
    ).toBeVisible();

    await reading.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect
      .poll(() => reading.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);

    await reading.getByRole("tab", { name: "Design logic" }).click();
    for (const name of [
      "Review the evidence before measuring the pack",
      "Leave a decision another person can review",
    ]) {
      await expect(
        reading.getByRole("heading", { name, exact: true }),
      ).toBeVisible();
    }

    await reading.getByRole("tab", { name: "Questions" }).click();
    const questions = reading.locator("details");
    await expect(questions.locator("summary")).toHaveText([
      "What can I open and inspect?",
      "How far does the OmniMind calibration reach?",
      "Who decides whether work is ready to release?",
    ]);
    const expanded = reading.locator("details[open]");
    await expect(expanded).toHaveCount(0);
    await questions.nth(0).locator("summary").click();
    await expect(expanded.locator("summary")).toHaveText(
      "What can I open and inspect?",
    );
    await questions.nth(1).locator("summary").click();
    await expect(expanded.locator("summary")).toHaveText(
      "How far does the OmniMind calibration reach?",
    );

    await page.locator("[data-scene-portal]").click();
    await expect(page).toHaveURL(/#archive-echoes\/inside$/);
    await expect(page.locator("html")).toHaveAttribute(
      "data-experience-state",
      "exploring",
    );
    await waitForTwoPaintFrames(page);
    await expect(page.locator("[data-experience]")).toHaveAttribute(
      "data-scene-mode",
      "inner",
    );
    await expect(reading).toBeVisible();
    await expect(context).toContainText("Use the review instrument");
    await expect.poll(() => reading.evaluate((e) => e.scrollTop)).toBe(0);

    await page.goto("about:blank");
    await beginJourney(page, "archive-echoes/inside");
    await waitForTwoPaintFrames(page);
    await expect(page.locator("[data-experience]")).toHaveAttribute(
      "data-scene-mode",
      "inner",
    );
    await expect(reading).toBeVisible();
    await expect(context).toContainText("Use the review instrument");
  });

  test("opens the two Archive objects and returns through the in-world exit", async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(
      testInfo.project.name === "chrome-mobile"
        ? { width: 390, height: 844 }
        : { width: 1024, height: 768 },
    );
    await beginJourney(page, "archive-echoes");
    await page.locator("[data-scene-portal]").click();
    await expect(page).toHaveURL(/#archive-echoes\/inside$/);

    const dialog = page.locator("[data-archive-dialog]");
    await expect(dialog.locator("[data-archive-panel]")).toHaveCount(2);
    await expect(
      page.locator('[data-pilot-action="archive-folio"]'),
    ).toHaveCount(0);
    for (const artifact of [
      { action: "archive-shelves", title: "Inspect the records" },
      { action: "archive-astrolabe", title: "Trace a release decision" },
    ]) {
      const trigger = page.locator(`[data-pilot-action="${artifact.action}"]`);
      await trigger.locator("[data-pilot-pin]").click();
      await expect(dialog).toHaveAttribute("open");
      await expect(dialog).toHaveAccessibleName(artifact.title);
      await expect(dialog.locator("[data-archive-panel]:visible")).toHaveCount(
        1,
      );
      await expect(
        dialog.getByRole("heading", { name: artifact.title, exact: true }),
      ).toBeVisible();

      if (artifact.action === "archive-shelves") {
        await expect(
          dialog.getByRole("link", { name: "Read the OmniMind case study" }),
        ).toHaveAttribute("href", "/profile/work/omnimind/");
        await expect(
          dialog.getByRole("link", { name: "Open the public repository" }),
        ).toHaveAttribute(
          "href",
          /github\.com\/Bongo-Seakhoa\/Visualizing_Filters_CNN$/,
        );
      } else {
        await expect(dialog.getByRole("listitem")).toHaveCount(3);
        await expect(
          dialog.getByRole("link", {
            name: "Read the Human-Governed AI Delivery Method",
          }),
        ).toHaveAttribute(
          "href",
          "/profile/work/human-governed-ai-delivery-method/",
        );
      }

      await dialog.locator("[data-archive-close]").click();
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    }

    const exit = page.locator('[data-pilot-action="archive-exit"]');
    await exit
      .locator(
        testInfo.project.name === "chrome-mobile"
          ? "[data-pilot-pin]"
          : "[data-pilot-label]",
      )
      .click();
    await expect(page).toHaveURL(/#archive-echoes$/);
    await expect(page.locator("[data-experience]")).toHaveAttribute(
      "data-scene-mode",
      "outer",
    );
    await expect(
      page.locator('[data-pilot-action="archive-shelves"]'),
    ).toBeHidden();
  });

  test("uses all four authored crossings outside the pilot in both directions", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chrome-desktop");
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await beginJourney(page, "garden-origins");

    const experience = page.locator("[data-experience]");
    const guide = page.locator("[data-pilot-guide]");
    const near = page.locator("[data-pilot-effect-near]");
    const far = page.locator("[data-pilot-effect-far]");
    const rollers = page.locator("[data-pilot-roller]");
    const skip = page.locator("[data-pilot-skip]");
    const crossings = [
      { control: "next", direction: "forward", destination: "archive-echoes" },
      {
        control: "previous",
        direction: "backward",
        destination: "garden-origins",
      },
    ] as const;
    for (const ability of [
      { id: "dune-surfing", name: "dune", effect: "dune-wake" },
      { id: "sand-teleportation", name: "sand", effect: "sand-veil" },
      { id: "solar-propulsion", name: "solar", effect: "solar-plume" },
      { id: "reality-bending", name: "fold", effect: "fold-seam" },
    ]) {
      await page.locator(`[data-power-id="${ability.id}"]`).click();
      for (const crossing of crossings) {
        const painted = page.evaluate(
          ({ name, effect, direction }) =>
            new Promise((resolve) => {
              const root =
                document.querySelector<HTMLElement>("[data-experience]");
              const image =
                document.querySelector<HTMLImageElement>("[data-pilot-guide]");
              const near = document.querySelector<HTMLImageElement>(
                "[data-pilot-effect-near]",
              );
              const far = document.querySelector<HTMLImageElement>(
                "[data-pilot-effect-far]",
              );
              const button =
                document.querySelector<HTMLButtonElement>("[data-pilot-skip]");
              const rollers = [
                ...document.querySelectorAll<HTMLElement>(
                  "[data-pilot-roller]",
                ),
              ];
              const expires = performance.now() + 8500;
              const visible = (layer: HTMLElement | null) =>
                !!layer &&
                !layer.hidden &&
                Number(getComputedStyle(layer).opacity) > 0;
              function inspect() {
                if (
                  root?.dataset.effectRenderer === "authored-pilot" &&
                  root.dataset.pilotCrossing === name &&
                  root.dataset.travelDirection === direction &&
                  image?.src.includes(`/amani-${name}-`) &&
                  image.naturalWidth > 0 &&
                  near?.src.endsWith(`/${effect}.webp`) &&
                  near.naturalWidth > 0 &&
                  visible(image) &&
                  visible(near) &&
                  visible(button) &&
                  (!(name === "dune" || name === "sand") || visible(far)) &&
                  (name !== "fold" || rollers.filter(visible).length === 2)
                ) {
                  const box = button!.getBoundingClientRect();
                  const hit = document.elementFromPoint(
                    box.x + box.width / 2,
                    box.y + box.height / 2,
                  );
                  if (direction === "forward" && hit && button!.contains(hit)) {
                    button!.click();
                    resolve("skipped");
                    return;
                  }
                  if (direction === "backward") {
                    resolve("painted");
                    return;
                  }
                }
                if (performance.now() >= expires)
                  resolve(root?.dataset.effectRenderer ?? "no active renderer");
                else requestAnimationFrame(inspect);
              }
              requestAnimationFrame(inspect);
            }),
          {
            name: ability.name,
            effect: ability.effect,
            direction: crossing.direction,
          },
        );
        await page.locator(`[data-${crossing.control}-location]`).click();
        expect(await painted, `${ability.name} ${crossing.direction}`).toBe(
          crossing.direction === "forward" ? "skipped" : "painted",
        );
        await expect(page).toHaveURL(new RegExp(`#${crossing.destination}$`));
        await expect(experience).toHaveAttribute(
          "data-location",
          crossing.destination,
        );
        await expect(page.locator("html")).toHaveAttribute(
          "data-experience-state",
          "exploring",
        );
        await expect(experience).not.toHaveAttribute("data-pilot-crossing");
        await expect(guide).toBeHidden();
        await expect(near).toBeHidden();
        await expect(far).toBeHidden();
        await expect(rollers.first()).toBeHidden();
        await expect(rollers.last()).toBeHidden();
        await expect(skip).toBeHidden();
      }
    }
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
