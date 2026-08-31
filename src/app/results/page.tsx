import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentElection, listElections } from "@/lib/elections";
import { Badge, Card, EmptyState, Meter, Stat } from "@/components/ui";
import { formatDateTime, formatNumber, formatPercent, humanize } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";

export const metadata = { title: "Results" };

/** Official result dashboard (section 11). */
export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ election?: string }>;
}) {
  const { t } = await getTranslator();
  const params = await searchParams;

  const [elections, current] = await Promise.all([listElections(), getCurrentElection()]);

  // Default to the election the rest of the site treats as current, rather
  // than whichever row happens to sort first — that could be an archived or
  // unverified record.
  const selectedSlug = params.election ?? current?.slug ?? elections[0]?.slug;
  const election = selectedSlug
    ? await prisma.election.findUnique({
        where: { slug: selectedSlug },
        select: { id: true, name: true, status: true, totalSeats: true, sourceName: true, sourceUrl: true },
      })
    : null;

  const results = election
    ? await prisma.result.findMany({
        where: { electionId: election.id, status: "VERIFIED" },
        include: {
          candidate: { select: { fullName: true, slug: true } },
          party: { select: { name: true, shortName: true, colorHex: true } },
          constituency: { select: { name: true, district: true, slug: true } },
        },
        orderBy: [{ isWinner: "desc" }, { votes: "desc" }],
      })
    : [];

  const winners = results.filter((result) => result.isWinner);
  const byParty = new Map<string, number>();
  for (const winner of winners) {
    const name = winner.party?.shortName ?? winner.party?.name ?? "Independent";
    byParty.set(name, (byParty.get(name) ?? 0) + 1);
  }
  const partySeats = [...byParty.entries()].sort((a, b) => b[1] - a[1]);

  const totalVotes = results.reduce((sum, result) => sum + result.votes, 0);
  const turnouts = results.map((r) => r.turnoutPct).filter((v): v is number => v !== null);
  const averageTurnout =
    turnouts.length > 0 ? turnouts.reduce((sum, value) => sum + value, 0) / turnouts.length : null;
  const lastUpdated = results.reduce<Date | null>(
    (latest, result) => (!latest || result.updatedAt > latest ? result.updatedAt : latest),
    null
  );

  return (
    <div className="wrap section">
      <h1>{t("res.title")}</h1>
      <p className="muted">{t("res.lede")}</p>

      {elections.length === 0 ? (
        <Card>
          <EmptyState title="No elections recorded yet" />
        </Card>
      ) : (
        <>
          <div className="chip-row" style={{ marginBottom: "1rem" }}>
            {elections.map((item) => (
              <Link
                key={item.slug}
                href={`/results?election=${item.slug}`}
                className={`chip${item.slug === selectedSlug ? " active" : ""}`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {election ? (
            <>
              <div className="grid grid-4">
                <Stat label={t("res.totalSeats")} value={formatNumber(election.totalSeats)} />
                <Stat label={t("res.declared")} value={formatNumber(winners.length)} accent="green" />
                <Stat label={t("res.votesCounted")} value={formatNumber(totalVotes)} />
                <Stat
                  label={t("res.turnout")}
                  value={averageTurnout === null ? "—" : formatPercent(averageTurnout)}
                  accent="orange"
                />
              </div>

              <div className="notice notice-blue" style={{ marginTop: "1rem" }}>
                <strong>Counting status: {humanize(election.status)}.</strong> Source:{" "}
                {election.sourceName ?? "not recorded"}
                {election.sourceUrl ? (
                  <>
                    {" "}
                    (<a href={election.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">link</a>)
                  </>
                ) : null}
                . Last updated {formatDateTime(lastUpdated)}.
              </div>

              <div className="grid grid-sidebar" style={{ marginTop: "1rem" }}>
                <Card title={t("res.declaredResults")}>
                  {results.length === 0 ? (
                    <EmptyState title={t("res.noneYet")} />
                  ) : (
                    <div className="table-wrap">
                      <table className="data responsive">
                        <thead>
                          <tr>
                            <th>Constituency</th>
                            <th>Candidate</th>
                            <th>Party</th>
                            <th className="num">Votes</th>
                            <th>Vote share</th>
                            <th className="num">Turnout</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((result) => (
                            <tr key={result.id}>
                              <td data-label="Constituency">
                                <Link href={`/constituencies/${result.constituency.slug}`}>
                                  {result.constituency.name}
                                </Link>
                                <div className="small faint">{result.constituency.district}</div>
                              </td>
                              <td data-label="Candidate">
                                <Link href={`/candidates/${result.candidate.slug}`}>
                                  {result.candidate.fullName}
                                </Link>
                                {result.isWinner ? (
                                  <>
                                    {" "}
                                    <Badge tone="good">Elected</Badge>
                                  </>
                                ) : null}
                              </td>
                              <td data-label="Party">
                                {result.party?.shortName ?? result.party?.name ?? "Independent"}
                              </td>
                              <td className="num" data-label="Votes">
                                {formatNumber(result.votes)}
                              </td>
                              <td data-label="Vote share">
                                <div className="row" style={{ gap: ".4rem" }}>
                                  <span className="small" style={{ minWidth: "3.2rem" }}>
                                    {formatPercent(result.voteShare)}
                                  </span>
                                  <span style={{ flex: 1, minWidth: "70px" }}>
                                    <Meter
                                      value={result.voteShare ?? 0}
                                      tone={result.isWinner ? "good" : undefined}
                                    />
                                  </span>
                                </div>
                              </td>
                              <td className="num" data-label="Turnout">
                                {formatPercent(result.turnoutPct)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                <aside className="stack">
                  <Card title={t("res.byParty")}>
                    {partySeats.length === 0 ? (
                      <p className="small muted">No seats declared yet.</p>
                    ) : (
                      partySeats.map(([party, seats]) => (
                        <div className="bar-row" key={party} style={{ marginBottom: ".4rem" }}>
                          <span className="small">{party}</span>
                          <Meter value={seats} max={winners.length} />
                          <span className="small faint">{seats}</span>
                        </div>
                      ))
                    )}
                  </Card>

                  <div className="notice">
                    NetaTrack is not an election authority. Where an official figure differs from
                    what is shown here, the authority&apos;s published record is definitive.
                  </div>
                </aside>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
