# API reference

All endpoints are JSON over the same origin. Authentication is the
`netatrack_session` HTTP-only cookie. Every endpoint validates its input with zod
and re-checks permissions server-side.

**Error shape**

```json
{ "error": "human readable message", "issues": [{ "path": "field", "message": "why" }] }
```

`issues` appears only on validation failures. Status codes: `400` invalid input,
`401` not authenticated, `403` not permitted, `404` not found, `409` conflict or
illegal state transition, `423` account locked, `429` rate limited.

---

## Authentication

| Method | Path | Auth | Rate limit | Notes |
|---|---|---|---|---|
| POST | `/api/auth/register` | — | 5 / hour / IP | Creates a PENDING account and queues a verification email. Returns `{ok:true}` whether or not the address was already registered, so the endpoint cannot enumerate accounts. |
| POST | `/api/auth/verify` | — | — | Body `{token}`. Activates the account. Tokens are single-use and expire in 24 hours. |
| POST | `/api/auth/login` | — | 8 / 15 min / IP | Body `{email, password, mfaCode?}`. Returns `{ok:true, mfaRequired:true}` when a second factor is needed. Eight failures lock the account for 15 minutes. Privileged logins trigger a security alert email. |
| POST | `/api/auth/logout` | session | — | Revokes this session. |
| POST | `/api/auth/logout-all` | session | — | Revokes every session for the account. |
| POST | `/api/auth/forgot-password` | — | 5 / hour / IP | Always returns `{ok:true}`. |
| POST | `/api/auth/reset-password` | — | 5 / hour / IP | Body `{token, password}`. Single-use token; revokes all sessions on success. |
| GET | `/api/auth/me` | optional | — | Returns the current user and their resolved permission list. |
| POST | `/api/auth/mfa/setup` | session | — | Issues a TOTP secret. MFA stays off until confirmed. |
| POST | `/api/auth/mfa/enable` | session | — | Body `{code}`. Proves possession, then enables. |
| POST | `/api/auth/mfa/disable` | session | — | Body `{password}`. Refused for Super Admin accounts. |

**Password policy:** at least 10 characters with an uppercase letter, a lowercase
letter and a digit. Stored as bcrypt cost 12.

---

## Citizen issues

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/api/complaints` | none (or `complaint.create`) | Anonymous allowed when `complaints.allowAnonymous` is on. Returns `{trackingId}`. Rate limited to 5 / hour / IP. |
| GET | `/api/complaints/{trackingId}` | none | Public tracking. Returns only public columns and public timeline events. |
| POST | `/api/complaints/feedback` | none | Closure feedback and reopen request. A registered reporter's issue accepts feedback only from that reporter. |
| PATCH | `/api/admin/complaints/{id}/transition` | per transition | The single lifecycle entry point. |

### Transition endpoint

```jsonc
PATCH /api/admin/complaints/{id}/transition
{
  "status": "ASSIGNED",
  "assignedToId": "uuid",       // required when status is ASSIGNED
  "department": "Water Supply",
  "publicUpdate": "…",          // shown to the citizen and emailed
  "internalNote": "…",          // never public
  "resolutionNote": "…",        // required when status is RESOLVED
  "expectedUpdateAt": "2026-09-02T10:00:00.000Z",
  "priority": "HIGH"
}
```

Required permission by edge:

| From → To | Permission |
|---|---|
| SUBMITTED → UNDER_REVIEW | `complaint.update` |
| UNDER_REVIEW → VERIFIED | `complaint.verify` |
| UNDER_REVIEW → CLOSED | `complaint.resolve` |
| VERIFIED → ASSIGNED | `complaint.assign` |
| ASSIGNED → ASSIGNED (reassign) | `complaint.assign` |
| ASSIGNED → ACKNOWLEDGED / IN_PROGRESS | `complaint.update` |
| ACKNOWLEDGED → IN_PROGRESS | `complaint.update` |
| IN_PROGRESS → AWAITING_RESPONSE / IN_PROGRESS | `complaint.update` |
| IN_PROGRESS, AWAITING_RESPONSE → RESOLVED | `complaint.resolve` |
| RESOLVED → CLOSED | `complaint.resolve` |
| RESOLVED, CLOSED → IN_PROGRESS (reopen) | `complaint.reopen` |

Any other pair returns `409`. Staff without `complaint.view.all` may only act on
issues assigned to them. The reporter is emailed on VERIFIED, ASSIGNED, IN_PROGRESS,
AWAITING_RESPONSE, RESOLVED and CLOSED.

---

## Public opinion

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/api/ratings` | `rating.create` | Six dimensions, each 1–5. Upserts: one rating per account per candidate. A candidate cannot rate their own claimed profile. 20 / hour / IP. |
| POST | `/api/polls/{id}/vote` | `poll.vote` | One vote per account per poll. 30 / hour / IP. |
| PATCH | `/api/admin/ratings/{id}` | `rating.moderate` | Body `{status, moderationNote}`. Hidden and removed ratings leave the published average. |

---

## Candidates

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/api/candidates/claims` | session | Submit a profile claim with evidence. |
| PATCH | `/api/admin/claims/{id}` | `candidate.claim.review` | `{status, reviewNote}`. Approval links the account, promotes a CITIZEN to CANDIDATE and rejects competing claims. |
| PATCH | `/api/candidates/{id}/self` | `candidate.edit.own` | Whitelisted fields only, and only on the profile linked to the caller's account. |
| POST | `/api/admin/candidates/{id}/verify` | `candidate.verify` | `{status, sourceLabel, sourceUrl, note}`. Records a provenance entry. |

The self-edit whitelist is biography, education, experience, previous positions,
agenda, key issues, photo URL and social links. Party, constituency, verification
status, ratings, official results and fact-check verdicts are unreachable from it.

---

## Elections and editorial

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/api/admin/results/{id}/publish` | `result.publish` | Verification is refused without a recorded source. |
| PATCH | `/api/admin/news/{id}` | `news.edit` (+ `news.publish` to approve/publish) | Editing a published body requires `correctionSummary`, which is written to the public revision history. |
| PATCH | `/api/admin/fact-checks/{id}` | `factcheck.review` (+ `factcheck.publish`) | A body containing only `subjectResponse` requires just `factcheck.respond`, and only from the subject's own account. |
| POST | `/api/admin/promises/{id}` | `promise.manage` | Records a dated update. COMPLETED requires an evidence link. |

---

## Administration

| Method | Path | Permission | Notes |
|---|---|---|---|
| PATCH | `/api/admin/users/{id}` | `user.edit` (+ `user.role.assign`, `user.suspend`) | Suspension, locking or deletion revokes every session immediately. |
| PATCH | `/api/admin/roles/{role}` | `role.manage` | Replaces a role's permission set. Super Admin is not editable. |
| PATCH | `/api/admin/settings` | `settings.manage` | Key/value runtime configuration. |
| POST | `/api/admin/notifications/test` | `settings.manage` | Queues a test email and reports transport status without echoing credentials. |

---

## Research

| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/api/research/export` | `analytics.export` + approved researcher flag | `{dataset, format}` where format is `csv` or `json`. 10 / hour / IP. Every export writes an `ExportLog` row and an audit entry. |

Datasets: `election_results`, `candidate_ratings`, `issue_categories`,
`issue_response_times`, `promise_progress`, `constituency_profile`.

Every dataset is aggregated or de-identified by construction. None contains email
addresses, reporter identities, individual rater identities, passwords or tokens.

---

## Rate limits

| Bucket | Limit | Window |
|---|---|---|
| login | 8 | 15 min |
| register | 5 | 1 hour |
| password reset (request and redeem) | 5 | 1 hour |
| complaint create | 5 | 1 hour |
| rating | 20 | 1 hour |
| poll vote | 30 | 1 hour |
| public tracking read | 300 | 1 min |
| dataset export | 10 | 1 hour |

Keyed on client IP. A `429` carries `Retry-After`. The limiter is in-process — move
it to Redis before running more than one instance.
