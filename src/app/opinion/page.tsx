import Link from "next/link";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { Card, EmptyState, Stars, Stat } from "@/components/ui";
import { PollVoteForm } from "@/components/civic-forms";
import { RATING_DIMENSIONS } from "@/lib/ratings";
import { formatDate, formatNumber } from "@/lib/format";

export const metadata = { title: "Public opinion" };

export default async function OpinionPage() {
  const [actor, pollsEnabled, ratingsEnabled] = await Promise.all([
    getActor(),
    getSetting("features.publicPolls"),
    getSetting("ratings.enabled"),
  ]);

  const polls = pollsEnabled
    ? await prisma.poll.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        include: {
          options: {
            orderBy: { order: "asc" },
            include: { _count: { select: { votes: true } } },
          },
          votes: actor ? { where: { userId: actor.userId }, select: { optionId: true } } : false,
        },
      })
    : [];

  const [ratedCandidates, ratingCount] = await Promise.all([
    prisma.candidate.findMany({
      where: { ratings: { some: { status: "VISIBLE" } } },
      select: {
        id: true,
        slug: true,
        fullName: true,
        party: { select: { shortName: true, name: true } },
        constituency: { select: { name: true } },
        ratings: { where: { status: "VISIBLE" }, select: { weightedScore: true, updatedAt: true } },
      },
      take: 50,
    }),
    prisma.rating.count({ where: { status: "VISIBLE" } }),
  ]);

  const ranked = ratedCandidates
    .map((candidate) => {
      const count = candidate.ratings.length;
      return {
        ...candidate,
        count,
        average: candidate.ratings.reduce((sum, r) => sum + r.weightedScore, 0) / count,
        lastUpdated: candidate.ratings.reduce<Date>(
          (latest, r) => (r.updatedAt > latest ? r.updatedAt : latest),
          candidate.ratings[0].updatedAt
        ),
      };
    })
    .sort((a, b) => b.average - a.average)
    .slice(0, 20);

  return (
    <div className="wrap section">
      <h1>Public opinion</h1>
      <p className="muted">
        Polls, surveys and candidate ratings submitted by registered users. These figures measure
        perception. They are not election results and are not voting recommendations.
      </p>

      <div className="grid grid-3">
        <Stat label="Ratings submitted" value={formatNumber(ratingCount)} />
        <Stat label="Candidates rated" value={formatNumber(ratedCandidates.length)} />
        <Stat label="Open polls" value={formatNumber(polls.length)} accent="purple" />
      </div>

      <div className="grid grid-sidebar" style={{ marginTop: "1.2rem" }}>
        <div className="stack">
          <Card
            title="Candidate rating leaderboard"
            action={
              <Link className="small" href="/methodology">
                Methodology
              </Link>
            }
          >
            {!ratingsEnabled ? (
              <p className="small muted">Candidate ratings are currently disabled.</p>
            ) : ranked.length === 0 ? (
              <EmptyState title="No ratings submitted yet" />
            ) : (
              <div className="table-wrap">
                <table className="data responsive">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Party</th>
                      <th>Rating</th>
                      <th className="num">Ratings</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((candidate) => (
                      <tr key={candidate.id}>
                        <td data-label="Candidate">
                          <Link href={`/candidates/${candidate.slug}`}>{candidate.fullName}</Link>
                          {candidate.constituency ? (
                            <div className="small faint">{candidate.constituency.name}</div>
                          ) : null}
                        </td>
                        <td data-label="Party">
                          {candidate.party?.shortName ?? candidate.party?.name ?? "Independent"}
                        </td>
                        <td data-label="Rating">
                          <span className="row">
                            <Stars value={candidate.average} />
                            <strong>{candidate.average.toFixed(1)}</strong>
                          </span>
                        </td>
                        <td className="num" data-label="Ratings">
                          {formatNumber(candidate.count)}
                        </td>
                        <td data-label="Updated">{formatDate(candidate.lastUpdated)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="notice" style={{ marginTop: ".9rem" }}>
              Public-opinion indicator only. Kept entirely separate from official election results.
            </div>
          </Card>

          {polls.map((poll) => (
            <Card key={poll.id} title={poll.question}>
              {poll.description ? <p className="small muted">{poll.description}</p> : null}
              {!actor ? (
                <p className="small muted">
                  <Link href="/login">Log in</Link> to vote. Results are shown after you vote.
                </p>
              ) : (
                <PollVoteForm
                  pollId={poll.id}
                  votedOptionId={
                    Array.isArray(poll.votes) && poll.votes.length > 0 ? poll.votes[0].optionId : null
                  }
                  options={poll.options.map((option) => ({
                    id: option.id,
                    label: option.label,
                    count: option._count.votes,
                  }))}
                />
              )}
              {poll.endsAt ? (
                <p className="small faint" style={{ marginTop: ".6rem", marginBottom: 0 }}>
                  Closes {formatDate(poll.endsAt)}
                </p>
              ) : null}
            </Card>
          ))}
        </div>

        <aside className="stack">
          <Card title="How ratings are calculated">
            <ul className="small" style={{ paddingLeft: "1.1rem", margin: 0 }}>
              {RATING_DIMENSIONS.map((dimension) => (
                <li key={dimension.key} style={{ marginBottom: ".3rem" }}>
                  <strong>{dimension.label}</strong> — {Math.round(dimension.weight * 100)}%
                  <div className="faint">{dimension.purpose}</div>
                </li>
              ))}
            </ul>
            <Link className="small" href="/methodology">
              Full methodology →
            </Link>
          </Card>

          <Card title="Rating safeguards">
            <ul className="small muted" style={{ paddingLeft: "1.1rem", margin: 0 }}>
              <li>Only authenticated accounts may submit ratings.</li>
              <li>One rating per account per candidate; updates replace it.</li>
              <li>Submission is rate limited and monitored for automated abuse.</li>
              <li>Suspicious patterns are flagged for moderation.</li>
              <li>Individual rater identity is never published.</li>
              <li>Anyone can report an abusive or fraudulent rating.</li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
