import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { Card, EmptyState, Stat } from "@/components/ui";
import { ElectionBadge } from "@/components/status";
import { formatDate, formatNumber, humanize } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";
import { enumLabel } from "@/lib/i18n";

export const metadata = { title: "Elections" };

export default async function AdminElectionsPage() {
  const actor = await requireActorPage("/admin/elections");
  const { t, locale } = await getTranslator();
  if (!(await can({ userId: actor.userId, role: actor.role }, "election.manage"))) redirect("/admin");

  const [elections, constituencies, stations, parties] = await Promise.all([
    prisma.election.findMany({
      orderBy: { year: "desc" },
      include: {
        _count: { select: { candidacies: true, results: true, events: true } },
      },
    }),
    prisma.constituency.count(),
    prisma.pollingStation.count(),
    prisma.party.count(),
  ]);

  return (
    <>
      <h1>{t("adm.elections")}</h1>
      <p className="muted">
        Elections, constituencies, polling stations and candidate nominations. Results are managed
        on the <Link href="/admin/results">results screen</Link>.
      </p>

      <div className="grid grid-4">
        <Stat label={t("adm.elections")} value={elections.length} />
        <Stat label={t("con.title")} value={formatNumber(constituencies)} />
        <Stat label={t("con.pollingStations")} value={formatNumber(stations)} />
        <Stat label={t("cand.party")} value={formatNumber(parties)} accent="purple" />
      </div>

      {elections.length === 0 ? (
        <Card className="section-tight">
          <EmptyState title="No elections recorded" hint="Seed the database or add an election record." />
        </Card>
      ) : (
        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data responsive">
            <thead>
              <tr>
                <th>Election</th>
                <th>Type</th>
                <th>Status</th>
                <th>Polling day</th>
                <th className="num">Seats</th>
                <th className="num">Candidacies</th>
                <th className="num">Results</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {elections.map((election) => (
                <tr key={election.id}>
                  <td data-label="Election">
                    <Link href={`/elections/${election.slug}`}>{election.name}</Link>
                    <div className="small faint">{election.year}</div>
                  </td>
                  <td data-label="Type">{enumLabel(election.type, locale)}</td>
                  <td data-label="Status">
                    <ElectionBadge status={election.status} />
                  </td>
                  <td data-label="Polling day">{formatDate(election.electionDate)}</td>
                  <td className="num" data-label="Seats">
                    {formatNumber(election.totalSeats)}
                  </td>
                  <td className="num" data-label="Candidacies">
                    {election._count.candidacies}
                  </td>
                  <td className="num" data-label="Results">
                    {election._count.results}
                  </td>
                  <td data-label="Source">
                    {election.sourceUrl ? (
                      <a href={election.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                        {election.sourceName ?? "Source"}
                      </a>
                    ) : (
                      (election.sourceName ?? <span className="faint">Not recorded</span>)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
