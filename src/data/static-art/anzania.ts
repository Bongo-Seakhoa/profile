export const ANZANIA_PLATE_IDS = [
  "threshold-dunes-outer",
  "threshold-dunes-inner",
  "stone-pass-names-outer",
  "stone-pass-names-inner",
  "archive-echoes-outer",
  "archive-echoes-inner",
  "bazaar-skill-outer",
  "bazaar-skill-inner",
  "oasis-audience-outer",
  "oasis-audience-inner",
  "forge-resolve-outer",
  "forge-resolve-inner",
  "garden-origins-outer",
  "garden-origins-inner",
  "observatory-horizons-outer",
  "observatory-horizons-inner",
] as const;

export const PUBLISHED_ANZANIA_PLATE_IDS = [
  "threshold-dunes-outer",
  "archive-echoes-outer",
  "oasis-audience-inner",
] as const;

export const ANZANIA_DERIVATIVE_WIDTHS = [480, 768, 1200, 1672] as const;
export const ANZANIA_DERIVATIVE_FORMATS = ["avif", "webp", "jpg"] as const;

export type AnzaniaPlateId = (typeof ANZANIA_PLATE_IDS)[number];
export type PublishedAnzaniaPlateId =
  (typeof PUBLISHED_ANZANIA_PLATE_IDS)[number];
export type AnzaniaDerivativeWidth = (typeof ANZANIA_DERIVATIVE_WIDTHS)[number];
export type AnzaniaDerivativeFormat =
  (typeof ANZANIA_DERIVATIVE_FORMATS)[number];

export type AnzaniaApprovedUse =
  | "home-hero"
  | "about-identity"
  | "about-story"
  | "work-evidence"
  | "capabilities"
  | "delivery-process"
  | "research-strategy"
  | "contact-call-to-action"
  | "future-immersive-reference";

export interface FocalPoint {
  readonly xPercent: number;
  readonly yPercent: number;
}

export interface AnzaniaPlateRecord {
  readonly assetId: AnzaniaPlateId;
  readonly sceneId: `anzania.${string}`;
  readonly locationId: string;
  readonly role: "outer" | "inner";
  readonly runtimeAlias: `anzania-${string}-v01`;
  readonly sourceFilename: string;
  readonly sourceSha256: string;
  readonly sourceWidth: 1672;
  readonly sourceHeight: 941;
  readonly focalDesktop: FocalPoint;
  readonly focalMobile: FocalPoint;
  readonly alt: string;
  readonly defaultPresentation: "meaningful" | "decorative";
  readonly approvedUses: readonly AnzaniaApprovedUse[];
  readonly publishForStaticView: boolean;
}

const plate = (record: AnzaniaPlateRecord): AnzaniaPlateRecord => record;

/**
 * The verified, location-plate-only allowlist.
 *
 * Support boards, character sheets and superseded Zahir artwork are deliberately
 * absent. Source masters remain in the reference library and are never copied to
 * the public site; `scripts/build-static-art.mjs` only emits transformed derivatives.
 */
export const ANZANIA_PLATES = {
  "threshold-dunes-outer": plate({
    assetId: "threshold-dunes-outer",
    sceneId: "anzania.threshold_dunes",
    locationId: "threshold_dunes",
    role: "outer",
    runtimeAlias: "anzania-threshold-dunes-outer-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 08_21_20 PM (1).png",
    sourceSha256:
      "df490e854b28f356613fe3e8423cda77531b4fc30a040bb88623c8bc34e5b16a",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 53, yPercent: 52 },
    focalMobile: { xPercent: 53, yPercent: 52 },
    alt: "A mounted caravan crosses sunlit dunes toward a distant city, with blue and gold wayfinding banners in the foreground.",
    defaultPresentation: "meaningful",
    approvedUses: ["home-hero", "future-immersive-reference"],
    publishForStaticView: true,
  }),
  "threshold-dunes-inner": plate({
    assetId: "threshold-dunes-inner",
    sceneId: "anzania.threshold_dunes",
    locationId: "threshold_dunes",
    role: "inner",
    runtimeAlias: "anzania-threshold-dunes-inner-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 07_59_39 PM (2).png",
    sourceSha256:
      "0c1c047c28c42f7979aa4b7eb5edcaaff6ba6b242c6f511e10957dbe34caf1c4",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 50, yPercent: 54 },
    focalMobile: { xPercent: 52, yPercent: 54 },
    alt: "A red-and-cream desert waystation stands beside palms, banners and water vessels at the edge of the dunes.",
    defaultPresentation: "decorative",
    approvedUses: ["home-hero", "future-immersive-reference"],
    publishForStaticView: false,
  }),
  "stone-pass-names-outer": plate({
    assetId: "stone-pass-names-outer",
    sceneId: "anzania.stone_pass_names",
    locationId: "stone_pass_names",
    role: "outer",
    runtimeAlias: "anzania-stone-pass-names-outer-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 08_21_21 PM (4).png",
    sourceSha256:
      "685c603cc093ce5e1cb0b4c25f4c9d4cba883e55528809282601a1d4a0be6cd4",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 51, yPercent: 54 },
    focalMobile: { xPercent: 51, yPercent: 55 },
    alt: "A monumental carved arch and blue banners mark a road through the Stone Pass of Context.",
    defaultPresentation: "decorative",
    approvedUses: ["about-identity", "future-immersive-reference"],
    publishForStaticView: false,
  }),
  "stone-pass-names-inner": plate({
    assetId: "stone-pass-names-inner",
    sceneId: "anzania.stone_pass_names",
    locationId: "stone_pass_names",
    role: "inner",
    runtimeAlias: "anzania-stone-pass-names-inner-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 07_59_39 PM (3).png",
    sourceSha256:
      "56186f7f742829c39930634f1c1126d48c9f8c852ec0180baeec6f988bd274f6",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 50, yPercent: 52 },
    focalMobile: { xPercent: 52, yPercent: 52 },
    alt: "Travellers move between carved stone towers and hanging banners inside a narrow canyon passage.",
    defaultPresentation: "decorative",
    approvedUses: ["about-identity", "future-immersive-reference"],
    publishForStaticView: false,
  }),
  "archive-echoes-outer": plate({
    assetId: "archive-echoes-outer",
    sceneId: "anzania.archive_echoes",
    locationId: "archive_echoes",
    role: "outer",
    runtimeAlias: "anzania-archive-echoes-outer-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 08_21_22 PM (7).png",
    sourceSha256:
      "70b216fc73d5c2c50467d96ce7dbed9d641fe8a85551c480306d517c186a3e5b",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 60, yPercent: 55 },
    focalMobile: { xPercent: 60, yPercent: 55 },
    alt: "A monumental cliffside archive rises above broad stairs, its blue-and-gold domes framed by desert stone.",
    defaultPresentation: "decorative",
    approvedUses: ["work-evidence", "future-immersive-reference"],
    publishForStaticView: true,
  }),
  "archive-echoes-inner": plate({
    assetId: "archive-echoes-inner",
    sceneId: "anzania.archive_echoes",
    locationId: "archive_echoes",
    role: "inner",
    runtimeAlias: "anzania-archive-echoes-inner-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 07_59_40 PM (4).png",
    sourceSha256:
      "9ad34efb41f1e853d8fac7ff2a595e5c6a3a80f1bbbe929b2e92f6a9ecc3a8e9",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 52, yPercent: 53 },
    focalMobile: { xPercent: 52, yPercent: 54 },
    alt: "Sun shafts illuminate an armillary sphere, scroll shelves and lanterns in a vaulted archive hall.",
    defaultPresentation: "decorative",
    approvedUses: ["work-evidence", "future-immersive-reference"],
    publishForStaticView: false,
  }),
  "bazaar-skill-outer": plate({
    assetId: "bazaar-skill-outer",
    sceneId: "anzania.bazaar_skill",
    locationId: "bazaar_skill",
    role: "outer",
    runtimeAlias: "anzania-bazaar-skill-outer-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 08_21_22 PM (10).png",
    sourceSha256:
      "c7f801095a3b0f65a68b853e67dafb9a916acd91bb92e264b14d6e247bbbead5",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 50, yPercent: 53 },
    focalMobile: { xPercent: 50, yPercent: 54 },
    alt: "A broad market avenue leads through canopies and pennants toward domed civic buildings.",
    defaultPresentation: "decorative",
    approvedUses: ["capabilities", "future-immersive-reference"],
    publishForStaticView: false,
  }),
  "bazaar-skill-inner": plate({
    assetId: "bazaar-skill-inner",
    sceneId: "anzania.bazaar_skill",
    locationId: "bazaar_skill",
    role: "inner",
    runtimeAlias: "anzania-bazaar-skill-inner-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 07_59_40 PM (5).png",
    sourceSha256:
      "89bb630378246de0eb55f35e719a3520f348cd913be305036475b5331bfd7eed",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 50, yPercent: 55 },
    focalMobile: { xPercent: 50, yPercent: 55 },
    alt: "Layered canopies, rugs, brass vessels and crates fill an intimate desert market court.",
    defaultPresentation: "decorative",
    approvedUses: ["capabilities", "future-immersive-reference"],
    publishForStaticView: false,
  }),
  "oasis-audience-outer": plate({
    assetId: "oasis-audience-outer",
    sceneId: "anzania.oasis_audience",
    locationId: "oasis_audience",
    role: "outer",
    runtimeAlias: "anzania-oasis-audience-outer-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 08_21_20 PM (2).png",
    sourceSha256:
      "8b13f522e66803652a4e642b4b0b0460f75befdd5727d9c8b0dc5244318095c7",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 60, yPercent: 53 },
    focalMobile: { xPercent: 60, yPercent: 54 },
    alt: "White domes, palms and bridges surround a turquoise lagoon crossed by small boats.",
    defaultPresentation: "decorative",
    approvedUses: ["contact-call-to-action", "future-immersive-reference"],
    publishForStaticView: false,
  }),
  "oasis-audience-inner": plate({
    assetId: "oasis-audience-inner",
    sceneId: "anzania.oasis_audience",
    locationId: "oasis_audience",
    role: "inner",
    runtimeAlias: "anzania-oasis-audience-inner-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 07_59_40 PM (6).png",
    sourceSha256:
      "a56fab44357ee77907574b7111157db3dc22c999f30c2c7e1fc3eb388d10272a",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 50, yPercent: 50 },
    focalMobile: { xPercent: 50, yPercent: 50 },
    alt: "A lantern-lit waterside pavilion glows at dusk, reflected in still water beneath palms.",
    defaultPresentation: "decorative",
    approvedUses: ["contact-call-to-action", "future-immersive-reference"],
    publishForStaticView: true,
  }),
  "forge-resolve-outer": plate({
    assetId: "forge-resolve-outer",
    sceneId: "anzania.forge_resolve",
    locationId: "forge_resolve",
    role: "outer",
    runtimeAlias: "anzania-forge-resolve-outer-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 08_21_21 PM (5).png",
    sourceSha256:
      "e51e723e59e8d070245ee2dc5fbc34aaf01d3077d196287efd1ef454304ad2b5",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 62, yPercent: 55 },
    focalMobile: { xPercent: 62, yPercent: 55 },
    alt: "An industrial foundry citadel rises from desert rock beneath smoke plumes and banners.",
    defaultPresentation: "decorative",
    approvedUses: ["delivery-process", "future-immersive-reference"],
    publishForStaticView: false,
  }),
  "forge-resolve-inner": plate({
    assetId: "forge-resolve-inner",
    sceneId: "anzania.forge_resolve",
    locationId: "forge_resolve",
    role: "inner",
    runtimeAlias: "anzania-forge-resolve-inner-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 08_21_21 PM (3).png",
    sourceSha256:
      "1126d3071388868f17d94c810bed6fe4b9d70f4ef434075d117bc7512dcb3188",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 52, yPercent: 52 },
    focalMobile: { xPercent: 52, yPercent: 52 },
    alt: "Furnace light warms a forge hall filled with suspended apparatus, chains and work surfaces.",
    defaultPresentation: "decorative",
    approvedUses: ["delivery-process", "future-immersive-reference"],
    publishForStaticView: false,
  }),
  "garden-origins-outer": plate({
    assetId: "garden-origins-outer",
    sceneId: "anzania.garden_origins",
    locationId: "garden_origins",
    role: "outer",
    runtimeAlias: "anzania-garden-origins-outer-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 08_21_22 PM (8).png",
    sourceSha256:
      "e60fb2f0f97b5688f6561c1135dba6524182b505fd98a494dad987f804b63b57",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 51, yPercent: 52 },
    focalMobile: { xPercent: 51, yPercent: 53 },
    alt: "A pale terraced garden city climbs between turquoise cascades and dense greenery.",
    defaultPresentation: "decorative",
    approvedUses: ["about-story", "future-immersive-reference"],
    publishForStaticView: false,
  }),
  "garden-origins-inner": plate({
    assetId: "garden-origins-inner",
    sceneId: "anzania.garden_origins",
    locationId: "garden_origins",
    role: "inner",
    runtimeAlias: "anzania-garden-origins-inner-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 08_21_21 PM (6).png",
    sourceSha256:
      "4f475acd22f01a9f7d8154a978e13d1a3187a8833a7d567ac21349eed94c8e62",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 50, yPercent: 53 },
    focalMobile: { xPercent: 50, yPercent: 53 },
    alt: "Sheer curtains, vines and a reflecting pool soften a white garden courtyard and domed pavilion.",
    defaultPresentation: "decorative",
    approvedUses: ["about-story", "future-immersive-reference"],
    publishForStaticView: false,
  }),
  "observatory-horizons-outer": plate({
    assetId: "observatory-horizons-outer",
    sceneId: "anzania.observatory_horizons",
    locationId: "observatory_horizons",
    role: "outer",
    runtimeAlias: "anzania-observatory-horizons-outer-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 08_21_23 PM (11).png",
    sourceSha256:
      "78753ec171ba475af1c6572dac03180020f400335f1b6b1238191155ec5d9603",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 42, yPercent: 50 },
    focalMobile: { xPercent: 42, yPercent: 50 },
    alt: "A mountaintop observatory and circular platform overlook clouds and an open dusk horizon.",
    defaultPresentation: "decorative",
    approvedUses: ["research-strategy", "future-immersive-reference"],
    publishForStaticView: false,
  }),
  "observatory-horizons-inner": plate({
    assetId: "observatory-horizons-inner",
    sceneId: "anzania.observatory_horizons",
    locationId: "observatory_horizons",
    role: "inner",
    runtimeAlias: "anzania-observatory-horizons-inner-v01",
    sourceFilename: "ChatGPT Image Jul 30, 2026, 08_21_22 PM (9).png",
    sourceSha256:
      "f35414a50b9f33a60935bf2dd0d00ea2e315ab1f04b7f523c68b918cdd45ebd7",
    sourceWidth: 1672,
    sourceHeight: 941,
    focalDesktop: { xPercent: 50, yPercent: 52 },
    focalMobile: { xPercent: 50, yPercent: 52 },
    alt: "An armillary instrument, star charts and lanterns fill a deep-blue celestial chamber.",
    defaultPresentation: "decorative",
    approvedUses: ["research-strategy", "future-immersive-reference"],
    publishForStaticView: false,
  }),
} as const satisfies Record<AnzaniaPlateId, AnzaniaPlateRecord>;

const plateIdSet = new Set<string>(ANZANIA_PLATE_IDS);
const publishedPlateIdSet = new Set<string>(PUBLISHED_ANZANIA_PLATE_IDS);

export const isAnzaniaPlateId = (value: string): value is AnzaniaPlateId =>
  plateIdSet.has(value);

export const isPublishedAnzaniaPlateId = (
  value: string,
): value is PublishedAnzaniaPlateId => publishedPlateIdSet.has(value);

export const getAnzaniaPlate = (id: AnzaniaPlateId): AnzaniaPlateRecord =>
  ANZANIA_PLATES[id];

export const getPublishedAnzaniaPlate = (
  id: PublishedAnzaniaPlateId,
): AnzaniaPlateRecord => ANZANIA_PLATES[id];

export const getDerivativePath = (
  record: Pick<AnzaniaPlateRecord, "runtimeAlias">,
  width: AnzaniaDerivativeWidth,
  format: AnzaniaDerivativeFormat,
): string =>
  `assets/images/anzania/${record.runtimeAlias}/${record.runtimeAlias}-${width}.${format}`;

export const getDerivativeDimensions = (
  width: AnzaniaDerivativeWidth,
): { readonly width: AnzaniaDerivativeWidth; readonly height: number } => ({
  width,
  height: Math.round((width * 941) / 1672),
});
