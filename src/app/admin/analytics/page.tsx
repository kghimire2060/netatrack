import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { Card, EmptyState, Meter, Stat } from "@/components/ui";
import { formatNumber, humanize } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";
import { enumLabel } from "@/lib/i18n";

export const metadata = { title: "Analytics" };

/** Operational analytics for staff and administrators (section 14, 15). */
export default async function AdminAnalyticsPage() {
  const actor = await requireActorPage("/admin/analytics");
  const { t, locale } = await getTranslator();
  if (!(await can({ userId: actor.userId, role: actor.role }, "analytics.view"))) redirect("/admin");

  const [
    byStatus,
    byCategory,
    byAssignee,
    resolvedSample,
    overdue,
    ratingsByCandidate,
    exportsRecent,
    userGrowth,
  ] = await Promise.all([
    prisma.complaint.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.complaint.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.complaint.groupBy({
      by: ["assignedToId"],
      _count: { _all: true },
      where: { assignedToId: { not: null }, status: { notIn: ["RESOLVED", "CLOSED"] } },
    }),
    prisma.complaint.findMany({
      where: { resolvedAt: { not: null } },
      select: { createdAt: true, verifiedAt: true, resolvedAt: true, category: true },
      take: 5000,
    }),
    prisma.complaint.count({
      where: { expectedUpdateAt: { lt: new Date() }, status: { notIn: ["RESOLVED", "CLOSED"] } },
    }),
    prisma.rating.groupBy({ by: ["candidateId"], _count: { _all: true }, where: { status: "VISIBLE" } }),
    prisma.exportLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { fullName: true } } },
    }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);

  const assigneeIds = byAssignee.map((row) => row.assignedToId!).filter(Boolean);
  const assignees = await prisma.user.findMany({
    where: { id: { in: assigneeIds } },
    select: { id: true, fullName: true },
  });

  const total = byStatus.reduce((sum, row) => sum + row._count._all, 0);
  const hours = (from: Date, to: Date) => (to.getTime() - from.getTime()) / 3_600_000;
  const resolveTimes = resolvedSample.map((row) => hours(row.createdAt, row.resolvedAt!));
  const verifyTimes = resolvedSample
    .filter((row) => row.verifiedAt)
    .map((row) => hours(row.createdAt, row.verifiedAt!));
  const mean = (values: number[]) =>
    values.length === 0
      ? null
      : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;

  const maxCategory = Math.max(1, ...byCategory.map((row) => row._count._all));
  const maxAssignee = Math.max(1, ...byAssignee.map((row) => row._count._all));

  return (
    <>
      <h1>{t("adm.analytics")}</h1>
      <p className="muted">
        Queue health, response performance and platform activity. Figures are aggregates; no citizen
        is identifiable here.
      </p>

      <div className="grid grid-4">
        <Stat label={t("adm.issue")} value={formatNumber(total)} />
        <Stat label={t("adm.overdue")} value={overdue} accent={overdue > 0 ? "red" : undefined} />
        <Stat
          label="Mean hours to verify"
          value={mean(verifyTimes) ?? "—"}
          accent="orange"
        />
        <Stat label="Mean hours to resolve" value={mean(resolveTimes) ?? "—"} accent="green" />
      </div>

      <div className="grid grid-2" style={{ marginTop: "1.2rem" }}>
        <Card title="Queue by status">
          {byStatus.map((row) => (
            <div className="bar-row" key={row.status} style={{ marginBottom: ".4rem" }}>
              <span className="small">{enumLabel(row.status, locale)}</span>
              <Meter
                value={row._count._all}
                max={total || 1}
                tone={row.status === "RESOLVED" || row.status === "CLOSED" ? "good" : "warn"}
              />
              <span className="small faint">{row._count._all}</span>
            </div>
          ))}
        </Card>

        <Card title="Open workload by assignee">
          {byAssignee.length === 0 ? (
            <EmptyState title="Nothing currently assigned" />
          ) : (
            byAssignee
              .sort((a, b) => b._count._all - a._count._all)
              .map((row) => (
                <div className="bar-row" key={row.assignedToId} style={{ marginBottom: ".4rem" }}>
                  <span className="small">
                    {assignees.find((user) => user.id === row.assignedToId)?.fullName ?? "Unknown"}
                  </span>
                  <Meter value={row._count._all} max={maxAssignee} />
                  <span className="small faint">{row._count._all}</span>
                </div>
              ))
          )}
        </Card>

        <Card title="Issues by category">
          {byCategory
            .sort((a, b) => b._count._all - a._count._all)
            .slice(0, 10)
            .map((row) => (
              <div className="bar-row" key={row.category} style={{ marginBottom: ".4rem" }}>
                <span className="small">{row.category}</span>
                <Meter value={row._count._all} max={maxCategory} />
                <span className="small faint">{row._count._all}</span>
              </div>
            ))}
        </Card>

        <Card title="Accounts by role">
          {userGrowth.map((row) => (
            <div className="bar-row" key={row.role} style={{ marginBottom: ".4rem" }}>
              <span className="small">{enumLabel(row.role, locale)}</span>
              <Meter
                value={row._count._all}
                max={Math.max(1, ...userGrowth.map((item) => item._count._all))}
              />
              <span className="small faint">{row._count._all}</span>
            </div>
          ))}
        </Card>
      </div>

      <div className="grid grid-2" style={{ marginTop: "1rem" }}>
        <Card title="Rating participation">
          <dl className="kv">
            <dt>Candidates with ratings</dt>
            <dd>{ratingsByCandidate.length}</dd>
            <dt>Visible ratings</dt>
            <dd>{formatNumber(ratingsByCandidate.reduce((sum, row) => sum + row._count._all, 0))}</dd>
            <dt>Most-rated candidate count</dt>
            <dd>{formatNumber(Math.max(0, ...ratingsByCandidate.map((row) => row._count._all)))}</dd>
          </dl>
        </Card>

        <Card title="Recent dataset exports">
          {exportsRecent.length === 0 ? (
            <EmptyState title="No exports recorded" />
          ) : (
            <ul className="small" style={{ paddingLeft: "1.1rem", margin: 0 }}>
              {exportsRecent.map((entry) => (
                <li key={entry.id}>
                  {entry.user.fullName} — {entry.dataset} ({formatNumber(entry.rowCount)} rows,{" "}
                  {entry.format})
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
