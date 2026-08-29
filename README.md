# NetaTrack

**Know. Vote. Track.** — an election information and citizen accountability platform,
built from the *NetaTrack Complete Software Development Proposal*.

A working full-stack implementation of the web application, admin portal, candidate
portal and researcher portal: Next.js 15 (App Router) + TypeScript + PostgreSQL via
Prisma, with server-enforced RBAC, real SMTP delivery, complaint tracking with
public tracking IDs, and an append-only audit trail.

---

## Quick start

```bash
npm install
cp .env.example .env          # then set DATABASE_URL and SESSION_SECRET
npm run db:migrate            # create the schema
npm run db:seed               # demo data across every role
npm run dev                   # http://localhost:3000
```

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Demo accounts

All seeded accounts share the password `NetaTrack#2026`.

| Email | Role | What it shows |
|---|---|---|
| `superadmin@netatrack.example` | Super Admin | Roles, permissions, settings, notifications, audit |
| `admin@netatrack.example` | Admin | Full operations, verification, publishing, user administration |
| `staff.ops@netatrack.example` | Staff | Only the issues assigned to them |
| `staff.editor@netatrack.example` | Staff | Editorial and candidate-record work |
| `citizen@netatrack.example` | Citizen | Ratings, polls, own issues |
| `citizen2@netatrack.example` | Citizen | Second citizen, has a pending profile claim |
| `candidate@netatrack.example` | Candidate | Claimed profile for Ram Prasad Sharma |
| `researcher@netatrack.example` | Researcher | Approved dataset exports |

### Tracking IDs to try on `/track`

`NT-ISSUE-00000001` (resolved, full timeline) · `NT-ISSUE-00000002` (in progress) ·
`NT-ISSUE-00000003` (just submitted, anonymous)

---

## What is implemented

### Public site
Home · Global search · Candidates (search, filter, detail) · Candidate comparison · Constituencies ·
Elections · Official results dashboard · Election calendar · News with visible
correction history · Fact checks with verdicts, evidence and subject responses ·
Public opinion (rating leaderboard + polls) · Promise tracker · Civic analytics ·
Report an issue · Track an issue · Notifications · About/neutrality · Rating methodology ·
Privacy · Terms

### Accounts and security
Register → email verification → activation · Login with throttling and lockout ·
TOTP multi-factor authentication (mandatory for Super Admin) · Single-use, hashed
password-reset tokens · Server-side session registry with per-session and
"log out everywhere" revocation · Account states: Pending / Active / Suspended /
Locked / Deleted

### Citizen issue tracking
Anonymous or authenticated submission · Automatic public tracking ID
(`NT-ISSUE-00000001`) separate from the internal UUID · Enforced nine-state
lifecycle · Assignment, department routing, expected-update SLA, evidence
attachments · Public timeline that never exposes internal notes, reporter identity
or staff communications · Citizen closure feedback and reopen requests · Lifecycle
email at every notifying state

### Candidate intelligence
Source-backed profiles with provenance records · Verification workflow ·
Six-dimension weighted ratings with published methodology, moderation and abuse
reporting · Side-by-side comparison · Profile claim workflow: request → evidence →
staff review → admin approval → account linked, with an edit whitelist that cannot
reach verification records, fact-check verdicts or official results

### Elections
Elections, constituencies, polling stations, parties, candidacies and official
results · A result cannot be verified without a recorded source · Official data and
public opinion are stored in separate tables and never merged

### Accountability
Manifestos and promises with a dated update history · A promise cannot be marked
completed without an evidence link · Objective performance records kept separate
from perception ratings

### Editorial governance
News: draft → editorial review → source review → approval → publish · Editing a
published article requires a correction summary, preserved in a public revision
history · Fact checks: claim → evidence → reviewer → verdict → editor approval →
publish, with a right of reply that never overwrites the verdict

### Administration
Dashboard with queue health and security alerts · Issue queue and case detail ·
Candidates, claims, elections, results, news, fact checks, promises, polls, rating
moderation · Users and role/permission editor · Email delivery log with test send ·
Audit log · System settings and feature flags

### Research
Six aggregated, de-identified datasets with CSV/JSON export · Export permission
separate from view permission · Administrator approval required · Every export rate
limited and audited

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm start` | Production server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:push` | Push the schema without a migration (prototyping) |
| `npm run db:seed` | Seed demo data (idempotent) |
| `npm run db:studio` | Prisma Studio |
| `npm run mailer` | Retry queued/failed transactional email |

---

## Project layout

```
prisma/
  schema.prisma          full data model (section 17 of the proposal)
  migrations/            versioned SQL migrations
  seed.ts                idempotent demo dataset
scripts/
  mail-worker.ts         background SMTP retry worker
src/lib/
  auth.ts                passwords, sessions, tokens, request metadata
  permissions.ts         permission catalog + default role matrix
  rbac.ts                database-backed authorization, cached
  totp.ts                RFC 6238 multi-factor codes (no extra dependency)
  complaint-workflow.ts  the state machine and its permission map
  tracking.ts            public tracking ID generation and validation
  ratings.ts             rating dimensions, weights and aggregation
  email.ts               queue-then-deliver SMTP with retry
  email-templates.ts     HTML + plain-text transactional templates
  audit.ts               append-only audit writer with redaction
  rate-limit.ts          fixed-window limiter and per-endpoint budgets
  datasets.ts            researcher dataset definitions and queries
  settings.ts            runtime configuration with caching
  validation.ts          shared zod schemas
  api.ts                 response helpers, guards, pagination, CSV
src/app/                 public pages, auth pages, portals, admin, API routes
src/components/          design-system primitives and client forms
docs/                    architecture, API reference, security, deployment
```

---

## Security posture

- **Authorization is server-side, always.** The UI hides controls for convenience;
  every API route independently re-checks the caller's permission. Reaching a page
  never implies the right to act.
- **No privilege escalation.** Nobody can grant a permission they do not hold;
  `role.manage` and `settings.manage` are exclusive to Super Admin; only a Super
  Admin can create or modify another Super Admin.
- **Secrets stay in the environment.** Database, session and SMTP credentials are
  never returned by an API, never rendered, never logged, never committed.
- **Passwords** are bcrypt (cost 12). Email tokens are stored as SHA-256 hashes,
  expire, and are single-use. A password change revokes every session.
- **Privacy by construction.** The public tracking endpoint selects only public
  columns — internal notes and reporter identity are not merely hidden in the UI,
  they are never fetched. IP addresses are stored hashed.
- **Every privileged action is audited** with actor, timestamp, target, result and a
  redacted change summary.

See [`docs/SECURITY.md`](docs/SECURITY.md) for the full model.

---

## Not included

The proposal's phase 6 **Flutter Android and iOS applications** are not part of this
repository. The responsive web build covers phones (the reference mobile layout is
implemented), and every mobile screen listed in section 19 has a working web
equivalent backed by the same JSON API, so the mobile clients can be built against
it without server changes.

Also deferred: file upload storage is modelled in the schema
(`ComplaintAttachment`, `CandidateDocument`) and rendered where present, but no
upload endpoint or S3 integration is wired up; OpenSearch/Elasticsearch full-text
search (Postgres queries are used instead); Redis-backed distributed rate limiting
(the limiter is in-process — see `src/lib/rate-limit.ts` before running more than
one instance); Nepali localisation — the app is English-only, though `User.locale`
exists and no strings are baked into the data model, so a translation layer needs no
schema change; and a key-authenticated public research API (the `ApiKey` model is
there, exports currently go through the session-authenticated endpoint).

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — data model, ERD and request flow
- [`docs/API.md`](docs/API.md) — endpoint reference with permissions
- [`docs/SECURITY.md`](docs/SECURITY.md) — security and privacy model
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — production deployment and launch checklist
- [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) — proposal section → implementation map
