import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, Card, EmptyState, Stars } from "@/components/ui";
import { ComplaintBadge, VerdictBadge, VerificationBadge } from "@/components/status";
import { isValidTrackingId, normalizeTrackingId } from "@/lib/tracking";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Search" };

/** Cross-entity search across candidates, constituencies, news and fact checks. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  if (q.length < 2) {
    return (
      <div className="wrap section" style={{ maxWidth: "760px" }}>
        <h1>Search</h1>
        <Card>
          <form method="get" className="row" style={{ gap: ".5rem" }}>
            <input name="q" defaultValue={q} placeholder="Candidate, constituency, news or tracking ID" className="grow" autoFocus />
            <button className="btn">Search</button>
          </form>
          <p className="small muted" style={{ marginTop: ".8rem", marginBottom: 0 }}>
            Enter at least two characters. Pasting a tracking ID such as{" "}
            <code className="mono">NT-ISSUE-00000001</code> jumps straight to that issue.
          </p>
        </Card>
      </div>
    );
  }

  const contains = { contains: q, mode: "insensitive" as const };

  // A pasted tracking ID resolves directly rather than being treated as text.
  const trackingId = normalizeTrackingId(q);
  const issue = isValidTrackingId(trackingId)
    ? await prisma.complaint.findUnique({
        where: { trackingId },
        select: { trackingId: true, title: true, status: true, category: true },
      })
    : null;

  const [candidates, constituencies, articles, factChecks, parties] = await Promise.all([
    prisma.candidate.findMany({
      where: { OR: [{ fullName: contains }, { agenda: contains }, { keyIssues: contains }] },
      take: 10,
      select: {
        id: true,
        slug: true,
        fullName: true,
        verificationStatus: true,
        party: { select: { name: true } },
        constituency: { select: { name: true, district: true } },
        ratings: { where: { status: "VISIBLE" }, select: { weightedScore: true } },
      },
    }),
    prisma.constituency.findMany({
      where: { OR: [{ name: contains }, { district: contains }, { province: contains }] },
      take: 10,
      select: { id: true, slug: true, name: true, district: true, province: true },
    }),
    prisma.newsArticle.findMany({
      where: { status: "PUBLISHED", OR: [{ title: contains }, { excerpt: contains }, { body: contains }] },
      take: 8,
      select: { id: true, slug: true, title: true, excerpt: true, publishedAt: true },
    }),
    prisma.factCheck.findMany({
      where: { status: "PUBLISHED", OR: [{ claim: contains }, { summary: contains }, { claimant: contains }] },
      take: 8,
      select: { id: true, slug: true, claim: true, verdict: true },
    }),
    prisma.party.findMany({
      where: { OR: [{ name: contains }, { shortName: contains }] },
      take: 6,
      select: { id: true, slug: true, name: true, shortName: true, _count: { select: { candidates: true } } },
    }),
  ]);

  const total =
    candidates.length + constituencies.length + articles.length + factChecks.length + parties.length;

  return (
    <div className="wrap section">
      <h1>Search</h1>
      <Card>
        <form method="get" className="row" style={{ gap: ".5rem" }}>
          <input name="q" defaultValue={q} className="grow" />
          <button className="btn">Search</button>
        </form>
      </Card>

      <p className="small muted" style={{ marginTop: "1rem" }}>
        {total} result{total === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
      </p>

      {issue ? (
        <Card title="Citizen issue">
          <div className="row-between">
            <div>
              <Link className="mono" href={`/track?id=${issue.trackingId}`}>
                {issue.trackingId}
              </Link>
              <div style={{ fontWeight: 600 }}>{issue.title}</div>
              <div className="small faint">{issue.category}</div>
            </div>
            <ComplaintBadge status={issue.status} />
          </div>
        </Card>
      ) : null}

      {total === 0 && !issue ? (
        <Card>
          <EmptyState
            title="Nothing matched that search"
            hint="Try a candidate name, a district, a party or a phrase from an article."
          />
        </Card>
      ) : null}

      {candidates.length > 0 ? (
        <Card title="Candidates">
          <div className="stack">
            {candidates.map((candidate) => {
              const count = candidate.ratings.length;
              const average =
                count === 0
                  ? 0
                  : candidate.ratings.reduce((sum, r) => sum + r.weightedScore, 0) / count;
              return (
                <div className="row-between" key={candidate.id}>
                  <div>
                    <Link href={`/candidates/${candidate.slug}`}>
                      <strong>{candidate.fullName}</strong>
                    </Link>
                    <div className="small faint">
                      {candidate.party?.name ?? "Independent"}
                      {candidate.constituency
                        ? ` · ${candidate.constituency.name}, ${candidate.constituency.district}`
                        : ""}
                    </div>
                  </div>
                  <span className="row">
                    {count > 0 ? (
                      <span className="row small">
                        <Stars value={average} />
                        <span className="faint">{average.toFixed(1)}</span>
                      </span>
                    ) : null}
                    <VerificationBadge status={candidate.verificationStatus} />
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {constituencies.length > 0 ? (
        <Card title="Constituencies">
          <div className="chip-row">
            {constituencies.map((constituency) => (
              <Link key={constituency.id} className="chip" href={`/constituencies/${constituency.slug}`}>
                {constituency.name} — {constituency.district}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      {parties.length > 0 ? (
        <Card title="Parties">
          <div className="chip-row">
            {parties.map((party) => (
              <Link key={party.id} className="chip" href={`/candidates?party=${party.slug}`}>
                {party.name} ({party._count.candidates})
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      {articles.length > 0 ? (
        <Card title="News">
          <div className="stack">
            {articles.map((article) => (
              <div key={article.id}>
                <Link href={`/news/${article.slug}`}>
                  <strong>{article.title}</strong>
                </Link>
                <div className="small faint">{formatDate(article.publishedAt)}</div>
                {article.excerpt ? (
                  <p className="small muted" style={{ margin: ".15rem 0 0" }}>
                    {article.excerpt}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {factChecks.length > 0 ? (
        <Card title="Fact checks">
          <div className="stack">
            {factChecks.map((factCheck) => (
              <div className="row-between" key={factCheck.id}>
                <Link href={`/fact-checks/${factCheck.slug}`}>{factCheck.claim}</Link>
                <VerdictBadge verdict={factCheck.verdict} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <p className="small faint" style={{ marginTop: "1rem" }}>
        Looking for an issue you reported? Use <Link href="/track">Track an issue</Link> with your
        tracking ID. <Badge tone="muted">Tip</Badge> tracking IDs also work in this box.
      </p>
    </div>
  );
}
