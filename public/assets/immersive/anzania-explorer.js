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
  sceneForegroundPrevious: "[data-scene-foreground-previous]",
  sceneForeground: "[data-scene-foreground]",
  environmentFx: "[data-environment-fx]",
  powerTransition: "[data-power-transition]",
  powerTransitionName: "[data-power-transition-name]",
  powerTransitionCaption: "[data-power-transition-caption]",
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
  chapterSignal: "[data-chapter-signal]",
  chapterSignalValue: "[data-chapter-signal-value]",
  chapterEvidence: "[data-chapter-evidence]",
  chapterFacts: "[data-chapter-facts]",
  chapterActions: "[data-chapter-actions]",
  chapterInside: "[data-chapter-inside]",
  chapterInsideKicker: "[data-chapter-inside-kicker]",
  chapterInsideTitle: "[data-chapter-inside-title]",
  chapterInsideSummary: "[data-chapter-inside-summary]",
  chapterTabs: "[data-chapter-tabs]",
  chapterTabPanel: "[data-chapter-tab-panel]",
  chapterArtifact: "[data-chapter-artifact]",
  portalButton: "[data-portal-button]",
  portalAction: "[data-portal-action]",
  portalCaption: "[data-portal-caption]",
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
};

const elements = Object.fromEntries(
  Object.entries(selectors).map(([key, selector]) => [
    key,
    document.querySelector(selector),
  ]),
);

const storageKeys = {
  guide: "anzania-guide-v2",
  power: "anzania-power-v2",
  motion: "anzania-motion-v2",
  visited: "anzania-visited-v2",
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
  for (const control of [
    elements.previousLocation,
    elements.nextLocation,
    elements.portalButton,
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
}

function getCurrentLocation() {
  return state.manifest?.locations[state.locationIndex] ?? null;
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
  if (!elements.chapterPanel) return;
  elements.chapterPanel.scrollTop = 0;
  if (state.chapterScrollFrame) {
    window.cancelAnimationFrame(state.chapterScrollFrame);
  }
  state.chapterScrollFrame = window.requestAnimationFrame(() => {
    state.chapterScrollFrame = 0;
    if (elements.chapterPanel) elements.chapterPanel.scrollTop = 0;
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

function tabDefinitions(location) {
  return [
    {
      id: "now",
      label: "Now",
      eyebrow: "Live work",
      description:
        "Current work, accepted research and systems in development.",
      render: () => `
        <div class="inside-now-grid">
          ${location.deepDive.now
            .map(
              (item) => `
                <article class="inside-now-card">
                  <span>${escapeHtml(item.status)}</span>
                  <h4>${escapeHtml(item.title)}</h4>
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
                  <h4>${escapeHtml(pillar.title)}</h4>
                  <p>${escapeHtml(pillar.body)}</p>
                </article>`,
            )
            .join("")}
        </div>`,
    },
    {
      id: "field-notes",
      label: "Field notes",
      eyebrow: "Questions worth carrying",
      description:
        "Concise answers that reveal the operating judgement behind the record.",
      render: () => `
        <div class="inside-notes">
          ${location.deepDive.notes
            .map(
              (note) => `
                <details>
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
  if (!state.manifest || !elements.portalButton) return false;
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
  elements.experience.dataset.biome = location.biome;
  elements.experience.dataset.location = location.id;
  elements.chapterPanel.dataset.mode = state.sceneMode;
  if (elements.chapterInside) {
    elements.chapterInside.hidden = state.sceneMode !== "inner";
  }

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
    elements.locationRegion.textContent = location.region;
  if (elements.locationName) elements.locationName.textContent = location.name;
  if (elements.chapterEyebrow)
    elements.chapterEyebrow.textContent = location.eyebrow;
  if (elements.chapterTitle) elements.chapterTitle.textContent = location.title;
  if (elements.chapterLead) elements.chapterLead.textContent = location.lead;
  if (elements.chapterSignal)
    elements.chapterSignal.textContent = location.signal;
  if (elements.chapterSignalValue) {
    elements.chapterSignalValue.textContent = location.signalValue;
  }
  if (elements.portalAction) {
    elements.portalAction.textContent =
      state.sceneMode === "outer"
        ? location.portalAction
        : "Return to the outer approach";
  }
  if (elements.portalCaption) {
    elements.portalCaption.textContent =
      state.sceneMode === "outer"
        ? location.portalCaption
        : "Close the field notes and restore the wider landscape";
  }
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
    elements.chapterActions.innerHTML = location.actions
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

  try {
    window.history.replaceState(null, "", `#${location.id}`);
  } catch {
    // Hash state is progressive enhancement only.
  }

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
    elements.sceneForeground.style.backgroundImage = background;
    elements.sceneCurrent.style.opacity = "1";
    elements.scenePrevious.style.opacity = "0";
    elements.sceneForeground.style.opacity = "0.76";
    elements.sceneForegroundPrevious.style.opacity = "0";
    return;
  }

  elements.scenePrevious.style.backgroundImage = currentBackground;
  elements.sceneForegroundPrevious.style.backgroundImage =
    elements.sceneForeground.style.backgroundImage || currentBackground;
  elements.scenePrevious.style.opacity = "1";
  elements.sceneForegroundPrevious.style.opacity = "0.76";
  elements.sceneCurrent.style.opacity = "0";
  elements.sceneForeground.style.opacity = "0";

  window.requestAnimationFrame(() => {
    const background = `url("${nextSource}")`;
    elements.sceneCurrent.style.backgroundImage = background;
    elements.sceneForeground.style.backgroundImage = background;
    window.requestAnimationFrame(() => {
      elements.sceneCurrent.style.opacity = "1";
      elements.scenePrevious.style.opacity = "0";
      elements.sceneForeground.style.opacity = "0.76";
      elements.sceneForegroundPrevious.style.opacity = "0";
    });
  });
}

function stageSceneTransition(nextSource) {
  if (
    !elements.sceneCurrent ||
    !elements.scenePrevious ||
    !elements.sceneForegroundPrevious ||
    !elements.sceneForeground
  ) {
    return false;
  }

  const outgoingBackground = elements.sceneCurrent.style.backgroundImage;
  const outgoingForeground =
    elements.sceneForeground.style.backgroundImage || outgoingBackground;
  const incomingBackground = `url("${nextSource}")`;

  elements.experience.classList.add("is-scene-staged");
  elements.scenePrevious.style.backgroundImage = outgoingBackground;
  elements.sceneForegroundPrevious.style.backgroundImage = outgoingForeground;
  elements.scenePrevious.style.opacity = "1";
  elements.sceneForegroundPrevious.style.opacity = "0.76";

  elements.sceneCurrent.style.backgroundImage = incomingBackground;
  elements.sceneForeground.style.backgroundImage = incomingBackground;
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
  elements.experience.classList.remove("is-scene-staged");
  delete elements.experience.dataset.transitionPhase;
  delete elements.experience.dataset.travelDirection;
}

function renderScene(options = {}) {
  const location = getCurrentLocation();
  if (!location) return;
  transitionScene(chooseSceneSource(location[state.sceneMode]), options);
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
  const locationRect = rectFromElement(
    document.querySelector(".location-mark"),
    14,
  );
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
    locationRect,
    railRect,
    abilityRect,
    lookRect,
    traversalRect,
    modeRect,
    toastRect,
  ].filter(Boolean);

  const minimumTop = Math.max(safeTop, (topbarRect?.bottom ?? safeTop) + 12);
  const maximumBottom = viewport.height - safeBottom;
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
      (locationRect?.bottom ?? minimumTop) + 16,
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
  if (elements.powerTransitionName) {
    elements.powerTransitionName.textContent = power.name;
  }
  if (elements.powerTransitionCaption) {
    elements.powerTransitionCaption.textContent = power.description;
  }
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
    direction < 0 ? "18vw" : "-18vw",
  );
  document.documentElement.style.setProperty(
    "--travel-incoming-x",
    direction < 0 ? "-16vw" : "16vw",
  );
}

async function travelTo(
  nextIndex,
  { focusChapter = false, announceChange = true } = {},
) {
  if (!state.manifest || state.isTraversing) return;
  const clampedIndex = clamp(nextIndex, 0, state.manifest.locations.length - 1);
  if (clampedIndex === state.locationIndex) return;

  const nextLocation = state.manifest.locations[clampedIndex];
  const power = getCurrentPower();
  const duration = state.motionEnabled ? power.durationMs : 40;
  const handoffAt = clamp(power.handoffAt ?? 0.52, 0.4, 0.62);
  const direction = clampedIndex < state.locationIndex ? -1 : 1;

  setLookBack(false);
  setSceneView(false);
  setPresenting(false, 0, { updateGuidePose: false });
  state.isTraversing = true;
  state.sceneMode = "outer";
  state.activeInsideTab = "now";
  void setGuidePose("travel");
  document.documentElement.dataset.experienceState = "traversing";
  setInteractionLock(true);
  recalculateFraming();
  announce(`${power.name}. Travelling to ${nextLocation.formalName}.`);

  const nextSource = chooseSceneSource(nextLocation.outer);
  await loadImage(nextSource);
  stageSceneTransition(nextSource);
  activatePower(power, { duration, handoffAt, direction });
  elements.experience.dataset.transitionPhase = "departure";
  elements.experience.classList.add("is-traversing", power.className);
  await wait(Math.max(16, duration * handoffAt));

  state.locationIndex = clampedIndex;
  elements.experience.dataset.transitionPhase = "arrival";
  revealStagedScene();
  renderLocation({ announceChange: false, resetScroll: true });
  await wait(Math.max(16, duration * (1 - handoffAt)));

  elements.experience.classList.remove("is-traversing", power.className);
  finishSceneTransition();
  state.isTraversing = false;
  setInteractionLock(false);
  document.documentElement.dataset.experienceState = "exploring";
  renderLocation({ announceChange, resetScroll: true });
  setPresenting(true, 780);
  recalculateFraming();

  if (focusChapter) elements.chapterPanel?.focus({ preventScroll: true });
  preloadAdjacentScenes();
}

async function togglePortal() {
  if (!state.manifest || state.isTraversing) return;
  const location = getCurrentLocation();
  const power = getCurrentPower();
  if (!location || !power) return;

  const duration = state.motionEnabled ? power.durationMs : 40;
  const handoffAt = clamp(power.handoffAt ?? 0.52, 0.4, 0.62);
  const nextMode = state.sceneMode === "outer" ? "inner" : "outer";
  const direction = nextMode === "inner" ? 1 : -1;
  setLookBack(false);
  setSceneView(false);
  setPresenting(false, 0, { updateGuidePose: false });
  state.isTraversing = true;
  void setGuidePose("travel");
  document.documentElement.dataset.experienceState = "transitioning";
  setInteractionLock(true);
  recalculateFraming();

  const nextSource = chooseSceneSource(location[nextMode]);
  await loadImage(nextSource);
  stageSceneTransition(nextSource);
  activatePower(power, { duration, handoffAt, direction });
  elements.experience.dataset.transitionPhase = "departure";
  elements.experience.classList.add("is-traversing", power.className);
  announce(
    `${power.name}. ${nextMode === "inner" ? "Entering" : "Leaving"} ${location.formalName}.`,
  );

  await wait(Math.max(16, duration * handoffAt));
  state.sceneMode = nextMode;
  if (state.sceneMode === "inner") state.activeInsideTab = "now";
  elements.experience.dataset.transitionPhase = "arrival";
  revealStagedScene();
  renderLocation({ announceChange: false, resetScroll: true });
  await wait(Math.max(16, duration * (1 - handoffAt)));

  elements.experience.classList.remove("is-traversing", power.className);
  finishSceneTransition();
  state.isTraversing = false;
  setInteractionLock(false);
  renderTraversalNavigation();
  resetChapterScroll();
  document.documentElement.dataset.experienceState = "exploring";
  recalculateFraming({ immediate: true });
  announce(
    state.sceneMode === "inner"
      ? `Entered ${location.formalName}. ${location.deepDive.heading}`
      : `Returned to the outer approach of ${location.formalName}.`,
  );
  setPresenting(true, 860);
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
}

function selectInsideTab(tabId, { focus = false } = {}) {
  const location = getCurrentLocation();
  if (!location) return;
  const available = tabDefinitions(location).map((tab) => tab.id);
  if (!available.includes(tabId)) return;
  state.activeInsideTab = tabId;
  renderDeepDive();
  if (focus) {
    elements.chapterTabs
      ?.querySelector(`[data-inside-tab="${CSS.escape(tabId)}"]`)
      ?.focus();
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

  if (nextState) {
    setLookBack(false);
    resetIdleTimer();
    announce("Viewing the current scene. Release to return to the story.");
  }
}

function applyMotionPreference(enabled, { persist = true } = {}) {
  state.motionEnabled = Boolean(enabled);
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

function beginJourney() {
  state.hasBegun = true;
  elements.arrivalGate.hidden = true;
  elements.explorer.hidden = false;
  document.documentElement.dataset.experienceState = "exploring";
  renderLocation({ announceChange: true, resetScroll: true });
  renderGuide();
  renderAbilities();
  setPresenting(true, 1_100);
  window.requestAnimationFrame(() => {
    recalculateFraming({ immediate: true });
    elements.chapterPanel?.focus({ preventScroll: true });
  });
  resetIdleTimer();
  showToast(
    "Choose a crossing ability, then use the arrows. Enter each place to open its living professional record.",
    4_200,
  );
}

function parseInitialLocation() {
  if (!state.manifest) return 0;
  const hash = window.location.hash.replace(/^#/, "");
  const index = state.manifest.locations.findIndex(
    (location) => location.id === hash,
  );
  return index >= 0 ? index : 0;
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
  elements.beginJourney?.addEventListener("click", beginJourney);
  elements.previousLocation?.addEventListener("click", () =>
    travelTo(state.locationIndex - 1),
  );
  elements.nextLocation?.addEventListener("click", advanceForward);
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
    selectInsideTab(button.dataset.insideTab);
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
    if (!response.ok) {
      throw new Error(`Manifest request failed with ${response.status}`);
    }
    state.manifest = await response.json();

    setLoadingProgress(32, "Opening the western reach…");
    state.locationIndex = parseInitialLocation();
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
};

void initialise();
