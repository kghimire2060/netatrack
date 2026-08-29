# Architecture

## Stack

| Layer | Choice | Note |
|---|---|---|
| Web | Next.js 15 App Router, TypeScript, React 19 | Server Components read the database directly; client components only where interaction demands it |
| API | Next.js Route Handlers under `/api` | Same origin as the site; also the contract a future Flutter client would use |
| Database | PostgreSQL via Prisma | UUID primary keys; separate public identifiers |
| Sessions | Signed JWT cookie + server-side session registry | The registry makes revocation immediate |
| Email | Nodemailer over SMTP, queued in the database | `scripts/mail-worker.ts` retries |
| Authorization | Database-backed permission matrix, cached 60s | `src/lib/rbac.ts` |

The proposal specifies NestJS for the backend and Flutter for mobile. This build
puts the API in Next.js route handlers instead, so one deployable serves the site
and the API. The service boundary is still clean — every route handler is thin and
delegates to `src/lib/*` — so lifting the API into a standalone NestJS service later
is a move of `src/lib` plus the handlers, not a rewrite.

## Request flow

```
Browser / mobile client
        │
        ▼
   CDN / WAF                       (production, see DEPLOYMENT.md)
        │
        ▼
Next.js server
   ├── Server Component ──► prisma ──► PostgreSQL      (reads for pages)
   └── Route handler
         ├── rate limit          src/lib/rate-limit.ts
         ├── parse + validate    zod, src/lib/validation.ts
         ├── authenticate        src/lib/auth.ts   (cookie → JWT → Session row)
         ├── authorize           src/lib/rbac.ts   (role matrix + user overrides)
         ├── business rule       e.g. src/lib/complaint-workflow.ts
         ├── write               prisma transaction
         ├── notify              src/lib/email.ts  (queue → deliver → retry)
         └── audit               src/lib/audit.ts  (actor, target, result, summary)
```

Nothing in that chain trusts the client. A page that renders an action button has
already checked the permission, and the endpoint behind the button checks it again.

## Data model

Every major record has a UUID primary key. Public identifiers — tracking IDs, slugs,
claim references — are separate unique columns, so internal storage can change
without breaking public links, and the primary key never leaks.

```
                ┌──────────────┐
                │     User     │
                └──────┬───────┘
       ┌───────────────┼──────────────┬─────────────┬──────────────┐
       │               │              │             │              │
  Session       VerificationToken  Rating      Complaint      AuditLog
  UserPermissionOverride            │          (reporter,          │
                                    │           assignee,      ExportLog
                                    │           verifier)      ApiKey
                                    │             │
                                    │        ComplaintEvent
                                    │        ComplaintAttachment
                                    ▼
                              ┌───────────┐
              ┌───────────────│ Candidate │───────────────┐
              │               └─────┬─────┘               │
              │                     │                     │
      CandidateSource         CandidateClaim         PerformanceRecord
      CandidateDocument             │                 Promise ──► PromiseUpdate
                                    │                    │
                                    │                 Manifesto
                                    ▼
        ┌────────────┐        ┌──────────┐        ┌──────────────┐
        │   Party    │────────│ Candidacy│────────│   Election   │
        └─────┬──────┘        └──────────┘        └──────┬───────┘
              │                     │                    │
              │               ┌─────▼──────┐      ElectionEvent
              └───────────────│   Result   │
                              └─────┬──────┘
                                    │
                            ┌───────▼────────┐
                            │  Constituency  │──── PollingStation
                            └────────────────┘

  Editorial:  NewsArticle ──► NewsRevision       Opinion:  Poll ──► PollOption
              FactCheck   ──► FactCheckEvidence            Poll ──► PollVote
                                                           Rating ──► RatingReport

  Platform:   RolePermission   Setting   Notification
```

### Separation that matters

Three separations are structural, not conventional, because collapsing them is how
a civic platform loses its neutrality:

1. **Official results vs. public opinion.** `Result` (official, source-required,
   verification-gated) and `Rating` (perception, user-generated, moderated) are
   distinct tables with no join and no shared score column. No query in the codebase
   combines them.
2. **Objective records vs. perception.** `PerformanceRecord` holds source-backed
   activity (attendance, questions, bills). It is rendered next to ratings but never
   averaged with them.
3. **Public vs. internal complaint data.** `Complaint.publicResponse` and
   `ComplaintEvent.isPublic` are what citizens see. `Complaint.internalNotes` and
   `ComplaintEvent.internalNote` are never selected by any public query — see
   `src/app/api/complaints/[trackingId]/route.ts`, which lists its columns explicitly
   rather than spreading the record.

## Authorization model

The permission *catalog* lives in code (`src/lib/permissions.ts`) so names are
type-checked. The role → permission *mapping* lives in the database
(`RolePermission`) so an administrator can re-scope a role without a deploy.
`UserPermissionOverride` grants or revokes a single permission for one account.

Resolution order: user override → role mapping → deny.

The matrix is cached in-process for 60 seconds and invalidated immediately when
edited through the API. If the database is unreachable, `rbac.ts` falls back to the
compiled `DEFAULT_ROLE_MATRIX` rather than failing open.

### Escalation guards

- `role.manage` and `settings.manage` are Super Admin only and cannot be delegated
  (`SUPER_ADMIN_ONLY` in `permissions.ts`, enforced by `assertCanGrant`).
- Nobody can grant a permission they do not themselves hold.
- Only a Super Admin can grant the Super Admin role or modify a Super Admin account.
- The Super Admin role's own permission set is not editable — it is always complete.
- Multi-factor authentication cannot be disabled on a Super Admin account.

## Complaint state machine

`src/lib/complaint-workflow.ts` is the single source of truth. Each edge declares the
permission it requires; the transition endpoint refuses any move not in the table.

```
SUBMITTED ─► UNDER_REVIEW ─► VERIFIED ─► ASSIGNED ─► ACKNOWLEDGED ─► IN_PROGRESS
                   │                        │                            │  ▲
                   │                        └──── reassign ──────────────┘  │
                   │                                                        ▼
                   │                                            AWAITING_RESPONSE
                   │                                                        │
                   └────► CLOSED  (rejected at triage)                      ▼
                                                                        RESOLVED ─► CLOSED
                                                                            │          │
                                                                            └─ reopen ─┘
                                                                              (complaint.reopen)
```

Additional rules enforced server-side: resolving requires a resolution note;
assigning requires an assignee; staff without `complaint.view.all` may only act on
issues assigned to them.

## Caching

| What | Where | TTL | Invalidation |
|---|---|---|---|
| Role → permission matrix | in-process | 60s | immediate on edit |
| Settings | in-process | 30s | immediate on save |
| Rate-limit counters | in-process | per window | automatic sweep |

All three are per-process. Running more than one instance means a role change can
take up to 60 seconds to reach every node, and rate limits apply per node. Move all
three to Redis before horizontal scaling — the architecture in the proposal already
provisions it.

## Rendering

The root layout reads the session cookie, so the whole tree renders per request
(`export const dynamic = "force-dynamic"`). This is the right default for a platform
where nearly every page varies by role. For election-day traffic, the pages that are
genuinely identical for everyone — results, candidate profiles, news — should move to
cached rendering with tag-based revalidation on publish; that is a per-page change,
not an architectural one.
