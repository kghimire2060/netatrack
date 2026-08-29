# Security and privacy model

## Principles

1. **The server decides.** The UI hides controls for convenience only. Every API
   route independently re-checks authentication, permission, ownership and state.
2. **Fetch narrow.** Public endpoints select the columns they intend to publish
   rather than fetching a record and deleting fields. A field that is never selected
   cannot leak through a refactor.
3. **Fail closed.** If the permission matrix cannot be read, the compiled defaults
   apply — never "allow".
4. **Record it.** Every privileged action writes an audit entry with actor,
   timestamp, target, result and a redacted change summary.

## Authentication

| Control | Implementation |
|---|---|
| Password storage | bcrypt, cost 12. Never logged, never returned, never recoverable. |
| Password policy | ≥ 10 characters with upper case, lower case and a digit. |
| Login throttling | 8 attempts per IP per 15 minutes; 8 consecutive failures lock the account for 15 minutes. |
| Enumeration | Login returns one message for both unknown email and wrong password. Register and forgot-password always return success. |
| MFA | RFC 6238 TOTP with ±1 step drift tolerance. Mandatory for Super Admin — the disable endpoint refuses it. Enabling requires proving possession of a live code. |
| Sessions | Signed JWT (HS256, 7 days) in an HTTP-only, SameSite=Lax, Secure-in-production cookie, **plus** a `Session` row. A revoked or expired row invalidates the token instantly. |
| Revocation | Per session (`logout`), all sessions (`logout-all`), automatically on password reset, and automatically when an account is suspended, locked or deleted. |
| Email tokens | 32 random bytes, stored only as SHA-256. Verification expires in 24 hours, reset in 60 minutes. Single-use, marked consumed on redemption. |

## Authorization

Resolution is user override → role mapping → deny. See
[`ARCHITECTURE.md`](ARCHITECTURE.md#authorization-model).

Escalation is blocked at four points:

- `assertCanGrant` refuses any grant of a permission the actor does not hold.
- `SUPER_ADMIN_ONLY` (`role.manage`, `settings.manage`) cannot be delegated to any
  other role, by anyone.
- The Super Admin role's permission set is not editable and is always complete.
- Only a Super Admin can grant the Super Admin role or modify a Super Admin account.

A staff member cannot widen their own scope: `role.manage` is not in the STAFF or
ADMIN matrix, and `user.role.assign` is separate from `user.edit`.

## Input handling

Every request body and query string is parsed with a zod schema before it reaches
business logic. Prisma parameterises all queries, so there is no string-built SQL.
React escapes all rendered values; no `dangerouslySetInnerHTML` is used anywhere.

## Privacy

**Never public, by construction:**

| Data | Protection |
|---|---|
| Reporter identity on an issue | `GET /api/complaints/{trackingId}` does not select `reporterId`, `contactEmail` or the reporter relation. The `/track` page selects the same narrow column list. |
| Internal staff notes | `Complaint.internalNotes` and `ComplaintEvent.internalNote` are not selected by any public query. Timeline events are filtered on `isPublic: true`. |
| Individual rater identity | Rating aggregates are published; `userId` is never rendered publicly and never appears in an export. |
| Email addresses | Never rendered on a public page and never included in any dataset. |
| IP addresses | Stored hashed (`hashIp`, SHA-256 with the session secret as salt) against ratings. Raw IPs appear only in session and audit records, which are staff-only. |
| Passwords, tokens, MFA secrets, API keys | Stored hashed or generated-once, redacted from audit summaries by `safeSummary`. |

**Retention:** sessions 7 days; verification tokens 24 hours; reset tokens 60
minutes. Audit records are retained for accountability and the application exposes
no update or delete path for them.

## Election integrity

- Official results (`Result`) and public opinion (`Rating`, `Poll`) are separate
  tables. No query joins or blends them.
- A result cannot reach `VERIFIED` without a recorded source name.
- Verified results display source, verification status and last-update time.
- Objective performance records are stored and shown apart from perception ratings.
- Rating methodology and weights are published at `/methodology` and applied
  identically to every candidate — there is no per-candidate adjustment anywhere in
  the code.

## Content integrity

- A published article cannot be edited without a correction summary, and the
  correction history is public and permanent.
- Fact-check verdicts require `factcheck.review`; publishing requires
  `factcheck.publish`. A subject may attach a response with `factcheck.respond`, and
  only to a record about their own claimed profile — the response never alters the
  verdict.
- Moderation decisions record a reason and are audited.

## Abuse resistance

Per-endpoint rate limits (see [`API.md`](API.md#rate-limits)); one rating per
account per candidate; one vote per account per poll; a candidate cannot rate their
own profile; hashed IP retained for pattern detection; any user can report a rating;
flagged ratings surface in the moderation queue.

## Known limitations to close before production

1. **Rate limiting and caches are in-process.** With more than one instance, limits
   apply per node and a permission change can take up to 60 seconds to propagate.
   Move `rate-limit.ts`, the `rbac.ts` matrix cache and the `settings.ts` cache to
   Redis.
2. **No upload endpoint.** Attachments are modelled and rendered but nothing accepts
   a file yet. When adding one: enforce size and MIME allowlists, scan for malware,
   store outside the web root in private object storage, and serve through a
   permission-checked route rather than a public URL.
3. **No CSRF token.** Protection currently rests on `SameSite=Lax` plus JSON-only
   endpoints. Add a double-submit token before accepting any form-encoded POST.
4. **Security headers are not set.** Add CSP, HSTS, `X-Content-Type-Options`,
   `Referrer-Policy` and `Permissions-Policy` at the edge or in `next.config.ts`.
5. **No automated test suite.** The flows in this build were verified manually
   end to end. Before launch, encode them as tests: the permission matrix, the
   complaint state machine, tracking-ID generation, and the public-endpoint
   field-leakage checks are the highest-value targets.
6. **SMTP domain authentication.** SPF, DKIM and DMARC must be configured on the
   sending domain; the application cannot verify this for you.
