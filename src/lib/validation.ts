import { z } from "zod";

/** Shared input schemas. Validation is always server-side (section 18). */

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a digit");

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
  mfaCode: z.string().trim().optional(),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

export const complaintCreateSchema = z.object({
  title: z.string().trim().min(6, "Give the issue a clear title").max(160),
  description: z.string().trim().min(20, "Describe the issue in at least 20 characters").max(5000),
  category: z.string().trim().min(1, "Choose a category"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  province: z.string().trim().max(80).optional().nullable(),
  district: z.string().trim().max(80).optional().nullable(),
  locationDetail: z.string().trim().max(300).optional().nullable(),
  constituencyId: z.string().uuid().optional().nullable(),
  contactEmail: emailSchema.optional().nullable(),
});

export const complaintTransitionSchema = z.object({
  status: z.enum([
    "SUBMITTED",
    "UNDER_REVIEW",
    "VERIFIED",
    "ASSIGNED",
    "ACKNOWLEDGED",
    "IN_PROGRESS",
    "AWAITING_RESPONSE",
    "RESOLVED",
    "CLOSED",
  ]),
  publicUpdate: z.string().trim().max(2000).optional().nullable(),
  internalNote: z.string().trim().max(4000).optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  department: z.string().trim().max(120).optional().nullable(),
  expectedUpdateAt: z.string().datetime().optional().nullable(),
  resolutionNote: z.string().trim().max(4000).optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  /**
   * Route the issue to an elected representative, surfacing it on that
   * politician's public profile. Explicit and reversible (null unroutes it) —
   * never inferred from the issue's constituency, which would publish an
   * unsourced accusation against whoever holds the seat.
   */
  representativeId: z.string().uuid().optional().nullable(),
});

export const complaintFeedbackSchema = z.object({
  trackingId: z.string().trim().min(6),
  feedback: z.string().trim().max(2000).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  requestReopen: z.boolean().default(false),
});

const dimension = z.number().int().min(1).max(5);

export const ratingSchema = z.object({
  candidateId: z.string().uuid(),
  publicTrust: dimension,
  communication: dimension,
  localIssueFocus: dimension,
  policyClarity: dimension,
  responsiveness: dimension,
  overall: dimension,
  comment: z.string().trim().max(1000).optional().nullable(),
});

export const candidateWriteSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  photoUrl: z.string().url().max(500).optional().nullable(),
  biography: z.string().trim().max(8000).optional().nullable(),
  education: z.string().trim().max(2000).optional().nullable(),
  experience: z.string().trim().max(2000).optional().nullable(),
  previousPositions: z.string().trim().max(2000).optional().nullable(),
  agenda: z.string().trim().max(4000).optional().nullable(),
  keyIssues: z.string().trim().max(1000).optional().nullable(),
  gender: z.string().trim().max(40).optional().nullable(),
  partyId: z.string().uuid().optional().nullable(),
  constituencyId: z.string().uuid().optional().nullable(),
  socialLinks: z.record(z.string().url()).optional().nullable(),
});

/** Fields a claimed candidate account may edit itself (section 6). */
export const candidateSelfEditSchema = candidateWriteSchema.pick({
  biography: true,
  education: true,
  experience: true,
  previousPositions: true,
  agenda: true,
  keyIssues: true,
  photoUrl: true,
  socialLinks: true,
});

export const claimSchema = z.object({
  candidateId: z.string().uuid(),
  evidenceUrl: z.string().url().max(500).optional().nullable(),
  statement: z.string().trim().min(20).max(2000),
});

export const pollVoteSchema = z.object({ optionId: z.string().uuid() });

export const newsWriteSchema = z.object({
  title: z.string().trim().min(6).max(200),
  excerpt: z.string().trim().max(400).optional().nullable(),
  body: z.string().trim().min(50),
  category: z.string().trim().max(60).optional().nullable(),
  coverUrl: z.string().url().max(500).optional().nullable(),
  sources: z.string().trim().max(2000).optional().nullable(),
});

export const factCheckWriteSchema = z.object({
  claim: z.string().trim().min(10).max(600),
  claimant: z.string().trim().max(160).optional().nullable(),
  claimSource: z.string().url().max(500).optional().nullable(),
  verdict: z.enum([
    "TRUE",
    "MOSTLY_TRUE",
    "MISLEADING",
    "FALSE",
    "UNVERIFIED",
    "INSUFFICIENT_EVIDENCE",
  ]),
  summary: z.string().trim().max(1000).optional().nullable(),
  analysis: z.string().trim().max(20000).optional().nullable(),
  candidateId: z.string().uuid().optional().nullable(),
});

export const promiseWriteSchema = z.object({
  title: z.string().trim().min(6).max(240),
  description: z.string().trim().max(4000).optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  status: z.enum([
    "NOT_STARTED",
    "IN_PROGRESS",
    "COMPLETED",
    "DELAYED",
    "CANCELLED",
    "UNABLE_TO_VERIFY",
  ]),
  evidenceUrl: z.string().url().max(500).optional().nullable(),
  evidenceNote: z.string().trim().max(2000).optional().nullable(),
  candidateId: z.string().uuid().optional().nullable(),
  constituencyId: z.string().uuid().optional().nullable(),
});

// ------------------- constituency projects, statements, media ----------------

/** ISO date string from a <input type="date">, or null. */
const optionalDate = z
  .string()
  .trim()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date")
  .optional()
  .nullable();

export const PROJECT_STATUSES = [
  "PROPOSED",
  "APPROVED",
  "IN_PROGRESS",
  "COMPLETED",
  "STALLED",
  "CANCELLED",
  "UNABLE_TO_VERIFY",
] as const;

export const projectWriteSchema = z.object({
  title: z.string().trim().min(6).max(240),
  titleNe: z.string().trim().max(240).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
  sector: z.string().trim().max(80).optional().nullable(),
  status: z.enum(PROJECT_STATUSES),
  /**
   * Progress is nullable and stays that way unless the implementing body
   * published a figure — the API must never derive one from `status`.
   */
  progressPct: z.number().min(0).max(100).optional().nullable(),
  budgetNpr: z.number().min(0).max(1e14).optional().nullable(),
  spentNpr: z.number().min(0).max(1e14).optional().nullable(),
  startedAt: optionalDate,
  targetDate: optionalDate,
  completedAt: optionalDate,
  wardNumber: z.number().int().min(1).max(99).optional().nullable(),
  locationDetail: z.string().trim().max(240).optional().nullable(),
  implementingBody: z.string().trim().max(200).optional().nullable(),
  constituencyId: z.string().uuid(),
  candidateId: z.string().uuid().optional().nullable(),
  promiseId: z.string().uuid().optional().nullable(),
  sourceName: z.string().trim().max(200).optional().nullable(),
  sourceUrl: z.string().url().max(500).optional().nullable(),
});

export const projectUpdateSchema = z.object({
  status: z.enum(PROJECT_STATUSES),
  progressPct: z.number().min(0).max(100).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
  evidenceUrl: z.string().url().max(500).optional().nullable(),
});

export const statementWriteSchema = z.object({
  candidateId: z.string().uuid(),
  /**
   * Minimum length is deliberate: a three-word fragment attributed as a quote
   * is the shape misquotation takes, so the record has to carry enough of the
   * statement to be checkable against its source.
   */
  quote: z.string().trim().min(20).max(4000),
  quoteNe: z.string().trim().max(4000).optional().nullable(),
  context: z.enum([
    "PARLIAMENT",
    "PRESS_CONFERENCE",
    "INTERVIEW",
    "SOCIAL_MEDIA",
    "CAMPAIGN_RALLY",
    "PARTY_EVENT",
    "OFFICIAL_DOCUMENT",
    "OTHER",
  ]),
  venue: z.string().trim().max(240).optional().nullable(),
  statedAt: optionalDate,
  topic: z.string().trim().max(80).optional().nullable(),
  sourceName: z.string().trim().max(200).optional().nullable(),
  sourceUrl: z.string().url().max(500).optional().nullable(),
  factCheckId: z.string().uuid().optional().nullable(),
  publish: z.boolean().default(false),
});

export const mediaWriteSchema = z.object({
  candidateId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  kind: z.enum([
    "PROJECT_EVIDENCE",
    "CONSTITUENCY_VISIT",
    "PARLIAMENT",
    "PUBLIC_EVENT",
    "DOCUMENT_SCAN",
    "OTHER",
  ]),
  imageUrl: z.string().url().max(500),
  thumbnailUrl: z.string().url().max(500).optional().nullable(),
  caption: z.string().trim().max(400).optional().nullable(),
  captionNe: z.string().trim().max(400).optional().nullable(),
  altText: z.string().trim().max(300).optional().nullable(),
  capturedAt: optionalDate,
  credit: z.string().trim().max(160).optional().nullable(),
  sourceUrl: z.string().url().max(500).optional().nullable(),
  position: z.number().int().min(0).max(999).default(0),
  publish: z.boolean().default(false),
});

/** Editorial identity fields on a candidate that only staff may set. */
export const candidateDetailsSchema = z.object({
  fullNameNe: z.string().trim().max(160).optional().nullable(),
  dateOfBirth: optionalDate,
  photoUrl: z.string().url().max(500).optional().nullable(),
  office: z.string().trim().max(160).optional().nullable(),
});

export const resultWriteSchema = z.object({
  electionId: z.string().uuid(),
  constituencyId: z.string().uuid(),
  candidateId: z.string().uuid(),
  partyId: z.string().uuid().optional().nullable(),
  votes: z.number().int().min(0),
  totalVotesCast: z.number().int().min(0).optional().nullable(),
  turnoutPct: z.number().min(0).max(100).optional().nullable(),
  isWinner: z.boolean().default(false),
  sourceName: z.string().trim().max(200).optional().nullable(),
  sourceUrl: z.string().url().max(500).optional().nullable(),
});

export const userAdminSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "LOCKED", "DELETED"]).optional(),
  role: z
    .enum(["SUPER_ADMIN", "ADMIN", "STAFF", "CITIZEN", "CANDIDATE", "RESEARCHER"])
    .optional(),
  researcherApproved: z.boolean().optional(),
  reason: z.string().trim().max(500).optional(),
});
