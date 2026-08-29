import type { ComplaintStatus, ContentStatus, FactCheckVerdict, PromiseStatus, VerificationStatus, ElectionStatus, ClaimStatus, AccountStatus } from "@prisma/client";
import { Badge, type Tone } from "./ui";
import { humanize } from "@/lib/format";

const COMPLAINT_TONE: Record<ComplaintStatus, Tone> = {
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

const PROMISE_TONE: Record<PromiseStatus, Tone> = {
  NOT_STARTED: "muted",
  IN_PROGRESS: "warn",
  COMPLETED: "good",
  DELAYED: "bad",
  CANCELLED: "muted",
  UNABLE_TO_VERIFY: "purple",
};

const VERDICT_TONE: Record<FactCheckVerdict, Tone> = {
  TRUE: "good",
  MOSTLY_TRUE: "good",
  MISLEADING: "warn",
  FALSE: "bad",
  UNVERIFIED: "muted",
  INSUFFICIENT_EVIDENCE: "muted",
};

const VERIFICATION_TONE: Record<VerificationStatus, Tone> = {
  PENDING: "warn",
  VERIFIED: "good",
  REJECTED: "bad",
};

const ELECTION_TONE: Record<ElectionStatus, Tone> = {
  UPCOMING: "info",
  ACTIVE: "warn",
  COUNTING: "warn",
  COMPLETED: "good",
  CANCELLED: "muted",
};

const CONTENT_TONE: Record<ContentStatus, Tone> = {
  DRAFT: "muted",
  EDITORIAL_REVIEW: "warn",
  SOURCE_REVIEW: "warn",
  APPROVED: "info",
  PUBLISHED: "good",
  ARCHIVED: "muted",
};

const CLAIM_TONE: Record<ClaimStatus, Tone> = {
  SUBMITTED: "info",
  UNDER_REVIEW: "warn",
  APPROVED: "good",
  REJECTED: "bad",
};

const ACCOUNT_TONE: Record<AccountStatus, Tone> = {
  PENDING: "warn",
  ACTIVE: "good",
  SUSPENDED: "bad",
  LOCKED: "bad",
  DELETED: "muted",
};

export const ComplaintBadge = ({ status }: { status: ComplaintStatus }) => (
  <Badge tone={COMPLAINT_TONE[status]}>{humanize(status)}</Badge>
);
export const PromiseBadge = ({ status }: { status: PromiseStatus }) => (
  <Badge tone={PROMISE_TONE[status]}>{humanize(status)}</Badge>
);
export const VerdictBadge = ({ verdict }: { verdict: FactCheckVerdict }) => (
  <Badge tone={VERDICT_TONE[verdict]}>{humanize(verdict)}</Badge>
);
export const VerificationBadge = ({ status }: { status: VerificationStatus }) => (
  <Badge tone={VERIFICATION_TONE[status]}>{humanize(status)}</Badge>
);
export const ElectionBadge = ({ status }: { status: ElectionStatus }) => (
  <Badge tone={ELECTION_TONE[status]}>{humanize(status)}</Badge>
);
export const ContentBadge = ({ status }: { status: ContentStatus }) => (
  <Badge tone={CONTENT_TONE[status]}>{humanize(status)}</Badge>
);
export const ClaimBadge = ({ status }: { status: ClaimStatus }) => (
  <Badge tone={CLAIM_TONE[status]}>{humanize(status)}</Badge>
);
export const AccountBadge = ({ status }: { status: AccountStatus }) => (
  <Badge tone={ACCOUNT_TONE[status]}>{humanize(status)}</Badge>
);

export { COMPLAINT_TONE };
