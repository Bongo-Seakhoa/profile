import { z } from "astro/zod";

export const recordIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected a kebab-case identifier");

export const isoMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");

export const precisionDateSchema = z
  .string()
  .regex(
    /^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/,
    "Expected YYYY-MM or YYYY-MM-DD",
  );

const reviewedDateSchema = z.iso.date();
const httpsUrlSchema = z
  .url()
  .refine(
    (value) => value.startsWith("https://"),
    "Public links must use HTTPS",
  );
const publicUrlSchema = z
  .url()
  .refine(
    (value) => value.startsWith("https://") || value.startsWith("mailto:"),
    "Public links must use HTTPS or mailto",
  );

export const evidenceStateSchema = z.enum([
  "owner-supplied-profile",
  "public-verification-link",
  "public-website",
  "public-repository",
  "client-safe-summary",
]);

export const privacyStatusSchema = z.enum(["public", "client-safe-summary"]);

export const publicLinkSchema = z.object({
  id: recordIdSchema,
  label: z.string().min(1),
  url: publicUrlSchema,
  description: z.string().min(1),
});

export const publicPhoneSchema = z.object({
  display: z.literal("+27 73 590 7659"),
  href: z.literal("tel:+27735907659"),
});

export const identitySchema = z.object({
  id: z.literal("bongo-seakhoa"),
  primaryName: z.literal("Bongo Seakhoa"),
  alternateNames: z.array(z.string().min(1)).min(1),
  fullNameVariants: z.array(z.string().min(1)).min(1),
  headline: z.string().min(1),
  valueStatement: z.string().min(1),
  location: z.string().min(1),
  availability: z.string().min(1),
  email: z.email(),
  publicPhone: publicPhoneSchema,
  summary: z.array(z.string().min(1)).min(2),
  identityNote: z.string().min(1),
  profileHighlights: z.array(z.string().min(1)).min(3).max(6),
  links: z.array(publicLinkSchema).min(3),
  evidenceState: z.literal("owner-supplied-profile"),
  lastReviewed: reviewedDateSchema,
});

export const contentReferenceSchema = z.object({
  label: z.string().min(1),
  collection: z.enum(["experience", "project"]),
  id: recordIdSchema,
});

export const capabilitySchema = z.object({
  id: recordIdSchema,
  title: z.string().min(1),
  problem: z.string().min(1),
  delivers: z.array(z.string().min(1)).min(2),
  evidence: z.array(contentReferenceSchema).min(1),
  tools: z.array(z.string().min(1)).min(1),
  featuredOrder: z.number().int().positive(),
  public: z.literal(true),
  lastReviewed: reviewedDateSchema,
});

export const skillGroupSchema = z.object({
  id: recordIdSchema,
  label: z.string().min(1),
  items: z.array(z.string().min(1)).min(1),
});

export const experienceSchema = z
  .object({
    id: recordIdSchema,
    company: z.string().min(1),
    role: z.string().min(1),
    /**
     * The legacy profile establishes role titles and dates, but not contractual
     * modality. Keep this explicitly unknown until owner-supplied evidence exists.
     */
    contractType: z.literal("unknown"),
    location: z.string().min(1),
    remote: z.boolean(),
    dateStart: isoMonthSchema,
    dateEnd: isoMonthSchema.nullable(),
    current: z.boolean(),
    summary: z.string().min(1),
    highlights: z.array(z.string().min(1)).min(1),
    tools: z.array(z.string().min(1)),
    evidenceLinks: z.array(httpsUrlSchema),
    evidenceState: evidenceStateSchema,
    privacyStatus: privacyStatusSchema,
    featured: z.boolean(),
    featuredOrder: z.number().int().positive().nullable(),
    public: z.literal(true),
    lastReviewed: reviewedDateSchema,
  })
  .superRefine((entry, context) => {
    if (entry.current && entry.dateEnd !== null) {
      context.addIssue({
        code: "custom",
        path: ["dateEnd"],
        message: "Current experience must not have an end date",
      });
    }
    if (!entry.current && entry.dateEnd === null) {
      context.addIssue({
        code: "custom",
        path: ["dateEnd"],
        message: "Completed experience requires an end date",
      });
    }
    if (entry.dateEnd !== null && entry.dateEnd < entry.dateStart) {
      context.addIssue({
        code: "custom",
        path: ["dateEnd"],
        message: "Experience end date cannot precede its start date",
      });
    }
    if (entry.featured && entry.featuredOrder === null) {
      context.addIssue({
        code: "custom",
        path: ["featuredOrder"],
        message: "Featured experience requires a featured order",
      });
    }
  });

export const educationSchema = z
  .object({
    id: recordIdSchema,
    institution: z.string().min(1),
    qualification: z.string().min(1),
    dateStart: isoMonthSchema,
    dateEnd: isoMonthSchema.nullable(),
    current: z.boolean(),
    location: z.string().min(1),
    details: z.array(z.string().min(1)).min(1),
    result: z.string().min(1).nullable(),
    evidenceLinks: z.array(httpsUrlSchema),
    evidenceState: evidenceStateSchema,
    featuredOrder: z.number().int().positive(),
    public: z.literal(true),
    lastReviewed: reviewedDateSchema,
  })
  .superRefine((entry, context) => {
    if (entry.current && entry.dateEnd !== null) {
      context.addIssue({
        code: "custom",
        path: ["dateEnd"],
        message: "Current education must not have an end date",
      });
    }
    if (!entry.current && entry.dateEnd === null) {
      context.addIssue({
        code: "custom",
        path: ["dateEnd"],
        message: "Completed education requires an end date",
      });
    }
    if (entry.dateEnd !== null && entry.dateEnd < entry.dateStart) {
      context.addIssue({
        code: "custom",
        path: ["dateEnd"],
        message: "Education end date cannot precede its start date",
      });
    }
  });

export const credentialComponentSchema = z.object({
  id: recordIdSchema,
  title: z.string().min(1),
  issued: precisionDateSchema.nullable(),
  verificationUrl: httpsUrlSchema.nullable(),
  verificationCode: z.string().min(1).nullable(),
});

export const credentialSchema = z
  .object({
    id: recordIdSchema,
    title: z.string().min(1),
    issuer: z.string().min(1),
    kind: z.enum(["certification", "specialization", "course", "program"]),
    category: z.enum([
      "current-cloud",
      "professional",
      "academic-coursework",
      "additional-learning",
      "history",
    ]),
    issued: precisionDateSchema.nullable(),
    expires: precisionDateSchema.nullable(),
    status: z.enum(["active", "completed", "historical"]),
    statusLabel: z.string().min(1),
    verificationUrl: httpsUrlSchema,
    verificationCode: z.string().min(1).nullable(),
    /**
     * Component evidence is nested so a course cannot be rendered both as a
     * standalone credential and as a specialization component by accident.
     */
    components: z.array(credentialComponentSchema),
    evidenceState: z.literal("public-verification-link"),
    featured: z.boolean(),
    featuredOrder: z.number().int().positive().nullable(),
    public: z.literal(true),
    lastReviewed: reviewedDateSchema,
  })
  .superRefine((entry, context) => {
    if (entry.status === "active" && entry.expires === null) {
      context.addIssue({
        code: "custom",
        path: ["expires"],
        message: "Active certification requires an expiry date",
      });
    }
    if (
      entry.expires !== null &&
      entry.issued !== null &&
      entry.expires < entry.issued
    ) {
      context.addIssue({
        code: "custom",
        path: ["expires"],
        message: "Credential expiry cannot precede issue date",
      });
    }
    if (entry.featured && entry.featuredOrder === null) {
      context.addIssue({
        code: "custom",
        path: ["featuredOrder"],
        message: "Featured credentials require a featured order",
      });
    }
  });

export const projectSchema = z
  .object({
    id: recordIdSchema,
    slug: recordIdSchema,
    title: z.string().min(1),
    type: z.string().min(1),
    status: z.enum(["public", "professional", "experiment", "archived"]),
    evidenceState: z.enum([
      "public-repository",
      "public-website",
      "client-safe-summary",
    ]),
    privacyStatus: privacyStatusSchema,
    summary: z.string().min(1),
    role: z.string().min(1).nullable(),
    constraints: z.array(z.string().min(1)),
    contributions: z.array(z.string().min(1)),
    validation: z.array(z.string().min(1)),
    outcome: z.string().min(1).nullable(),
    limitations: z.array(z.string().min(1)),
    technologies: z.array(z.string().min(1)).min(1),
    publicUrl: httpsUrlSchema,
    relatedExperienceIds: z.array(recordIdSchema),
    featured: z.boolean(),
    featuredOrder: z.number().int().positive().nullable(),
    caseStudyDepth: z.enum(["full", "summary", "archive"]),
    public: z.literal(true),
    lastReviewed: reviewedDateSchema,
  })
  .superRefine((entry, context) => {
    if (entry.featured && entry.featuredOrder === null) {
      context.addIssue({
        code: "custom",
        path: ["featuredOrder"],
        message: "Featured projects require a featured order",
      });
    }
  });

export const routeEntityReferenceSchema = z.object({
  collection: z.enum(["project"]),
  id: recordIdSchema,
});

export const releaseSurfaceSchema = z.enum(["static-view", "immersive-entry"]);

export const routeSchema = z.object({
  id: recordIdSchema,
  path: z
    .string()
    .refine(
      (value) => !value.startsWith("/"),
      "Route paths must be base-relative",
    )
    .refine(
      (value) => value === "" || value === "404.html" || value.endsWith("/"),
      "Non-root route paths must end with a slash (except 404.html)",
    ),
  kind: z.enum(["page", "project", "document", "continuity", "system"]),
  label: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  navigation: z.boolean(),
  navigationOrder: z.number().int().positive().nullable(),
  sitemap: z.boolean(),
  canonicalRouteId: recordIdSchema.nullable(),
  entityRef: routeEntityReferenceSchema.nullable(),
  surface: releaseSurfaceSchema,
  immersiveDestinationId: recordIdSchema.nullable(),
});

export const documentSectionKindSchema = z.enum([
  "identity",
  "profile",
  "skills",
  "experience",
  "projects",
  "education",
  "credentials",
]);

export const documentSectionSchema = z.object({
  id: recordIdSchema,
  kind: documentSectionKindSchema,
  label: z.string().min(1),
  itemIds: z.array(recordIdSchema).min(1),
});

export const documentPageSchema = z.object({
  number: z.number().int().positive(),
  sections: z.array(documentSectionSchema).min(1),
});

export const documentVariantSchema = z.object({
  id: recordIdSchema,
  identityId: z.literal("bongo-seakhoa"),
  displayName: z.string().min(1),
  previewPath: z.string().min(1),
  pdfPath: z.string().min(1),
});

export const documentManifestSchema = z.object({
  id: z.enum(["resume", "cv"]),
  label: z.string().min(1),
  paper: z.literal("A4"),
  pageCount: z.number().int().min(2).max(4),
  publicPhone: z.literal(true),
  variants: z.array(documentVariantSchema).length(2),
  selectionPolicy: z.object({
    skills: z.enum(["all", "selected", "none"]),
    experience: z.enum(["all", "selected", "none"]),
    projects: z.enum(["all", "selected", "none"]),
    education: z.enum(["all", "selected", "none"]),
    credentials: z.enum(["all", "selected", "none"]),
  }),
  pages: z.array(documentPageSchema).min(2).max(4),
  lastReviewed: reviewedDateSchema,
});

export const siteSettingsSchema = z.object({
  id: z.literal("site"),
  siteName: z.string().min(1),
  siteUrl: z
    .url()
    .refine((value) => value.endsWith("/"), "Site URL must end with a slash"),
  basePath: z.literal("/profile"),
  defaultTitle: z.string().min(1),
  defaultDescription: z.string().min(1),
  locale: z.literal("en"),
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  publicContactLinkIds: z.array(recordIdSchema).min(1),
  documents: z.object({
    resumePages: z.literal(2),
    cvPages: z.literal(3),
    paper: z.literal("A4"),
    publicPhone: z.literal(true),
  }),
  sourcePolicy: z.object({
    primarySource: z.literal("content/profile.json"),
    linkedInReconciliation: z.literal("pending-owner-export"),
    unsupportedClaims: z.literal("reject"),
  }),
  lastReviewed: reviewedDateSchema,
});

export const profileCollectionSchemas = {
  identity: z.array(identitySchema).length(1),
  capabilities: z.array(capabilitySchema),
  skills: z.array(skillGroupSchema),
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
  credentials: z.array(credentialSchema),
  projects: z.array(projectSchema),
  routes: z.array(routeSchema),
  siteSettings: z.array(siteSettingsSchema).length(1),
  documentManifest: z.array(documentManifestSchema).length(2),
} as const;

export type Identity = z.infer<typeof identitySchema>;
export type Capability = z.infer<typeof capabilitySchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Credential = z.infer<typeof credentialSchema>;
export type Project = z.infer<typeof projectSchema>;
export type RouteRecord = z.infer<typeof routeSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type DocumentManifest = z.infer<typeof documentManifestSchema>;

export interface ProfileContent {
  identity: Identity[];
  capabilities: Capability[];
  skills: SkillGroup[];
  experience: Experience[];
  education: Education[];
  credentials: Credential[];
  projects: Project[];
  routes: RouteRecord[];
  siteSettings: SiteSettings[];
  documentManifest: DocumentManifest[];
}
