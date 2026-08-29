# Traceability: proposal → implementation

Every numbered section of the *NetaTrack Complete Software Development Proposal*
mapped to where it lives in this repository, with an honest status.

Status key: **Done** · **Partial** (works, with a stated gap) · **Not built**

| § | Requirement | Status | Where |
|---|---|---|---|
| 1 | Continuous civic platform, not only a results portal | Done | Pre/during/post-election surfaces: `/candidates`, `/results`, `/promises`, `/track` |
| 2 | In-scope module list | Partial | All web modules built; Flutter apps not built (§19) |
| 3 | Brand palette, components, responsive cards, states | Done | `src/app/globals.css`, `src/components/ui.tsx`. Tables collapse to cards under 720px. Empty states via `EmptyState`; branded `not-found.tsx` and `error.tsx` (plus an admin-scoped boundary); pending states on every form; route skeletons on segments that cannot 404; permission-denied handled by redirect to login or `/account` |
| 3 | Main navigation | Partial | `src/components/site-nav.tsx` — all eleven proposed links plus a search box (`/search`), a notification indicator (`/account/notifications`) and login/profile controls. Language switching is not built: the app is English-only, with `User.locale` in place for a later Nepali layer |
| 4 | Six roles | Done | `Role` enum; `src/lib/permissions.ts` |
| 4 | Register → validate → duplicate check → pending → token → SMTP → verify → activate → log | Done | `src/app/api/auth/register`, `/verify` |
| 4 | Login, verification, reset, session rotation, MFA, throttling, logout-all, account states | Done | `src/lib/auth.ts`, `src/lib/totp.ts`, `src/app/api/auth/*` |
| 5 | Backend-enforced granular permissions | Done | `src/lib/rbac.ts`, `src/lib/permissions.ts` (49 permissions) |
| 5 | Editable role → permission mapping | Done | `RolePermission` table, `/admin/roles` |
| 5 | Audit record for every privileged action | Done | `src/lib/audit.ts`, `/admin/audit` |
| 6 | Candidate profile fields, sources, documents, ratings | Done | `prisma/schema.prisma`, `/candidates/[slug]` |
| 6 | Candidate comparison | Done | `/compare` |
| 6 | Claim workflow: request → evidence → staff review → admin approval → linked → logged | Done | `/api/candidates/claims`, `/api/admin/claims/[id]`, `/portal/candidate`, `/admin/claims` |
| 6 | Candidates cannot edit fact-checks, results, methodology or verification | Done | Field whitelist in `candidateSelfEditSchema`; separate permissions |
| 7 | Six weighted rating dimensions | Done | `src/lib/ratings.ts` — 20/15/20/15/15/15 |
| 7 | Rating safeguards | Done | Auth required, one per account per candidate, rate limited, hashed IP, moderation queue, reporting, count/average/distribution/timestamp shown, methodology published |
| 8 | Auto tracking ID separate from internal UUID | Done | `src/lib/tracking.ts` — `NT-ISSUE-00000001`, gap-safe |
| 8 | Nine-state lifecycle with per-state behaviour | Done | `src/lib/complaint-workflow.ts` |
| 8 | Citizen tracking page hides internal notes and PII | Done | `/track`, `/api/complaints/[trackingId]` select public columns only |
| 9 | Full complaint record | Done | `Complaint`, `ComplaintEvent`, `ComplaintAttachment` |
| 9 | Progress timeline | Done | `/track`, `/admin/complaints/[id]` |
| 9 | Lifecycle notifications | Partial | Created, verified, assigned, progress, response, resolved all send. Overdue escalation is surfaced on the admin dashboard but not yet emailed on a schedule |
| 10 | Real SMTP, not a placeholder | Done | `src/lib/email.ts` — nodemailer, queue-then-deliver, retry worker |
| 10 | HTML + plain-text templates | Done | `src/lib/email-templates.ts` |
| 10 | Credentials in env only, background queue, retry, delivery logs, admin test send, rate limits | Done | `Notification` table, `scripts/mail-worker.ts`, `/admin/notifications` |
| 10 | SPF, DKIM, DMARC | Not built | Infrastructure task — see `DEPLOYMENT.md` |
| 11 | Election, constituency, polling station, result modules | Done | `/elections`, `/constituencies`, `/results` |
| 11 | Results show source, update time, verification status | Done | Verification refused without a source |
| 11 | Official results kept apart from public opinion | Done | Separate tables, no join anywhere |
| 12 | Manifesto and promise tracker with six statuses | Done | `/promises`, `PromiseUpdate` history |
| 12 | Performance indicators, methodology-driven | Done | `PerformanceRecord`, rendered separately from ratings |
| 13 | News workflow with correction history | Done | `/admin/news`, `NewsRevision`, correction summary required after publication |
| 13 | Fact-check workflow and six labels | Done | `/fact-checks`, `/admin/fact-checks` |
| 13 | Candidate responses do not overwrite findings | Done | `subjectResponse` is a separate field; verdict changes need `factcheck.review` |
| 14 | Researcher dashboards and datasets | Done | `/portal/researcher`, `src/lib/datasets.ts` — six datasets |
| 14 | Explicit approval, export ≠ view, rate limits, no PII, audited | Done | `researcherApproved` flag, `analytics.export`, `ExportLog` |
| 14 | Rate-limited research API with keys | Partial | `ApiKey` model exists; no key-authenticated public API route yet — exports go through the session-authenticated endpoint |
| 15 | Admin dashboard and all operational areas | Done | `/admin/*` — 18 screens |
| 16 | Technical architecture | Partial | Next.js + TypeScript + PostgreSQL + Prisma as proposed. API in Next route handlers rather than NestJS; Redis, OpenSearch and S3 not wired (see `ARCHITECTURE.md`) |
| 17 | Database entities | Done | All 21 named entities plus `Session`, `VerificationToken`, `RolePermission`, `UserPermissionOverride`, `Candidacy`, `ElectionEvent`, `CandidateClaim`, `CandidateSource`, `CandidateDocument`, `RatingReport`, `NewsRevision`, `FactCheckEvidence`, `PerformanceRecord`, `ApiKey`, `ExportLog`, `Setting` |
| 17 | Internal UUIDs, separate public identifiers | Done | Every model |
| 18 | Passwords, authorization, validation, API security, secrets, audit, privacy | Done | See `SECURITY.md` |
| 18 | File upload restrictions and malware scanning | Not built | No upload endpoint yet; requirements documented in `SECURITY.md` |
| 18 | Political neutrality and trust controls | Done | `/methodology`, `/about`, source records, correction history, right of reply, audited moderation |
| 19 | Mobile app screens | Partial | Every screen has a responsive web equivalent on the same JSON API. Flutter Android/iOS clients not built |
| 20 | Roadmap | n/a | Planning document |
| 21 | Team and budget | n/a | Commercial document |
| 22 | QA, testing, deployment, maintenance | Partial | Flows verified manually end to end and `DEPLOYMENT.md` carries the launch checklist; no automated test suite yet |
| 23 | Deliverables | Partial | Web app, admin portal, candidate portal, complaint system, SMTP, ratings, security layer, documented schema and migrations, API documentation, deployment docs, versioned source — all present. Android and iOS applications outstanding |
| 24 | Positioning and brand statement | Done | Hero, footer and `/about` carry "Know. Vote. Track." and the neutrality notice |

| 2 | English + Nepali-ready architecture | Partial | English only. No string is baked into the data model and `User.locale` exists, so a translation layer can be added without a schema change — but no i18n framework is wired up |

## The three gaps that matter most

1. **Flutter mobile applications** (§19, phase 6 of the roadmap). The largest
   outstanding piece. The JSON API is complete and role-aware, so the clients can be
   built against it without server changes.
2. **File uploads** (§9, §18). Attachments are modelled and displayed, but nothing
   accepts a file. Needs a permission-checked endpoint, size/MIME allowlists,
   malware scanning and private object storage.
3. **Automated tests** (§22). Everything here was verified by hand. The permission
   matrix, complaint state machine, tracking-ID generation and public-endpoint
   field-leakage checks should be encoded as tests before launch.
