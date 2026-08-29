import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { Card, EmptyState, Stat } from "@/components/ui";
import { ClaimBadge, ComplaintBadge, ContentBadge } from "@/components/status";
import { smtpConfigured } from "@/lib/email";
import { formatDateTime, humanize, relativeTime } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";
import { enumLabel } from "@/lib/i18n";

export const metadata = { title: "Admin dashboard" };

export default async function AdminDashboard() {
  const actor = await requireActorPage("/admin");
  const { t, locale } = await getTranslator();
  const seesAll = await can({ userId: actor.userId, role: actor.role }, "complaint.view.all");

  const queueScope = seesAll ? {} : { assignedToId: actor.userId };

  const [
    openIssues,
    overdueIssues,
    unassigned,
    resolvedToday,
    pendingClaims,
    pendingCandidates,
    draftContent,
    flaggedRatings,
    failedEmails,
    recentQueue,
    recentAudit,
    reopenRequests,
  ] = await Promise.all([
    prisma.complaint.count({ where: { ...queueScope, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    prisma.complaint.count({
      where: {
        ...queueScope,
        status: { notIn: ["RESOLVED", "CLOSED"] },
        expectedUpdateAt: { lt: new Date() },
      },
    }),
    prisma.complaint.count({ where: { assignedToId: null, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    prisma.complaint.count({
      where: { resolvedAt: { gte: new Date(Date.now() - 86_400_000) } },
    }),
    prisma.candidateClaim.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.candidate.count({ where: { verificationStatus: "PENDING" } }),
    prisma.newsArticle.count({ where: { status: { notIn: ["PUBLISHED", "ARCHIVED"] } } }),
    prisma.rating.count({ where: { status: "FLAGGED" } }),
    prisma.notification.count({ where: { status: "FAILED" } }),
    prisma.complaint.findMany({
      where: { ...queueScope, status: { notIn: ["CLOSED"] } },
      orderBy: [{ expectedUpdateAt: "asc" }, { updatedAt: "desc" }],
      take: 8,
      select: {
        id: true,
        trackingId: true,
        title: true,
        status: true,
        priority: true,
        expectedUpdateAt: true,
        assignedTo: { select: { fullName: true } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        result: true,
        targetType: true,
        createdAt: true,
        actor: { select: { fullName: true } },
      },
    }),
    prisma.complaint.count({ where: { reopenRequested: true } }),
  ]);

  return (
    <>
      <div className="row-between">
        <div>
          <h1>{t("adm.dashboard")}</h1>
          <p className="muted">
            {seesAll ? t("adm.allQueues") : t("adm.yourQueue")} · {t("adm.signedInAs")}{" "}
            {actor.fullName} ({enumLabel(actor.role, locale)})
          </p>
        </div>
      </div>

      <div className="grid grid-4">
        <Stat label={t("adm.openIssues")} value={openIssues} />
        <Stat label={t("adm.overdue")} value={overdueIssues} accent={overdueIssues > 0 ? "red" : undefined} />
        <Stat label={t("adm.unassigned")} value={unassigned} accent="orange" />
        <Stat label={t("adm.resolved24")} value={resolvedToday} accent="green" />
      </div>

      <div className="grid grid-4" style={{ marginTop: "1rem" }}>
        <Stat label={t("adm.pendingClaims")} value={pendingClaims} accent="purple" />
        <Stat label={t("adm.awaitingVerification")} value={pendingCandidates} />
        <Stat label={t("adm.contentInReview")} value={draftContent} />
        <Stat label={t("adm.flaggedRatings")} value={flaggedRatings} accent={flaggedRatings > 0 ? "red" : undefined} />
      </div>

      {(failedEmails > 0 || reopenRequests > 0 || !smtpConfigured()) && (
        <div className="stack" style={{ marginTop: "1rem" }}>
          {!smtpConfigured() ? (
            <div className="alert alert-warn">
              <strong>SMTP is not configured.</strong> Transactional email is being written to the
              notification log and printed to the server console instead of being delivered. Set the
              SMTP_* environment variables before launch.
            </div>
          ) : null}
          {failedEmails > 0 ? (
            <div className="alert alert-error">
              {failedEmails} notification{failedEmails === 1 ? "" : "s"} failed to send.{" "}
              <Link href="/admin/notifications">Review the delivery log</Link>.
            </div>
          ) : null}
          {reopenRequests > 0 ? (
            <div className="alert alert-warn">
              {reopenRequests} citizen{reopenRequests === 1 ? " has" : "s have"} requested that a
              resolved issue be reopened.{" "}
              <Link href="/admin/complaints?reopen=1">Review requests</Link>.
            </div>
          ) : null}
        </div>
      )}

      <div className="grid grid-sidebar" style={{ marginTop: "1.2rem" }}>
        <Card
          title={t("adm.issueQueue")}
          action={
            <Link className="small" href="/admin/complaints">
              Open queue
            </Link>
          }
        >
          {recentQueue.length === 0 ? (
            <EmptyState title={t("adm.nothingInQueue")} />
          ) : (
            <div className="table-wrap">
              <table className="data responsive">
                <thead>
                  <tr>
                    <th>{t("adm.trackingId")}</th>
                    <th>{t("adm.issue")}</th>
                    <th>{t("adm.status")}</th>
                    <th>{t("adm.assignee")}</th>
                    <th>{t("adm.due")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentQueue.map((issue) => {
                    const overdue =
                      issue.expectedUpdateAt !== null && issue.expectedUpdateAt < new Date();
                    return (
                      <tr key={issue.id}>
                        <td data-label="Tracking ID">
                          <Link className="mono" href={`/admin/complaints/${issue.id}`}>
                            {issue.trackingId}
                          </Link>
                        </td>
                        <td data-label="Issue">{issue.title}</td>
                        <td data-label="Status">
                          <ComplaintBadge status={issue.status} />
                        </td>
                        <td data-label="Assignee">
                          {issue.assignedTo?.fullName ?? <span className="faint">Unassigned</span>}
                        </td>
                        <td data-label="Due">
                          <span style={overdue ? { color: "var(--red)", fontWeight: 700 } : undefined}>
                            {issue.expectedUpdateAt ? relativeTime(issue.expectedUpdateAt) : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <aside className="stack">
          <Card
            title={t("adm.recentActivity")}
            action={
              <Link className="small" href="/admin/audit">
                Audit log
              </Link>
            }
          >
            <ul className="timeline">
              {recentAudit.map((entry) => (
                <li key={entry.id} className={entry.result === "SUCCESS" ? "" : "is-warn"}>
                  <div className="when">{formatDateTime(entry.createdAt)}</div>
                  <div className="what small">{entry.action}</div>
                  <div className="small faint">
                    {entry.actor?.fullName ?? "System"}
                    {entry.targetType ? ` · ${entry.targetType}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={t("adm.pendingReview")}>
            <ul className="small" style={{ paddingLeft: "1.1rem", margin: 0 }}>
              <li>
                <Link href="/admin/claims">{pendingClaims} candidate profile claims</Link>{" "}
                <ClaimBadge status="SUBMITTED" />
              </li>
              <li>
                <Link href="/admin/candidates?verification=PENDING">
                  {pendingCandidates} candidate records unverified
                </Link>
              </li>
              <li>
                <Link href="/admin/news">{draftContent} articles in the editorial pipeline</Link>{" "}
                <ContentBadge status="EDITORIAL_REVIEW" />
              </li>
              <li>
                <Link href="/admin/ratings">{flaggedRatings} ratings flagged for moderation</Link>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
