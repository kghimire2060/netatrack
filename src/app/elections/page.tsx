import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, EmptyState, Stat } from "@/components/ui";
import { ElectionBadge } from "@/components/status";
import { formatDate, formatNumber, humanize } from "@/lib/format";

export const metadata = { title: "Elections" };

export default async function ElectionsPage() {
  const elections = await prisma.election.findMany({
    orderBy: [{ year: "desc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      year: true,
      status: true,
      electionDate: true,
      totalSeats: true,
      sourceName: true,
      _count: { select: { candidacies: true, results: true } },
    },
  });

  const active = elections.filter((election) =>
    ["UPCOMING", "ACTIVE", "COUNTING"].includes(election.status)
  );

  return (
    <div className="wrap section">
      <h1>Elections</h1>
      <p className="muted">
        Election metadata, schedules, candidate registration and official results. Every result
        record shows its source and last update time.
      </p>

      <div className="grid grid-3">
        <Stat label="Elections recorded" value={formatNumber(elections.length)} />
        <Stat label="Current or upcoming" value={formatNumber(active.length)} accent="orange" />
        <Stat
          label="Results published"
          value={formatNumber(elections.reduce((sum, election) => sum + election._count.results, 0))}
          accent="green"
        />
      </div>

      <div className="stack" style={{ marginTop: "1.2rem" }}>
        {elections.length === 0 ? (
          <Card>
            <EmptyState title="No elections have been recorded yet" />
          </Card>
        ) : (
          elections.map((election) => (
            <Card key={election.id}>
              <div className="row-between">
                <div>
                  <div className="row" style={{ gap: ".5rem" }}>
                    <h3 style={{ margin: 0 }}>
                      <Link href={`/elections/${election.slug}`}>{election.name}</Link>
                    </h3>
                    <ElectionBadge status={election.status} />
                  </div>
                  <p className="small muted" style={{ margin: ".25rem 0 0" }}>
                    {humanize(election.type)} · {election.year}
                    {election.electionDate ? ` · Polling ${formatDate(election.electionDate)}` : ""}
                    {election.totalSeats ? ` · ${formatNumber(election.totalSeats)} seats` : ""}
                  </p>
                  <p className="small faint" style={{ margin: ".15rem 0 0" }}>
                    {formatNumber(election._count.candidacies)} candidacies ·{" "}
                    {formatNumber(election._count.results)} result records
                    {election.sourceName ? ` · Source: ${election.sourceName}` : ""}
                  </p>
                </div>
                <Link className="btn btn-sm btn-ghost" href={`/elections/${election.slug}`}>
                  Open
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
