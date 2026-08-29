import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Avatar, Badge, Breadcrumb, Card, EmptyState, Stat, Stars } from "@/components/ui";
import { ComplaintBadge, VerificationBadge } from "@/components/status";
import { formatNumber, formatPercent, relativeTime } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const constituency = await prisma.constituency.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: constituency?.name ?? "Constituency" };
}

export default async function ConstituencyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const constituency = await prisma.constituency.findUnique({
    where: { slug },
    include: {
      pollingStations: { orderBy: { name: "asc" } },
      candidates: {
        include: {
          party: true,
          ratings: { where: { status: "VISIBLE" }, select: { weightedScore: true } },
        },
        orderBy: { fullName: "asc" },
      },
      results: {
        where: { status: "VERIFIED" },
        include: {
          election: true,
          candidate: { select: { fullName: true, slug: true } },
          party: { select: { shortName: true, name: true } },
        },
        orderBy: [{ election: { year: "desc" } }, { votes: "desc" }],
      },
      complaints: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { trackingId: true, title: true, status: true, category: true, createdAt: true },
      },
      promises: { take: 10, orderBy: { lastUpdateAt: "desc" } },
      _count: { select: { complaints: true } },
    },
  });

  if (!constituency) notFound();

  const issueCategories = new Map<string, number>();
  for (const complaint of constituency.complaints) {
    issueCategories.set(complaint.category, (issueCategories.get(complaint.category) ?? 0) + 1);
  }

  return (
    <div className="wrap section">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Constituencies", href: "/constituencies" },
          { label: constituency.name },
        ]}
      />

      <h1>{constituency.name}</h1>
      <p className="muted">
        {constituency.district} district, {constituency.province} province
      </p>

      <div className="grid grid-4">
        <Stat label="Registered voters" value={formatNumber(constituency.registeredVoters)} />
        <Stat label="Candidates" value={formatNumber(constituency.candidates.length)} />
        <Stat label="Polling stations" value={formatNumber(constituency.pollingStations.length)} />
        <Stat
          label="Citizen issues"
          value={formatNumber(constituency._count.complaints)}
          accent="orange"
        />
      </div>

      <div className="grid grid-sidebar" style={{ marginTop: "1.2rem" }}>
        <div className="stack">
          <Card
            title="Current candidates"
            action={
              <Link className="small" href={`/compare?constituency=${constituency.slug}`}>
                Compare
              </Link>
            }
          >
            {constituency.candidates.length === 0 ? (
              <EmptyState title="No candidates recorded for this constituency" />
            ) : (
              <div className="grid grid-2">
                {constituency.candidates.map((candidate) => {
                  const count = candidate.ratings.length;
                  const average =
                    count === 0
                      ? 0
                      : candidate.ratings.reduce((sum, r) => sum + r.weightedScore, 0) / count;
                  return (
                    <Link
                      key={candidate.id}
                      className="card card-tight card-hover row"
                      href={`/candidates/${candidate.slug}`}
                    >
                      <Avatar name={candidate.fullName} url={candidate.photoUrl} />
                      <div className="grow">
                        <strong>{candidate.fullName}</strong>
                        <div className="small muted">{candidate.party?.name ?? "Independent"}</div>
                        {count > 0 ? (
                          <div className="row small">
                            <Stars value={average} />
                            <span className="faint">{average.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="small faint">No ratings</span>
                        )}
                      </div>
                      <VerificationBadge status={candidate.verificationStatus} />
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Previous election results">
            {constituency.results.length === 0 ? (
              <EmptyState title="No verified results recorded" />
            ) : (
              <div className="table-wrap">
                <table className="data responsive">
                  <thead>
                    <tr>
                      <th>Election</th>
                      <th>Candidate</th>
                      <th>Party</th>
                      <th className="num">Votes</th>
                      <th className="num">Vote share</th>
                      <th className="num">Turnout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {constituency.results.map((result) => (
                      <tr key={result.id}>
                        <td data-label="Election">
                          <Link href={`/elections/${result.election.slug}`}>
                            {result.election.year}
                          </Link>
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
                        <td className="num" data-label="Vote share">
                          {formatPercent(result.voteShare)}
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

          <Card title="Local citizen issues">
            {constituency.complaints.length === 0 ? (
              <EmptyState
                title="No issues reported here yet"
                action={
                  <Link className="btn btn-sm" href="/report">
                    Report an issue
                  </Link>
                }
              />
            ) : (
              <div className="stack">
                {constituency.complaints.map((complaint) => (
                  <div className="row-between" key={complaint.trackingId}>
                    <div>
                      <Link href={`/track?id=${complaint.trackingId}`} className="mono small">
                        {complaint.trackingId}
                      </Link>
                      <div style={{ fontWeight: 600 }}>{complaint.title}</div>
                      <div className="small faint">
                        {complaint.category} · {relativeTime(complaint.createdAt)}
                      </div>
                    </div>
                    <ComplaintBadge status={complaint.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="stack">
          <Card title="Major public issues">
            {constituency.majorIssues ? (
              <div className="chip-row">
                {constituency.majorIssues.split(",").map((issue) => (
                  <span className="chip" key={issue.trim()}>
                    {issue.trim()}
                  </span>
                ))}
              </div>
            ) : (
              <p className="small muted">Not recorded.</p>
            )}
            {issueCategories.size > 0 ? (
              <>
                <hr className="divider" />
                <div className="small muted">Recent issue categories</div>
                <ul className="small" style={{ paddingLeft: "1.1rem", margin: ".3rem 0 0" }}>
                  {[...issueCategories.entries()].map(([category, count]) => (
                    <li key={category}>
                      {category} — {count}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Card>

          <Card title="Polling stations">
            {constituency.pollingStations.length === 0 ? (
              <p className="small muted">No polling stations recorded.</p>
            ) : (
              <ul className="small" style={{ paddingLeft: "1.1rem", margin: 0 }}>
                {constituency.pollingStations.map((station) => (
                  <li key={station.id}>
                    {station.name}
                    {station.registeredVoters
                      ? ` — ${formatNumber(station.registeredVoters)} voters`
                      : ""}
                    {station.address ? <div className="faint">{station.address}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {constituency.promises.length > 0 ? (
            <Card title="Local promises">
              <ul className="small" style={{ paddingLeft: "1.1rem", margin: 0 }}>
                {constituency.promises.map((promise) => (
                  <li key={promise.id}>{promise.title}</li>
                ))}
              </ul>
              <Link className="small" href="/promises">
                Full promise tracker →
              </Link>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
