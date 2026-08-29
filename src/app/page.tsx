import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, Card, Stat, Stars } from "@/components/ui";
import { ComplaintBadge, ElectionBadge, VerificationBadge } from "@/components/status";
import { TrackLookup } from "@/components/civic-forms";
import { formatDate, formatNumber, relativeTime } from "@/lib/format";

/** Home page — mirrors the supplied interface reference (section 3, 19). */
export default async function HomePage() {
  const [
    candidateCount,
    constituencyCount,
    resolvedCount,
    issueCount,
    activeElection,
    topCandidates,
    latestNews,
    openIssues,
    upcomingEvents,
  ] = await Promise.all([
    prisma.candidate.count(),
    prisma.constituency.count(),
    prisma.complaint.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
    prisma.complaint.count(),
    prisma.election.findFirst({
      where: { status: { in: ["ACTIVE", "COUNTING", "UPCOMING"] } },
      orderBy: [{ status: "asc" }, { electionDate: "asc" }],
      select: { name: true, slug: true, status: true, electionDate: true, totalSeats: true },
    }),
    prisma.candidate.findMany({
      where: { ratings: { some: { status: "VISIBLE" } } },
      select: {
        id: true,
        slug: true,
        fullName: true,
        photoUrl: true,
        verificationStatus: true,
        party: { select: { name: true, shortName: true } },
        constituency: { select: { name: true } },
        ratings: { where: { status: "VISIBLE" }, select: { weightedScore: true } },
      },
      take: 12,
    }),
    prisma.newsArticle.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 4,
      select: { slug: true, title: true, excerpt: true, category: true, publishedAt: true },
    }),
    prisma.complaint.findMany({
      where: { status: { notIn: ["CLOSED"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { trackingId: true, title: true, status: true, category: true, district: true, updatedAt: true },
    }),
    prisma.electionEvent.findMany({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 4,
      select: { title: true, startsAt: true, election: { select: { name: true } } },
    }),
  ]);

  const ranked = topCandidates
    .map((candidate) => ({
      ...candidate,
      average:
        candidate.ratings.reduce((sum, rating) => sum + rating.weightedScore, 0) /
        candidate.ratings.length,
      count: candidate.ratings.length,
    }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 4);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <span className="eyebrow">Know. Vote. Track.</span>
          <h1>Election information and citizen accountability, in one place.</h1>
          <p>
            Compare candidates on the record, follow official results, report local issues and
            track what your representatives actually deliver after election day.
          </p>

          <div className="hero-search">
            <TrackLookup />
          </div>
          <p className="small" style={{ color: "#9fb4d6", marginTop: ".5rem" }}>
            Have a tracking ID? Check your issue above — no account needed.
          </p>

          <div className="hero-stats">
            <Stat label="Candidates" value={formatNumber(candidateCount)} />
            <Stat label="Constituencies" value={formatNumber(constituencyCount)} />
            <Stat label="Citizen issues" value={formatNumber(issueCount)} />
            <Stat label="Issues resolved" value={formatNumber(resolvedCount)} />
          </div>
        </div>
      </section>

      <div className="wrap section">
        <div className="grid grid-4">
          <FeatureCard
            href="/candidates"
            title="Candidate profiles"
            body="Source-backed biographies, education, agenda, manifesto and public ratings."
          />
          <FeatureCard
            href="/compare"
            title="Compare candidates"
            body="Put candidates from the same constituency side by side on the same criteria."
          />
          <FeatureCard
            href="/report"
            title="Report an issue"
            body="Submit a local issue, get a tracking ID and follow every status change."
          />
          <FeatureCard
            href="/promises"
            title="Promise tracker"
            body="Campaign commitments converted into records with status and evidence."
          />
        </div>
      </div>

      <div className="wrap section-tight">
        <div className="grid grid-sidebar">
          <div className="stack">
            {activeElection ? (
              <Card
                title="Current election"
                action={<ElectionBadge status={activeElection.status} />}
              >
                <div className="row-between">
                  <div>
                    <h3 style={{ marginBottom: ".15rem" }}>{activeElection.name}</h3>
                    <p className="small muted" style={{ margin: 0 }}>
                      {activeElection.electionDate
                        ? `Polling day ${formatDate(activeElection.electionDate)}`
                        : "Date to be announced"}
                      {activeElection.totalSeats ? ` · ${activeElection.totalSeats} seats` : ""}
                    </p>
                  </div>
                  <Link className="btn btn-sm btn-ghost" href={`/elections/${activeElection.slug}`}>
                    Open election
                  </Link>
                </div>
              </Card>
            ) : null}

            <Card
              title="Popular candidates"
              action={
                <Link className="small" href="/candidates">
                  View all
                </Link>
              }
            >
              {ranked.length === 0 ? (
                <p className="muted small">No ratings have been submitted yet.</p>
              ) : (
                <div className="grid grid-2">
                  {ranked.map((candidate) => (
                    <Link
                      key={candidate.id}
                      href={`/candidates/${candidate.slug}`}
                      className="card card-tight card-hover row"
                      style={{ gap: ".7rem", alignItems: "flex-start" }}
                    >
                      <div className="avatar">
                        {candidate.fullName
                          .split(" ")
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")}
                      </div>
                      <div className="grow">
                        <strong>{candidate.fullName}</strong>
                        <div className="small muted">
                          {candidate.party?.shortName ?? candidate.party?.name ?? "Independent"}
                          {candidate.constituency ? ` · ${candidate.constituency.name}` : ""}
                        </div>
                        <div className="row small" style={{ marginTop: ".25rem" }}>
                          <Stars value={candidate.average} />
                          <span className="faint">
                            {candidate.average.toFixed(1)} · {candidate.count} ratings
                          </span>
                        </div>
                      </div>
                      <VerificationBadge status={candidate.verificationStatus} />
                    </Link>
                  ))}
                </div>
              )}
              <p className="small faint" style={{ marginTop: ".8rem", marginBottom: 0 }}>
                Ratings are public-opinion indicators, not voting recommendations.{" "}
                <Link href="/methodology">View methodology</Link>.
              </p>
            </Card>

            <Card
              title="Latest news"
              action={
                <Link className="small" href="/news">
                  All news
                </Link>
              }
            >
              {latestNews.length === 0 ? (
                <p className="muted small">No articles have been published yet.</p>
              ) : (
                <div className="stack">
                  {latestNews.map((article) => (
                    <article key={article.slug}>
                      <Link href={`/news/${article.slug}`}>
                        <strong>{article.title}</strong>
                      </Link>
                      <div className="small faint">
                        {article.category ? <Badge tone="muted">{article.category}</Badge> : null}{" "}
                        {formatDate(article.publishedAt)}
                      </div>
                      {article.excerpt ? (
                        <p className="small muted" style={{ margin: ".2rem 0 0" }}>
                          {article.excerpt}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <aside className="stack">
            <Card title="Recent citizen issues">
              {openIssues.length === 0 ? (
                <p className="muted small">No issues reported yet.</p>
              ) : (
                <div className="stack">
                  {openIssues.map((issue) => (
                    <div key={issue.trackingId}>
                      <Link href={`/track?id=${issue.trackingId}`} className="mono small">
                        {issue.trackingId}
                      </Link>
                      <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{issue.title}</div>
                      <div className="row small faint">
                        <ComplaintBadge status={issue.status} />
                        <span>{issue.category}</span>
                        <span>{relativeTime(issue.updatedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link className="btn btn-sm btn-block" href="/report" style={{ marginTop: ".8rem" }}>
                Report an issue
              </Link>
            </Card>

            <Card title="Election calendar">
              {upcomingEvents.length === 0 ? (
                <p className="muted small">No scheduled events.</p>
              ) : (
                <ul className="timeline">
                  {upcomingEvents.map((event) => (
                    <li key={`${event.title}-${event.startsAt.toISOString()}`}>
                      <div className="when">{formatDate(event.startsAt)}</div>
                      <div className="what">{event.title}</div>
                      <div className="small muted">{event.election.name}</div>
                    </li>
                  ))}
                </ul>
              )}
              <Link className="small" href="/calendar">
                Full calendar →
              </Link>
            </Card>

            <div className="notice">
              NetaTrack is not an election authority. Official results always show their source and
              update time, and are stored separately from public opinion.
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function FeatureCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="card card-hover">
      <h3>{title}</h3>
      <p className="small muted" style={{ margin: 0 }}>
        {body}
      </p>
    </Link>
  );
}
