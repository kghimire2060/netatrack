import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge, Breadcrumb, Card, EmptyState, Meter, Stat } from "@/components/ui";
import { ElectionBadge, VerificationBadge } from "@/components/status";
import { SourceLine, VerifiedBadge } from "@/components/dashboard/trust";
import { formatDate, formatDateTime, formatNumber, formatPercent, humanize } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const election = await prisma.election.findUnique({ where: { slug }, select: { name: true } });
  return { title: election?.name ?? "Election" };
}

export default async function ElectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await getTranslator();

  const election = await prisma.election.findUnique({
    where: { slug },
    include: {
      events: { orderBy: { startsAt: "asc" } },
      results: {
        where: { status: "VERIFIED" },
        include: {
          candidate: { select: { fullName: true, slug: true } },
          party: { select: { name: true, shortName: true } },
          constituency: { select: { name: true, district: true, slug: true } },
        },
        orderBy: [{ constituency: { name: "asc" } }, { votes: "desc" }],
      },
      _count: { select: { candidacies: true } },
    },
  });

  if (!election) notFound();

  const winners = election.results.filter((result) => result.isWinner);
  const totalVotes = election.results.reduce((sum, result) => sum + result.votes, 0);
  const turnouts = election.results
    .map((result) => result.turnoutPct)
    .filter((value): value is number => value !== null);
  const averageTurnout =
    turnouts.length > 0 ? turnouts.reduce((sum, value) => sum + value, 0) / turnouts.length : null;

  const byConstituency = new Map<string, typeof election.results>();
  for (const result of election.results) {
    const key = result.constituency.name;
    byConstituency.set(key, [...(byConstituency.get(key) ?? []), result]);
  }

  const lastUpdated = election.results.reduce<Date | null>(
    (latest, result) => (!latest || result.updatedAt > latest ? result.updatedAt : latest),
    null
  );

  return (
    <div className="wrap section">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Elections", href: "/elections" },
          { label: election.name },
        ]}
      />

      <div className="row-between">
        <div>
          <div className="row" style={{ gap: ".5rem" }}>
            <h1 style={{ margin: 0 }}>{election.name}</h1>
            <ElectionBadge status={election.status} />
            <VerifiedBadge
              state={
                election.verification === "VERIFIED"
                  ? "verified"
                  : election.verification === "REJECTED"
                    ? "unverified"
                    : "historical"
              }
              t={t}
            />
          </div>
          <p className="muted" style={{ margin: ".3rem 0 0" }}>
            {humanize(election.type)} · {election.year}
            {election.electionDate ? ` · Polling day ${formatDate(election.electionDate)}` : ""}
          </p>
        </div>
      </div>

      {election.verification !== "VERIFIED" && election.verifiedNote ? (
        <div className="historical-note" style={{ margin: ".7rem 0" }}>
          {election.verifiedNote}
        </div>
      ) : null}
      {election.description ? <p>{election.description}</p> : null}
      <SourceLine
        t={t}
        sourceName={election.sourceName}
        sourceUrl={election.sourceUrl}
        verifiedAt={election.verifiedAt}
      />

      <div className="grid grid-4" style={{ marginTop: "1rem" }}>
        <Stat label="Total seats" value={formatNumber(election.totalSeats)} />
        <Stat label="Candidacies" value={formatNumber(election._count.candidacies)} />
        <Stat label="Seats declared" value={formatNumber(winners.length)} accent="green" />
        <Stat
          label="Average turnout"
          value={averageTurnout === null ? "—" : formatPercent(averageTurnout)}
          accent="orange"
        />
      </div>

      <div className="notice notice-blue" style={{ marginTop: "1rem" }}>
        <strong>Official data.</strong> Source: {election.sourceName ?? "not recorded"}
        {election.sourceUrl ? (
          <>
            {" "}
            (<a href={election.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">link</a>)
          </>
        ) : null}
        . Last updated {formatDateTime(lastUpdated)}. Only results with a recorded source and a
        verification decision appear here.
      </div>

      <div className="grid grid-sidebar" style={{ marginTop: "1rem" }}>
        <div className="stack">
          <Card title="Results by constituency">
            {byConstituency.size === 0 ? (
              <EmptyState
                title="No verified results yet"
                hint="Results appear once they are entered with a source and verified by an administrator."
              />
            ) : (
              [...byConstituency.entries()].map(([name, results]) => {
                const constituencyTotal = results.reduce((sum, result) => sum + result.votes, 0);
                return (
                  <div key={name} style={{ marginBottom: "1.4rem" }}>
                    <div className="row-between">
                      <h3 style={{ margin: 0 }}>
                        <Link href={`/constituencies/${results[0].constituency.slug}`}>{name}</Link>
                      </h3>
                      <span className="small faint">
                        {results[0].constituency.district} ·{" "}
                        {formatNumber(results[0].totalVotesCast ?? constituencyTotal)} votes cast
                      </span>
                    </div>
                    <div className="table-wrap" style={{ marginTop: ".4rem" }}>
                      <table className="data responsive">
                        <thead>
                          <tr>
                            <th>Candidate</th>
                            <th>Party</th>
                            <th className="num">Votes</th>
                            <th>Share</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((result) => (
                            <tr key={result.id}>
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
                              <td data-label="Share">
                                <div className="row" style={{ gap: ".4rem" }}>
                                  <span style={{ minWidth: "3.2rem" }} className="small">
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
                              <td data-label="Status">
                                <VerificationBadge status={result.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>

        <aside className="stack">
          <Card title="Election calendar">
            {election.events.length === 0 ? (
              <p className="small muted">No scheduled events recorded.</p>
            ) : (
              <ul className="timeline">
                {election.events.map((event) => (
                  <li
                    key={event.id}
                    className={event.startsAt && event.startsAt < new Date() ? "is-muted" : ""}
                  >
                    <div className="when">
                      {event.startsAt ? (
                        <>
                          {formatDate(event.startsAt)}
                          {event.endsAt ? ` – ${formatDate(event.endsAt)}` : ""}
                        </>
                      ) : (
                        <span title="No confirmed Gregorian date on record">
                          {event.bsDate ? `${event.bsDate} (BS)` : "Date not confirmed"}
                        </span>
                      )}
                    </div>
                    <div className="what">{event.title}</div>
                    {event.detail ? <div className="small muted">{event.detail}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Totals">
            <dl className="kv">
              <dt>Votes counted</dt>
              <dd>{formatNumber(totalVotes)}</dd>
              <dt>Result records</dt>
              <dd>{formatNumber(election.results.length)}</dd>
              <dt>Counting status</dt>
              <dd>{humanize(election.status)}</dd>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
