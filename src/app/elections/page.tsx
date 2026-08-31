import Link from "next/link";
import { listElections } from "@/lib/elections";
import { Card, EmptyState, Stat } from "@/components/ui";
import { ElectionBadge } from "@/components/status";
import { SourceLine, VerifiedBadge } from "@/components/dashboard/trust";
import { formatDate, formatNumber, humanize } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";

export const metadata = { title: "Elections" };

export default async function ElectionsPage() {
  const { t } = await getTranslator();
  // Read through the shared service so this page and the homepage can never
  // disagree about which elections exist or how they rank.
  const elections = await listElections();

  // ACTIVE is the deprecated spelling of LIVE; both are counted so legacy rows
  // are not silently dropped from the tally.
  const active = elections.filter((election) =>
    ["UPCOMING", "LIVE", "ACTIVE", "COUNTING"].includes(election.status)
  );

  return (
    <div className="wrap section">
      <h1>{t("elec.title")}</h1>
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
                    <VerifiedBadge tier={election.tier} t={t} />
                  </div>
                  <p className="small muted" style={{ margin: ".25rem 0 0" }}>
                    {humanize(election.type)} · {election.year}
                    {election.electionDate ? ` · Polling ${formatDate(election.electionDate)}` : ""}
                    {election.totalSeats ? ` · ${formatNumber(election.totalSeats)} seats` : ""}
                  </p>
                  <p className="small faint" style={{ margin: ".15rem 0 0" }}>
                    {formatNumber(election._count.candidacies)} · {formatNumber(election._count.results)}
                  </p>
                  <div style={{ marginTop: ".25rem" }}>
                    <SourceLine
                      t={t}
                      sourceName={election.sourceName}
                      sourceUrl={election.sourceUrl}
                      verifiedAt={election.verifiedAt}
                    />
                  </div>
                  {election.tier !== "OFFICIAL" && election.verifiedNote ? (
                    <div className="historical-note" style={{ marginTop: ".5rem" }}>
                      {election.verifiedNote}
                    </div>
                  ) : null}
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
