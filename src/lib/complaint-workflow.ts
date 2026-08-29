import type { ComplaintStatus } from "@prisma/client";
import type { Permission } from "./permissions";

/**
 * Complaint lifecycle (section 8).
 *
 *   Submitted → Under Review → Verified → Assigned → Acknowledged →
 *   In Progress → Awaiting Response → Resolved → Closed
 *
 * Transitions are enforced on the server. A client cannot jump a complaint
 * straight from Submitted to Closed, and each move requires a permission.
 */

export const COMPLAINT_FLOW: ComplaintStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "VERIFIED",
  "ASSIGNED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "AWAITING_RESPONSE",
  "RESOLVED",
  "CLOSED",
];

type TransitionRule = { to: ComplaintStatus[]; permission: Permission };

const RULES: Record<ComplaintStatus, TransitionRule[]> = {
  SUBMITTED: [{ to: ["UNDER_REVIEW"], permission: "complaint.update" }],
  UNDER_REVIEW: [
    { to: ["VERIFIED"], permission: "complaint.verify" },
    { to: ["CLOSED"], permission: "complaint.resolve" }, // rejected at triage
  ],
  VERIFIED: [{ to: ["ASSIGNED"], permission: "complaint.assign" }],
  ASSIGNED: [
    { to: ["ACKNOWLEDGED", "IN_PROGRESS"], permission: "complaint.update" },
    { to: ["ASSIGNED"], permission: "complaint.assign" }, // reassignment
  ],
  ACKNOWLEDGED: [{ to: ["IN_PROGRESS"], permission: "complaint.update" }],
  IN_PROGRESS: [
    { to: ["AWAITING_RESPONSE", "IN_PROGRESS"], permission: "complaint.update" },
    { to: ["RESOLVED"], permission: "complaint.resolve" },
  ],
  AWAITING_RESPONSE: [
    { to: ["IN_PROGRESS"], permission: "complaint.update" },
    { to: ["RESOLVED"], permission: "complaint.resolve" },
  ],
  RESOLVED: [
    { to: ["CLOSED"], permission: "complaint.resolve" },
    { to: ["IN_PROGRESS"], permission: "complaint.reopen" },
  ],
  CLOSED: [{ to: ["IN_PROGRESS"], permission: "complaint.reopen" }],
};

export function allowedTransitions(from: ComplaintStatus): ComplaintStatus[] {
  return [...new Set(RULES[from].flatMap((rule) => rule.to))];
}

export function permissionForTransition(
  from: ComplaintStatus,
  to: ComplaintStatus
): Permission | null {
  const rule = RULES[from].find((candidate) => candidate.to.includes(to));
  return rule?.permission ?? null;
}

export function isValidTransition(from: ComplaintStatus, to: ComplaintStatus) {
  return permissionForTransition(from, to) !== null;
}

/** What the system does when a complaint enters each state (section 8 table). */
export const STATUS_BEHAVIOUR: Record<ComplaintStatus, string> = {
  SUBMITTED: "Generate Tracking ID, save timestamp and send confirmation email.",
  UNDER_REVIEW: "Staff checks category, location, evidence and policy compliance.",
  VERIFIED: "Record verification decision and reviewer.",
  ASSIGNED: "Assign department/staff/team and notify assignee.",
  ACKNOWLEDGED: "Assigned party confirms receipt.",
  IN_PROGRESS: "Post progress updates and next expected update.",
  AWAITING_RESPONSE: "Request or record response from responsible authority.",
  RESOLVED: "Resolution note and evidence required.",
  CLOSED: "Citizen accepts closure or can request reopening under policy.",
};

/** Statuses that trigger an email to the reporter. */
export const NOTIFY_ON: ComplaintStatus[] = [
  "VERIFIED",
  "ASSIGNED",
  "IN_PROGRESS",
  "AWAITING_RESPONSE",
  "RESOLVED",
  "CLOSED",
];

export const STATUS_TONE: Record<ComplaintStatus, "info" | "warn" | "good" | "muted"> = {
  SUBMITTED: "info",
  UNDER_REVIEW: "warn",
  VERIFIED: "info",
  ASSIGNED: "info",
  ACKNOWLEDGED: "info",
  IN_PROGRESS: "warn",
  AWAITING_RESPONSE: "warn",
  RESOLVED: "good",
  CLOSED: "muted",
};
