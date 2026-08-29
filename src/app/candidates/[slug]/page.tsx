import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/auth";
import { Avatar, Badge, Breadcrumb, Card, EmptyState, Meter, Stars } from "@/components/ui";
import { LevelBadge, PromiseBadge, VerdictBadge, VerificationBadge } from "@/components/status";
import { RatingForm } from "@/components/civic-forms";
import { RATING_DIMENSIONS, summarize } from "@/lib/ratings";
import { formatDate, formatDateTime, formatNumber, formatPercent } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { slug },
    select: { fullName: true },
  });
  return { title: candidate?.fullName ?? "Candidate" };
}

export default async function CandidatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const actor = await getActor();

  const candidate = await prisma.candidate.findUnique({
    where: { slug },
    include: {
      party: true,
      constituency: true,
      sources: { orderBy: { createdAt: "desc" } },
      documents: { where: { isPublic: true } },
      promises: { orderBy: { lastUpdateAt: "desc" }, take: 10 },
      performance: { orderBy: { periodLabel: "desc" }, take: 4 },
      factChecks: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 5,
        select: { slug: true, claim: true, verdict: true, publishedAt: true },
      },
      candidacies: {
        include: { election: true, constituency: true },
        orderBy: { election: { year: "desc" } },
      },
      results: {
        where: { status: "VERIFIED" },
        include: { election: true, constituency: true },
        orderBy: { election: { year: "desc" } },
      },
      ratings: {
        where: { status: "VISIBLE" },
        select: {
          publicTrust: true,
          communication: true,
          localIssueFocus: true,
          policyClarity: true,
          responsiveness: true,
          overall: true,
          weightedScore: true,
          updatedAt: true,
          comment: true,
          userId: true,
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!candidate) notFound();

  const summary = summarize(candidate.ratings);
  const ownRating = actor
    ? candidate.ratings.find((rating) => rating.userId === actor.userId)
    : null;
  const isOwnProfile = actor?.userId === candidate.accountId;
  const socialLinks = (candidate.socialLinks as Record<string, string> | null) ?? null;

  return (
    <div className="wrap section">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Candidates", href: "/candidates" },
          { label: candidate.fullName },
        ]}
      />

      <Card>
        <div className="row" style={{ alignItems: "flex-start", gap: "1rem" }}>
          <Avatar name={candidate.fullName} url={candidate.photoUrl} large />
          <div className="grow">
            <div className="row" style={{ gap: ".5rem" }}>
              <h1 style={{ margin: 0 }}>{candidate.fullName}</h1>
              <VerificationBadge status={candidate.verificationStatus} />
              <LevelBadge level={candidate.level} />
              {candidate.isIncumbent ? <Badge tone="navy">Incumbent</Badge> : null}
              {candidate.isIndependent ? <Badge tone="muted">Independent</Badge> : null}
              {candidate.accountId ? <Badge tone="purple">Profile claimed</Badge> : null}
            </div>
            <p className="muted" style={{ margin: ".3rem 0 0" }}>
              {candidate.party?.name ?? "Independent"}
              {candidate.constituency
                ? ` · ${candidate.constituency.name}, ${candidate.constituency.district}, ${candidate.constituency.province}`
                : ""}
            </p>
            {candidate.office ? (
              <p className="small" style={{ margin: ".35rem 0 0", fontWeight: 600 }}>
                {candidate.office}
              </p>
            ) : null}
            {candidate.keyIssues ? (
              <div className="chip-row" style={{ marginTop: ".6rem" }}>
                {candidate.keyIssues.split(",").map((issue) => (
                  <span className="chip" key={issue.trim()}>
                    {issue.trim()}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="center">
            <div className="score">
              {summary.count > 0 ? summary.average.toFixed(1) : "—"}
              <small>/5</small>
            </div>
            <Stars value={summary.average} />
            <div className="small faint">{formatNumber(summary.count)} ratings</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-sidebar" style={{ marginTop: "1rem" }}>
        <div className="stack">
          <Card title="Profile">
            <dl className="kv">
              <dt>Biography</dt>
              <dd>{candidate.biography ?? "Not recorded"}</dd>
              <dt>Education</dt>
              <dd>{candidate.education ?? "Not recorded"}</dd>
              <dt>Professional experience</dt>
              <dd>{candidate.experience ?? "Not recorded"}</dd>
              <dt>Previous public positions</dt>
              <dd>{candidate.previousPositions ?? "Not recorded"}</dd>
              <dt>Public agenda</dt>
              <dd>{candidate.agenda ?? "Not recorded"}</dd>
              {candidate.termsServed !== null ? (
                <>
                  <dt>Terms served</dt>
                  <dd>{candidate.termsServed}</dd>
                </>
              ) : null}
              {candidate.prGroup ? (
                <>
                  <dt>Proportional representation group</dt>
                  <dd>{candidate.prGroup}</dd>
                </>
              ) : null}
              {socialLinks
                ? Object.entries(socialLinks).map(([label, url]) => (
                    <div key={label} style={{ display: "contents" }}>
                      <dt>{label}</dt>
                      <dd>
                        <a href={url} rel="noopener noreferrer nofollow" target="_blank">
                          {url}
                        </a>
                      </dd>
                    </div>
                  ))
                : null}
            </dl>
          </Card>

          <Card title="Election participation and results">
            {candidate.candidacies.length === 0 ? (
              <EmptyState title="No recorded candidacies" />
            ) : (
              <div className="table-wrap">
                <table className="data responsive">
                  <thead>
                    <tr>
                      <th>Election</th>
                      <th>Constituency</th>
                      <th>Status</th>
                      <th className="num">Votes</th>
                      <th className="num">Vote share</th>
                      <th>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidate.candidacies.map((candidacy) => {
                      const result = candidate.results.find(
                        (row) =>
                          row.electionId === candidacy.electionId &&
                          row.constituencyId === candidacy.constituencyId
                      );
                      return (
                        <tr key={candidacy.id}>
                          <td data-label="Election">
                            <Link href={`/elections/${candidacy.election.slug}`}>
                              {candidacy.election.name}
                            </Link>
                          </td>
                          <td data-label="Constituency">{candidacy.constituency.name}</td>
                          <td data-label="Status">{candidacy.nominationStatus}</td>
                          <td className="num" data-label="Votes">
                            {result ? formatNumber(result.votes) : "—"}
                          </td>
                          <td className="num" data-label="Vote share">
                            {result ? formatPercent(result.voteShare) : "—"}
                          </td>
                          <td data-label="Outcome">
                            {result ? (
                              result.isWinner ? (
                                <Badge tone="good">Elected</Badge>
                              ) : (
                                <Badge tone="muted">Not elected</Badge>
                              )
                            ) : (
                              <Badge tone="muted">Pending</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="small faint" style={{ marginTop: ".7rem", marginBottom: 0 }}>
              Official results only. Sources and update times are shown on the{" "}
              <Link href="/results">results page</Link>.
            </p>
          </Card>

          <Card title="Manifesto commitments">
            {candidate.promises.length === 0 ? (
              <EmptyState title="No commitments recorded for this candidate" />
            ) : (
              <div className="table-wrap">
                <table className="data responsive">
                  <thead>
                    <tr>
                      <th>Promise</th>
                      <th>Status</th>
                      <th>Evidence</th>
                      <th>Last update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidate.promises.map((promise) => (
                      <tr key={promise.id}>
                        <td data-label="Promise">{promise.title}</td>
                        <td data-label="Status">
                          <PromiseBadge status={promise.status} />
                        </td>
                        <td data-label="Evidence">
                          {promise.evidenceUrl ? (
                            <a href={promise.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow">
                              Source
                            </a>
                          ) : (
                            <span className="faint">None</span>
                          )}
                        </td>
                        <td data-label="Last update">{formatDate(promise.lastUpdateAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {candidate.performance.length > 0 ? (
            <Card title="Representative performance records">
              <p className="small muted">
                Objective, source-backed activity records. These are kept separate from
                perception-based ratings.
              </p>
              <div className="table-wrap">
                <table className="data responsive">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th className="num">Attendance</th>
                      <th className="num">Questions</th>
                      <th className="num">Bills</th>
                      <th className="num">Local activities</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidate.performance.map((record) => (
                      <tr key={record.id}>
                        <td data-label="Period">{record.periodLabel}</td>
                        <td className="num" data-label="Attendance">
                          {formatPercent(record.attendancePct)}
                        </td>
                        <td className="num" data-label="Questions">
                          {formatNumber(record.questionsAsked)}
                        </td>
                        <td className="num" data-label="Bills">
                          {formatNumber(record.billsSponsored)}
                        </td>
                        <td className="num" data-label="Local activities">
                          {formatNumber(record.constituencyActivities)}
                        </td>
                        <td data-label="Source">
                          {record.sourceUrl ? (
                            <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                              {record.sourceName ?? "Source"}
                            </a>
                          ) : (
                            (record.sourceName ?? "—")
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {candidate.factChecks.length > 0 ? (
            <Card title="Related fact checks">
              <div className="stack">
                {candidate.factChecks.map((factCheck) => (
                  <div key={factCheck.slug} className="row-between">
                    <Link href={`/fact-checks/${factCheck.slug}`}>{factCheck.claim}</Link>
                    <span className="row">
                      <VerdictBadge verdict={factCheck.verdict} />
                      <span className="small faint">{formatDate(factCheck.publishedAt)}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="small faint" style={{ marginTop: ".7rem", marginBottom: 0 }}>
                Fact checks are independent editorial records. A candidate may attach a response but
                cannot change a verdict.
              </p>
            </Card>
          ) : null}
        </div>

        <aside className="stack">
          <Card title="Public opinion">
            {summary.count === 0 ? (
              <p className="small muted">No ratings yet. Be the first to rate this candidate.</p>
            ) : (
              <>
                <div className="row-between">
                  <span className="score">
                    {summary.average.toFixed(1)}
                    <small>/5</small>
                  </span>
                  <span className="small faint">
                    {formatNumber(summary.count)} ratings
                    <br />
                    Updated {formatDateTime(summary.lastUpdated)}
                  </span>
                </div>
                <hr className="divider" />
                {RATING_DIMENSIONS.map((dimension) => (
                  <div className="bar-row" key={dimension.key} style={{ marginBottom: ".4rem" }}>
                    <span className="small">{dimension.label}</span>
                    <Meter value={summary.dimensionAverages[dimension.key]} max={5} />
                    <span className="small faint">
                      {summary.dimensionAverages[dimension.key].toFixed(1)}
                    </span>
                  </div>
                ))}
                <hr className="divider" />
                <div className="small muted">Distribution</div>
                {summary.distribution
                  .map((count, index) => ({ star: index + 1, count }))
                  .reverse()
                  .map((row) => (
                    <div className="bar-row" key={row.star} style={{ marginBottom: ".25rem" }}>
                      <span className="small">{row.star} star</span>
                      <Meter value={row.count} max={summary.count} tone="warn" />
                      <span className="small faint">{row.count}</span>
                    </div>
                  ))}
              </>
            )}
            <div className="notice" style={{ marginTop: ".8rem" }}>
              User-generated public opinion. Not an official election result.{" "}
              <Link href="/methodology">Methodology</Link>
            </div>
          </Card>

          <Card title={ownRating ? "Update your rating" : "Rate this candidate"}>
            {!actor ? (
              <p className="small muted">
                <Link href="/login">Log in</Link> to rate candidates. Only authenticated users can
                submit ratings, and each account may rate a candidate once.
              </p>
            ) : isOwnProfile ? (
              <p className="small muted">You cannot rate your own candidate profile.</p>
            ) : (
              <RatingForm
                candidateId={candidate.id}
                existing={
                  ownRating
                    ? {
                        publicTrust: ownRating.publicTrust,
                        communication: ownRating.communication,
                        localIssueFocus: ownRating.localIssueFocus,
                        policyClarity: ownRating.policyClarity,
                        responsiveness: ownRating.responsiveness,
                        overall: ownRating.overall,
                      }
                    : null
                }
              />
            )}
          </Card>

          <Card title="Sources and provenance">
            {candidate.sources.length === 0 ? (
              <p className="small muted">No source records attached yet.</p>
            ) : (
              <ul className="small" style={{ paddingLeft: "1.1rem", margin: 0 }}>
                {candidate.sources.map((source) => (
                  <li key={source.id} style={{ marginBottom: ".35rem" }}>
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noopener noreferrer nofollow">
                        {source.label}
                      </a>
                    ) : (
                      source.label
                    )}
                    {source.field ? <span className="faint"> · {source.field}</span> : null}
                    <div className="faint">{formatDate(source.createdAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {candidate.documents.length > 0 ? (
            <Card title="Candidate-submitted documents">
              <ul className="small" style={{ paddingLeft: "1.1rem", margin: 0 }}>
                {candidate.documents.map((document) => (
                  <li key={document.id}>
                    <a href={document.fileUrl} target="_blank" rel="noopener noreferrer nofollow">
                      {document.title}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card title="Is this your profile?">
            <p className="small muted">
              Candidates can claim a profile and edit permitted fields after identity review.
              Editorial records, verification decisions and fact-checks stay independent.
            </p>
            <Link className="btn btn-sm btn-ghost btn-block" href="/portal/candidate">
              Claim this profile
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
