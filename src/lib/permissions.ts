/**
 * The permission catalog (source of truth for permission *names*).
 *
 * The role -> permission mapping is stored in the database (RolePermission) so
 * an administrator can re-scope a role without a deploy; `DEFAULT_ROLE_MATRIX`
 * below is what the seed writes on first run and what `rbac.ts` falls back to
 * if the table has not been populated yet.
 *
 * Matches the access matrix in section 5 of the proposal.
 */

export const PERMISSIONS = {
  // users, roles, security
  "user.view": "View user accounts",
  "user.edit": "Edit user accounts",
  "user.suspend": "Suspend or reactivate a user account",
  "user.role.assign": "Assign roles to users",
  "role.manage": "Create roles and assign permissions",
  "settings.manage": "Manage system configuration",
  "audit.view.all": "View all audit logs",

  // candidates
  "candidate.view": "View candidate records",
  "candidate.create": "Create candidate records",
  "candidate.edit": "Edit permitted candidate fields",
  "candidate.edit.own": "Edit own claimed candidate profile",
  "candidate.verify": "Approve or verify candidate information",
  "candidate.claim.review": "Review candidate profile claim requests",
  "candidate.delete": "Delete candidate records",

  // elections
  "election.view": "View elections",
  "election.manage": "Create and edit elections, constituencies, polling stations",
  "result.view": "View election results",
  "result.manage": "Enter and edit election results",
  "result.publish": "Publish or verify official results",

  // complaints
  "complaint.create": "Submit a citizen issue",
  "complaint.view.own": "View own submitted issues",
  "complaint.view.assigned": "View issues assigned to me",
  "complaint.view.all": "View all issues including internal notes",
  "complaint.verify": "Verify a submitted issue",
  "complaint.assign": "Assign an issue to staff or a department",
  "complaint.update": "Post progress updates on an issue",
  "complaint.respond": "Post a public response on an issue",
  "complaint.resolve": "Mark an issue resolved or closed",
  "complaint.reopen": "Reopen a closed issue",

  // public opinion
  "rating.create": "Submit a candidate rating",
  "rating.moderate": "Moderate suspicious or abusive ratings",
  "poll.vote": "Vote in a public poll",
  "poll.manage": "Create and manage polls",

  // editorial
  "news.view": "View news articles",
  "news.create": "Draft news articles",
  "news.edit": "Edit news articles",
  "news.publish": "Approve and publish news",
  "factcheck.view": "View fact checks",
  "factcheck.create": "Create fact-check records",
  "factcheck.review": "Review fact-check evidence and verdicts",
  "factcheck.publish": "Publish a fact check",
  "factcheck.respond": "Attach a subject response to a fact check",

  // accountability
  "promise.view": "View manifesto promises",
  "promise.manage": "Create and update promise records",
  "performance.manage": "Maintain representative performance records",

  // analytics and research
  "analytics.view": "View operational and civic dashboards",
  "analytics.advanced": "Access researcher dashboards and datasets",
  "analytics.export": "Export approved datasets",
  "apikey.manage": "Create and revoke research API keys",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export type RoleName =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "STAFF"
  | "CITIZEN"
  | "CANDIDATE"
  | "RESEARCHER";

const CITIZEN: Permission[] = [
  "candidate.view",
  "election.view",
  "result.view",
  "news.view",
  "factcheck.view",
  "promise.view",
  "complaint.create",
  "complaint.view.own",
  "rating.create",
  "poll.vote",
];

const CANDIDATE_ROLE: Permission[] = [
  ...CITIZEN,
  "candidate.edit.own",
  "factcheck.respond",
];

const RESEARCHER: Permission[] = [
  ...CITIZEN,
  "analytics.view",
  "analytics.advanced",
  "analytics.export",
  "apikey.manage",
];

const STAFF: Permission[] = [
  "candidate.view",
  "candidate.create",
  "candidate.edit",
  "election.view",
  "result.view",
  "result.manage",
  "complaint.view.assigned",
  "complaint.verify",
  "complaint.update",
  "complaint.respond",
  "rating.moderate",
  "news.view",
  "news.create",
  "news.edit",
  "factcheck.view",
  "factcheck.create",
  "factcheck.review",
  "promise.view",
  "promise.manage",
  "analytics.view",
  "poll.vote",
  "complaint.create",
  "complaint.view.own",
];

const ADMIN: Permission[] = [
  ...STAFF,
  "user.view",
  "user.edit",
  "user.suspend",
  "user.role.assign",
  "candidate.verify",
  "candidate.claim.review",
  "candidate.delete",
  "election.manage",
  "result.publish",
  "complaint.view.all",
  "complaint.assign",
  "complaint.resolve",
  "complaint.reopen",
  "poll.manage",
  "news.publish",
  "factcheck.publish",
  "performance.manage",
  "analytics.export",
  "audit.view.all",
];

/**
 * Section 5: "No staff user should be able to grant themselves higher
 * permissions." Only SUPER_ADMIN holds role.manage and settings.manage.
 */
export const DEFAULT_ROLE_MATRIX: Record<RoleName, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: dedupe(ADMIN),
  STAFF: dedupe(STAFF),
  CITIZEN: dedupe(CITIZEN),
  CANDIDATE: dedupe(CANDIDATE_ROLE),
  RESEARCHER: dedupe(RESEARCHER),
};

function dedupe(list: Permission[]): Permission[] {
  return [...new Set(list)];
}

/** Permissions no role other than SUPER_ADMIN may ever be granted. */
export const SUPER_ADMIN_ONLY: Permission[] = ["role.manage", "settings.manage"];
