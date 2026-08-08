const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

root.classList.add("static-enhanced");
root.dataset.motion = reducedMotion.matches ? "reduced" : "full";

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const progressBar = document.querySelector("[data-static-progress]");
const sectionIndex = document.querySelector("[data-section-index]");
const sectionLabel = document.querySelector("[data-section-label]");
const sectionProgress = document.querySelector("[data-section-progress]");
const header = document.querySelector(".site-header");

const sectionCandidates = Array.from(
  document.querySelectorAll("main > .page-masthead, main > section"),
).filter((element) => !element.hasAttribute("hidden"));

sectionCandidates.forEach((section, index) => {
  section.dataset.fieldSection = String(index + 1).padStart(2, "0");
  if (!section.dataset.sectionLabel) {
    const heading = section.querySelector("h1, h2");
    section.dataset.sectionLabel =
      heading?.textContent?.replace(/\s+/g, " ").trim() ||
      `Section ${index + 1}`;
  }
});

let activeSection = sectionCandidates[0] ?? null;
let scrollFrame = 0;

function updateScrollState() {
  scrollFrame = 0;
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollRange = Math.max(
    1,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const ratio = clamp(scrollTop / scrollRange, 0, 1);
  const percent = Math.round(ratio * 100);

  root.style.setProperty("--static-scroll-ratio", String(ratio));
  root.style.setProperty("--static-scroll-y", `${scrollTop}px`);
  root.dataset.scrolled = scrollTop > 24 ? "true" : "false";

  if (progressBar) progressBar.style.transform = `scaleX(${ratio})`;
  if (sectionProgress) {
    sectionProgress.textContent = `${String(percent).padStart(2, "0")}%`;
  }

  if (activeSection && sectionIndex && sectionLabel) {
    sectionIndex.textContent = activeSection.dataset.fieldSection || "01";
    sectionLabel.textContent = activeSection.dataset.sectionLabel || "Overview";
  }
}

function requestScrollUpdate() {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(updateScrollState);
}

window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", requestScrollUpdate, { passive: true });
updateScrollState();

if ("IntersectionObserver" in window && sectionCandidates.length > 0) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio);
      if (!visible[0]) return;

      activeSection = visible[0].target;
      root.dataset.activeSection = activeSection.dataset.fieldSection || "01";
      updateScrollState();
    },
    {
      rootMargin: "-22% 0px -56% 0px",
      threshold: [0, 0.1, 0.25, 0.5, 0.75],
    },
  );
  sectionCandidates.forEach((section) => sectionObserver.observe(section));
}

const revealTargets = Array.from(
  document.querySelectorAll(
    [
      "main > section",
      ".page-masthead__body",
      ".project-card",
      ".capability-record",
      ".experience-record",
      ".credential-record",
      ".document-card",
      ".working-style article",
      ".home-split-panels article",
      ".contact-methods > div",
      ".research-record",
      ".education-record",
      "[data-signal-card]",
    ].join(","),
  ),
);

function revealEverything() {
  revealTargets.forEach((target) => {
    target.dataset.revealState = "visible";
  });
}

if (!reducedMotion.matches && "IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.dataset.revealState = "visible";
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -2% 0px", threshold: 0.05 },
  );

  revealTargets.forEach((target, index) => {
    const box = target.getBoundingClientRect();
    target.style.setProperty("--reveal-order", String(index % 6));
    if (box.top < window.innerHeight * 0.98) {
      target.dataset.revealState = "visible";
    } else {
      target.dataset.revealState = "pending";
      revealObserver.observe(target);
    }
  });
} else {
  revealEverything();
}

function applySpotlight(element, event) {
  const box = element.getBoundingClientRect();
  const x = clamp(((event.clientX - box.left) / box.width) * 100, 0, 100);
  const y = clamp(((event.clientY - box.top) / box.height) * 100, 0, 100);
  element.style.setProperty("--signal-x", `${x}%`);
  element.style.setProperty("--signal-y", `${y}%`);
}

if (finePointer.matches) {
  document
    .querySelectorAll(
      ".project-card, [data-signal-card], .document-card, .working-style article",
    )
    .forEach((element) => {
      element.addEventListener("pointermove", (event) =>
        applySpotlight(element, event),
      );
      element.addEventListener("pointerleave", () => {
        element.style.removeProperty("--signal-x");
        element.style.removeProperty("--signal-y");
      });
    });

  window.addEventListener(
    "pointermove",
    (event) => {
      root.style.setProperty("--pointer-x", `${event.clientX}px`);
      root.style.setProperty("--pointer-y", `${event.clientY}px`);
    },
    { passive: true },
  );
}

const dialog = document.querySelector("[data-command-dialog]");
const trigger = document.querySelector("[data-command-trigger]");
const search = document.querySelector("[data-command-search]");
const commandItems = Array.from(document.querySelectorAll("[data-command-item]"));
const emptyState = document.querySelector("[data-command-empty]");
const commandGrid = document.querySelector(".static-command-navigation ul");
let returnFocus = null;

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [role='textbox']",
    ),
  );
}

function filterCommands() {
  const query = search?.value.trim().toLowerCase() || "";
  let visibleCount = 0;
  commandItems.forEach((item) => {
    const label = item.textContent?.toLowerCase() || "";
    const matches = !query || label.includes(query);
    item.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  if (emptyState) emptyState.hidden = visibleCount > 0;
  if (commandGrid instanceof HTMLElement) {
    commandGrid.dataset.filtered = query ? "true" : "false";
    commandGrid.dataset.visibleCount = String(visibleCount);
  }
}

function isDialogElement(value) {
  return (
    typeof HTMLDialogElement !== "undefined" && value instanceof HTMLDialogElement
  );
}

function openDialog() {
  if (!isDialogElement(dialog)) return;
  const activeElement = document.activeElement;
  returnFocus =
    activeElement instanceof HTMLElement && activeElement !== document.body
      ? activeElement
      : trigger;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  root.dataset.commandOpen = "true";
  window.requestAnimationFrame(() => search?.focus());
}

function closeDialog() {
  if (!isDialogElement(dialog)) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

trigger?.addEventListener("click", openDialog);
dialog?.addEventListener("close", () => {
  root.dataset.commandOpen = "false";
  if (search) search.value = "";
  filterCommands();
  if (returnFocus instanceof HTMLElement) returnFocus.focus();
});
dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) closeDialog();
});
search?.addEventListener("input", filterCommands);
commandItems.forEach((item) => {
  item.querySelector("a")?.addEventListener("click", () => closeDialog());
});

document.addEventListener("keydown", (event) => {
  const commandShortcut =
    (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
  const slashShortcut =
    event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
  if ((commandShortcut || slashShortcut) && !isEditableTarget(event.target)) {
    event.preventDefault();
    openDialog();
  }
});

function handleMotionPreference(event) {
  root.dataset.motion = event.matches ? "reduced" : "full";
  if (event.matches) revealEverything();
}

if (typeof reducedMotion.addEventListener === "function") {
  reducedMotion.addEventListener("change", handleMotionPreference);
} else {
  reducedMotion.addListener(handleMotionPreference);
}

if (header && "ResizeObserver" in window) {
  const headerObserver = new ResizeObserver(() => {
    root.style.setProperty(
      "--measured-header-height",
      `${header.getBoundingClientRect().height}px`,
    );
  });
  headerObserver.observe(header);
}

function eligibleInternalLink(anchor, event) {
  if (reducedMotion.matches || event.defaultPrevented || event.button !== 0) {
    return null;
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  if (anchor.hasAttribute("download") || anchor.target) return null;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  ) {
    return null;
  }
  return url;
}

document.addEventListener("click", (event) => {
  const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(anchor instanceof HTMLAnchorElement)) return;
  const destination = eligibleInternalLink(anchor, event);
  if (!destination) return;

  event.preventDefault();
  root.dataset.leaving = "true";
  window.setTimeout(() => window.location.assign(destination.href), 135);
});

window.addEventListener("pageshow", () => {
  delete root.dataset.leaving;
  window.requestAnimationFrame(() => {
    root.classList.add("static-ready");
    root.dataset.staticReady = "true";
  });
});

window.requestAnimationFrame(() => {
  root.classList.add("static-ready");
  root.dataset.staticReady = "true";
});
