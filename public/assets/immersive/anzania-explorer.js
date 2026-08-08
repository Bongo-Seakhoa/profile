const manifestUrl = new URL("./runtime-manifest.json", import.meta.url);
const assetRootUrl = new URL("./", import.meta.url);
const siteRootUrl = new URL("../../", import.meta.url);

const selectors = {
  experience: "[data-experience]",
  loadingGate: "[data-loading-gate]",
  loadingProgress: "[data-loading-progress]",
  loadingStatus: "[data-loading-status]",
  arrivalGate: "[data-arrival-gate]",
  beginJourney: "[data-begin-journey]",
  explorer: "[data-explorer]",
  scenePrevious: "[data-scene-previous]",
  sceneCurrent: "[data-scene-current]",
  sceneForeground: "[data-scene-foreground]",
  powerTransition: "[data-power-transition]",
  progressLabel: "[data-progress-label]",
  progressBar: "[data-progress-bar]",
  locationRailList: "[data-location-rail-list]",
  mapLocationList: "[data-map-location-list]",
  locationNumber: "[data-location-number]",
  locationRegion: "[data-location-region]",
  locationName: "[data-location-name]",
  chapterPanel: "[data-chapter-panel]",
  chapterEyebrow: "[data-chapter-eyebrow]",
  chapterTitle: "[data-chapter-title]",
  chapterLead: "[data-chapter-lead]",
  chapterEvidence: "[data-chapter-evidence]",
  chapterActions: "[data-chapter-actions]",
  portalButton: "[data-portal-button]",
  portalAction: "[data-portal-action]",
  portalCaption: "[data-portal-caption]",
  companion: "[data-companion]",
  companionImage: "[data-companion-image]",
  companionName: "[data-companion-name]",
  lookBackButton: "[data-look-back-button]",
  previousLocation: "[data-previous-location]",
  nextLocation: "[data-next-location]",
  modeIndicator: "[data-mode-indicator]",
  mapButton: "[data-map-button]",
  guideButton: "[data-guide-button]",
  optionsButton: "[data-options-button]",
  mapDialog: "[data-map-dialog]",
  guideDialog: "[data-guide-dialog]",
  optionsDialog: "[data-options-dialog]",
  guideGrid: "[data-guide-grid]",
  motionToggle: "[data-motion-toggle]",
  toast: "[data-experience-toast]",
  announcer: "[data-experience-announcer]",
};

const elements = Object.fromEntries(
  Object.entries(selectors).map(([key, selector]) => [key, document.querySelector(selector)]),
);

const atlasCoordinates = {
  "threshold-dunes": [17, 68],
  "stone-pass": [29, 49],
  "garden-origins": [42, 66],
  "archive-echoes": [52, 42],
  "forge-resolve": [64, 59],
  "bazaar-skill": [73, 40],
  "observatory-horizons": [84, 24],
  "oasis-audience": [88, 72],
};

const storageKeys = {
  guide: "anzania-guide-v1",
  motion: "anzania-motion-v1",
  visited: "anzania-visited-v1",
};

const state = {
  manifest: null,
  locationIndex: 0,
  sceneMode: "outer",
  selectedGuideId: "dn-m-afr-01",
  motionEnabled: true,
  isTraversing: false,
  isLookingBack: false,
  hasBegun: false,
  visited: new Set(),
  lastFrame: null,
  toastTimer: 0,
  presentTimer: 0,
  idleTimer: 0,
  reframeTimer: 0,
  parallaxFrame: 0,
};

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function safeStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable in private or file-based browsing contexts.
  }
}

function resolveAsset(relativePath) {
  return new URL(relativePath.replace(/^\.\//, ""), assetRootUrl).href;
}

function resolveSitePath(relativePath) {
  return new URL(relativePath.replace(/^\//, ""), siteRootUrl).href;
}

function setLoadingProgress(progress, message) {
  if (elements.loadingProgress) {
    elements.loadingProgress.style.width = `${clamp(progress, 0, 100)}%`;
  }
  if (elements.loadingStatus && message) {
    elements.loadingStatus.textContent = message;
  }
}

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(
      () => resolve({ src, loaded: false, timedOut: true }),
      7_500,
    );
    image.decoding = "async";
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve({ src, loaded: true, timedOut: false });
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve({ src, loaded: false, timedOut: false });
    };
    image.src = src;
  });
}

function chooseSceneSource(scene) {
  const requiredWidth =
    window.innerWidth * clamp(window.devicePixelRatio || 1, 1, 2);
  const useSmall = requiredWidth <= 1_050;
  return resolveAsset(useSmall ? scene.small : scene.large);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function announce(message) {
  if (!elements.announcer) return;
  elements.announcer.textContent = "";
  window.requestAnimationFrame(() => {
    elements.announcer.textContent = message;
  });
}

function showToast(message, duration = 2600) {
  if (!elements.toast) return;
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, duration);
}

function setPresenting(active = true, duration = 900) {
  window.clearTimeout(state.presentTimer);
  elements.experience?.classList.toggle("is-presenting", active);
  if (active) {
    state.presentTimer = window.setTimeout(() => {
      elements.experience?.classList.remove("is-presenting");
    }, duration);
  }
}

function setInteractionLock(locked) {
  for (const control of [
    elements.previousLocation,
    elements.nextLocation,
    elements.portalButton,
    elements.mapButton,
    elements.guideButton,
    elements.optionsButton,
  ]) {
    control?.toggleAttribute("disabled", locked);
  }
}

function getCurrentLocation() {
  return state.manifest?.locations[state.locationIndex] ?? null;
}

function getCurrentGuide() {
  return state.manifest?.guides.find((guide) => guide.id === state.selectedGuideId) ?? state.manifest?.guides[0] ?? null;
}

function renderNavigation() {
  if (!state.manifest) return;

  if (elements.locationRailList) {
    elements.locationRailList.innerHTML = state.manifest.locations
      .map(
        (location, index) => `
          <li>
            <button
              type="button"
              data-location-index="${index}"
              aria-label="Travel to ${escapeHtml(location.formalName)}"
              ${index === state.locationIndex ? 'aria-current="step"' : ""}
            ><span>${escapeHtml(location.number)}</span></button>
          </li>`,
      )
      .join("");
  }

  if (elements.mapLocationList) {
    elements.mapLocationList.innerHTML = state.manifest.locations
      .map(
        (location, index) => `
          <li>
            <button
              type="button"
              data-map-location-index="${index}"
              ${index === state.locationIndex ? 'aria-current="step"' : ""}
            >
              <span>${escapeHtml(location.number)}</span>
              <span>
                <strong>${escapeHtml(location.name)}</strong>
                <small>${escapeHtml(location.region)}</small>
              </span>
            </button>
          </li>`,
      )
      .join("");
  }
}

function renderGuides() {
  if (!state.manifest || !elements.guideGrid) return;

  elements.guideGrid.innerHTML = state.manifest.guides
    .map(
      (guide) => `
        <button
          class="guide-card"
          type="button"
          data-guide-id="${escapeHtml(guide.id)}"
          aria-pressed="${guide.id === state.selectedGuideId ? "true" : "false"}"
          aria-label="Choose ${escapeHtml(guide.name)}, ${escapeHtml(guide.inspiration)} ${escapeHtml(guide.presentation.toLowerCase())} guide"
        >
          <span class="guide-card__figure">
            <img src="${resolveAsset(guide.src)}" alt="" width="540" height="1280" loading="lazy" decoding="async" />
          </span>
          <strong>${escapeHtml(guide.name)}</strong>
          <small>${escapeHtml(guide.presentation)} · ${escapeHtml(guide.inspiration)}</small>
        </button>`,
    )
    .join("");
}

function warmGuideCards() {
  elements.guideGrid?.querySelectorAll("img").forEach((image) => {
    image.loading = "eager";
    image.fetchPriority = "low";
    if (!image.complete && typeof image.decode === "function") {
      image.decode().catch(() => undefined);
    }
  });
}

function renderGuide() {
  const guide = getCurrentGuide();
  if (!guide) return;

  if (elements.companionImage) {
    elements.companionImage.src = resolveAsset(guide.src);
    elements.companionImage.alt = guide.alt;
  }
  if (elements.companionName) {
    elements.companionName.textContent = guide.name;
  }

  elements.guideGrid?.querySelectorAll("[data-guide-id]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.guideId === guide.id));
  });
}

function renderLocation({ announceChange = false } = {}) {
  const location = getCurrentLocation();
  if (!location || !state.manifest) return;

  if (state.hasBegun && !state.isTraversing) {
    document.documentElement.dataset.experienceState = "exploring";
  }
  elements.experience.dataset.sceneMode = state.sceneMode;

  if (elements.progressLabel) {
    elements.progressLabel.textContent = `${location.number} / ${String(state.manifest.locations.length).padStart(2, "0")}`;
  }
  if (elements.progressBar) {
    elements.progressBar.style.width = `${((state.locationIndex + 1) / state.manifest.locations.length) * 100}%`;
  }
  if (elements.locationNumber) elements.locationNumber.textContent = location.number;
  if (elements.locationRegion) elements.locationRegion.textContent = location.region;
  if (elements.locationName) elements.locationName.textContent = location.name;
  if (elements.chapterEyebrow) elements.chapterEyebrow.textContent = location.eyebrow;
  if (elements.chapterTitle) elements.chapterTitle.textContent = location.title;
  if (elements.chapterLead) elements.chapterLead.textContent = location.lead;
  if (elements.portalAction) {
    elements.portalAction.textContent = state.sceneMode === "outer" ? location.portalAction : "Return to the outer approach";
  }
  if (elements.portalCaption) {
    elements.portalCaption.textContent =
      state.sceneMode === "outer"
        ? location.portalCaption
        : "The evidence recedes and the wider landscape returns";
  }
  if (elements.modeIndicator) {
    elements.modeIndicator.lastChild.textContent = state.sceneMode === "outer" ? " Outer approach" : " Inner place";
  }

  if (elements.chapterEvidence) {
    elements.chapterEvidence.innerHTML = location.evidence
      .map(
        (record) => `
          <dl class="evidence-record">
            <dt>${escapeHtml(record.label)}</dt>
            <dd>${escapeHtml(record.value)}</dd>
          </dl>`,
      )
      .join("");
  }

  if (elements.chapterActions) {
    elements.chapterActions.innerHTML = location.actions
      .map(
        (action) => `<a href="${resolveSitePath(action.path)}">${escapeHtml(action.label)} <span aria-hidden="true">→</span></a>`,
      )
      .join("");
  }

  elements.previousLocation?.toggleAttribute("disabled", state.locationIndex === 0 || state.isTraversing);
  elements.nextLocation?.toggleAttribute(
    "disabled",
    state.locationIndex === state.manifest.locations.length - 1 || state.isTraversing,
  );

  elements.locationRailList?.querySelectorAll("[data-location-index]").forEach((button) => {
    if (Number(button.dataset.locationIndex) === state.locationIndex) {
      button.setAttribute("aria-current", "step");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  elements.mapLocationList?.querySelectorAll("[data-map-location-index]").forEach((button) => {
    if (Number(button.dataset.mapLocationIndex) === state.locationIndex) {
      button.setAttribute("aria-current", "step");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  const [atlasX, atlasY] = atlasCoordinates[location.id] ?? [50, 50];
  elements.mapDialog?.style.setProperty("--atlas-x", `${atlasX}%`);
  elements.mapDialog?.style.setProperty("--atlas-y", `${atlasY}%`);

  state.visited.add(location.id);
  safeStorageSet(storageKeys.visited, JSON.stringify([...state.visited]));

  try {
    window.history.replaceState(null, "", `#${location.id}`);
  } catch {
    // Hash state is an enhancement only.
  }

  window.requestAnimationFrame(() => recalculateFraming());
  if (announceChange) announce(`${location.formalName}. ${location.title}`);
}

function transitionScene(nextSource, { immediate = false } = {}) {
  if (!elements.sceneCurrent || !elements.scenePrevious || !elements.sceneForeground) return;

  const currentBackground = elements.sceneCurrent.style.backgroundImage;
  if (immediate || !currentBackground) {
    const background = `url("${nextSource}")`;
    elements.sceneCurrent.style.backgroundImage = background;
    elements.sceneForeground.style.backgroundImage = background;
    elements.sceneCurrent.style.opacity = "1";
    elements.scenePrevious.style.opacity = "0";
    return;
  }

  elements.scenePrevious.style.backgroundImage = currentBackground;
  elements.scenePrevious.style.opacity = "1";
  elements.sceneCurrent.style.opacity = "0";

  window.requestAnimationFrame(() => {
    const background = `url("${nextSource}")`;
    elements.sceneCurrent.style.backgroundImage = background;
    elements.sceneForeground.style.backgroundImage = background;
    window.requestAnimationFrame(() => {
      elements.sceneCurrent.style.opacity = "1";
      elements.scenePrevious.style.opacity = "0";
    });
  });
}

function renderScene(options = {}) {
  const location = getCurrentLocation();
  if (!location) return;
  const scene = location[state.sceneMode];
  transitionScene(chooseSceneSource(scene), options);
}

function rectFromElement(element, expansion = 0) {
  if (!element || element.hidden) return null;
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    left: rect.left - expansion,
    top: rect.top - expansion,
    right: rect.right + expansion,
    bottom: rect.bottom + expansion,
    width: rect.width + expansion * 2,
    height: rect.height + expansion * 2,
  };
}

function intersectionArea(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

function getCssPixelValue(propertyName, fallback) {
  const value = Number.parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue(propertyName));
  return Number.isFinite(value) ? value : fallback;
}

function calculateFraming() {
  const viewport = {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
  };
  const compact = viewport.width <= 820;
  const veryCompact = viewport.width <= 520;
  const shortViewport = viewport.height < 700;
  const safeLeft = getCssPixelValue("--safe-left", veryCompact ? 12 : 22);
  const safeRight = getCssPixelValue("--safe-right", veryCompact ? 12 : 22);
  const safeTop = getCssPixelValue("--safe-top", veryCompact ? 12 : 22);
  const safeBottom = getCssPixelValue("--safe-bottom", 18);
  const captionAllowance = compact ? 34 : 38;
  const avatarAspect = 540 / 1280;

  let targetRatio = compact ? 0.19 : 0.18;
  if (shortViewport) targetRatio = compact ? 0.17 : 0.16;
  if (state.isTraversing) targetRatio *= 0.86;
  targetRatio = clamp(targetRatio, 0.14, 0.2);

  const topbarRect = rectFromElement(document.querySelector(".explorer-topbar"), 10);
  const chapterRect = rectFromElement(elements.chapterPanel, compact ? 16 : 22);
  const locationRect = rectFromElement(document.querySelector(".location-mark"), 14);
  const railRect = rectFromElement(document.querySelector(".location-rail"), 12);
  const lookRect = rectFromElement(document.querySelector(".look-control"), 12);
  const traversalRect = rectFromElement(document.querySelector(".traversal-controls"), 12);
  const modeRect = rectFromElement(elements.modeIndicator, 10);
  const obstacles = [topbarRect, chapterRect, locationRect, railRect, lookRect, traversalRect, modeRect].filter(Boolean);

  const minimumTop = Math.max(safeTop, (topbarRect?.bottom ?? safeTop) + 10);
  const maximumBottom = viewport.height - safeBottom;
  let best = null;

  const ratioCandidates = [targetRatio, targetRatio - 0.012, targetRatio - 0.024, 0.14, 0.132];
  for (const ratio of ratioCandidates) {
    const avatarHeight = clamp(
      viewport.height * ratio,
      viewport.height * 0.132,
      viewport.height * 0.2,
    );
    const avatarWidth = avatarHeight * avatarAspect;
    const maximumTop = maximumBottom - avatarHeight - captionAllowance;
    if (maximumTop <= minimumTop) continue;

    const preferredTop = compact && chapterRect
      ? clamp(chapterRect.top - avatarHeight - captionAllowance - 14, minimumTop, maximumTop)
      : clamp(viewport.height * 0.68, minimumTop, maximumTop);

    const xFractions = compact ? [0.76, 0.64, 0.36, 0.24, 0.5] : [0.32, 0.43, 0.22, 0.5, 0.62];
    const yOffsets = compact ? [0, -26, 24, -52] : [0, -34, 26, -64];

    for (const xFraction of xFractions) {
      for (const yOffset of yOffsets) {
        const left = clamp(
          viewport.width * xFraction - avatarWidth / 2,
          safeLeft + 8,
          viewport.width - safeRight - avatarWidth - 8,
        );
        const top = clamp(preferredTop + yOffset, minimumTop, maximumTop);
        const candidate = {
          left,
          top,
          right: left + avatarWidth,
          bottom: top + avatarHeight,
          width: avatarWidth,
          height: avatarHeight,
          ratio: avatarHeight / viewport.height,
        };

        const overlap = obstacles.reduce((sum, obstacle) => sum + intersectionArea(candidate, obstacle), 0);
        const preferredX = viewport.width * (compact ? 0.74 : 0.34);
        const preferredY = compact
          ? (chapterRect ? chapterRect.top - avatarHeight - captionAllowance - 14 : viewport.height * 0.42)
          : viewport.height * 0.68;
        const distancePenalty = Math.abs(left + avatarWidth / 2 - preferredX) * 0.55 + Math.abs(top - preferredY) * 0.42;
        const edgePenalty =
          Math.max(0, safeLeft + 14 - left) * 40 +
          Math.max(0, left + avatarWidth + safeRight + 14 - viewport.width) * 40 +
          Math.max(0, minimumTop - top) * 40 +
          Math.max(0, top + avatarHeight + captionAllowance + safeBottom - viewport.height) * 40;
        const sizePenalty = Math.abs(targetRatio - candidate.ratio) * 900;
        const score = overlap * 125 + distancePenalty + edgePenalty + sizePenalty;

        if (!best || score < best.score) {
          best = { ...candidate, score, overlap };
        }
      }
    }

    if (best && best.overlap === 0 && best.ratio >= 0.14) break;
  }

  if (!best) {
    const avatarHeight = viewport.height * 0.14;
    const avatarWidth = avatarHeight * avatarAspect;
    best = {
      left: clamp(viewport.width * 0.5 - avatarWidth / 2, safeLeft, viewport.width - safeRight - avatarWidth),
      top: clamp(viewport.height - avatarHeight - captionAllowance - safeBottom - 60, minimumTop, viewport.height - avatarHeight - captionAllowance - safeBottom),
      right: 0,
      bottom: 0,
      width: avatarWidth,
      height: avatarHeight,
      ratio: 0.14,
      score: Number.POSITIVE_INFINITY,
      overlap: 0,
    };
    best.right = best.left + best.width;
    best.bottom = best.top + best.height;
  }

  return {
    ...best,
    viewport,
    compact,
    fullyVisible:
      best.left >= 0 &&
      best.top >= 0 &&
      best.right <= viewport.width &&
      best.bottom <= viewport.height,
  };
}

function recalculateFraming({ immediate = false } = {}) {
  if (!elements.companion || elements.explorer?.hidden) return null;
  if (immediate) {
    window.clearTimeout(state.reframeTimer);
    elements.experience?.classList.add("is-reframing");
    void elements.companion.offsetHeight;
  }

  const frame = calculateFraming();
  state.lastFrame = frame;

  document.documentElement.style.setProperty("--avatar-height", `${frame.height.toFixed(2)}px`);
  document.documentElement.style.setProperty("--avatar-left", `${frame.left.toFixed(2)}px`);
  document.documentElement.style.setProperty("--avatar-top", `${frame.top.toFixed(2)}px`);
  elements.companion.dataset.frameRatio = frame.ratio.toFixed(4);
  elements.companion.dataset.frameStatus = frame.fullyVisible && frame.overlap === 0 ? "safe" : "clamped";

  if (immediate) {
    state.reframeTimer = window.setTimeout(() => {
      elements.experience?.classList.remove("is-reframing");
    }, 80);
  }

  return frame;
}

async function travelTo(nextIndex, { focusChapter = false, announceChange = true } = {}) {
  if (!state.manifest || state.isTraversing) return;
  const clampedIndex = clamp(nextIndex, 0, state.manifest.locations.length - 1);
  if (clampedIndex === state.locationIndex) return;

  const nextLocation = state.manifest.locations[clampedIndex];
  const power = state.manifest.powers[nextLocation.power] ?? state.manifest.powers["reality-bending"];
  const duration = state.motionEnabled ? power.durationMs : 40;

  state.isTraversing = true;
  state.sceneMode = "outer";
  elements.experience.classList.add("is-traversing", power.className);
  document.documentElement.dataset.experienceState = "traversing";
  setInteractionLock(true);
  recalculateFraming();
  announce(`${power.name}. Travelling to ${nextLocation.formalName}.`);

  const nextSource = chooseSceneSource(nextLocation.outer);
  void loadImage(nextSource);
  await wait(Math.max(16, duration * 0.42));

  state.locationIndex = clampedIndex;
  renderScene();
  renderLocation({ announceChange: false });
  await wait(Math.max(16, duration * 0.58));

  elements.experience.classList.remove("is-traversing", power.className);
  state.isTraversing = false;
  setInteractionLock(false);
  document.documentElement.dataset.experienceState = "exploring";
  renderLocation({ announceChange });
  setPresenting(true, 720);
  recalculateFraming();

  if (focusChapter) elements.chapterPanel?.focus({ preventScroll: true });
  preloadAdjacentScenes();
}

async function togglePortal() {
  if (!state.manifest || state.isTraversing) return;
  const location = getCurrentLocation();
  if (!location) return;

  const power = state.manifest.powers["reality-bending"];
  const duration = state.motionEnabled ? power.durationMs : 40;
  state.isTraversing = true;
  elements.experience.classList.add("is-traversing", power.className);
  document.documentElement.dataset.experienceState = "transitioning";
  setInteractionLock(true);
  recalculateFraming();

  await wait(Math.max(16, duration * 0.43));
  state.sceneMode = state.sceneMode === "outer" ? "inner" : "outer";
  renderScene();
  renderLocation({ announceChange: false });
  await wait(Math.max(16, duration * 0.57));

  elements.experience.classList.remove("is-traversing", power.className);
  state.isTraversing = false;
  setInteractionLock(false);
  document.documentElement.dataset.experienceState = "exploring";
  recalculateFraming();
  announce(
    state.sceneMode === "inner"
      ? `Entered ${location.formalName}. ${location.title}`
      : `Returned to the outer approach of ${location.formalName}.`,
  );
  setPresenting(true, 820);
}

function selectGuide(guideId) {
  if (!state.manifest) return;
  const guide = state.manifest.guides.find((candidate) => candidate.id === guideId);
  if (!guide) return;
  state.selectedGuideId = guide.id;
  safeStorageSet(storageKeys.guide, guide.id);
  renderGuide();
  closeDialog(elements.guideDialog);
  setPresenting(true, 900);
  recalculateFraming();
  showToast(`${guide.name} will travel beside you.`);
  announce(`${guide.name} selected as your Anzania guide.`);
}

function openDialog(dialog) {
  if (!dialog) return;
  resetIdleTimer();
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function" && dialog.open) {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
  resetIdleTimer();
  window.requestAnimationFrame(() => recalculateFraming());
}

function closeOpenDialog() {
  const openDialogElement = document.querySelector("dialog[open]");
  if (!openDialogElement) return false;
  closeDialog(openDialogElement);
  return true;
}

function setLookBack(active) {
  if (!state.hasBegun || state.isTraversing) return;
  state.isLookingBack = active;
  elements.experience.classList.toggle("is-looking-back", active);
  elements.lookBackButton?.setAttribute("aria-pressed", String(active));
  if (active) {
    resetIdleTimer();
    announce("Looking back across the current approach.");
  }
}

function applyMotionPreference(enabled, { persist = true } = {}) {
  state.motionEnabled = Boolean(enabled);
  elements.experience.dataset.motion = state.motionEnabled ? "on" : "off";
  if (elements.motionToggle) elements.motionToggle.checked = state.motionEnabled;
  if (!state.motionEnabled) {
    document.documentElement.style.setProperty("--parallax-x", "0px");
    document.documentElement.style.setProperty("--parallax-y", "0px");
    document.documentElement.style.setProperty("--foreground-x", "0px");
    document.documentElement.style.setProperty("--foreground-y", "0px");
  }
  if (persist) safeStorageSet(storageKeys.motion, state.motionEnabled ? "on" : "off");
}

function handleParallax(event) {
  if (!state.motionEnabled || !state.hasBegun || state.isTraversing) return;
  if (state.parallaxFrame) return;
  const pointerX = event.clientX;
  const pointerY = event.clientY;
  state.parallaxFrame = window.requestAnimationFrame(() => {
    state.parallaxFrame = 0;
    const x = (pointerX / window.innerWidth - 0.5) * 2;
    const y = (pointerY / window.innerHeight - 0.5) * 2;
    document.documentElement.style.setProperty("--parallax-x", `${(-x * 8).toFixed(2)}px`);
    document.documentElement.style.setProperty("--parallax-y", `${(-y * 5).toFixed(2)}px`);
    document.documentElement.style.setProperty("--foreground-x", `${(-x * 15).toFixed(2)}px`);
    document.documentElement.style.setProperty("--foreground-y", `${(-y * 9).toFixed(2)}px`);
  });
}

function resetParallax() {
  if (!state.motionEnabled) return;
  document.documentElement.style.setProperty("--parallax-x", "0px");
  document.documentElement.style.setProperty("--parallax-y", "0px");
  document.documentElement.style.setProperty("--foreground-x", "0px");
  document.documentElement.style.setProperty("--foreground-y", "0px");
}

function activateIdleLean() {
  if (!state.hasBegun || state.isTraversing || document.querySelector("dialog[open]")) return;
  const frame = state.lastFrame ?? recalculateFraming();
  if (!frame) return;
  const leanLeft = frame.left + frame.width / 2 < window.innerWidth / 2;
  document.documentElement.style.setProperty("--idle-lean-angle", leanLeft ? "-3deg" : "3deg");
  document.documentElement.style.setProperty("--idle-lean-shift", leanLeft ? "-2.5%" : "2.5%");
  elements.experience.classList.add("is-idle-leaning");
}

function resetIdleTimer() {
  window.clearTimeout(state.idleTimer);
  elements.experience?.classList.remove("is-idle-leaning");
  if (state.hasBegun) {
    state.idleTimer = window.setTimeout(activateIdleLean, 22000);
  }
}

function preloadAdjacentScenes() {
  if (!state.manifest) return;
  const candidates = [state.locationIndex, state.locationIndex + 1, state.locationIndex - 1]
    .filter((index) => index >= 0 && index < state.manifest.locations.length)
    .flatMap((index) => {
      const location = state.manifest.locations[index];
      return [chooseSceneSource(location.outer), chooseSceneSource(location.inner)];
    });
  for (const src of [...new Set(candidates)]) void loadImage(src);
}

function beginJourney() {
  state.hasBegun = true;
  elements.arrivalGate.hidden = true;
  elements.explorer.hidden = false;
  document.documentElement.dataset.experienceState = "exploring";
  renderLocation({ announceChange: true });
  renderGuide();
  window.requestAnimationFrame(() => {
    recalculateFraming({ immediate: true });
    elements.chapterPanel?.focus({ preventScroll: true });
  });
  resetIdleTimer();
  showToast("Use the arrows to cross Anzania. Every location opens into the complete Static View record.", 3200);
}

function parseInitialLocation() {
  if (!state.manifest) return 0;
  const hash = window.location.hash.replace(/^#/, "");
  const index = state.manifest.locations.findIndex((location) => location.id === hash);
  return index >= 0 ? index : 0;
}

function restorePreferences() {
  const storedGuide = safeStorageGet(storageKeys.guide);
  if (storedGuide && state.manifest?.guides.some((guide) => guide.id === storedGuide)) {
    state.selectedGuideId = storedGuide;
  }

  const visited = safeStorageGet(storageKeys.visited);
  if (visited) {
    try {
      const parsed = JSON.parse(visited);
      if (Array.isArray(parsed)) state.visited = new Set(parsed.filter((value) => typeof value === "string"));
    } catch {
      state.visited = new Set();
    }
  }

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const storedMotion = safeStorageGet(storageKeys.motion);
  applyMotionPreference(storedMotion ? storedMotion === "on" : !reducedMotion, { persist: false });
}

function bindEvents() {
  elements.beginJourney?.addEventListener("click", beginJourney);
  elements.previousLocation?.addEventListener("click", () => travelTo(state.locationIndex - 1));
  elements.nextLocation?.addEventListener("click", () => travelTo(state.locationIndex + 1));
  elements.portalButton?.addEventListener("click", togglePortal);

  elements.locationRailList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-location-index]");
    if (!button) return;
    travelTo(Number(button.dataset.locationIndex));
  });

  elements.mapLocationList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-map-location-index]");
    if (!button) return;
    closeDialog(elements.mapDialog);
    travelTo(Number(button.dataset.mapLocationIndex), { focusChapter: true });
  });

  elements.guideGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-guide-id]");
    if (!button) return;
    selectGuide(button.dataset.guideId);
  });

  elements.mapButton?.addEventListener("click", () => openDialog(elements.mapDialog));
  elements.guideButton?.addEventListener("click", () => {
    warmGuideCards();
    openDialog(elements.guideDialog);
  });
  elements.optionsButton?.addEventListener("click", () => openDialog(elements.optionsDialog));
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => closeDialog(button.closest("dialog")));
  });
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeDialog(dialog);
    });
  });

  elements.motionToggle?.addEventListener("change", () => {
    applyMotionPreference(elements.motionToggle.checked);
    showToast(state.motionEnabled ? "Atmospheric motion enabled." : "Atmospheric motion reduced.");
  });

  const startLookBack = (event) => {
    event.preventDefault();
    if (event.pointerId != null) elements.lookBackButton?.setPointerCapture?.(event.pointerId);
    setLookBack(true);
  };
  const endLookBack = (event) => {
    if (event?.pointerId != null && elements.lookBackButton?.hasPointerCapture?.(event.pointerId)) {
      elements.lookBackButton.releasePointerCapture(event.pointerId);
    }
    setLookBack(false);
  };
  elements.lookBackButton?.addEventListener("pointerdown", startLookBack);
  elements.lookBackButton?.addEventListener("pointerup", endLookBack);
  elements.lookBackButton?.addEventListener("pointercancel", endLookBack);
  elements.lookBackButton?.addEventListener("lostpointercapture", () => setLookBack(false));
  elements.lookBackButton?.addEventListener("contextmenu", (event) => event.preventDefault());

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
    resetIdleTimer();

    if (event.key === "Escape" && closeOpenDialog()) {
      event.preventDefault();
      return;
    }
    if (!state.hasBegun) {
      if (event.key === "Enter") {
        event.preventDefault();
        beginJourney();
      }
      return;
    }
    if (document.querySelector("dialog[open]")) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      travelTo(state.locationIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      travelTo(state.locationIndex + 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      togglePortal();
    } else if (event.key.toLowerCase() === "m") {
      event.preventDefault();
      openDialog(elements.mapDialog);
    } else if (event.key.toLowerCase() === "g") {
      event.preventDefault();
      openDialog(elements.guideDialog);
    } else if (event.key.toLowerCase() === "l" && !event.repeat) {
      event.preventDefault();
      setLookBack(true);
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.key.toLowerCase() === "l") setLookBack(false);
  });

  window.addEventListener("pointermove", (event) => {
    handleParallax(event);
    resetIdleTimer();
  }, { passive: true });
  window.addEventListener("pointerleave", resetParallax);
  window.addEventListener("pointerdown", resetIdleTimer, { passive: true });
  window.addEventListener("touchstart", resetIdleTimer, { passive: true });
  window.addEventListener("resize", () => {
    renderScene({ immediate: true });
    recalculateFraming({ immediate: true });
  });
  window.addEventListener("orientationchange", () => {
    window.setTimeout(() => recalculateFraming({ immediate: true }), 180);
  });
  window.addEventListener("hashchange", () => {
    if (!state.manifest || state.isTraversing) return;
    const nextIndex = parseInitialLocation();
    if (nextIndex !== state.locationIndex) travelTo(nextIndex);
  });

  if ("ResizeObserver" in window && elements.chapterPanel) {
    const observer = new ResizeObserver(() => recalculateFraming());
    observer.observe(elements.chapterPanel);
  }
}

async function initialise() {
  try {
    setLoadingProgress(12, "Reading the atlas…");
    const response = await fetch(manifestUrl, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Manifest request failed with ${response.status}`);
    state.manifest = await response.json();

    setLoadingProgress(34, "Opening the western reach…");
    state.locationIndex = parseInitialLocation();
    restorePreferences();
    renderNavigation();
    renderGuides();
    renderGuide();
    renderScene({ immediate: true });
    renderLocation();

    const firstLocation = getCurrentLocation();
    const firstGuide = getCurrentGuide();
    const preloadSources = [
      chooseSceneSource(firstLocation.outer),
      chooseSceneSource(firstLocation.inner),
      resolveAsset(firstGuide.src),
      resolveAsset(state.manifest.atlas.src),
    ];

    setLoadingProgress(58, "Gathering the first horizon…");
    const preloadResults = await Promise.all(preloadSources.map(loadImage));
    const loadedCount = preloadResults.filter((result) => result.loaded).length;
    setLoadingProgress(82, loadedCount === preloadResults.length ? "Calling your guide…" : "Completing the crossing…");
    await wait(state.motionEnabled ? 260 : 20);

    bindEvents();
    preloadAdjacentScenes();
    setLoadingProgress(100, "The crossing is ready.");
    await wait(state.motionEnabled ? 340 : 20);

    elements.loadingGate?.classList.add("is-leaving");
    await wait(state.motionEnabled ? 470 : 20);
    elements.loadingGate.hidden = true;
    elements.arrivalGate.hidden = false;
    document.documentElement.dataset.experienceState = "arrival";
    announce("Explore Anzania is ready. Anzania is an original fictional portfolio world.");
  } catch (error) {
    console.error("Explore Anzania could not initialise", error);
    setLoadingProgress(100, "The immersive atlas could not be opened.");
    if (elements.loadingGate) {
      elements.loadingGate.innerHTML = `
        <div class="arrival-gate__frame">
          <p class="arrival-gate__kicker">The crossing is temporarily closed</p>
          <p class="loading-gate__title" style="font-size:clamp(2.8rem,8vw,6rem)">ANZANIA</p>
          <p class="arrival-gate__definition">The complete portfolio remains available in Static View.</p>
          <div class="arrival-gate__actions">
            <a class="explore-button explore-button--primary" href="${resolveSitePath("")}">Open Static View <span aria-hidden="true">→</span></a>
          </div>
        </div>`;
    }
    document.documentElement.dataset.experienceState = "fallback";
  }
}

window.__ANZANIA_DEBUG__ = {
  getState: () => ({
    locationIndex: state.locationIndex,
    locationId: getCurrentLocation()?.id ?? null,
    sceneMode: state.sceneMode,
    guideId: state.selectedGuideId,
    isTraversing: state.isTraversing,
    isLookingBack: state.isLookingBack,
    hasBegun: state.hasBegun,
    frame: state.lastFrame,
  }),
  recalculateFraming,
  travelTo,
  togglePortal,
};

void initialise();
