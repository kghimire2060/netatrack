import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Card, EmptyState, Stat } from "@/components/ui";
import { ClaimBadge } from "@/components/status";
import { ClaimReviewForm } from "@/components/admin-forms";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Profile claims" };

export default async function AdminClaimsPage() {
  const actor = await requireActor();
  if (!(await can({ userId: actor.userId, role: actor.role }, "candidate.claim.review")))
    redirect("/admin");

  const [pending, decided, counts] = await Promise.all([
    prisma.candidateClaim.findMany({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      orderBy: { createdAt: "asc" },
      include: {
        candidate: { select: { fullName: true, slug: true, accountId: true } },
        requester: { select: { fullName: true, email: true, createdAt: true } },
      },
    }),
    prisma.candidateClaim.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        candidate: { select: { fullName: true } },
        requester: { select: { fullName: true } },
        reviewer: { select: { fullName: true } },
      },
    }),
    prisma.candidateClaim.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return (
    <>
      <h1>Candidate profile claims</h1>
      <p className="muted">
        Approving a claim links the requester&apos;s account to the candidate record and grants edit
        access to permitted profile fields only.
      </p>

      <div className="grid grid-3">
        <Stat label="Awaiting review" value={pending.length} accent="orange" />
        <Stat
          label="Approved"
          value={counts.find((r) => r.status === "APPROVED")?._count._all ?? 0}
          accent="green"
        />
        <Stat label="Rejected" value={counts.find((r) => r.status === "REJECTED")?._count._all ?? 0} />
      </div>

      <div className="stack" style={{ marginTop: "1.2rem" }}>
        {pending.length === 0 ? (
          <Card>
            <EmptyState title="No claims awaiting review" />
          </Card>
        ) : (
          pending.map((claim) => (
            <Card key={claim.id}>
              <div className="row-between">
                <div className="grow">
                  <div className="row" style={{ gap: ".5rem" }}>
                    <strong>
                      <Link href={`/candidates/${claim.candidate.slug}`}>
                        {claim.candidate.fullName}
                      </Link>
                    </strong>
                    <ClaimBadge status={claim.status} />
                    <span className="mono small faint">{claim.reference}</span>
                  </div>
                  <div className="small muted">
                    Requested by {claim.requester.fullName} ({claim.requester.email}) ·{" "}
                    {formatDateTime(claim.createdAt)}
                  </div>
                  {claim.candidate.accountId ? (
                    <div className="alert alert-warn" style={{ marginTop: ".5rem" }}>
                      This profile is already linked to another account. Approving is blocked.
                    </div>
                  ) : null}
                </div>
              </div>
              <hr className="divider" />
              <p style={{ whiteSpace: "pre-wrap" }}>{claim.statement}</p>
              {claim.evidenceUrl ? (
                <p className="small">
                  Evidence:{" "}
                  <a href={claim.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow">
                    {claim.evidenceUrl}
                  </a>
                </p>
              ) : (
                <p className="small faint">No evidence URL supplied.</p>
              )}
              <ClaimReviewForm claimId={claim.id} />
            </Card>
          ))
        )}
      </div>

      {decided.length > 0 ? (
        <Card title="Recent decisions" className="section-tight">
          <div className="table-wrap">
            <table className="data responsive">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Candidate</th>
                  <th>Requester</th>
                  <th>Decision</th>
                  <th>Reviewer</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((claim) => (
                  <tr key={claim.id}>
                    <td data-label="Reference" className="mono small">
                      {claim.reference}
                    </td>
                    <td data-label="Candidate">{claim.candidate.fullName}</td>
                    <td data-label="Requester">{claim.requester.fullName}</td>
                    <td data-label="Decision">
                      <ClaimBadge status={claim.status} />
                    </td>
                    <td data-label="Reviewer">{claim.reviewer?.fullName ?? "—"}</td>
                    <td data-label="When">{formatDateTime(claim.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </>
  );
}
