import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, EmptyState, Meter, Stat } from "@/components/ui";
import { formatNumber, humanize } from "@/lib/format";

export const metadata = { title: "Analytics" };

/** Public civic dashboard. Aggregates only — no citizen identifiers. */
export default async function AnalyticsPage() {
  const [
    issuesByStatus,
    issuesByCategory,
    issuesByDistrict,
    promiseStatus,
    ratingCount,
    candidateCount,
    verifiedCandidates,
    resolvedTimes,
  ] = await Promise.all([
    prisma.complaint.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.complaint.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.complaint.groupBy({
      by: ["district"],
      _count: { _all: true },
      where: { district: { not: null } },
    }),
    prisma.promise.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.rating.count({ where: { status: "VISIBLE" } }),
    prisma.candidate.count(),
    prisma.candidate.count({ where: { verificationStatus: "VERIFIED" } }),
    prisma.complaint.findMany({
      where: { resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
      take: 5000,
    }),
  ]);

  const totalIssues = issuesByStatus.reduce((sum, row) => sum + row._count._all, 0);
  const resolved =
    (issuesByStatus.find((row) => row.status === "RESOLVED")?._count._all ?? 0) +
    (issuesByStatus.find((row) => row.status === "CLOSED")?._count._all ?? 0);

  const durations = resolvedTimes
    .filter((row) => row.resolvedAt)
    .map((row) => (row.resolvedAt!.getTime() - row.createdAt.getTime()) / 3_600_000);
  const meanHours =
    durations.length > 0
      ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10
      : null;

  const topCategories = [...issuesByCategory]
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 8);
  const topDistricts = [...issuesByDistrict]
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 8);
  const maxCategory = topCategories[0]?._count._all ?? 1;
  const maxDistrict = topDistricts[0]?._count._all ?? 1;
  const promiseTotal = promiseStatus.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <div className="wrap section">
      <h1>Civic analytics</h1>
      <p className="muted">
        Aggregated platform activity. Individual citizens, reporters and raters are never
        identifiable in these figures.
      </p>

      <div className="grid grid-4">
        <Stat label="Citizen issues" value={formatNumber(totalIssues)} />
        <Stat
          label="Resolution rate"
          value={totalIssues === 0 ? "—" : `${Math.round((resolved / totalIssues) * 100)}%`}
          accent="green"
        />
        <Stat
          label="Mean time to resolve"
          value={meanHours === null ? "—" : `${meanHours} h`}
          accent="orange"
        />
        <Stat label="Ratings submitted" value={formatNumber(ratingCount)} accent="purple" />
      </div>

      <div className="grid grid-2" style={{ marginTop: "1.2rem" }}>
        <Card title="Issues by status">
          {issuesByStatus.length === 0 ? (
            <EmptyState title="No issues yet" />
          ) : (
            issuesByStatus.map((row) => (
              <div className="bar-row" key={row.status} style={{ marginBottom: ".4rem" }}>
                <span className="small">{humanize(row.status)}</span>
                <Meter
                  value={row._count._all}
                  max={totalIssues}
                  tone={row.status === "RESOLVED" || row.status === "CLOSED" ? "good" : "warn"}
                />
                <span className="small faint">{row._count._all}</span>
              </div>
            ))
          )}
        </Card>

        <Card title="Issues by category">
          {topCategories.length === 0 ? (
            <EmptyState title="No issues yet" />
          ) : (
            topCategories.map((row) => (
              <div className="bar-row" key={row.category} style={{ marginBottom: ".4rem" }}>
                <span className="small">{row.category}</span>
                <Meter value={row._count._all} max={maxCategory} />
                <span className="small faint">{row._count._all}</span>
              </div>
            ))
          )}
        </Card>

        <Card title="Issues by district">
          {topDistricts.length === 0 ? (
            <EmptyState title="No location data yet" />
          ) : (
            topDistricts.map((row) => (
              <div className="bar-row" key={row.district} style={{ marginBottom: ".4rem" }}>
                <span className="small">{row.district}</span>
                <Meter value={row._count._all} max={maxDistrict} />
                <span className="small faint">{row._count._all}</span>
              </div>
            ))
          )}
        </Card>

        <Card title="Promise progress">
          {promiseTotal === 0 ? (
            <EmptyState title="No promises tracked yet" />
          ) : (
            promiseStatus.map((row) => (
              <div className="bar-row" key={row.status} style={{ marginBottom: ".4rem" }}>
                <span className="small">{humanize(row.status)}</span>
                <Meter
                  value={row._count._all}
                  max={promiseTotal}
                  tone={row.status === "COMPLETED" ? "good" : row.status === "DELAYED" ? "red" : undefined}
                />
                <span className="small faint">{row._count._all}</span>
              </div>
            ))
          )}
        </Card>
      </div>

      <Card title="Data quality" className="section-tight">
        <div className="grid grid-3">
          <Stat label="Candidates recorded" value={formatNumber(candidateCount)} />
          <Stat label="Editorially verified" value={formatNumber(verifiedCandidates)} accent="green" />
          <Stat
            label="Verification coverage"
            value={
              candidateCount === 0
                ? "—"
                : `${Math.round((verifiedCandidates / candidateCount) * 100)}%`
            }
          />
        </div>
      </Card>

      <div className="notice notice-purple" style={{ marginTop: "1rem" }}>
        Researchers can request approved access to dataset exports and an API.{" "}
        <Link href="/portal/researcher">Open the researcher portal</Link>.
      </div>
    </div>
  );
}
