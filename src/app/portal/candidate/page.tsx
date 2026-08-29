import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { Card, EmptyState } from "@/components/ui";
import { ClaimBadge, VerdictBadge, VerificationBadge } from "@/components/status";
import { CandidateClaimForm, CandidateSelfEditForm } from "@/components/civic-forms";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata = { title: "Candidate portal" };

/**
 * Candidate portal (section 6). A claimed profile exposes only the editable
 * field set; verification, ratings, results and fact-check verdicts are shown
 * read-only with an explanation of why.
 */
export default async function CandidatePortalPage() {
  const actor = await requireActor().catch(() => null);
  if (!actor) redirect("/login?next=/portal/candidate");

  const [profile, claims, unclaimed] = await Promise.all([
    prisma.candidate.findUnique({
      where: { accountId: actor.userId },
      include: {
        party: true,
        constituency: true,
        ratings: { where: { status: "VISIBLE" }, select: { weightedScore: true } },
        factChecks: {
          where: { status: "PUBLISHED" },
          select: { id: true, slug: true, claim: true, verdict: true, subjectResponse: true },
        },
        documents: true,
      },
    }),
    prisma.candidateClaim.findMany({
      where: { requesterId: actor.userId },
      orderBy: { createdAt: "desc" },
      include: { candidate: { select: { fullName: true } } },
    }),
    prisma.candidate.findMany({
      where: { accountId: null },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
      take: 500,
    }),
  ]);

  const ratingCount = profile?.ratings.length ?? 0;
  const ratingAverage =
    ratingCount > 0
      ? profile!.ratings.reduce((sum, rating) => sum + rating.weightedScore, 0) / ratingCount
      : 0;

  return (
    <div className="wrap section">
      <h1>Candidate portal</h1>
      <p className="muted">
        Manage the profile fields you are permitted to edit. Editorial records stay independent.
      </p>

      {profile ? (
        <div className="grid grid-sidebar">
          <div className="stack">
            <Card
              title={`Editing: ${profile.fullName}`}
              action={<VerificationBadge status={profile.verificationStatus} />}
            >
              <CandidateSelfEditForm
                candidate={{
                  id: profile.id,
                  biography: profile.biography,
                  education: profile.education,
                  experience: profile.experience,
                  previousPositions: profile.previousPositions,
                  agenda: profile.agenda,
                  keyIssues: profile.keyIssues,
                  photoUrl: profile.photoUrl,
                }}
              />
            </Card>

            {profile.factChecks.length > 0 ? (
              <Card title="Fact checks about you">
                <p className="small muted">
                  You may submit a response to any fact check. Responses are published alongside the
                  verdict and never replace it. Contact the editorial team to submit one.
                </p>
                <div className="stack">
                  {profile.factChecks.map((factCheck) => (
                    <div key={factCheck.id} className="row-between">
                      <Link href={`/fact-checks/${factCheck.slug}`}>{factCheck.claim}</Link>
                      <span className="row">
                        <VerdictBadge verdict={factCheck.verdict} />
                        {factCheck.subjectResponse ? (
                          <span className="badge badge-purple">Response attached</span>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          <aside className="stack">
            <Card title="Read-only records">
              <dl className="kv">
                <dt>Party</dt>
                <dd>{profile.party?.name ?? "Independent"}</dd>
                <dt>Constituency</dt>
                <dd>{profile.constituency?.name ?? "Not recorded"}</dd>
                <dt>Verification</dt>
                <dd>
                  <VerificationBadge status={profile.verificationStatus} />
                </dd>
                <dt>Public rating</dt>
                <dd>
                  {ratingCount === 0
                    ? "No ratings yet"
                    : `${ratingAverage.toFixed(1)}/5 from ${ratingCount} ratings`}
                </dd>
              </dl>
              <hr className="divider" />
              <p className="small muted" style={{ margin: 0 }}>
                Party, constituency, verification status, official results, ratings and fact-check
                verdicts are editorial or official records. They are not editable from this portal.
              </p>
            </Card>

            <Card title="Your public profile">
              <Link className="btn btn-sm btn-ghost btn-block" href={`/candidates/${profile.slug}`}>
                View as the public sees it
              </Link>
            </Card>
          </aside>
        </div>
      ) : (
        <div className="grid grid-sidebar">
          <Card title="Claim your candidate profile">
            <CandidateClaimForm candidates={unclaimed} />
          </Card>

          <aside className="stack">
            <Card title="Your claim requests">
              {claims.length === 0 ? (
                <EmptyState title="No claims submitted" />
              ) : (
                <ul className="timeline">
                  {claims.map((claim) => (
                    <li key={claim.id}>
                      <div className="when">{formatDateTime(claim.createdAt)}</div>
                      <div className="what">
                        {claim.candidate.fullName} <ClaimBadge status={claim.status} />
                      </div>
                      <div className="small faint mono">{claim.reference}</div>
                      {claim.reviewNote ? (
                        <p className="small" style={{ margin: ".2rem 0 0" }}>
                          {claim.reviewNote}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="How review works">
              <ol className="small muted" style={{ paddingLeft: "1.1rem", margin: 0 }}>
                <li>You submit identity evidence.</li>
                <li>Staff review the evidence.</li>
                <li>An administrator approves or rejects the claim.</li>
                <li>On approval your account is linked to the profile.</li>
                <li>Permitted fields become editable; every change is logged.</li>
              </ol>
            </Card>
          </aside>
        </div>
      )}

      {claims.length > 0 && profile ? (
        <Card title="Claim history" className="section-tight">
          <ul className="small" style={{ paddingLeft: "1.1rem", margin: 0 }}>
            {claims.map((claim) => (
              <li key={claim.id}>
                {claim.candidate.fullName} — {claim.status} ({formatDate(claim.createdAt)})
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
