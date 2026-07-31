import { deriveExperienceOverlaps } from "./experience-overlaps";
import type { DocumentManifest, ProfileContent, RouteRecord } from "./schemas";

export type ValidationSeverity = "error" | "warning";

export interface ContentValidationIssue {
  code: string;
  severity: ValidationSeverity;
  path: string;
  message: string;
}

export interface ContentValidationResult {
  issues: ContentValidationIssue[];
  errors: ContentValidationIssue[];
  warnings: ContentValidationIssue[];
  overlaps: ReturnType<typeof deriveExperienceOverlaps>;
}

export interface ContentValidationOptions {
  now?: Date;
  credentialExpiryWarningDays?: number;
}

type SelectableCollection =
  "skills" | "experience" | "projects" | "education" | "credentials";

const DOCUMENT_SECTION_TO_COLLECTION = {
  skills: "skills",
  experience: "experience",
  projects: "projects",
  education: "education",
  credentials: "credentials",
} as const;

function addIssue(
  issues: ContentValidationIssue[],
  code: string,
  severity: ValidationSeverity,
  path: string,
  message: string,
): void {
  issues.push({ code, severity, path, message });
}

function normalizedTitle(value: string): string {
  return value.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
}

function endOfPrecisionDate(value: string): Date {
  if (value.length === 7) {
    const [yearText, monthText] = value.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  }

  return new Date(`${value}T23:59:59.999Z`);
}

function startOfPrecisionDate(value: string): Date {
  return new Date(`${value}${value.length === 7 ? "-01" : ""}T00:00:00.000Z`);
}

function daysBetween(left: Date, right: Date): number {
  return Math.ceil((right.getTime() - left.getTime()) / 86_400_000);
}

function checkUniqueValues(
  issues: ContentValidationIssue[],
  values: readonly { value: string; path: string }[],
  code: string,
  label: string,
): void {
  const seen = new Map<string, string>();

  for (const entry of values) {
    const firstPath = seen.get(entry.value);
    if (firstPath !== undefined) {
      addIssue(
        issues,
        code,
        "error",
        entry.path,
        `${label} "${entry.value}" is already used at ${firstPath}`,
      );
    } else {
      seen.set(entry.value, entry.path);
    }
  }
}

function checkRecordIdentifiers(
  content: ProfileContent,
  issues: ContentValidationIssue[],
): void {
  const topLevelIds: { value: string; path: string }[] = [];
  const collections = [
    "identity",
    "capabilities",
    "skills",
    "experience",
    "education",
    "credentials",
    "projects",
    "routes",
    "siteSettings",
    "documentManifest",
  ] as const;

  for (const collection of collections) {
    for (const [index, record] of content[collection].entries()) {
      topLevelIds.push({
        value: record.id,
        path: `${collection}[${index}].id`,
      });
    }
  }

  checkUniqueValues(issues, topLevelIds, "DUPLICATE_ID", "Record ID");

  const credentialIds = [
    ...content.credentials.map((credential, index) => ({
      value: credential.id,
      path: `credentials[${index}].id`,
    })),
    ...content.credentials.flatMap((credential, credentialIndex) =>
      credential.components.map((component, componentIndex) => ({
        value: component.id,
        path: `credentials[${credentialIndex}].components[${componentIndex}].id`,
      })),
    ),
  ];
  checkUniqueValues(
    issues,
    credentialIds,
    "DUPLICATE_CREDENTIAL_ID",
    "Credential or component ID",
  );

  const credentialTitles = [
    ...content.credentials.map((credential, index) => ({
      value: normalizedTitle(credential.title),
      path: `credentials[${index}].title`,
    })),
    ...content.credentials.flatMap((credential, credentialIndex) =>
      credential.components.map((component, componentIndex) => ({
        value: normalizedTitle(component.title),
        path: `credentials[${credentialIndex}].components[${componentIndex}].title`,
      })),
    ),
  ];
  checkUniqueValues(
    issues,
    credentialTitles,
    "DUPLICATE_CREDENTIAL_TITLE",
    "Credential or component title",
  );

  checkUniqueValues(
    issues,
    content.routes.map((route, index) => ({
      value: route.path,
      path: `routes[${index}].path`,
    })),
    "DUPLICATE_ROUTE_PATH",
    "Route path",
  );
}

function checkDates(
  content: ProfileContent,
  issues: ContentValidationIssue[],
  now: Date,
  credentialExpiryWarningDays: number,
): void {
  const currentMonth = now.toISOString().slice(0, 7);

  for (const collection of ["experience", "education"] as const) {
    for (const [index, record] of content[collection].entries()) {
      if (record.dateStart > currentMonth) {
        addIssue(
          issues,
          "FUTURE_START_DATE",
          "error",
          `${collection}[${index}].dateStart`,
          `${record.id} starts in the future (${record.dateStart})`,
        );
      }
      if (record.dateEnd !== null && record.dateEnd < record.dateStart) {
        addIssue(
          issues,
          "END_BEFORE_START",
          "error",
          `${collection}[${index}].dateEnd`,
          `${record.id} ends before it starts`,
        );
      }
    }
  }

  for (const [index, credential] of content.credentials.entries()) {
    if (
      credential.issued !== null &&
      startOfPrecisionDate(credential.issued).getTime() > now.getTime()
    ) {
      addIssue(
        issues,
        "FUTURE_CREDENTIAL_DATE",
        "error",
        `credentials[${index}].issued`,
        `${credential.id} has a future issue date`,
      );
    }

    if (credential.expires === null) continue;

    const expiry = endOfPrecisionDate(credential.expires);
    if (credential.status === "active" && expiry.getTime() < now.getTime()) {
      addIssue(
        issues,
        "EXPIRED_ACTIVE_CREDENTIAL",
        "error",
        `credentials[${index}].status`,
        `${credential.id} is marked active after ${credential.expires}`,
      );
    }

    const remainingDays = daysBetween(now, expiry);
    if (
      credential.status === "active" &&
      remainingDays >= 0 &&
      remainingDays <= credentialExpiryWarningDays
    ) {
      addIssue(
        issues,
        "CREDENTIAL_EXPIRY_NEAR",
        "warning",
        `credentials[${index}].expires`,
        `${credential.id} expires in ${remainingDays} days`,
      );
    }
  }
}

function checkReferences(
  content: ProfileContent,
  issues: ContentValidationIssue[],
): void {
  const experienceIds = new Set(content.experience.map(({ id }) => id));
  const projectIds = new Set(content.projects.map(({ id }) => id));

  for (const [capabilityIndex, capability] of content.capabilities.entries()) {
    for (const [referenceIndex, reference] of capability.evidence.entries()) {
      const ids =
        reference.collection === "experience" ? experienceIds : projectIds;
      if (!ids.has(reference.id)) {
        addIssue(
          issues,
          "BROKEN_CONTENT_REFERENCE",
          "error",
          `capabilities[${capabilityIndex}].evidence[${referenceIndex}].id`,
          `${reference.collection} record "${reference.id}" does not exist`,
        );
      }
    }
  }

  for (const [projectIndex, project] of content.projects.entries()) {
    for (const [
      referenceIndex,
      experienceId,
    ] of project.relatedExperienceIds.entries()) {
      if (!experienceIds.has(experienceId)) {
        addIssue(
          issues,
          "BROKEN_EXPERIENCE_REFERENCE",
          "error",
          `projects[${projectIndex}].relatedExperienceIds[${referenceIndex}]`,
          `Experience "${experienceId}" does not exist`,
        );
      }
    }
  }

  const identity = content.identity[0];
  const publicLinkIds = new Set(identity?.links.map(({ id }) => id) ?? []);
  for (const [index, linkId] of (
    content.siteSettings[0]?.publicContactLinkIds ?? []
  ).entries()) {
    if (!publicLinkIds.has(linkId)) {
      addIssue(
        issues,
        "BROKEN_CONTACT_REFERENCE",
        "error",
        `siteSettings[0].publicContactLinkIds[${index}]`,
        `Public identity link "${linkId}" does not exist`,
      );
    }
  }
}

function checkPrivacy(
  content: ProfileContent,
  issues: ContentValidationIssue[],
): void {
  const serialized = JSON.stringify(content);
  if (serialized.includes("\u2014")) {
    addIssue(
      issues,
      "PUBLIC_EM_DASH",
      "error",
      "$",
      "Public content must not contain em dash characters",
    );
  }
  const approvedPhoneDigits = content.identity[0]?.publicPhone.href.replace(
    /\D/gu,
    "",
  );
  const unapprovedPhone = [...serialized.matchAll(/\+\d[\d\s().-]{7,}\d/gu)]
    .map(([value]) => ({
      value,
      digits: value.replace(/\D/gu, ""),
    }))
    .find(({ digits }) => digits !== approvedPhoneDigits);
  if (unapprovedPhone !== undefined) {
    addIssue(
      issues,
      "UNAPPROVED_PUBLIC_PHONE",
      "error",
      "$",
      `Public content contains an unapproved phone-like value (${unapprovedPhone.value})`,
    );
  }
  if (/bongokosa\.wixsite\.com/i.test(serialized)) {
    addIssue(
      issues,
      "WIX_SOURCE_FORBIDDEN",
      "error",
      "$",
      "The retired Wix portfolio must not appear in production content",
    );
  }
  if (serialized.includes("\u2014")) {
    addIssue(
      issues,
      "PUBLIC_EM_DASH",
      "error",
      "$",
      "Public content must not contain em dashes; rewrite the sentence with natural punctuation",
    );
  }

  for (const [index, experience] of content.experience.entries()) {
    if (
      experience.evidenceState === "client-safe-summary" &&
      experience.privacyStatus !== "client-safe-summary"
    ) {
      addIssue(
        issues,
        "CLIENT_PRIVACY_MISMATCH",
        "error",
        `experience[${index}].privacyStatus`,
        `${experience.id} must retain client-safe privacy status`,
      );
    }
  }

  for (const [index, project] of content.projects.entries()) {
    if (
      project.evidenceState === "client-safe-summary" &&
      project.privacyStatus !== "client-safe-summary"
    ) {
      addIssue(
        issues,
        "CLIENT_PRIVACY_MISMATCH",
        "error",
        `projects[${index}].privacyStatus`,
        `${project.id} must retain client-safe privacy status`,
      );
    }
  }
}

function checkEvidenceStates(
  content: ProfileContent,
  issues: ContentValidationIssue[],
): void {
  for (const [index, experience] of content.experience.entries()) {
    if (
      (experience.evidenceState === "public-website" ||
        experience.evidenceState === "public-repository") &&
      experience.evidenceLinks.length === 0
    ) {
      addIssue(
        issues,
        "MISSING_EVIDENCE_LINK",
        "error",
        `experience[${index}].evidenceLinks`,
        `${experience.id} claims public evidence without a link`,
      );
    }
  }

  for (const [index, project] of content.projects.entries()) {
    if (
      project.evidenceState === "public-repository" &&
      new URL(project.publicUrl).hostname.toLocaleLowerCase("en") !==
        "github.com"
    ) {
      addIssue(
        issues,
        "REPOSITORY_EVIDENCE_MISMATCH",
        "error",
        `projects[${index}].publicUrl`,
        `${project.id} is marked public-repository but does not link to GitHub`,
      );
    }
    if (
      project.evidenceState === "client-safe-summary" &&
      project.privacyStatus !== "client-safe-summary"
    ) {
      addIssue(
        issues,
        "EVIDENCE_PRIVACY_MISMATCH",
        "error",
        `projects[${index}].privacyStatus`,
        `${project.id} has client-safe evidence but public privacy status`,
      );
    }
  }

  for (const [index, credential] of content.credentials.entries()) {
    if (credential.evidenceState !== "public-verification-link") {
      addIssue(
        issues,
        "CREDENTIAL_EVIDENCE_MISMATCH",
        "error",
        `credentials[${index}].evidenceState`,
        `${credential.id} must carry a public verification link`,
      );
    }
  }
}

function routeIndex(routes: readonly RouteRecord[]): Map<string, RouteRecord> {
  return new Map(routes.map((route) => [route.id, route]));
}

function checkCanonicalRouteCycles(
  routes: readonly RouteRecord[],
  issues: ContentValidationIssue[],
): void {
  const byId = routeIndex(routes);

  for (const [index, route] of routes.entries()) {
    const seen = new Set([route.id]);
    let nextId = route.canonicalRouteId;

    while (nextId !== null) {
      if (seen.has(nextId)) {
        addIssue(
          issues,
          "CANONICAL_ROUTE_CYCLE",
          "error",
          `routes[${index}].canonicalRouteId`,
          `Canonical route chain for ${route.id} contains a cycle`,
        );
        break;
      }
      seen.add(nextId);
      nextId = byId.get(nextId)?.canonicalRouteId ?? null;
    }
  }
}

function checkRoutes(
  content: ProfileContent,
  issues: ContentValidationIssue[],
): void {
  const routesById = routeIndex(content.routes);
  const projectIds = new Set(content.projects.map(({ id }) => id));
  const rootRoutes = content.routes.filter(({ path }) => path === "");

  if (rootRoutes.length !== 1 || rootRoutes[0]?.id !== "home") {
    addIssue(
      issues,
      "ROOT_ROUTE_DRIFT",
      "error",
      "routes",
      "The route manifest must contain exactly one root route with ID home",
    );
  }

  for (const [index, route] of content.routes.entries()) {
    if (route.navigation !== (route.navigationOrder !== null)) {
      addIssue(
        issues,
        "NAVIGATION_ORDER_MISMATCH",
        "error",
        `routes[${index}].navigationOrder`,
        `${route.id} navigation state and order disagree`,
      );
    }

    if (
      route.canonicalRouteId !== null &&
      !routesById.has(route.canonicalRouteId)
    ) {
      addIssue(
        issues,
        "BROKEN_CANONICAL_ROUTE",
        "error",
        `routes[${index}].canonicalRouteId`,
        `Canonical route "${route.canonicalRouteId}" does not exist`,
      );
    }

    if (
      (route.kind === "page" || route.kind === "project") &&
      route.canonicalRouteId === null
    ) {
      if (route.immersiveDestinationId === null) {
        addIssue(
          issues,
          "MODE_ROUTE_DRIFT",
          "error",
          `routes[${index}].immersiveDestinationId`,
          `${route.id} has a Static View destination but no immersive destination ID`,
        );
      }
    }

    if (route.kind === "project") {
      if (route.entityRef === null || !projectIds.has(route.entityRef.id)) {
        addIssue(
          issues,
          "BROKEN_PROJECT_ROUTE",
          "error",
          `routes[${index}].entityRef`,
          `${route.id} does not reference a real project`,
        );
      } else {
        const project = content.projects.find(
          ({ id }) => id === route.entityRef?.id,
        );
        if (project !== undefined && route.path !== `work/${project.slug}/`) {
          addIssue(
            issues,
            "PROJECT_ROUTE_SLUG_DRIFT",
            "error",
            `routes[${index}].path`,
            `${route.id} path does not match project slug ${project.slug}`,
          );
        }
      }
    } else if (route.entityRef !== null) {
      addIssue(
        issues,
        "UNEXPECTED_ROUTE_ENTITY",
        "error",
        `routes[${index}].entityRef`,
        `${route.id} is not a project route but has a project reference`,
      );
    }
  }

  checkUniqueValues(
    issues,
    content.routes
      .map((route, index) => ({
        value: route.immersiveDestinationId,
        path: `routes[${index}].immersiveDestinationId`,
      }))
      .filter(
        (entry): entry is { value: string; path: string } =>
          entry.value !== null,
      ),
    "DUPLICATE_IMMERSIVE_DESTINATION",
    "Immersive destination ID",
  );

  checkUniqueValues(
    issues,
    content.routes
      .map((route, index) => ({
        value: route.navigationOrder?.toString() ?? null,
        path: `routes[${index}].navigationOrder`,
      }))
      .filter(
        (entry): entry is { value: string; path: string } =>
          entry.value !== null,
      ),
    "DUPLICATE_NAVIGATION_ORDER",
    "Navigation order",
  );

  for (const project of content.projects) {
    const matchingRoutes = content.routes.filter(
      (route) =>
        route.kind === "project" &&
        route.entityRef?.collection === "project" &&
        route.entityRef.id === project.id,
    );
    if (matchingRoutes.length !== 1) {
      addIssue(
        issues,
        "PROJECT_ROUTE_DRIFT",
        "error",
        "routes",
        `${project.id} must have exactly one project route; found ${matchingRoutes.length}`,
      );
    }
  }

  checkCanonicalRouteCycles(content.routes, issues);
}

function selectedIdsForDocument(
  document: DocumentManifest,
  collection: SelectableCollection,
): string[] {
  const sectionKind = Object.entries(DOCUMENT_SECTION_TO_COLLECTION).find(
    ([, value]) => value === collection,
  )?.[0];
  if (sectionKind === undefined) return [];

  return document.pages.flatMap((page) =>
    page.sections
      .filter(({ kind }) => kind === sectionKind)
      .flatMap(({ itemIds }) => itemIds),
  );
}

function checkSelectionPolicy(
  document: DocumentManifest,
  collection: SelectableCollection,
  allIds: readonly string[],
  featuredIds: readonly string[],
  issues: ContentValidationIssue[],
  documentIndex: number,
): void {
  const selectedIds = selectedIdsForDocument(document, collection);
  const selected = new Set(selectedIds);
  const policy = document.selectionPolicy[collection];

  checkUniqueValues(
    issues,
    selectedIds.map((value, index) => ({
      value,
      path: `documentManifest[${documentIndex}].${collection}[${index}]`,
    })),
    "DUPLICATE_DOCUMENT_SELECTION",
    `${document.id} ${collection} selection`,
  );

  if (policy === "none" && selectedIds.length > 0) {
    addIssue(
      issues,
      "DOCUMENT_SELECTION_POLICY",
      "error",
      `documentManifest[${documentIndex}].selectionPolicy.${collection}`,
      `${document.id} selects ${collection} despite a none policy`,
    );
  }

  if (policy === "selected" && selectedIds.length === 0) {
    addIssue(
      issues,
      "DOCUMENT_SELECTION_POLICY",
      "error",
      `documentManifest[${documentIndex}].selectionPolicy.${collection}`,
      `${document.id} requires an explicit ${collection} selection`,
    );
  }

  if (policy === "all") {
    const missing = allIds.filter((id) => !selected.has(id));
    const unexpected = selectedIds.filter((id) => !allIds.includes(id));
    if (missing.length > 0 || unexpected.length > 0) {
      addIssue(
        issues,
        "INCOMPLETE_DOCUMENT_SELECTION",
        "error",
        `documentManifest[${documentIndex}].selectionPolicy.${collection}`,
        `${document.id} all-policy drift: missing [${missing.join(", ")}], unexpected [${unexpected.join(", ")}]`,
      );
    }
  }

  if (policy === "selected") {
    const omittedFeatured = featuredIds.filter((id) => !selected.has(id));
    if (omittedFeatured.length > 0) {
      addIssue(
        issues,
        "FEATURED_DOCUMENT_OMISSION",
        "error",
        `documentManifest[${documentIndex}].selectionPolicy.${collection}`,
        `${document.id} omits featured ${collection}: ${omittedFeatured.join(", ")}`,
      );
    }
  }
}

function checkDocuments(
  content: ProfileContent,
  issues: ContentValidationIssue[],
): void {
  const collectionIds: Record<SelectableCollection, string[]> = {
    skills: content.skills.map(({ id }) => id),
    experience: content.experience.map(({ id }) => id),
    projects: content.projects.map(({ id }) => id),
    education: content.education.map(({ id }) => id),
    credentials: content.credentials.map(({ id }) => id),
  };
  const featuredIds: Record<SelectableCollection, string[]> = {
    skills: [],
    experience: content.experience
      .filter(({ featured }) => featured)
      .map(({ id }) => id),
    projects: content.projects
      .filter(({ featured }) => featured)
      .map(({ id }) => id),
    education: [],
    credentials: content.credentials
      .filter(({ featured }) => featured)
      .map(({ id }) => id),
  };
  const identityIds = new Set<string>(content.identity.map(({ id }) => id));
  const routeByPath = new Map(
    content.routes.map((route) => [route.path, route]),
  );
  const identityNames = new Set<string>(
    content.identity.flatMap((identity) => [
      identity.primaryName,
      ...identity.alternateNames,
    ]),
  );

  for (const [documentIndex, document] of content.documentManifest.entries()) {
    if (document.pages.length !== document.pageCount) {
      addIssue(
        issues,
        "DOCUMENT_PAGE_COUNT_DRIFT",
        "error",
        `documentManifest[${documentIndex}].pages`,
        `${document.id} declares ${document.pageCount} pages but defines ${document.pages.length}`,
      );
    }

    document.pages.forEach((page, pageIndex) => {
      if (page.number !== pageIndex + 1) {
        addIssue(
          issues,
          "DOCUMENT_PAGE_ORDER",
          "error",
          `documentManifest[${documentIndex}].pages[${pageIndex}].number`,
          `${document.id} pages must be numbered contiguously from 1`,
        );
      }

      for (const [sectionIndex, section] of page.sections.entries()) {
        const path = `documentManifest[${documentIndex}].pages[${pageIndex}].sections[${sectionIndex}]`;
        if (section.kind === "identity" || section.kind === "profile") {
          for (const itemId of section.itemIds) {
            if (!identityIds.has(itemId)) {
              addIssue(
                issues,
                "BROKEN_DOCUMENT_REFERENCE",
                "error",
                `${path}.itemIds`,
                `${document.id} references missing identity ${itemId}`,
              );
            }
          }
          continue;
        }

        const collection =
          DOCUMENT_SECTION_TO_COLLECTION[
            section.kind as keyof typeof DOCUMENT_SECTION_TO_COLLECTION
          ];
        const validIds = new Set(collectionIds[collection]);
        for (const itemId of section.itemIds) {
          if (!validIds.has(itemId)) {
            addIssue(
              issues,
              "BROKEN_DOCUMENT_REFERENCE",
              "error",
              `${path}.itemIds`,
              `${document.id} references missing ${collection} item ${itemId}`,
            );
          }
        }
      }
    });

    for (const collection of Object.keys(
      collectionIds,
    ) as SelectableCollection[]) {
      checkSelectionPolicy(
        document,
        collection,
        collectionIds[collection],
        featuredIds[collection],
        issues,
        documentIndex,
      );
    }

    for (const [variantIndex, variant] of document.variants.entries()) {
      const path = `documentManifest[${documentIndex}].variants[${variantIndex}]`;
      if (!identityIds.has(variant.identityId)) {
        addIssue(
          issues,
          "BROKEN_DOCUMENT_IDENTITY",
          "error",
          `${path}.identityId`,
          `${variant.identityId} does not exist`,
        );
      }
      if (!identityNames.has(variant.displayName)) {
        addIssue(
          issues,
          "UNAPPROVED_NAME_VARIANT",
          "error",
          `${path}.displayName`,
          `${variant.displayName} is not an approved identity name`,
        );
      }
      const previewRoute = routeByPath.get(variant.previewPath);
      if (previewRoute?.kind !== "document") {
        addIssue(
          issues,
          "DOCUMENT_ROUTE_DRIFT",
          "error",
          `${path}.previewPath`,
          `${variant.previewPath} is not a document route`,
        );
      }
    }
  }

  checkUniqueValues(
    issues,
    content.documentManifest.flatMap((document, documentIndex) =>
      document.variants.flatMap((variant, variantIndex) => [
        {
          value: variant.previewPath,
          path: `documentManifest[${documentIndex}].variants[${variantIndex}].previewPath`,
        },
      ]),
    ),
    "DUPLICATE_DOCUMENT_PREVIEW",
    "Document preview path",
  );
  checkUniqueValues(
    issues,
    content.documentManifest.flatMap((document, documentIndex) =>
      document.variants.map((variant, variantIndex) => ({
        value: variant.pdfPath,
        path: `documentManifest[${documentIndex}].variants[${variantIndex}].pdfPath`,
      })),
    ),
    "DUPLICATE_DOCUMENT_PDF",
    "Document PDF path",
  );

  const settings = content.siteSettings[0];
  const resume = content.documentManifest.find(({ id }) => id === "resume");
  const cv = content.documentManifest.find(({ id }) => id === "cv");
  if (
    settings !== undefined &&
    (settings.documents.resumePages !== resume?.pageCount ||
      settings.documents.cvPages !== cv?.pageCount)
  ) {
    addIssue(
      issues,
      "DOCUMENT_SETTINGS_DRIFT",
      "error",
      "siteSettings[0].documents",
      "Site document page counts do not match the document manifest",
    );
  }
}

function checkSourceReviewState(
  content: ProfileContent,
  issues: ContentValidationIssue[],
): void {
  const settings = content.siteSettings[0];
  if (
    settings?.sourcePolicy.linkedInReconciliation === "pending-owner-export"
  ) {
    addIssue(
      issues,
      "OWNER_REVIEW_LINKEDIN",
      "warning",
      "siteSettings[0].sourcePolicy.linkedInReconciliation",
      "LinkedIn reconciliation remains pending an owner-supplied export",
    );
  }

  const unknownContractIds = content.experience
    .filter(({ contractType }) => contractType === "unknown")
    .map(({ id }) => id);
  if (unknownContractIds.length > 0) {
    addIssue(
      issues,
      "OWNER_REVIEW_CONTRACT_TYPES",
      "warning",
      "experience",
      `Contract types remain intentionally unknown: ${unknownContractIds.join(", ")}`,
    );
  }

  const projectDetailGaps = content.projects
    .filter(
      (project) =>
        project.role === null ||
        project.outcome === null ||
        project.contributions.length === 0,
    )
    .map(({ id }) => id);
  if (projectDetailGaps.length > 0) {
    addIssue(
      issues,
      "OWNER_REVIEW_PROJECT_EVIDENCE",
      "warning",
      "projects",
      `Project role, contribution or outcome evidence is incomplete: ${projectDetailGaps.join(", ")}`,
    );
  }
}

export function validateProfileContent(
  content: ProfileContent,
  options: ContentValidationOptions = {},
): ContentValidationResult {
  const now = options.now ?? new Date();
  const credentialExpiryWarningDays = options.credentialExpiryWarningDays ?? 90;
  const issues: ContentValidationIssue[] = [];

  checkRecordIdentifiers(content, issues);
  checkDates(content, issues, now, credentialExpiryWarningDays);
  checkReferences(content, issues);
  checkPrivacy(content, issues);
  checkEvidenceStates(content, issues);
  checkRoutes(content, issues);
  checkDocuments(content, issues);
  checkSourceReviewState(content, issues);

  issues.sort(
    (left, right) =>
      left.severity.localeCompare(right.severity) ||
      left.code.localeCompare(right.code) ||
      left.path.localeCompare(right.path),
  );

  return {
    issues,
    errors: issues.filter(({ severity }) => severity === "error"),
    warnings: issues.filter(({ severity }) => severity === "warning"),
    overlaps: deriveExperienceOverlaps(content.experience),
  };
}
