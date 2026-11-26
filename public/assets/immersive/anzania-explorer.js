import { createSceneEffects } from "./anzania-scene-effects.js";

const manifestUrl = new URL("./runtime-manifest.json", import.meta.url);
const assetRootUrl = new URL("./", import.meta.url);
const siteRootUrl = new URL("../../", import.meta.url);

const selectors = {
  skipLink: ".explore-skip-link",
  experience: "[data-experience]",
  loadingGate: "[data-loading-gate]",
  loadingProgress: "[data-loading-progress]",
  loadingStatus: "[data-loading-status]",
  arrivalGate: "[data-arrival-gate]",
  beginJourney: "[data-begin-journey]",
  explorer: "[data-explorer]",
  scenePrevious: "[data-scene-previous]",
  sceneCurrent: "[data-scene-current]",
  sceneForegroundPrevious: "[data-scene-foreground-previous]",
  sceneForeground: "[data-scene-foreground]",
  sceneEffects: "[data-scene-effects]",
  progressLabel: "[data-progress-label]",
  progressBar: "[data-progress-bar]",
  locationRailList: "[data-location-rail-list]",
  mapLocationList: "[data-map-location-list]",
  locationNumber: "[data-location-number]",
  locationRegion: "[data-location-region]",
  locationName: "[data-location-name]",
  sceneBrief: "[data-scene-brief]",
  sceneEvidence: "[data-scene-evidence]",
  scenePortal: "[data-scene-portal]",
  chapterPanel: "[data-chapter-panel]",
  chapterBody: "[data-chapter-body]",
  chapterEyebrow: "[data-chapter-eyebrow]",
  chapterTitle: "[data-chapter-title]",
  chapterLead: "[data-chapter-lead]",
  chapterSignal: "[data-chapter-signal]",
  chapterSignalValue: "[data-chapter-signal-value]",
  chapterEvidence: "[data-chapter-evidence]",
  chapterFacts: "[data-chapter-facts]",
  chapterActions: "[data-chapter-actions]",
  chapterInsideKicker: "[data-chapter-inside-kicker]",
  chapterInsideTitle: "[data-chapter-inside-title]",
  chapterInsideSummary: "[data-chapter-inside-summary]",
  chapterTabs: "[data-chapter-tabs]",
  chapterTabPanel: "[data-chapter-tab-panel]",
  chapterArtifact: "[data-chapter-artifact]",
  companion: "[data-companion]",
  companionImage: "[data-companion-image]",
  companionName: "[data-companion-name]",
  guideSpecialty: "[data-guide-specialty]",
  guideTemperament: "[data-guide-temperament]",
  guideInsight: "[data-guide-insight]",
  lookBackButton: "[data-look-back-button]",
  previousLocation: "[data-previous-location]",
  nextLocation: "[data-next-location]",
  modeIndicator: "[data-mode-indicator]",
  modeCopy: "[data-mode-copy]",
  abilityDock: "[data-ability-dock]",
  abilityList: "[data-ability-list]",
  selectedAbilityName: "[data-selected-ability-name]",
  mapButton: "[data-map-button]",
  guideButton: "[data-guide-button]",
  viewSceneButton: "[data-view-scene-button]",
  viewSceneLabel: "[data-view-scene-label]",
  viewSceneStatus: "[data-scene-view-status]",
  optionsButton: "[data-options-button]",
  mapDialog: "[data-map-dialog]",
  guideDialog: "[data-guide-dialog]",
  optionsDialog: "[data-options-dialog]",
  guideGrid: "[data-guide-grid]",
  motionToggle: "[data-motion-toggle]",
  toast: "[data-experience-toast]",
  announcer: "[data-experience-announcer]",
  pilotWaypoints: "[data-pilot-waypoints]",
  chamberDialog: "[data-chamber-dialog]",
  archiveDialog: "[data-archive-dialog]",
  pilotSkip: "[data-pilot-skip]",
  pilotGuide: "[data-pilot-guide]",
  pilotEffectFar: "[data-pilot-effect-far]",
  pilotEffectNear: "[data-pilot-effect-near]",
};

const elements = Object.fromEntries(
  Object.entries(selectors).map(([key, selector]) => [
    key,
    document.querySelector(selector),
  ]),
);

const sceneEffects = createSceneEffects(elements.sceneEffects, {
  onContextLost: () => {
    elements.experience?.classList.remove("has-scene-effects");
    if (elements.experience) {
      elements.experience.dataset.effectRenderer = "css-fallback";
    }
  },
});

const solarAnchors = {
  "threshold-dunes": {
    outer: [0.57, 0.32],
    inner: [0.14, 0.22],
  },
  "stone-pass": {
    outer: [0.62, 0.24],
    inner: [0.56, 0.2],
  },
  "garden-origins": {
    outer: [0.84, 0.18],
    inner: [0.75, 0.13],
  },
  "archive-echoes": {
    outer: [0.28, 0.34],
    inner: [0.64, 0.2],
  },
  "forge-resolve": {
    outer: [0.28, 0.17],
    inner: [0.2, 0.14],
  },
  "bazaar-skill": {
    outer: [0.54, 0.23],
    inner: [0.62, 0.2],
  },
  "observatory-horizons": {
    outer: [0.76, 0.21],
    inner: [0.58, 0.16],
  },
  "oasis-audience": {
    outer: [0.83, 0.25],
    inner: [0.39, 0.43],
  },
};

const storageKeys = {
  guide: "anzania-guide-v2",
  power: "anzania-power-v2",
  motion: "anzania-motion-v2",
  visited: "anzania-visited-v2",
};

const scenePilot = {
  dunes: {
    location: "threshold-dunes",
    mode: "outer",
    focus: [65, 46],
    portraitFocus: [76, 44],
    guides: [
      [0.673, 0.813, 0.215],
      [0.741, 0.61, 0.145],
    ],
    shortLandscapeGuide: [0.643, 0.62, 0.215],
    waypoints: { "journey-next": { point: [0.752, 0.349] } },
  },
  pass: {
    location: "stone-pass",
    mode: "outer",
    focus: [64, 48],
    portraitFocus: [76, 32],
    guides: [
      [0.665, 0.799, 0.225],
      [0.756, 0.614, 0.153],
    ],
    waypoints: {
      "chamber-enter": { point: [0.67, 0.425], portrait: [0.775, 0.42] },
      "journey-back": {
        point: [0.769, 0.699],
        portrait: [0.736, 0.282],
        portraitSide: "below",
      },
    },
  },
  chamber: {
    location: "stone-pass",
    mode: "inner",
    focus: [36, 54],
    portraitFocus: [49, 48],
    guides: [
      [0.559, 0.824, 0.393],
      [0.552, 0.781, 0.287],
    ],
    waypoints: {
      "chamber-exit": {
        point: [0.805, 0.734],
        portrait: [0.532, 0.234],
        portraitSide: "left",
      },
      workbench: {
        point: [725 / 1672, 579 / 941],
        portrait: [700 / 1672, 579 / 941],
      },
      "source-books": { point: [835 / 1672, 507 / 941], side: "left" },
      "validation-scroll": {
        point: [1120 / 1672, 403 / 941],
        portrait: [914 / 1672, 486 / 941],
        alternate: [588 / 1672, 301 / 941],
        portraitSide: "above",
      },
    },
  },
};

const archiveWaypoints = {
  "archive-exit": {
    point: [0.486, 0.631],
    portrait: [0.46, 0.567],
    label: "Return to Archive entrance",
    portraitLabel: "Back to entrance",
    portraitSide: "right",
  },
  "archive-shelves": {
    point: [0.897, 0.391],
    portrait: [0.506, 0.431],
    label: "Scroll shelves",
    portraitLabel: "Carved record",
    side: "left",
  },
  "archive-astrolabe": {
    point: [0.606, 0.504],
    label: "Review instrument",
    portraitSide: "left",
  },
};

const state = {
  manifest: null,
  locationIndex: 0,
  sceneMode: "outer",
  selectedGuideId: "dn-m-afr-01",
  selectedPowerId: "sand-teleportation",
  activeInsideTab: "now",
  motionEnabled: true,
  isTraversing: false,
  isLookingBack: false,
  isViewingScene: false,
  hasBegun: false,
  guidePose: "idle",
  guidePoseGuideId: null,
  guidePoseSource: null,
  guidePoseRequest: 0,
  visited: new Set(),
  lastFrame: null,
  toastTimer: 0,
  presentTimer: 0,
  idleTimer: 0,
  reframeTimer: 0,
  chapterScrollFrame: 0,
  parallaxFrame: 0,
  pendingHash: false,
  crossing: null,
  inspection: null,
};

const guidePoseNames = new Set(["idle", "present", "travel", "lookback"]);
const guidePoseDescriptions = {
  idle: "Standing at ease.",
  present: "Presenting the current evidence with an open hand.",
  travel: "Moving forward through the crossing.",
  lookback: "Looking back over their shoulder.",
};

const wait = (duration) =>
  new Promise((resolve) => window.setTimeout(resolve, duration));
const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

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
    // Storage can be unavailable in privacy-restricted browsing contexts.
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
    image.onload = async () => {
      window.clearTimeout(timeout);
      if (typeof image.decode === "function") {
        try {
          await image.decode();
        } catch {
          // A completed load is still safe to cache when decode is unavailable.
        }
      }
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
  return resolveAsset(requiredWidth <= 1_050 ? scene.small : scene.large);
}

function getPilotSetting(
  location = getCurrentLocation(),
  mode = state.sceneMode,
) {
  return Object.keys(scenePilot).find(
    (key) =>
      scenePilot[key].location === location?.id &&
      scenePilot[key].mode === mode,
  );
}

function pilotPortrait() {
  return window.innerWidth <= 704;
}

function sceneGuide(location = getCurrentLocation(), mode = state.sceneMode) {
  return location?.[mode]?.guideStage;
}

function sceneFocus(setting, stage) {
  const profile = scenePilot[setting];
  if (profile) return pilotPortrait() ? profile.portraitFocus : profile.focus;
  if (!stage) return [50, 50];
  const { clientWidth: width, clientHeight: height } = elements.sceneCurrent;
  const crop = height * (16 / 9) - width;
  const portrait = width <= 820 && height > width;
  const anchor = (
    portrait && stage.portrait ? stage.portrait : stage.anchors[0]
  )[0];
  const x =
    portrait && crop > 0
      ? clamp((anchor * (width + crop) - width * 0.67) / crop, 0, 1) * 100
      : 50;
  return [x, stage.focusY ?? 50];
}

function setSceneFocus(setting, stage) {
  const focus = sceneFocus(setting, stage)
    .map((axis) => `${axis}%`)
    .join(" ");
  elements.sceneCurrent.style.backgroundPosition = focus;
  elements.sceneForeground.style.backgroundPosition = focus;
}

function projectPilotPoint(point, setting, stage) {
  const width = elements.sceneCurrent.clientWidth;
  const height = elements.sceneCurrent.clientHeight;
  const sourceRatio = 1600 / 900;
  const artWidth = Math.max(width, height * sourceRatio);
  const artHeight = artWidth / sourceRatio;
  const [x, y] = sceneFocus(setting, stage);
  return [
    ((width - artWidth) * x) / 100 + artWidth * point[0],
    ((height - artHeight) * y) / 100 + artHeight * point[1],
  ];
}

function renderPilotWaypoints() {
  const layer = elements.pilotWaypoints;
  const setting = getPilotSetting();
  if (setting) elements.experience.dataset.pilotSetting = setting;
  else delete elements.experience.dataset.pilotSetting;
  if (!layer) return;
  const archive =
    state.sceneMode === "inner" &&
    getCurrentLocation()?.id === "archive-echoes";
  const waypoints = archive ? archiveWaypoints : scenePilot[setting]?.waypoints;
  layer.hidden =
    !waypoints || !state.hasBegun || state.isTraversing || state.isViewingScene;
  if (layer.hidden) return;

  const stage = sceneGuide();
  const portrait = archive
    ? window.innerWidth <= 820 && window.innerWidth < window.innerHeight
    : pilotPortrait();
  const width = layer.clientWidth;
  const height = layer.clientHeight;
  const readingBounds = elements.chapterPanel.getBoundingClientRect();
  const visible = ([x, y]) =>
    x > 27 && x < width - 27 && y > 29 && y < height - 29;
  for (const button of layer.querySelectorAll("[data-pilot-action]")) {
    const pin = waypoints[button.dataset.pilotAction];
    const choices =
      pin &&
      (portrait
        ? [pin.portrait, pin.point, pin.alternate]
        : [pin.point, pin.alternate, pin.portrait]
      ).filter(Boolean);
    const point = choices?.find((candidate) =>
      visible(projectPilotPoint(candidate, setting, stage)),
    );
    button.hidden = !point;
    if (!point) continue;
    const [x, y] = projectPilotPoint(point, setting, stage);
    const label = button.querySelector("[data-pilot-label]");
    if (pin.label)
      label.textContent =
        point === pin.portrait && pin.portraitLabel
          ? pin.portraitLabel
          : pin.label;
    const labelWidth = label.offsetWidth;
    let side =
      (portrait && point === pin.portrait && pin.portraitSide) ||
      pin.side ||
      "right";
    if (side === "right" && x + labelWidth + 30 > width) side = "left";
    if (side === "left" && x - labelWidth - 30 < 0) side = "below";
    if (
      side === "left" &&
      y >= readingBounds.top &&
      y <= readingBounds.bottom &&
      x > readingBounds.right &&
      x - labelWidth - 30 < readingBounds.right &&
      x + labelWidth + 30 < width
    ) {
      side = "right";
    }
    button.dataset.pilotLabelSide = side;
    button.style.setProperty("--pilot-x", `${x}px`);
    button.style.setProperty("--pilot-y", `${y}px`);
  }
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

function showToast(message, duration = 2_600) {
  if (!elements.toast) return;
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.requestAnimationFrame(() => recalculateFraming());
  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
    window.requestAnimationFrame(() => recalculateFraming());
  }, duration);
}

function setPresenting(
  active = true,
  duration = 900,
  { updateGuidePose = true, settlePose = "idle" } = {},
) {
  window.clearTimeout(state.presentTimer);
  elements.experience?.classList.toggle("is-presenting", active);
  if (active && updateGuidePose) void setGuidePose("present");
  if (active) {
    state.presentTimer = window.setTimeout(() => {
      elements.experience?.classList.remove("is-presenting");
      if (updateGuidePose && !state.isTraversing && !state.isLookingBack) {
        void setGuidePose(settlePose);
      }
    }, duration);
  } else if (updateGuidePose && !state.isTraversing && !state.isLookingBack) {
    void setGuidePose(settlePose);
  }
}

function setInteractionLock(locked) {
  elements.chapterPanel.inert = locked || state.isViewingScene;
  for (const control of [
    elements.previousLocation,
    elements.nextLocation,
    elements.scenePortal,
    elements.mapButton,
    elements.guideButton,
    elements.viewSceneButton,
    elements.optionsButton,
  ]) {
    control?.toggleAttribute("disabled", locked);
  }
  elements.abilityList
    ?.querySelectorAll("button")
    .forEach((control) => control.toggleAttribute("disabled", locked));
  renderPilotWaypoints();
}

function getCurrentLocation() {
  return state.manifest?.locations[state.locationIndex] ?? null;
}

function getSolarAnchor(location, sceneMode = state.sceneMode) {
  return solarAnchors[location?.id]?.[sceneMode] ?? [0.58, 0.3];
}

function getCurrentGuide() {
  return (
    state.manifest?.guides.find(
      (guide) => guide.id === state.selectedGuideId,
    ) ??
    state.manifest?.guides[0] ??
    null
  );
}

function normaliseGuidePose(pose) {
  return guidePoseNames.has(pose) ? pose : "idle";
}

function getGuidePoseCandidates(guide, pose) {
  if (!guide) return [];
  const requestedPose = normaliseGuidePose(pose);
  const candidates = [];
  const seen = new Set();
  const addCandidate = (source, sourcePose) => {
    if (typeof source !== "string" || !source.trim() || seen.has(source)) {
      return;
    }
    seen.add(source);
    candidates.push({ source, sourcePose });
  };

  addCandidate(guide.poses?.[requestedPose], requestedPose);
  if (requestedPose !== "idle") addCandidate(guide.poses?.idle, "idle");
  addCandidate(guide.image, "idle");
  // `src` is the pre-pose manifest contract and remains supported.
  addCandidate(guide.src, "idle");
  return candidates;
}

function getGuidePoseSource(guide, pose = "idle") {
  return getGuidePoseCandidates(guide, pose)[0]?.source ?? null;
}

function getGuidePreloadSources(guide) {
  if (!guide) return [];
  return ["idle", "present", "travel", "lookback"]
    .flatMap((pose) => getGuidePoseCandidates(guide, pose))
    .map(({ source }) => resolveAsset(source))
    .filter((source, index, sources) => sources.indexOf(source) === index);
}

function getGuidePoseAlt(guide, pose) {
  const requestedPose = normaliseGuidePose(pose);
  const authoredAlt = guide?.poseAlts?.[requestedPose];
  if (typeof authoredAlt === "string" && authoredAlt.trim()) {
    return authoredAlt;
  }

  const baseAlt =
    typeof guide?.alt === "string" && guide.alt.trim()
      ? guide.alt.trim()
      : `${guide?.name ?? "Anzania guide"}, full-body companion.`;
  const sentence = /[.!?]$/.test(baseAlt) ? baseAlt : `${baseAlt}.`;
  return `${sentence} ${guidePoseDescriptions[requestedPose]}`;
}

async function setGuidePose(pose, { guide = getCurrentGuide() } = {}) {
  const requestedPose = normaliseGuidePose(pose);
  state.guidePose = requestedPose;
  const requestId = ++state.guidePoseRequest;
  const guideId = guide?.id ?? null;
  const candidates = getGuidePoseCandidates(guide, requestedPose);

  if (!guide || !elements.companionImage || candidates.length === 0) {
    if (requestId === state.guidePoseRequest) {
      elements.companion?.removeAttribute("data-guide-pose-pending");
      elements.companion?.setAttribute("aria-busy", "false");
    }
    return false;
  }

  elements.companion?.setAttribute("aria-busy", "true");
  elements.companion?.setAttribute("data-guide-pose-pending", requestedPose);

  const commit = (source, sourcePose) => {
    if (
      requestId !== state.guidePoseRequest ||
      getCurrentGuide()?.id !== guideId
    ) {
      return false;
    }

    elements.companionImage.src = source;
    elements.companionImage.alt = getGuidePoseAlt(guide, requestedPose);
    elements.companionImage.style.setProperty(
      "--guide-foot-offset",
      `${100 - (guide.footline?.[sourcePose] ?? 94)}%`,
    );
    elements.companionImage.dataset.guidePose = requestedPose;
    elements.companionImage.toggleAttribute(
      "data-guide-pose-fallback",
      sourcePose !== requestedPose,
    );
    if (elements.companion) {
      elements.companion.dataset.guidePose = requestedPose;
      elements.companion.removeAttribute("data-guide-pose-pending");
      elements.companion.setAttribute("aria-busy", "false");
    }
    if (elements.experience) {
      elements.experience.dataset.guidePose = requestedPose;
    }
    state.guidePoseGuideId = guideId;
    state.guidePoseSource = source;
    return true;
  };

  for (const candidate of candidates) {
    const source = resolveAsset(candidate.source);
    if (
      state.guidePoseGuideId === guideId &&
      state.guidePoseSource === source
    ) {
      return commit(source, candidate.sourcePose);
    }

    const result = await loadImage(source);
    if (
      requestId !== state.guidePoseRequest ||
      getCurrentGuide()?.id !== guideId
    ) {
      return false;
    }
    if (result.loaded) return commit(source, candidate.sourcePose);
  }

  if (requestId === state.guidePoseRequest) {
    elements.companion?.removeAttribute("data-guide-pose-pending");
    elements.companion?.setAttribute("aria-busy", "false");
  }
  return false;
}

function preloadGuidePoses(guide = getCurrentGuide()) {
  for (const source of getGuidePreloadSources(guide)) void loadImage(source);
}

function getSettledGuidePose() {
  if (state.isLookingBack) return "lookback";
  if (state.isTraversing) return "travel";
  if (elements.experience?.classList.contains("is-presenting")) {
    return "present";
  }
  return "idle";
}

function resetChapterScroll() {
  if (!elements.chapterBody) return;
  elements.chapterBody.scrollTop = 0;
  if (state.chapterScrollFrame) {
    window.cancelAnimationFrame(state.chapterScrollFrame);
  }
  state.chapterScrollFrame = window.requestAnimationFrame(() => {
    state.chapterScrollFrame = 0;
    elements.chapterBody.scrollTop = 0;
  });
}

function getCurrentPower() {
  return (
    state.manifest?.powers[state.selectedPowerId] ??
    state.manifest?.powers["reality-bending"] ??
    null
  );
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
              data-visited="${state.visited.has(location.id) || index === state.locationIndex ? "true" : "false"}"
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

function renderAbilities() {
  if (!state.manifest || !elements.abilityList) return;

  elements.abilityList.innerHTML = Object.entries(state.manifest.powers)
    .map(
      ([powerId, power]) => `
        <button
          type="button"
          data-power-id="${escapeHtml(powerId)}"
          aria-pressed="${powerId === state.selectedPowerId ? "true" : "false"}"
          aria-label="Use ${escapeHtml(power.name)} for travel"
          title="${escapeHtml(power.description ?? "")}"
        >
          <span class="ability-dock__glyph" aria-hidden="true"><i>${escapeHtml(power.glyph ?? "◇")}</i></span>
          <span class="ability-dock__copy">
            <strong>${escapeHtml(power.name)}</strong>
            <small>${escapeHtml(power.description ?? "Choose this crossing style")}</small>
          </span>
        </button>`,
    )
    .join("");

  const power = getCurrentPower();
  if (elements.selectedAbilityName && power) {
    elements.selectedAbilityName.textContent = power.name;
  }
}

function renderGuides() {
  if (!state.manifest || !elements.guideGrid) return;

  elements.guideGrid.innerHTML = state.manifest.guides
    .map((guide) => {
      const source = getGuidePoseSource(guide, "idle");
      if (!source) return "";
      return `
        <button
          class="guide-card"
          type="button"
          data-guide-id="${escapeHtml(guide.id)}"
          aria-pressed="${guide.id === state.selectedGuideId ? "true" : "false"}"
          aria-label="Choose ${escapeHtml(guide.name)}, ${escapeHtml(guide.specialty)}"
          style="--card-accent:${escapeHtml(guide.accent ?? "#d7a94c")}" 
        >
          <span class="guide-card__figure">
            <span class="guide-card__halo" aria-hidden="true"></span>
            <img src="${resolveAsset(source)}" alt="" width="640" height="960" loading="lazy" decoding="async" />
          </span>
          <strong>${escapeHtml(guide.name)}</strong>
          <small>${escapeHtml(guide.specialty)}</small>
          <span class="guide-card__origin">${escapeHtml(guide.presentation)} · ${escapeHtml(guide.inspiration)}</span>
        </button>`;
    })
    .join("");
}

function warmGuideCards() {
  const selectedImage = elements.guideGrid?.querySelector(
    `[data-guide-id="${state.selectedGuideId}"] img`,
  );
  if (!(selectedImage instanceof HTMLImageElement)) return;
  selectedImage.loading = "eager";
  selectedImage.fetchPriority = "low";
  if (!selectedImage.complete && typeof selectedImage.decode === "function") {
    selectedImage.decode().catch(() => undefined);
  }
}

function warmGuideSelection(guideId) {
  const guide = state.manifest?.guides.find(
    (candidate) => candidate.id === guideId,
  );
  if (guide) preloadGuidePoses(guide);
}

function renderGuide() {
  const guide = getCurrentGuide();
  const location = getCurrentLocation();
  if (!guide) return;

  void setGuidePose(state.guidePose, { guide });
  if (elements.companionName) elements.companionName.textContent = guide.name;
  if (elements.guideSpecialty) {
    elements.guideSpecialty.textContent = guide.specialty;
  }
  if (elements.guideTemperament) {
    elements.guideTemperament.textContent = guide.temperament;
  }
  if (elements.guideInsight) {
    elements.guideInsight.textContent = guide.quote ?? location?.guideInsight;
  }

  document.documentElement.style.setProperty(
    "--guide-accent",
    guide.accent ?? "#d7a94c",
  );
  elements.experience.dataset.guide = guide.id;

  elements.guideGrid?.querySelectorAll("[data-guide-id]").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.guideId === guide.id),
    );
  });
}

function fieldNotesHeading(record) {
  const title = escapeHtml(record.title);
  return record.path
    ? `<a href="${escapeHtml(resolveSitePath(record.path))}">${title}</a>`
    : title;
}

function tabDefinitions(location) {
  return [
    {
      id: "now",
      label: "Evidence",
      eyebrow: "Records and examples",
      description: "The projects, roles and study behind this scene.",
      render: () => `
        <div class="inside-now-grid">
          ${location.deepDive.now
            .map(
              (item) => `
                <article class="inside-now-card">
                  <span>${escapeHtml(item.status)}</span>
                  <h4>${fieldNotesHeading(item)}</h4>
                  <p>${escapeHtml(item.detail)}</p>
                </article>`,
            )
            .join("")}
        </div>`,
    },
    {
      id: "logic",
      label: "Design logic",
      eyebrow: "How the work is shaped",
      description:
        "The principles used to move from ambiguity to something dependable.",
      render: () => `
        <div class="inside-pillar-grid">
          ${location.deepDive.pillars
            .map(
              (pillar, index) => `
                <article class="inside-pillar-card">
                  <span>${String(index + 1).padStart(2, "0")}</span>
                  <h4>${fieldNotesHeading(pillar)}</h4>
                  <p>${escapeHtml(pillar.body)}</p>
                </article>`,
            )
            .join("")}
        </div>`,
    },
    {
      id: "field-notes",
      label: "Questions",
      eyebrow: "Questions worth carrying",
      description:
        "Concise answers that reveal the operating judgement behind the record.",
      render: () => `
        <div class="inside-notes">
          ${location.deepDive.notes
            .map(
              (note) => `
                <details name="field-notes-questions">
                  <summary>${escapeHtml(note.question)}</summary>
                  <p>${escapeHtml(note.answer)}</p>
                </details>`,
            )
            .join("")}
        </div>`,
    },
  ];
}

function renderDeepDive() {
  const location = getCurrentLocation();
  if (!location?.deepDive) return;

  if (elements.chapterInsideKicker) {
    elements.chapterInsideKicker.textContent = location.deepDive.kicker;
  }
  if (elements.chapterInsideTitle) {
    elements.chapterInsideTitle.textContent = location.deepDive.heading;
  }
  if (elements.chapterInsideSummary) {
    elements.chapterInsideSummary.textContent = location.deepDive.summary;
  }

  const tabs = tabDefinitions(location);
  if (!tabs.some((tab) => tab.id === state.activeInsideTab)) {
    state.activeInsideTab = tabs[0].id;
  }
  const active =
    tabs.find((tab) => tab.id === state.activeInsideTab) ?? tabs[0];

  if (elements.chapterTabs) {
    elements.chapterTabs.innerHTML = tabs
      .map(
        (tab) => `
          <button
            id="inside-tab-${escapeHtml(tab.id)}"
            type="button"
            role="tab"
            data-inside-tab="${escapeHtml(tab.id)}"
            aria-selected="${tab.id === active.id ? "true" : "false"}"
            aria-controls="inside-panel"
            tabindex="${tab.id === active.id ? "0" : "-1"}"
          >${escapeHtml(tab.label)}</button>`,
      )
      .join("");
  }

  if (elements.chapterTabPanel) {
    elements.chapterTabPanel.setAttribute(
      "aria-labelledby",
      `inside-tab-${active.id}`,
    );
    elements.chapterTabPanel.innerHTML = `
      <header class="inside-panel__header">
        <p>${escapeHtml(active.eyebrow)}</p>
        <span>${escapeHtml(active.description)}</span>
      </header>
      ${active.render()}`;
  }

  if (elements.chapterArtifact) {
    const artifact = location.deepDive.artifact;
    elements.chapterArtifact.href = resolveSitePath(artifact.path);
    elements.chapterArtifact.innerHTML = `
      <span>${escapeHtml(artifact.label)}</span>
      <strong>${escapeHtml(artifact.title)}</strong>
      <small>${escapeHtml(artifact.detail)}</small>
      <b aria-hidden="true">↗</b>`;
  }
}

function canOpenFinalLocationEndState() {
  if (!state.manifest) return false;
  const location = getCurrentLocation();
  return Boolean(
    location &&
    state.locationIndex === state.manifest.locations.length - 1 &&
    state.sceneMode === "outer" &&
    location.deepDive,
  );
}

function renderForwardNavigation() {
  if (!state.manifest || !elements.nextLocation) return;
  const location = getCurrentLocation();
  const atFinalLocation =
    state.locationIndex === state.manifest.locations.length - 1;
  const opensEndState = canOpenFinalLocationEndState();
  elements.nextLocation.toggleAttribute(
    "disabled",
    state.isTraversing || (atFinalLocation && !opensEndState),
  );

  const label = elements.nextLocation.querySelector(
    ".traversal-controls__copy",
  );
  if (atFinalLocation && opensEndState) {
    const action = location?.portalAction ?? "Enter this place";
    if (label) label.textContent = action;
    elements.nextLocation.setAttribute("aria-label", action);
  } else {
    if (label) label.textContent = "Next crossing";
    elements.nextLocation.setAttribute("aria-label", "Travel to next location");
  }
}

function renderTraversalNavigation() {
  elements.previousLocation?.toggleAttribute(
    "disabled",
    state.locationIndex === 0 || state.isTraversing,
  );
  renderForwardNavigation();
}

function advanceForward() {
  if (!state.manifest || state.isTraversing) return;
  if (state.locationIndex < state.manifest.locations.length - 1) {
    void travelTo(state.locationIndex + 1);
    return;
  }
  if (canOpenFinalLocationEndState()) void togglePortal();
}

function renderLocation({ announceChange = false, resetScroll = false } = {}) {
  const location = getCurrentLocation();
  if (!location || !state.manifest) return;

  state.visited.add(location.id);
  safeStorageSet(storageKeys.visited, JSON.stringify([...state.visited]));

  if (state.hasBegun && !state.isTraversing) {
    document.documentElement.dataset.experienceState = "exploring";
  }

  elements.experience.dataset.sceneMode = state.sceneMode;
  elements.experience.dataset.location = location.id;
  elements.chapterPanel.dataset.mode = state.sceneMode;

  if (elements.progressLabel) {
    elements.progressLabel.textContent = `${location.number} / ${String(
      state.manifest.locations.length,
    ).padStart(2, "0")}`;
  }
  if (elements.progressBar) {
    elements.progressBar.style.width = `${
      ((state.locationIndex + 1) / state.manifest.locations.length) * 100
    }%`;
  }
  if (elements.locationNumber)
    elements.locationNumber.textContent = location.number;
  if (elements.locationRegion)
    elements.locationRegion.textContent =
      getPilotSetting() === "chamber"
        ? "Stone Pass checkpoint"
        : location.region;
  if (elements.locationName)
    elements.locationName.textContent =
      getPilotSetting() === "chamber"
        ? "Context Chamber"
        : (location[state.sceneMode].name ?? location.name);
  const setting = getPilotSetting();
  elements.sceneBrief.textContent =
    location[state.sceneMode].brief ?? location.title;
  const actions =
    location.id === "threshold-dunes" && state.sceneMode === "inner"
      ? location.deepDive.now
          .filter(({ path }) => path)
          .map(({ title, path }) => ({ label: title, path }))
      : location.actions;
  const [feature, ...secondaryActions] = actions;
  if (elements.sceneEvidence) {
    elements.sceneEvidence.hidden = !feature;
    if (feature) {
      elements.sceneEvidence.href = resolveSitePath(feature.path);
      elements.sceneEvidence.textContent = feature.label;
    }
  }
  const light = sceneGuide(location)?.light;
  elements.companion.toggleAttribute("data-scene-lit", Boolean(light));
  if (light) {
    const { brightness, contrast, saturation, hue, rim } = light;
    elements.companion.style.setProperty(
      "--guide-grade",
      `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${hue ?? 0}deg)`,
    );
    elements.companion.style.setProperty("--guide-scene-rim", rim);
  }
  elements.scenePortal.hidden =
    setting === "pass" ||
    setting === "chamber" ||
    (location.id === "archive-echoes" && state.sceneMode === "inner");
  if (elements.chapterEyebrow)
    elements.chapterEyebrow.textContent = location.eyebrow;
  if (elements.chapterTitle) elements.chapterTitle.textContent = location.title;
  if (elements.chapterLead) elements.chapterLead.textContent = location.lead;
  if (elements.chapterSignal)
    elements.chapterSignal.textContent = location.signal;
  if (elements.chapterSignalValue) {
    elements.chapterSignalValue.textContent = location.signalValue;
  }
  elements.scenePortal.textContent =
    state.sceneMode === "outer"
      ? location.portalAction
      : "Return to the outer approach";
  if (elements.modeCopy) {
    elements.modeCopy.textContent =
      state.sceneMode === "outer"
        ? "Outer approach"
        : "Inner place · expanded record";
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

  if (elements.chapterFacts) {
    elements.chapterFacts.innerHTML = location.facts
      .map(
        (fact) => `
          <div class="chapter-fact">
            <strong>${escapeHtml(fact.value)}</strong>
            <span>${escapeHtml(fact.label)}</span>
          </div>`,
      )
      .join("");
  }

  if (elements.chapterActions) {
    elements.chapterActions.innerHTML = secondaryActions
      .map(
        (action) => `
          <a href="${resolveSitePath(action.path)}">
            ${escapeHtml(action.label)} <span aria-hidden="true">→</span>
          </a>`,
      )
      .join("");
  }

  renderDeepDive();
  renderGuide();

  renderTraversalNavigation();

  elements.locationRailList
    ?.querySelectorAll("[data-location-index]")
    .forEach((button) => {
      if (Number(button.dataset.locationIndex) === state.locationIndex) {
        button.setAttribute("aria-current", "step");
      } else {
        button.removeAttribute("aria-current");
      }
    });

  elements.mapLocationList
    ?.querySelectorAll("[data-map-location-index]")
    .forEach((button) => {
      const locationIndex = Number(button.dataset.mapLocationIndex);
      const mapLocation = state.manifest?.locations[locationIndex];
      button.dataset.visited =
        mapLocation && state.visited.has(mapLocation.id) ? "true" : "false";
      if (locationIndex === state.locationIndex) {
        button.setAttribute("aria-current", "step");
      } else {
        button.removeAttribute("aria-current");
      }
    });

  renderPilotWaypoints();
  if (resetScroll) resetChapterScroll();
  window.requestAnimationFrame(() => recalculateFraming());
  if (announceChange) announce(`${location.formalName}. ${location.title}`);
}

function transitionScene(nextSource, { immediate = false } = {}) {
  if (
    !elements.sceneCurrent ||
    !elements.scenePrevious ||
    !elements.sceneForegroundPrevious ||
    !elements.sceneForeground
  ) {
    return;
  }

  const currentBackground = elements.sceneCurrent.style.backgroundImage;
  if (immediate || !currentBackground) {
    const background = `url("${nextSource}")`;
    elements.sceneCurrent.style.backgroundImage = background;
    elements.sceneCurrent.dataset.source = nextSource;
    elements.sceneForeground.style.backgroundImage = background;
    elements.sceneForeground.dataset.source = nextSource;
    elements.sceneCurrent.style.opacity = "1";
    elements.scenePrevious.style.opacity = "0";
    elements.sceneForeground.style.opacity = "0.76";
    elements.sceneForegroundPrevious.style.opacity = "0";
    return;
  }

  elements.scenePrevious.style.backgroundImage = currentBackground;
  elements.scenePrevious.dataset.source =
    elements.sceneCurrent.dataset.source || nextSource;
  elements.sceneForegroundPrevious.style.backgroundImage =
    elements.sceneForeground.style.backgroundImage || currentBackground;
  elements.sceneForegroundPrevious.dataset.source =
    elements.sceneForeground.dataset.source ||
    elements.sceneCurrent.dataset.source ||
    nextSource;
  elements.scenePrevious.style.opacity = "1";
  elements.sceneForegroundPrevious.style.opacity = "0.76";
  elements.sceneCurrent.style.opacity = "0";
  elements.sceneForeground.style.opacity = "0";

  window.requestAnimationFrame(() => {
    const background = `url("${nextSource}")`;
    elements.sceneCurrent.style.backgroundImage = background;
    elements.sceneCurrent.dataset.source = nextSource;
    elements.sceneForeground.style.backgroundImage = background;
    elements.sceneForeground.dataset.source = nextSource;
    window.requestAnimationFrame(() => {
      elements.sceneCurrent.style.opacity = "1";
      elements.scenePrevious.style.opacity = "0";
      elements.sceneForeground.style.opacity = "0.76";
      elements.sceneForegroundPrevious.style.opacity = "0";
    });
  });
}

function stageSceneTransition(nextSource, setting, guideStage) {
  if (
    !elements.sceneCurrent ||
    !elements.scenePrevious ||
    !elements.sceneForegroundPrevious ||
    !elements.sceneForeground
  ) {
    return false;
  }

  const outgoingBackground = elements.sceneCurrent.style.backgroundImage;
  const outgoingSource = elements.sceneCurrent.dataset.source;
  const outgoingForeground =
    elements.sceneForeground.style.backgroundImage || outgoingBackground;
  const incomingBackground = `url("${nextSource}")`;
  elements.scenePrevious.style.backgroundPosition =
    elements.sceneCurrent.style.backgroundPosition;
  elements.sceneForegroundPrevious.style.backgroundPosition =
    elements.sceneForeground.style.backgroundPosition;
  setSceneFocus(setting, guideStage);

  elements.experience.classList.add("is-scene-staged");
  elements.scenePrevious.style.backgroundImage = outgoingBackground;
  if (outgoingSource) elements.scenePrevious.dataset.source = outgoingSource;
  elements.sceneForegroundPrevious.style.backgroundImage = outgoingForeground;
  if (outgoingSource) {
    elements.sceneForegroundPrevious.dataset.source = outgoingSource;
  }
  elements.scenePrevious.style.opacity = "1";
  elements.sceneForegroundPrevious.style.opacity = "0.76";

  elements.sceneCurrent.style.backgroundImage = incomingBackground;
  elements.sceneCurrent.dataset.source = nextSource;
  elements.sceneForeground.style.backgroundImage = incomingBackground;
  elements.sceneForeground.dataset.source = nextSource;
  elements.sceneCurrent.style.opacity = "0";
  elements.sceneForeground.style.opacity = "0";
  void elements.scenePrevious.offsetWidth;
  return true;
}

function revealStagedScene() {
  if (
    !elements.sceneCurrent ||
    !elements.scenePrevious ||
    !elements.sceneForegroundPrevious ||
    !elements.sceneForeground
  ) {
    return;
  }

  elements.sceneCurrent.style.opacity = "1";
  elements.sceneForeground.style.opacity = "0.76";
  elements.scenePrevious.style.opacity = "0";
  elements.sceneForegroundPrevious.style.opacity = "0";
}

function finishSceneTransition() {
  if (!elements.experience) return;
  revealStagedScene();
  elements.scenePrevious?.style.removeProperty("background-image");
  elements.sceneForegroundPrevious?.style.removeProperty("background-image");
  delete elements.scenePrevious?.dataset.source;
  delete elements.sceneForegroundPrevious?.dataset.source;
  elements.experience.classList.remove("is-scene-staged");
  delete elements.experience.dataset.transitionPhase;
  delete elements.experience.dataset.travelDirection;
}

function renderScene(options = {}) {
  const location = getCurrentLocation();
  if (!location) return;
  setSceneFocus(getPilotSetting(location), sceneGuide(location));
  transitionScene(chooseSceneSource(location[state.sceneMode]), options);
  renderPilotWaypoints();
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
  const width = Math.max(
    0,
    Math.min(a.right, b.right) - Math.max(a.left, b.left),
  );
  const height = Math.max(
    0,
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  );
  return width * height;
}

function getCssPixelValue(propertyName, fallback) {
  const value = Number.parseFloat(
    window
      .getComputedStyle(document.documentElement)
      .getPropertyValue(propertyName),
  );
  return Number.isFinite(value) ? value : fallback;
}

// The first release used a 0.14 to 0.2 viewport-height guide. V2 deliberately makes the guide materially larger.
function frameRange(viewport) {
  const compact = viewport.width <= 820;
  const veryCompact = viewport.width <= 520;
  const short = viewport.height <= 540;
  const portrait = viewport.height > viewport.width;

  if (veryCompact && portrait) {
    return { target: 0.27, minimum: 0.22, maximum: 0.32 };
  }
  if (compact && portrait) {
    return { target: 0.31, minimum: 0.24, maximum: 0.38 };
  }
  if (short) {
    return { target: 0.34, minimum: 0.25, maximum: 0.39 };
  }
  if (viewport.width <= 1180) {
    return { target: 0.38, minimum: 0.3, maximum: 0.44 };
  }
  return { target: 0.43, minimum: 0.34, maximum: 0.48 };
}

function authoredGuideFrame(stage, context) {
  const {
    viewport,
    compact,
    minimumTop,
    maximumBottom,
    safeLeft,
    safeRight,
    obstacles,
  } = context;
  const artHeight = Math.max(
    elements.sceneCurrent.clientHeight,
    elements.sceneCurrent.clientWidth * (9 / 16),
  );
  const anchors =
    compact && viewport.height > viewport.width && stage.portrait
      ? [stage.portrait, ...stage.anchors]
      : stage.anchors;
  for (const anchor of anchors) {
    const [x, y] = projectPilotPoint(anchor, null, stage);
    const feetX = viewport.width / 2 + (x - viewport.width / 2) * 1.045;
    const bottom = viewport.height / 2 + (y - viewport.height / 2) * 1.045;
    const height = Math.min(
      artHeight * anchor[2],
      viewport.height * (compact ? 0.23 : 0.38),
    );
    const width = height * (640 / 960);
    const left = feetX - width / 2;
    const frame = {
      left,
      top: bottom - height,
      right: left + width,
      bottom,
      width,
      height,
    };
    if (
      left < safeLeft ||
      frame.right > viewport.width - safeRight ||
      frame.top < minimumTop ||
      bottom > maximumBottom
    )
      continue;
    const overlap = obstacles.reduce(
      (sum, obstacle) => sum + intersectionArea(frame, obstacle),
      0,
    );
    if (overlap < 25)
      return {
        ...frame,
        viewport,
        compact,
        overlap,
        ratio: height / viewport.height,
        score: 0,
        fullyVisible: true,
        grounded: true,
      };
  }
  return null;
}

function calculateFraming() {
  const viewport = {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
  };
  const compact = viewport.width <= 820;
  const portrait = viewport.height > viewport.width;
  const safeLeft = getCssPixelValue("--safe-left", compact ? 12 : 22);
  const safeRight = getCssPixelValue("--safe-right", compact ? 12 : 22);
  const safeTop = getCssPixelValue("--safe-top", compact ? 12 : 22);
  const safeBottom = getCssPixelValue("--safe-bottom", 18);
  const captionAllowance = compact ? 48 : viewport.width <= 1180 ? 52 : 70;
  const avatarAspect = 640 / 960;
  const range = frameRange(viewport);
  let targetRatio = range.target;
  if (state.sceneMode === "inner") targetRatio *= 0.94;
  if (state.isTraversing) targetRatio *= 0.92;
  targetRatio = clamp(targetRatio, range.minimum, range.maximum);

  const topbarRect = rectFromElement(
    document.querySelector(".explorer-topbar"),
    10,
  );
  const chapterRect = rectFromElement(elements.chapterPanel, compact ? 16 : 24);
  const railRect = rectFromElement(
    document.querySelector(".location-rail"),
    10,
  );
  const abilityRect = rectFromElement(elements.abilityDock, compact ? 8 : 14);
  const lookRect = rectFromElement(document.querySelector(".look-control"), 10);
  const traversalRect = rectFromElement(
    document.querySelector(".traversal-controls"),
    12,
  );
  const modeRect = rectFromElement(elements.modeIndicator, 8);
  const toastRect = elements.toast?.classList.contains("is-visible")
    ? rectFromElement(elements.toast, 8)
    : null;
  const obstacles = [
    topbarRect,
    chapterRect,
    railRect,
    abilityRect,
    lookRect,
    traversalRect,
    modeRect,
    toastRect,
  ].filter(Boolean);

  const minimumTop = Math.max(safeTop, (topbarRect?.bottom ?? safeTop) + 12);
  const maximumBottom = viewport.height - safeBottom;
  const stage = sceneGuide();
  if (stage) {
    const frame = authoredGuideFrame(stage, {
      viewport,
      compact,
      minimumTop,
      maximumBottom,
      safeLeft,
      safeRight,
      obstacles: [
        topbarRect,
        chapterRect,
        railRect,
        abilityRect,
        lookRect,
        traversalRect,
        modeRect,
      ].filter(Boolean),
    });
    if (frame) return frame;
  }
  const pilot = getPilotSetting();
  if (pilot && elements.sceneCurrent.clientWidth > 0) {
    const profile = scenePilot[pilot];
    const [anchorX, anchorY, authoredRatio] =
      !portrait && viewport.height <= 560 && profile.shortLandscapeGuide
        ? profile.shortLandscapeGuide
        : profile.guides[pilotPortrait() ? 1 : 0];
    const [groundX, groundY] = projectPilotPoint([anchorX, anchorY], pilot);
    const [screenX, screenY] = [groundX, groundY].map((axis, i) => {
      const middle = (i ? viewport.height : viewport.width) / 2;
      return middle + (axis - middle) * 1.045;
    });
    const ratio = Math.max(0.205, authoredRatio);
    const height = viewport.height * ratio;
    const width = height * avatarAspect;
    const left = clamp(
      screenX - width / 2,
      safeLeft,
      viewport.width - safeRight - width,
    );
    const bottom = clamp(screenY, minimumTop + height, maximumBottom);
    const frame = {
      left,
      top: bottom - height,
      right: left + width,
      bottom,
      width,
      height,
      ratio,
    };
    const overlap = obstacles.reduce(
      (sum, obstacle) => sum + intersectionArea(frame, obstacle),
      0,
    );
    if (overlap < 25) {
      return {
        ...frame,
        viewport,
        compact,
        overlap,
        score: 0,
        fullyVisible: true,
      };
    }
  }
  const ratioCandidates = [
    targetRatio,
    targetRatio - 0.025,
    targetRatio - 0.05,
    targetRatio - 0.075,
    range.minimum,
  ]
    .map((ratio) => clamp(ratio, range.minimum, range.maximum))
    .filter((ratio, index, values) => values.indexOf(ratio) === index);

  const xFractions = compact
    ? portrait
      ? [0.78, 0.7, 0.27, 0.5, 0.86, 0.14]
      : [0.24, 0.34, 0.16, 0.46, 0.58]
    : [0.28, 0.38, 0.18, 0.46, 0.56, 0.1];

  let best = null;
  for (const ratio of ratioCandidates) {
    const avatarHeight = viewport.height * ratio;
    const avatarWidth = avatarHeight * avatarAspect;
    const maximumTop = maximumBottom - avatarHeight - captionAllowance;
    if (maximumTop <= minimumTop) continue;

    const preferredTop =
      compact && portrait && chapterRect
        ? chapterRect.top - avatarHeight - captionAllowance - 16
        : viewport.height * (viewport.height <= 540 ? 0.42 : 0.43);
    const yCandidates = [
      preferredTop,
      preferredTop - 36,
      preferredTop + 32,
      minimumTop + 8,
      abilityRect
        ? abilityRect.top - avatarHeight - captionAllowance - 16
        : preferredTop,
      chapterRect && compact
        ? chapterRect.top - avatarHeight - captionAllowance - 18
        : preferredTop,
      maximumTop,
      maximumTop - 42,
      viewport.height * 0.34,
      viewport.height * 0.5,
    ].map((value) => clamp(value, minimumTop, maximumTop));

    for (const xFraction of xFractions) {
      for (const yPosition of yCandidates) {
        const left = clamp(
          viewport.width * xFraction - avatarWidth / 2,
          safeLeft + 4,
          viewport.width - safeRight - avatarWidth - 4,
        );
        const top = clamp(yPosition, minimumTop, maximumTop);
        const candidate = {
          left,
          top,
          right: left + avatarWidth,
          bottom: top + avatarHeight,
          width: avatarWidth,
          height: avatarHeight,
          ratio: avatarHeight / viewport.height,
        };
        const collisionCandidate = {
          ...candidate,
          bottom: candidate.bottom + captionAllowance,
          height: candidate.height + captionAllowance,
        };
        const overlap = obstacles.reduce(
          (sum, obstacle) =>
            sum + intersectionArea(collisionCandidate, obstacle),
          0,
        );
        const preferredX = viewport.width * (compact && portrait ? 0.76 : 0.3);
        const distancePenalty =
          Math.abs(left + avatarWidth / 2 - preferredX) * 0.42 +
          Math.abs(top - preferredTop) * 0.35;
        const sizePenalty = Math.abs(targetRatio - candidate.ratio) * 1_400;
        const score = overlap * 220 + distancePenalty + sizePenalty;

        if (!best || score < best.score) {
          best = { ...candidate, score, overlap };
        }
      }
    }

    if (best && best.overlap === 0 && best.ratio >= targetRatio - 0.03) {
      break;
    }
  }

  if (!best) {
    const avatarHeight = viewport.height * range.minimum;
    const avatarWidth = avatarHeight * avatarAspect;
    best = {
      left: clamp(
        viewport.width * 0.28 - avatarWidth / 2,
        safeLeft,
        viewport.width - safeRight - avatarWidth,
      ),
      top: clamp(
        viewport.height - avatarHeight - captionAllowance - safeBottom,
        minimumTop,
        viewport.height - avatarHeight - safeBottom,
      ),
      right: 0,
      bottom: 0,
      width: avatarWidth,
      height: avatarHeight,
      ratio: range.minimum,
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
  elements.companion.toggleAttribute("data-grounded", Boolean(frame.grounded));

  document.documentElement.style.setProperty(
    "--avatar-height",
    `${frame.height.toFixed(2)}px`,
  );
  document.documentElement.style.setProperty(
    "--avatar-left",
    `${frame.left.toFixed(2)}px`,
  );
  document.documentElement.style.setProperty(
    "--avatar-top",
    `${frame.top.toFixed(2)}px`,
  );
  elements.companion.dataset.frameRatio = frame.ratio.toFixed(4);
  elements.companion.dataset.frameStatus =
    frame.fullyVisible && frame.overlap < 25 ? "safe" : "clamped";

  if (immediate) {
    state.reframeTimer = window.setTimeout(() => {
      elements.experience?.classList.remove("is-reframing");
    }, 80);
  }

  return frame;
}

function activatePower(
  power,
  { duration = power?.durationMs ?? 2_200, handoffAt, direction = 1 } = {},
) {
  if (!power) return;
  const transitionHandoff = clamp(
    handoffAt ?? power.handoffAt ?? 0.52,
    0.4,
    0.62,
  );
  elements.experience.dataset.activePower = state.selectedPowerId;
  elements.experience.dataset.travelDirection =
    direction < 0 ? "backward" : "forward";
  document.documentElement.style.setProperty(
    "--ability-duration",
    `${Math.round(duration)}ms`,
  );
  document.documentElement.style.setProperty(
    "--ability-departure-duration",
    `${Math.round(duration * transitionHandoff)}ms`,
  );
  document.documentElement.style.setProperty(
    "--ability-arrival-duration",
    `${Math.round(duration * (1 - transitionHandoff))}ms`,
  );
  document.documentElement.style.setProperty(
    "--travel-direction",
    direction < 0 ? "-1" : "1",
  );
  document.documentElement.style.setProperty(
    "--travel-outgoing-x",
    direction < 0 ? "5.5vw" : "-5.5vw",
  );
  document.documentElement.style.setProperty(
    "--travel-incoming-x",
    direction < 0 ? "-5vw" : "5vw",
  );
}

async function startSceneTransitionEffect({
  fromSource,
  toSource,
  duration,
  direction,
  sunAnchor,
}) {
  if (
    !state.motionEnabled ||
    !sceneEffects?.available ||
    !fromSource ||
    !toSource
  ) {
    elements.experience?.classList.remove("has-scene-effects");
    if (elements.experience) {
      elements.experience.dataset.effectRenderer = "css-fallback";
    }
    return false;
  }

  try {
    await sceneEffects.start({
      fromSource,
      toSource,
      powerId: state.selectedPowerId,
      duration,
      direction,
      sunAnchor,
    });
    elements.experience?.classList.add("has-scene-effects");
    if (elements.experience) {
      elements.experience.dataset.effectRenderer = "webgl";
    }
    return true;
  } catch {
    sceneEffects.stop();
    elements.experience?.classList.remove("has-scene-effects");
    if (elements.experience) {
      elements.experience.dataset.effectRenderer = "css-fallback";
    }
    return false;
  }
}

function stopSceneTransitionEffect() {
  sceneEffects?.stop();
  elements.experience?.classList.remove("has-scene-effects");
  if (elements.experience) {
    delete elements.experience.dataset.effectRenderer;
  }
}

const pilotPowers = {
  "dune-surfing": {
    name: "dune",
    artwork: "dune-wake",
    beats: [0.17, 0.67, 0.89],
  },
  "sand-teleportation": {
    name: "sand",
    artwork: "sand-veil",
    beats: [0.19, 0.65, 0.85],
  },
  "solar-propulsion": {
    name: "solar",
    artwork: "solar-plume",
    beats: [0.25, 0.63, 0.86],
  },
  "reality-bending": {
    name: "fold",
    artwork: "fold-seam",
    beats: [0.24, 0.66, 0.87],
  },
};

const amaniContacts = {
  solar: [
    [543, 292],
    [585, 240],
    [545, 278],
  ],
  fold: [
    [306, 266],
    [299, 268],
    [294, 452],
  ],
};

const mateoActions = {
  dune: {
    frames: [1, 2],
    returnFrames: [3, 4],
    beats: [0.2, 0.8],
    width: 137.5,
  },
  sand: { frames: [1, 2, 3, 4], beats: [0.17, 0.37, 0.66, 0.88], width: 100 },
  solar: {
    frames: [1, 2],
    returnFrames: [3, 4],
    beats: [0.27, 0.83],
    width: 112.5,
    palms: [
      [0.848935, 0.198578],
      [0.84282, 0.220941],
      [0.127374, 0.232402],
      [0.110445, 0.254745],
    ],
  },
  fold: {
    frames: [1, 2, 3, 4],
    beats: [0.14, 0.28, 0.65, 0.88],
    width: 100,
    palms: [
      [0.475159, 0.270161],
      [0.482404, 0.262131],
      [0.502192, 0.272006],
      [0.500463, 0.420438],
    ],
  },
};

const guideSolarContact = {
  "dn-m-afr-01": { point: [538, 182] },
  "dn-m-eas-01": { point: [537, 188] },
  "dn-m-mena-01": { point: [440, 226] },
  "dn-f-afr-01": { point: [90, 276] },
  "dn-f-sas-01": { point: [432, 232] },
  "dn-n-eur-01": { point: [414, 186] },
  "dn-f-afr-02": { point: [500, 207] },
  "dn-f-lat-01": { point: [513, 239] },
  "dn-m-lat-01": { point: [518, 254] },
  "dn-f-eas-02": { point: [516, 284], pose: "present" },
  "dn-n-sea-01": { point: [146, 300], pose: "present" },
  "dn-m-pac-01": { point: [504, 284], pose: "present" },
};

const leftDuneStance = new Set([
  "dn-m-mena-01",
  "dn-f-afr-01",
  "dn-n-eur-01",
  "dn-n-sea-01",
]);
const fixedWardrobeSide = new Set([
  "dn-m-lat-01",
  "dn-f-eas-02",
  "dn-n-sea-01",
]);

const pilotImageCache = new Map();
const unit = (value) => clamp(value, 0, 1);
const smooth = (value) => {
  const t = unit(value);
  return t * t * (3 - 2 * t);
};

function loadPilotAsset(file) {
  if (!pilotImageCache.has(file)) {
    pilotImageCache.set(
      file,
      loadImage(resolveAsset(`pilot/${file}.webp`)).then((result) => {
        if (!result.loaded) pilotImageCache.delete(file);
        return result;
      }),
    );
  }
  return pilotImageCache.get(file);
}

async function preparePilotCrossing(powerId, direction) {
  const spec = pilotPowers[powerId];
  const keyframe = getCurrentGuide()?.crossing?.[spec.name];
  const mateo =
    state.selectedGuideId === "dn-m-lat-01" ? mateoActions[spec.name] : null;
  const frameNumbers =
    mateo && ((direction < 0 && mateo.returnFrames) || mateo.frames);
  const poseFiles =
    mateo && elements.pilotGuide
      ? frameNumbers.map((frame) => `mateo-${spec.name}-${frame}`)
      : state.selectedGuideId === "dn-m-afr-01" && elements.pilotGuide
        ? [1, 2, 3].map((frame) => `amani-${spec.name}-${frame}`)
        : keyframe && elements.pilotGuide
          ? [keyframe.file]
          : [];
  const [effect, ...loaded] = await Promise.all(
    [spec.artwork, ...poseFiles].map(loadPilotAsset),
  );
  if (!effect.loaded) return null;
  const poses = loaded.every((pose) => pose.loaded)
    ? loaded.map((pose) => pose.src)
    : [];
  return {
    ...spec,
    effect: effect.src,
    poses,
    mateo: Boolean(mateo),
    beats: mateo?.beats ?? spec.beats,
    contacts: mateo?.palms
      ? frameNumbers.map((frame) => [
          mateo.palms[frame - 1][0] * 640,
          mateo.palms[frame - 1][1] * 960,
        ])
      : keyframe?.contact
        ? [keyframe.contact]
        : amaniContacts[spec.name],
    mirrorArt: !mateo,
    width: mateo?.width ?? (keyframe ? 150 : spec.name === "dune" ? 125 : 100),
  };
}

function positionPilotEffect(
  image,
  { x, y, size, origin, alpha, direction = 1, angle = 0, stretch = 1 },
) {
  image.hidden = alpha <= 0.002;
  image.style.left = `${x}px`;
  image.style.top = `${y}px`;
  image.style.width = `${size}px`;
  image.style.opacity = alpha;
  image.style.transform = `translate(-50%, ${origin}%) rotate(${angle}deg) scale(${direction}, ${stretch})`;
}

function paintPilotRollers(rollers, edges, opening, focus, width, height) {
  const artWidth = Math.max(width, (height * 1600) / 900);
  const artHeight = (artWidth * 900) / 1600;
  const widthOfCurl = Math.max(18, Math.min(width * 0.055, 74));
  const shown = Math.sin(opening * Math.PI);
  rollers.forEach((roller, index) => {
    const side = index === 0 ? -1 : 1;
    const left = edges[index] - widthOfCurl * (side < 0 ? 0.72 : 0.28);
    roller.hidden = shown < 0.015;
    roller.style.width = `${widthOfCurl}px`;
    roller.style.left = `${left}px`;
    roller.style.opacity = String(shown * 0.86);
    roller.style.backgroundSize = `${artWidth}px ${artHeight}px`;
    roller.style.backgroundPosition = `${((width - artWidth) * focus[0]) / 100 - left}px ${((height - artHeight) * focus[1]) / 100}px`;
    roller.style.transform = `perspective(340px) rotateY(${side * 38}deg)`;
  });
}

function playPilotCrossing({
  spec,
  direction,
  duration,
  handoffAt,
  handoff,
  fromSetting,
  toSetting,
  fromStage,
  toStage,
}) {
  const {
    experience,
    sceneCurrent,
    scenePrevious,
    sceneForeground,
    sceneForegroundPrevious,
    companion,
    companionImage,
    pilotGuide,
    pilotEffectFar: far,
    pilotEffectNear: near,
    pilotSkip,
  } = elements;
  const effectLayer = far.parentElement;
  const rollers = [...experience.querySelectorAll("[data-pilot-roller]")];
  const authored = spec.poses.length > 0;
  const usesKeyframe = spec.poses.length === 1;
  const name = spec.name;
  const lightFor = (setting, stage) =>
    stage?.light ??
    (setting === "chamber"
      ? { brightness: 0.76, contrast: 1.1, saturation: 0.75, hue: 0 }
      : { brightness: 1, contrast: 1.06, saturation: 0.91, hue: 0 });
  const departureLight = lightFor(fromSetting, fromStage);
  const arrivalLight = lightFor(toSetting, toStage);
  const departureFocus = sceneFocus(fromSetting, fromStage);
  const guideId = state.selectedGuideId;
  const fallbackContact =
    guideSolarContact[guideId] ?? guideSolarContact["dn-m-afr-01"];
  const directional = name === "dune" || name === "solar";
  const baselineFacesLeft =
    name === "dune"
      ? leftDuneStance.has(guideId)
      : fallbackContact.point[0] < 320;
  const reflectedBaseline =
    directional &&
    !fixedWardrobeSide.has(guideId) &&
    direction !== (baselineFacesLeft ? -1 : 1);
  const reflectedArt = directional && direction < 0 && spec.mirrorArt;
  const start = performance.now();
  let request = 0;
  let pastHandoff = false;
  let finished = false;
  let currentPose = -1;
  let foldCenter = null;

  const movingLayers = [
    sceneCurrent,
    scenePrevious,
    sceneForeground,
    sceneForegroundPrevious,
  ];
  for (const element of movingLayers) {
    element.style.setProperty("animation", "none", "important");
    element.style.setProperty("transition", "none", "important");
  }
  sceneCurrent.style.opacity = "1";
  sceneForeground.style.opacity = "0";
  sceneForegroundPrevious.style.opacity = "0";
  effectLayer.hidden = false;
  far.src = near.src = spec.effect;
  pilotSkip.hidden = false;
  experience.dataset.pilotCrossing = name;
  experience.dataset.effectRenderer = "authored-pilot";
  if (name === "fold") {
    for (const roller of rollers)
      roller.style.backgroundImage = scenePrevious.style.backgroundImage;
  }

  function paint(progress) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const bounds = companion.getBoundingClientRect();
    const center = bounds.left + bounds.width / 2;
    const wind =
      name === "dune"
        ? smooth((progress - 0.06) / 0.28) *
          (1 - smooth((progress - 0.65) / 0.32))
        : 0;
    const sand =
      name === "sand"
        ? smooth((progress - 0.1) / 0.28) *
          (1 - smooth((progress - 0.59) / 0.32))
        : 0;
    const step = unit((progress - 0.17) / 0.58);
    const arc = name === "solar" ? 4 * step * (1 - step) : 0;
    const fold = name === "fold" ? Math.sin(Math.PI * progress) ** 2 : 0;
    const pivot = sand * Math.sin((progress - 0.11) * Math.PI * 2.4);
    const settle = 1 - smooth((progress - 0.6) / 0.4);
    const reach =
      bounds.height * (0.31 + (spec.mateo ? 0.23 : 0.18) * wind) + 6;
    const drift =
      name === "dune"
        ? clamp(
            direction * Math.min(width * 0.075, 87) * wind,
            reach - center,
            width - reach - center,
          )
        : direction *
          (Math.min(width * 0.047, 52) * smooth(step) * arc * settle +
            8 * pivot +
            5 * fold);
    const lift =
      -Math.min(height * 0.019, 14) * arc - Math.min(height * 0.009, 6) * wind;
    const blend = usesKeyframe
      ? smooth((progress - 0.1) / 0.16) * (1 - smooth((progress - 0.68) / 0.2))
      : 1;
    const phase = usesKeyframe
      ? blend > 0.004
        ? 0
        : -1
      : spec.beats.findIndex((end) => progress < end);
    const acting = authored && phase >= 0;
    companion.toggleAttribute("data-pilot-acting", acting);
    companion.toggleAttribute("data-pilot-keyframe", usesKeyframe && acting);
    if (pilotGuide) pilotGuide.hidden = !acting;
    if (acting && phase !== currentPose) {
      pilotGuide.src = spec.poses[phase];
      pilotGuide.style.setProperty("--pilot-guide-width", `${spec.width}%`);
      pilotGuide.style.setProperty("--pilot-guide-foot", "-6.25%");
      if (currentPose >= 0)
        pilotGuide.animate([{ opacity: 0.65 }, { opacity: 1 }], {
          duration: 90,
        });
      currentPose = phase;
    }

    const reflected = acting
      ? reflectedArt
      : reflectedBaseline && progress < 0.87;
    const moves = `translate3d(${drift}px,${lift}px,0) rotate(${direction * (7 * wind + 3 * pivot)}deg) scaleX(${reflected ? -1 : 1})`;
    if (acting) {
      pilotGuide.style.transform = `translateX(-50%) ${moves}`;
      if (usesKeyframe) {
        pilotGuide.style.opacity = String(blend);
        companionImage.style.opacity = String(1 - blend);
      }
    }
    if (!acting || usesKeyframe) {
      companionImage.style.transform =
        usesKeyframe && acting && reflectedArt !== reflectedBaseline
          ? `${moves} scaleX(-1)`
          : moves;
      if (!acting && usesKeyframe)
        companionImage.style.removeProperty("opacity");
    }

    if (name === "sand") {
      const cover =
        smooth((progress - 0.27) / 0.15) *
        (1 - smooth((progress - 0.62) / 0.2));
      companion.style.opacity = String(1 - cover);
    }

    const x = center + drift;
    const y = bounds.bottom;
    const reveal = smooth((progress - 0.12) / 0.72);
    far.hidden = true;
    near.hidden = true;
    const relight = smooth((progress - 0.36) / 0.41);
    const gradeAt = (key) =>
      departureLight[key] + (arrivalLight[key] - departureLight[key]) * relight;
    const grade = `brightness(${gradeAt("brightness")}) contrast(${gradeAt("contrast")}) saturate(${gradeAt("saturation")}) hue-rotate(${gradeAt("hue")}deg)`;
    far.style.filter = grade;
    near.style.filter = name === "solar" ? "saturate(.91)" : grade;
    near.style.mixBlendMode =
      name === "solar" || name === "fold" ? "screen" : "";

    if (name === "dune") {
      const cut = reveal * 130 - 15;
      sceneCurrent.style.maskImage = `linear-gradient(${direction > 0 ? 264 : 96}deg, #000 ${cut - 8}%, transparent ${cut + 8}%)`;
      const size =
        Math.max(200, Math.min(740, width * (0.29 + wind * 0.25))) *
        (spec.mateo ? 0.88 : 1);
      positionPilotEffect(far, {
        x: x - direction * size * 0.3,
        y,
        size: size * 0.86,
        origin: -93,
        alpha: wind * 0.48,
        direction,
        angle: -4 * direction,
      });
      positionPilotEffect(near, {
        x: x - direction * size * 0.42,
        y: y + height * 0.015,
        size,
        origin: -88,
        alpha: wind * 0.65,
        direction,
        angle: 3 * direction,
      });
    } else if (name === "sand") {
      const begin = direction < 0 ? 0.38 : 0.32;
      const growth = smooth((progress - begin) / (0.77 - begin));
      const radius = Math.hypot(width, height) * growth;
      const feather = Math.max(34, Math.min(155, width * 0.16));
      const maskY = y - Math.min(height * 0.18, bounds.height * 0.52);
      sceneCurrent.style.maskImage = `radial-gradient(circle at ${x}px ${maskY}px, #000 ${Math.max(0, radius - feather)}px, transparent ${radius + feather}px)`;
      sceneCurrent.style.opacity = String(
        smooth((progress - begin + 0.01) / 0.18),
      );
      const baseSize = Math.max(
        148,
        Math.min(width * 0.32, height * (0.19 + sand * 0.235)),
      );
      const size =
        Math.max(
          baseSize,
          Math.min(width * 0.5, bounds.height * (0.77 + sand * 0.2)),
        ) * (spec.mateo ? 0.9 : 1);
      const separation =
        size * (0.17 * (1 - smooth((progress - 0.19) / 0.36)) + 0.035);
      const lean = Math.cos(progress * 5.6) * (3.5 + sand * 2.9);
      const drop = 1 - 0.28 * smooth((progress - 0.61) / 0.28);
      positionPilotEffect(far, {
        x: x - direction * separation,
        y: y + size * 0.025,
        size,
        origin: -91,
        alpha: sand * 0.58,
        direction,
        angle: direction * (lean - 3),
        stretch: 1.17 * drop,
      });
      positionPilotEffect(near, {
        x: x + direction * separation,
        y: y + size * 0.023,
        size: size * 1.08,
        origin: -91,
        alpha: sand * 0.78,
        direction: -direction,
        angle: direction * (2 - lean),
        stretch: 1.22 * drop,
      });
    } else if (name === "solar") {
      sceneCurrent.style.opacity = String(smooth((progress - 0.34) / 0.24));
      const handAt = (image, point, mirror) => {
        const box = image.getBoundingClientRect();
        const u = point[0] / 640;
        return [
          box.left + (mirror ? 1 - u : u) * box.width,
          box.top + (point[1] / 960) * box.height,
        ];
      };
      let [handX, handY] = acting
        ? handAt(pilotGuide, spec.contacts[phase], reflected)
        : handAt(companionImage, fallbackContact.point, reflected);
      if (acting && usesKeyframe && blend < 0.999) {
        const [baseX, baseY] = handAt(
          companionImage,
          fallbackContact.point,
          reflectedBaseline,
        );
        handX = baseX + (handX - baseX) * blend;
        handY = baseY + (handY - baseY) * blend;
      }
      const peak = (at, span) =>
        Math.max(0, 1 - Math.abs(progress - at) / span) ** 2;
      const size =
        Math.max(138, Math.min(width * 0.36, height * 0.57)) *
        (spec.mateo ? 0.82 : 1);
      near.style.transformOrigin = "42.3% 71%";
      positionPilotEffect(near, {
        x: handX + 0.077 * size,
        y: handY,
        size,
        origin: -71,
        alpha: Math.min(
          0.97,
          peak(0.27, 0.19) * 0.81 + peak(0.49, 0.25) * 0.95,
        ),
        direction,
        angle: -9 * direction,
      });
    } else {
      const contact = acting
        ? (spec.contacts?.[phase] ?? [320, 350])
        : [320, 350];
      const gesture = (
        acting ? pilotGuide : companionImage
      ).getBoundingClientRect();
      if (foldCenter === null || (acting && progress < 0.22)) {
        foldCenter = clamp(
          gesture.left + (contact[0] / 640) * gesture.width,
          width * 0.24,
          width * 0.85,
        );
      }
      const opening = smooth((progress - 0.235) / 0.54);
      const left = foldCenter * (1 - opening) - width * 0.055 * opening;
      const right = foldCenter + (width - foldCenter + width * 0.055) * opening;
      const edge = Math.max(4, Math.min(20, width * 0.012));
      sceneCurrent.style.maskImage = `linear-gradient(90deg, transparent ${left - edge}px, #000 ${left + edge}px, #000 ${right - edge}px, transparent ${right + edge}px)`;
      sceneCurrent.style.opacity = String(smooth((progress - 0.14) / 0.17));
      paintPilotRollers(
        rollers,
        [left, right],
        opening,
        departureFocus,
        width,
        height,
      );
      const handY = gesture.top + (contact[1] / 960) * gesture.height;
      positionPilotEffect(near, {
        x: foldCenter,
        y: handY,
        size: Math.min(width * 0.2, height * 0.38),
        origin: -50,
        alpha: fold * (1 - opening) * 0.72,
        angle: -2 * direction,
      });
    }
  }

  function commitHandoff() {
    if (pastHandoff) return;
    pastHandoff = true;
    handoff();
  }

  return new Promise((resolve) => {
    function finish() {
      if (finished) return;
      finished = true;
      window.cancelAnimationFrame(request);
      commitHandoff();
      for (const element of movingLayers) {
        for (const property of ["animation", "transition", "mask-image"])
          element.style.removeProperty(property);
      }
      if (pilotGuide) {
        pilotGuide.hidden = true;
        pilotGuide.style.removeProperty("transform");
        pilotGuide.style.removeProperty("opacity");
      }
      companionImage.style.removeProperty("transform");
      companionImage.style.removeProperty("opacity");
      companion.style.removeProperty("opacity");
      companion.removeAttribute("data-pilot-acting");
      companion.removeAttribute("data-pilot-keyframe");
      delete experience.dataset.pilotCrossing;
      effectLayer.hidden = true;
      far.hidden = near.hidden = true;
      for (const roller of rollers) {
        roller.hidden = true;
        roller.style.removeProperty("background-image");
      }
      near.style.removeProperty("transform-origin");
      pilotSkip.hidden = true;
      state.crossing = null;
      resolve();
    }
    function frame(now) {
      const progress = unit((now - start) / duration);
      if (progress >= 1) {
        finish();
        return;
      }
      if (progress >= handoffAt) commitHandoff();
      paint(progress);
      request = window.requestAnimationFrame(frame);
    }
    state.crossing = { skip: finish };
    request = window.requestAnimationFrame(frame);
  });
}

async function moveToScene(
  nextIndex,
  nextMode,
  { focusChapter = false, announceChange = true } = {},
) {
  if (
    !state.manifest ||
    !state.hasBegun ||
    state.isTraversing ||
    (nextIndex === state.locationIndex && nextMode === state.sceneMode)
  )
    return;
  const nextLocation = state.manifest.locations[nextIndex];
  const power = getCurrentPower();
  if (!nextLocation || !power) return;
  const duration = state.motionEnabled ? power.durationMs : 40;
  const handoffAt = clamp(power.handoffAt ?? 0.52, 0.4, 0.62);
  const direction =
    nextIndex === state.locationIndex
      ? nextMode === "inner"
        ? 1
        : -1
      : Math.sign(nextIndex - state.locationIndex);
  const fromSetting = getPilotSetting();
  const toSetting = getPilotSetting(nextLocation, nextMode);
  const fromGuideStage = sceneGuide();
  const nextGuideStage = sceneGuide(nextLocation, nextMode);

  clearTransitionPreview();
  state.inspection?.cancel();
  window.clearTimeout(state.toastTimer);
  elements.toast?.classList.remove("is-visible");
  setLookBack(false);
  setSceneView(false);
  setPresenting(false, 0, { updateGuidePose: false });
  state.isTraversing = true;
  document.documentElement.dataset.experienceState =
    nextIndex === state.locationIndex ? "transitioning" : "traversing";
  setInteractionLock(true);
  recalculateFraming();

  const nextSource = chooseSceneSource(nextLocation[nextMode]);
  const shouldStage = Boolean(
    state.motionEnabled &&
    pilotPowers[state.selectedPowerId] &&
    elements.pilotEffectFar &&
    elements.pilotEffectNear &&
    elements.pilotSkip,
  );
  const [loaded, authored] = await Promise.all([
    loadImage(nextSource),
    shouldStage ? preparePilotCrossing(state.selectedPowerId, direction) : null,
  ]);
  const handoff = () => {
    state.locationIndex = nextIndex;
    state.sceneMode = nextMode;
    state.activeInsideTab = "now";
    elements.experience.dataset.transitionPhase = "arrival";
    renderLocation({ resetScroll: true });
  };

  if (!loaded.loaded) {
    state.isTraversing = false;
    setInteractionLock(false);
    renderLocation();
    setPresenting(true, 600);
    showToast("That crossing did not load. Try the route again.");
    if (state.pendingHash) {
      state.pendingHash = false;
      restoreJourneyHash();
    }
    return;
  }

  if (state.motionEnabled) {
    const solarPose = guideSolarContact[state.selectedGuideId]?.pose;
    await setGuidePose(
      authored?.name === "solar" && solarPose ? solarPose : "travel",
    );
    announce(`${power.name}. Continuing to ${nextLocation.formalName}.`);
    const outgoingSource = elements.sceneCurrent.dataset.source;
    if (!authored) {
      await startSceneTransitionEffect({
        fromSource: outgoingSource,
        toSource: nextSource,
        duration,
        direction,
        sunAnchor: getSolarAnchor(nextLocation, nextMode),
      });
    }
    stageSceneTransition(nextSource, toSetting, nextGuideStage);
    activatePower(power, { duration, handoffAt, direction });
    elements.experience.dataset.transitionPhase = "departure";
    elements.experience.classList.add("is-traversing", power.className);
    if (authored) {
      await playPilotCrossing({
        spec: authored,
        direction,
        duration,
        handoffAt,
        handoff,
        fromSetting,
        toSetting,
        fromStage: fromGuideStage,
        toStage: nextGuideStage,
      });
    } else {
      await wait(duration * handoffAt);
      revealStagedScene();
      handoff();
      await wait(duration * (1 - handoffAt));
    }
    elements.experience.classList.remove("is-traversing", power.className);
    stopSceneTransitionEffect();
    finishSceneTransition();
  } else {
    setSceneFocus(toSetting, nextGuideStage);
    transitionScene(nextSource, { immediate: true });
    handoff();
  }

  state.isTraversing = false;
  setInteractionLock(false);
  document.documentElement.dataset.experienceState = "exploring";
  if (state.pendingHash) {
    state.pendingHash = false;
    restoreJourneyHash();
  } else {
    writeJourneyHash();
  }
  renderLocation({ announceChange, resetScroll: true });
  setPresenting(true, 780);
  recalculateFraming();
  if (focusChapter) elements.locationName?.focus({ preventScroll: true });
  preloadAdjacentScenes();
  warmSceneTransition();
}

function travelTo(nextIndex, options) {
  if (!state.manifest) return;
  const index = clamp(nextIndex, 0, state.manifest.locations.length - 1);
  if (index === state.locationIndex) return;
  return moveToScene(index, "outer", options);
}

async function togglePortal() {
  if (!state.hasBegun || state.isTraversing) return;
  const opening = state.sceneMode === "outer";
  await moveToScene(state.locationIndex, opening ? "inner" : "outer", {
    focusChapter: true,
  });
}

function selectGuide(guideId) {
  if (!state.manifest) return;
  const guide = state.manifest.guides.find(
    (candidate) => candidate.id === guideId,
  );
  if (!guide) return;
  setLookBack(false);
  state.selectedGuideId = guide.id;
  state.guidePose = "idle";
  safeStorageSet(storageKeys.guide, guide.id);
  renderGuide();
  preloadGuidePoses(guide);
  closeDialog(elements.guideDialog);
  setPresenting(true, 900, { updateGuidePose: false });
  recalculateFraming();
  showToast(`${guide.name}, ${guide.specialty}, will travel beside you.`);
  announce(`${guide.name} selected as your Anzania guide.`);
}

function selectPower(powerId, { announceSelection = true } = {}) {
  if (!state.manifest?.powers[powerId] || state.isTraversing) return;
  state.selectedPowerId = powerId;
  safeStorageSet(storageKeys.power, powerId);
  renderAbilities();
  const power = getCurrentPower();
  activatePower(power);
  if (announceSelection) {
    showToast(
      `${power.name} selected. Your next crossing will use this ability.`,
    );
    announce(`${power.name} selected as the traversal ability.`);
  }
  warmSceneTransition();
}

function selectInsideTab(tabId, { focus = false } = {}) {
  const location = getCurrentLocation();
  if (!location) return;
  const available = tabDefinitions(location).map((tab) => tab.id);
  if (!available.includes(tabId)) return;
  state.activeInsideTab = tabId;
  renderDeepDive();
  if (focus) {
    const { chapterTabs, chapterBody, chapterTabPanel } = elements;
    chapterTabs
      ?.querySelector(`[data-inside-tab="${CSS.escape(tabId)}"]`)
      ?.focus({ preventScroll: true });
    if (chapterBody && chapterTabs && chapterTabPanel) {
      const bodyBounds = chapterBody.getBoundingClientRect();
      const sectionTop = chapterTabs.getBoundingClientRect().top;
      if (chapterTabPanel.getBoundingClientRect().bottom > bodyBounds.bottom) {
        chapterBody.scrollTop += Math.max(0, sectionTop - bodyBounds.top - 8);
      }
    }
  }
  window.requestAnimationFrame(() => recalculateFraming());
}

function openDialog(dialog) {
  if (!dialog) return;
  setSceneView(false);
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

async function previewTransition({
  powerId = state.selectedPowerId,
  fromIndex = 0,
  toIndex = 1,
  progress = 0.5,
  sceneMode = "outer",
} = {}) {
  const fromLocation = state.manifest?.locations[fromIndex];
  const toLocation = state.manifest?.locations[toIndex];
  const power = state.manifest?.powers[powerId];
  if (!sceneEffects?.available || !fromLocation || !toLocation || !power) {
    return { available: false };
  }

  const fromSource = chooseSceneSource(fromLocation[sceneMode]);
  const toSource = chooseSceneSource(toLocation[sceneMode]);
  await Promise.all([loadImage(fromSource), loadImage(toSource)]);
  const frame = await sceneEffects.preview({
    fromSource,
    toSource,
    powerId,
    duration: power.durationMs,
    direction: toIndex < fromIndex ? -1 : 1,
    progress,
    sunAnchor: getSolarAnchor(toLocation, sceneMode),
  });
  elements.experience?.classList.add(
    "has-scene-effects",
    "is-transition-preview",
  );
  if (elements.experience) {
    elements.experience.dataset.effectRenderer = "webgl-preview";
    elements.experience.dataset.previewPower = powerId;
  }
  return {
    available: true,
    powerId,
    fromId: fromLocation.id,
    toId: toLocation.id,
    progress,
    sceneMode,
    ...frame,
  };
}

function clearTransitionPreview() {
  sceneEffects?.stop();
  elements.experience?.classList.remove(
    "has-scene-effects",
    "is-transition-preview",
  );
  if (elements.experience) {
    delete elements.experience.dataset.effectRenderer;
    delete elements.experience.dataset.previewPower;
  }
}

function setLookBack(active) {
  if (!state.hasBegun || state.isTraversing) return;
  const nextState = Boolean(active);
  if (state.isLookingBack === nextState) return;
  state.isLookingBack = nextState;
  elements.experience.classList.toggle("is-looking-back", nextState);
  elements.lookBackButton?.setAttribute("aria-pressed", String(nextState));
  if (nextState) {
    void setGuidePose("lookback");
    resetIdleTimer();
    announce("Looking back across the current approach.");
  } else {
    void setGuidePose(getSettledGuidePose());
  }
}

function setSceneView(active) {
  const nextState = Boolean(active);
  if (
    nextState &&
    (!state.hasBegun ||
      state.isTraversing ||
      document.querySelector("dialog[open]"))
  ) {
    return;
  }
  if (state.isViewingScene === nextState) return;

  state.isViewingScene = nextState;
  elements.experience?.classList.toggle("is-viewing-scene", nextState);
  elements.chapterPanel.inert = nextState;
  elements.viewSceneButton?.setAttribute("aria-pressed", String(nextState));
  elements.viewSceneButton?.setAttribute(
    "aria-label",
    nextState
      ? "Release to return to the portfolio story"
      : "Press and hold to view the current scene",
  );
  if (elements.viewSceneLabel) {
    elements.viewSceneLabel.textContent = nextState ? "Release" : "View scene";
  }
  elements.viewSceneStatus?.setAttribute("aria-hidden", String(!nextState));
  renderPilotWaypoints();

  if (nextState) {
    setLookBack(false);
    resetIdleTimer();
    announce("Viewing the current scene. Release to return to the story.");
  }
}

function applyMotionPreference(enabled, { persist = true } = {}) {
  state.motionEnabled = Boolean(enabled);
  if (!state.motionEnabled) state.crossing?.skip();
  elements.experience.dataset.motion = state.motionEnabled ? "on" : "off";
  if (elements.motionToggle)
    elements.motionToggle.checked = state.motionEnabled;
  if (!state.motionEnabled) resetParallax();
  if (persist) {
    safeStorageSet(storageKeys.motion, state.motionEnabled ? "on" : "off");
  }
}

function handlePointer(event) {
  if (!state.motionEnabled || !state.hasBegun || state.isTraversing) return;
  if (state.parallaxFrame) return;
  const pointerX = event.clientX;
  const pointerY = event.clientY;
  state.parallaxFrame = window.requestAnimationFrame(() => {
    state.parallaxFrame = 0;
    const x = (pointerX / window.innerWidth - 0.5) * 2;
    const y = (pointerY / window.innerHeight - 0.5) * 2;
    document.documentElement.style.setProperty(
      "--pointer-x",
      `${((x + 1) * 50).toFixed(2)}%`,
    );
    document.documentElement.style.setProperty(
      "--pointer-y",
      `${((y + 1) * 50).toFixed(2)}%`,
    );
    document.documentElement.style.setProperty("--pointer-nx", x.toFixed(3));
    document.documentElement.style.setProperty("--pointer-ny", y.toFixed(3));
    document.documentElement.style.setProperty(
      "--parallax-x",
      `${(-x * 10).toFixed(2)}px`,
    );
    document.documentElement.style.setProperty(
      "--parallax-y",
      `${(-y * 6).toFixed(2)}px`,
    );
    document.documentElement.style.setProperty(
      "--foreground-x",
      `${(-x * 18).toFixed(2)}px`,
    );
    document.documentElement.style.setProperty(
      "--foreground-y",
      `${(-y * 11).toFixed(2)}px`,
    );
  });
}

function resetParallax() {
  document.documentElement.style.setProperty("--pointer-x", "50%");
  document.documentElement.style.setProperty("--pointer-y", "50%");
  document.documentElement.style.setProperty("--pointer-nx", "0");
  document.documentElement.style.setProperty("--pointer-ny", "0");
  document.documentElement.style.setProperty("--parallax-x", "0px");
  document.documentElement.style.setProperty("--parallax-y", "0px");
  document.documentElement.style.setProperty("--foreground-x", "0px");
  document.documentElement.style.setProperty("--foreground-y", "0px");
}

function activateIdleLean() {
  if (
    !state.hasBegun ||
    state.isTraversing ||
    document.querySelector("dialog[open]")
  ) {
    return;
  }
  const frame = state.lastFrame ?? recalculateFraming();
  if (!frame) return;
  const leanLeft = frame.left + frame.width / 2 < window.innerWidth / 2;
  document.documentElement.style.setProperty(
    "--idle-lean-angle",
    leanLeft ? "-2.6deg" : "2.6deg",
  );
  document.documentElement.style.setProperty(
    "--idle-lean-shift",
    leanLeft ? "-2%" : "2%",
  );
  elements.experience.classList.add("is-idle-leaning");
}

function resetIdleTimer() {
  window.clearTimeout(state.idleTimer);
  elements.experience?.classList.remove("is-idle-leaning");
  if (state.hasBegun) {
    state.idleTimer = window.setTimeout(activateIdleLean, 20_000);
  }
}

function preloadAdjacentScenes() {
  if (!state.manifest) return;
  const candidates = [
    state.locationIndex,
    state.locationIndex + 1,
    state.locationIndex - 1,
  ]
    .filter((index) => index >= 0 && index < state.manifest.locations.length)
    .flatMap((index) => {
      const location = state.manifest.locations[index];
      return [
        chooseSceneSource(location.outer),
        chooseSceneSource(location.inner),
      ];
    });
  for (const src of [...new Set(candidates)]) void loadImage(src);
}

function warmSceneTransition() {
  if (!state.motionEnabled || !state.manifest || !sceneEffects?.available) {
    return;
  }
  const currentLocation = getCurrentLocation();
  if (!currentLocation) return;
  const finalIndex = state.manifest.locations.length - 1;
  const nextLocation =
    state.locationIndex < finalIndex
      ? state.manifest.locations[state.locationIndex + 1]
      : currentLocation;
  const nextMode =
    state.locationIndex < finalIndex
      ? "outer"
      : state.sceneMode === "outer"
        ? "inner"
        : "outer";
  void sceneEffects
    .preloadTransition({
      fromSource: chooseSceneSource(currentLocation[state.sceneMode]),
      toSource: chooseSceneSource(nextLocation[nextMode]),
      powerId: state.selectedPowerId,
    })
    .catch(() => undefined);
}

function beginJourney() {
  state.hasBegun = true;
  elements.arrivalGate.hidden = true;
  elements.explorer.hidden = false;
  document.documentElement.dataset.experienceState = "exploring";
  renderLocation({ announceChange: true, resetScroll: true });
  writeJourneyHash({ replace: true });
  renderGuide();
  renderAbilities();
  setPresenting(true, 1_100);
  window.requestAnimationFrame(() => {
    recalculateFraming({ immediate: true });
    const first =
      getPilotSetting() === "chamber"
        ? elements.pilotWaypoints?.querySelector(
            '[data-pilot-action="workbench"]',
          )
        : elements.locationName;
    first?.focus({ preventScroll: true });
  });
  resetIdleTimer();
  if (getPilotSetting() === "dunes") {
    showToast(
      "Choose a crossing ability, then follow a waypoint or open the atlas.",
      3_400,
    );
  }
}

function parseInitialLocation() {
  const hash = window.location.hash.replace(/^#/, "");
  const [id, view] =
    hash === "context-chamber" ? ["stone-pass", "inside"] : hash.split("/");
  const index =
    state.manifest?.locations.findIndex((location) => location.id === id) ?? -1;
  return {
    index: Math.max(0, index),
    mode: index >= 0 && view === "inside" ? "inner" : "outer",
  };
}

function writeJourneyHash({ replace = false } = {}) {
  const id = getCurrentLocation()?.id;
  if (!id) return;
  const locationHash =
    state.sceneMode === "outer"
      ? id
      : id === "stone-pass"
        ? "context-chamber"
        : `${id}/inside`;
  if (window.location.hash === `#${locationHash}`) return;
  const method = replace ? "replaceState" : "pushState";
  window.history[method](null, "", `#${locationHash}`);
}

function restoreJourneyHash() {
  if (!state.manifest) return;
  if (state.isTraversing) {
    state.pendingHash = true;
    state.crossing?.skip();
    return;
  }
  const { index, mode } = parseInitialLocation();
  if (index === state.locationIndex && mode === state.sceneMode) return;
  closeOpenDialog();
  setLookBack(false);
  setSceneView(false);
  state.locationIndex = index;
  state.sceneMode = mode;
  state.activeInsideTab = "now";
  renderScene({ immediate: true });
  renderLocation({ announceChange: state.hasBegun, resetScroll: true });
  recalculateFraming({ immediate: true });
  preloadAdjacentScenes();
  warmSceneTransition();
}

const chamberRequests = {
  contributor: {
    access: "granted",
    status: "Project access granted",
    outcome: "Scoped answer",
    answer:
      "The release review is pending. Compare the latest test run with the readiness checklist.",
  },
  outside: {
    access: "limited",
    status: "Outside the access scope",
    outcome: "No project context",
    answer:
      "No project records are available to this role. Ask the project owner for access.",
  },
};

function renderChamberRequest(input) {
  const result = chamberRequests[input?.value];
  if (!result || !input.checked) return;
  const dialog = elements.chamberDialog;
  dialog.querySelector("[data-chamber-result]").dataset.access = result.access;
  dialog.querySelector("[data-chamber-status]").textContent = result.status;
  dialog.querySelector("[data-chamber-answer]").textContent = result.answer;
  const outcome = dialog.querySelector("[data-chamber-outcome]");
  if (outcome) outcome.textContent = result.outcome;
  dialog.querySelector("[data-chamber-sources]").hidden =
    result.access === "limited";
  for (const route of dialog.querySelectorAll("[data-chamber-route]")) {
    if (route.dataset.chamberRoute === result.access)
      route.setAttribute("aria-current", "true");
    else route.removeAttribute("aria-current");
  }
}

async function openSceneArtifact(action, button) {
  const archive = action.startsWith("archive-");
  const dialog = archive ? elements.archiveDialog : elements.chamberDialog;
  if (!dialog || dialog.open || state.inspection) return;
  const panels = [
    ...dialog.querySelectorAll(
      archive ? "[data-archive-panel]" : "[data-chamber-panel]",
    ),
  ];
  const selected = panels.find(
    (panel) =>
      (archive ? panel.dataset.archivePanel : panel.dataset.chamberPanel) ===
      action,
  );
  if (!selected) return;
  for (const panel of panels) panel.hidden = panel !== selected;
  dialog.setAttribute("aria-labelledby", selected.querySelector("h2").id);
  if (
    state.motionEnabled &&
    typeof elements.sceneCurrent.animate === "function"
  ) {
    const pin = button
      .querySelector("[data-pilot-pin]")
      .getBoundingClientRect();
    const origin = `${pin.left + pin.width / 2}px ${pin.top + pin.height / 2}px`;
    const view = window.getComputedStyle(elements.sceneCurrent).transform;
    const push = elements.sceneCurrent.animate(
      [
        { transformOrigin: origin, transform: view },
        { transformOrigin: origin, transform: `${view} scale(1.11)` },
      ],
      { duration: 320, easing: "cubic-bezier(.2,.72,.24,1)", fill: "forwards" },
    );
    state.inspection = push;
    try {
      await push.finished;
    } catch {
      return;
    } finally {
      state.inspection = null;
    }
    dialog.addEventListener("close", () => push.cancel(), { once: true });
  }
  dialog.addEventListener(
    "close",
    () => button.focus({ preventScroll: true }),
    { once: true },
  );
  openDialog(dialog);
}

function activatePilotWaypoint(event) {
  const button = event.target.closest("[data-pilot-action]");
  if (!button || state.isTraversing) return;
  switch (button.dataset.pilotAction) {
    case "journey-next":
      void travelTo(state.locationIndex + 1, { focusChapter: true });
      break;
    case "journey-back":
      void travelTo(state.locationIndex - 1, { focusChapter: true });
      break;
    case "chamber-enter":
    case "chamber-exit":
    case "archive-exit":
      void togglePortal();
      break;
    default:
      openSceneArtifact(button.dataset.pilotAction, button);
  }
}

function restorePreferences() {
  const storedGuide = safeStorageGet(storageKeys.guide);
  if (
    storedGuide &&
    state.manifest?.guides.some((guide) => guide.id === storedGuide)
  ) {
    state.selectedGuideId = storedGuide;
  }

  const storedPower = safeStorageGet(storageKeys.power);
  if (storedPower && state.manifest?.powers[storedPower]) {
    state.selectedPowerId = storedPower;
  }

  const visited = safeStorageGet(storageKeys.visited);
  if (visited) {
    try {
      const parsed = JSON.parse(visited);
      if (Array.isArray(parsed)) {
        state.visited = new Set(
          parsed.filter((value) => typeof value === "string"),
        );
      }
    } catch {
      state.visited = new Set();
    }
  }

  const reducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const storedMotion = safeStorageGet(storageKeys.motion);
  applyMotionPreference(storedMotion ? storedMotion === "on" : !reducedMotion, {
    persist: false,
  });
}

function bindEvents() {
  elements.skipLink?.addEventListener("click", (event) => {
    event.preventDefault();
    const target = !state.hasBegun
      ? elements.beginJourney
      : elements.locationName;
    target?.focus({ preventScroll: true });
  });
  elements.beginJourney?.addEventListener("click", beginJourney);
  elements.previousLocation?.addEventListener("click", () =>
    travelTo(state.locationIndex - 1),
  );
  elements.nextLocation?.addEventListener("click", advanceForward);
  elements.scenePortal?.addEventListener("click", togglePortal);
  elements.pilotWaypoints?.addEventListener("click", activatePilotWaypoint);
  elements.pilotSkip?.addEventListener("click", () => state.crossing?.skip());
  elements.chamberDialog?.addEventListener("change", (event) => {
    if (event.target.matches("input[name='request-role']"))
      renderChamberRequest(event.target);
  });

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
  for (const eventName of ["pointerover", "focusin"]) {
    elements.guideGrid?.addEventListener(eventName, (event) => {
      const button = event.target.closest("[data-guide-id]");
      if (button) warmGuideSelection(button.dataset.guideId);
    });
  }

  elements.abilityList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-power-id]");
    if (!button) return;
    selectPower(button.dataset.powerId);
  });

  elements.chapterTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-inside-tab]");
    if (!button) return;
    selectInsideTab(button.dataset.insideTab, { focus: true });
  });

  elements.chapterTabs?.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const location = getCurrentLocation();
    if (!location) return;
    const ids = tabDefinitions(location).map((tab) => tab.id);
    const current = ids.indexOf(state.activeInsideTab);
    let next = current;
    if (event.key === "ArrowLeft")
      next = (current - 1 + ids.length) % ids.length;
    if (event.key === "ArrowRight") next = (current + 1) % ids.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = ids.length - 1;
    event.preventDefault();
    selectInsideTab(ids[next], { focus: true });
  });

  elements.mapButton?.addEventListener("click", () =>
    openDialog(elements.mapDialog),
  );
  elements.guideButton?.addEventListener("click", () => {
    warmGuideCards();
    openDialog(elements.guideDialog);
  });
  elements.optionsButton?.addEventListener("click", () =>
    openDialog(elements.optionsDialog),
  );

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () =>
      closeDialog(button.closest("dialog")),
    );
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
    showToast(
      state.motionEnabled
        ? "Atmospheric motion enabled."
        : "Atmospheric motion reduced.",
    );
  });

  const startLookBack = (event) => {
    event.preventDefault();
    if (event.pointerId != null) {
      elements.lookBackButton?.setPointerCapture?.(event.pointerId);
    }
    setLookBack(true);
  };
  const endLookBack = (event) => {
    if (
      event?.pointerId != null &&
      elements.lookBackButton?.hasPointerCapture?.(event.pointerId)
    ) {
      elements.lookBackButton.releasePointerCapture(event.pointerId);
    }
    setLookBack(false);
  };
  elements.lookBackButton?.addEventListener("pointerdown", startLookBack);
  elements.lookBackButton?.addEventListener("pointerup", endLookBack);
  elements.lookBackButton?.addEventListener("pointercancel", endLookBack);
  elements.lookBackButton?.addEventListener("lostpointercapture", () =>
    setLookBack(false),
  );
  elements.lookBackButton?.addEventListener("contextmenu", (event) =>
    event.preventDefault(),
  );

  const startSceneView = (event) => {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    if (event.pointerId != null) {
      elements.viewSceneButton?.setPointerCapture?.(event.pointerId);
    }
    setSceneView(true);
  };
  const endSceneView = (event) => {
    if (
      event?.pointerId != null &&
      elements.viewSceneButton?.hasPointerCapture?.(event.pointerId)
    ) {
      elements.viewSceneButton.releasePointerCapture(event.pointerId);
    }
    setSceneView(false);
  };
  elements.viewSceneButton?.addEventListener("pointerdown", startSceneView);
  elements.viewSceneButton?.addEventListener("pointerup", endSceneView);
  elements.viewSceneButton?.addEventListener("pointercancel", endSceneView);
  elements.viewSceneButton?.addEventListener("lostpointercapture", () =>
    setSceneView(false),
  );
  elements.viewSceneButton?.addEventListener("contextmenu", (event) =>
    event.preventDefault(),
  );
  elements.viewSceneButton?.addEventListener("click", (event) =>
    event.preventDefault(),
  );
  elements.viewSceneButton?.addEventListener("keydown", (event) => {
    if (![" ", "Enter"].includes(event.key) || event.repeat) return;
    event.preventDefault();
    setSceneView(true);
  });
  elements.viewSceneButton?.addEventListener("keyup", (event) => {
    if (![" ", "Enter"].includes(event.key)) return;
    event.preventDefault();
    setSceneView(false);
  });
  elements.viewSceneButton?.addEventListener("blur", () => setSceneView(false));

  window.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) return;
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return;
    }
    resetIdleTimer();

    if (event.key === "Escape" && closeOpenDialog()) {
      event.preventDefault();
      return;
    }
    if (event.key === "Escape" && state.inspection) {
      event.preventDefault();
      state.inspection.cancel();
      return;
    }
    if (
      event.key === "Enter" &&
      event.target instanceof Element &&
      event.target.closest("button, a[href], summary")
    ) {
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
    if (state.isTraversing) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      travelTo(state.locationIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      advanceForward();
    } else if (event.key === "Enter") {
      event.preventDefault();
      togglePortal();
    } else if (event.key.toLowerCase() === "m") {
      event.preventDefault();
      openDialog(elements.mapDialog);
    } else if (event.key.toLowerCase() === "g") {
      event.preventDefault();
      warmGuideCards();
      openDialog(elements.guideDialog);
    } else if (event.key.toLowerCase() === "v" && !event.repeat) {
      event.preventDefault();
      setSceneView(true);
    } else if (event.key.toLowerCase() === "l" && !event.repeat) {
      event.preventDefault();
      setLookBack(true);
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.key.toLowerCase() === "l") setLookBack(false);
    if (event.key.toLowerCase() === "v") setSceneView(false);
  });

  window.addEventListener("blur", () => {
    setLookBack(false);
    setSceneView(false);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      setLookBack(false);
      setSceneView(false);
    }
  });

  window.addEventListener(
    "pointermove",
    (event) => {
      handlePointer(event);
      resetIdleTimer();
    },
    { passive: true },
  );
  window.addEventListener("pointerleave", resetParallax);
  window.addEventListener("pointerdown", resetIdleTimer, { passive: true });
  window.addEventListener("touchstart", resetIdleTimer, { passive: true });
  window.addEventListener("resize", () => {
    if (!state.isTraversing) renderScene({ immediate: true });
    recalculateFraming({ immediate: true });
  });
  window.addEventListener("orientationchange", () => {
    window.setTimeout(() => recalculateFraming({ immediate: true }), 180);
  });
  window.addEventListener("hashchange", restoreJourneyHash);
  window.addEventListener("popstate", restoreJourneyHash);

  if ("ResizeObserver" in window && elements.chapterPanel) {
    const observer = new ResizeObserver(() => recalculateFraming());
    observer.observe(elements.chapterPanel);
  }
}

async function initialise() {
  try {
    setLoadingProgress(12, "Reading the atlas…");
    const response = await fetch(manifestUrl, { credentials: "same-origin" });
    if (!response.ok) {
      throw new Error(`Manifest request failed with ${response.status}`);
    }
    state.manifest = await response.json();

    setLoadingProgress(32, "Opening the western reach…");
    const initial = parseInitialLocation();
    state.locationIndex = initial.index;
    state.sceneMode = initial.mode;
    restorePreferences();
    renderNavigation();
    renderAbilities();
    renderGuides();
    renderGuide();
    renderScene({ immediate: true });
    renderLocation();

    const firstLocation = getCurrentLocation();
    const firstGuide = getCurrentGuide();
    const preloadSources = [
      chooseSceneSource(firstLocation.outer),
      chooseSceneSource(firstLocation.inner),
      ...getGuidePreloadSources(firstGuide),
    ].filter((source, index, sources) => sources.indexOf(source) === index);

    setLoadingProgress(58, "Gathering the first horizon…");
    const preloadResults = await Promise.all(preloadSources.map(loadImage));
    const loadedCount = preloadResults.filter((result) => result.loaded).length;
    setLoadingProgress(
      82,
      loadedCount === preloadResults.length
        ? "Calling your guide…"
        : "Completing the crossing…",
    );
    await wait(state.motionEnabled ? 260 : 20);

    bindEvents();
    preloadAdjacentScenes();
    warmSceneTransition();
    setLoadingProgress(100, "The crossing is ready.");
    await wait(state.motionEnabled ? 340 : 20);

    elements.loadingGate?.classList.add("is-leaving");
    await wait(state.motionEnabled ? 470 : 20);
    elements.loadingGate.hidden = true;
    elements.arrivalGate.hidden = false;
    document.documentElement.dataset.experienceState = "arrival";
    announce("Explore Anzania is ready.");
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
    guidePose: state.guidePose,
    powerId: state.selectedPowerId,
    activeInsideTab: state.activeInsideTab,
    isTraversing: state.isTraversing,
    isLookingBack: state.isLookingBack,
    isViewingScene: state.isViewingScene,
    hasBegun: state.hasBegun,
    frame: state.lastFrame,
  }),
  recalculateFraming,
  travelTo,
  togglePortal,
  setGuidePose,
  setSceneView,
  selectPower,
  previewTransition,
  clearTransitionPreview,
};

void initialise();
