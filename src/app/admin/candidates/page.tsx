import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { Card, EmptyState, Pager, Stat } from "@/components/ui";
import { VerificationBadge } from "@/components/status";
import { CandidateVerifyForm } from "@/components/admin-forms";
import { formatDate } from "@/lib/format";
import type { Prisma, VerificationStatus } from "@prisma/client";

export const metadata = { title: "Candidates" };

const PAGE_SIZE = 20;

export default async function AdminCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; verification?: string; page?: string }>;
}) {
  const actor = await requireActorPage("/admin/candidates");
  if (!(await can({ userId: actor.userId, role: actor.role }, "candidate.edit"))) redirect("/admin");
  const canVerify = await can({ userId: actor.userId, role: actor.role }, "candidate.verify");

  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const verification = ["PENDING", "VERIFIED", "REJECTED"].includes(params.verification ?? "")
    ? (params.verification as VerificationStatus)
    : undefined;

  const where: Prisma.CandidateWhereInput = {
    ...(verification ? { verificationStatus: verification } : {}),
    ...(params.q ? { fullName: { contains: params.q, mode: "insensitive" as const } } : {}),
  };

  const [total, candidates, counts] = await Promise.all([
    prisma.candidate.count({ where }),
    prisma.candidate.findMany({
      where,
      orderBy: [{ verificationStatus: "asc" }, { fullName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        party: { select: { shortName: true, name: true } },
        constituency: { select: { name: true, district: true } },
        account: { select: { fullName: true } },
        _count: { select: { ratings: true, sources: true, promises: true } },
      },
    }),
    prisma.candidate.groupBy({ by: ["verificationStatus"], _count: { _all: true } }),
  ]);

  return (
    <>
      <h1>Candidates</h1>
      <p className="muted">
        Editorial candidate records. Verification requires a recorded source; candidate accounts can
        never change a verification decision.
      </p>

      <div className="grid grid-3">
        <Stat
          label="Verified"
          value={counts.find((r) => r.verificationStatus === "VERIFIED")?._count._all ?? 0}
          accent="green"
        />
        <Stat
          label="Pending"
          value={counts.find((r) => r.verificationStatus === "PENDING")?._count._all ?? 0}
          accent="orange"
        />
        <Stat
          label="Rejected"
          value={counts.find((r) => r.verificationStatus === "REJECTED")?._count._all ?? 0}
        />
      </div>

      <Card className="section-tight">
        <form method="get" className="row" style={{ gap: ".6rem" }}>
          <input name="q" defaultValue={params.q ?? ""} placeholder="Candidate name" className="grow" />
          <select name="verification" defaultValue={params.verification ?? ""} aria-label="Verification">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button className="btn btn-sm">Filter</button>
        </form>
      </Card>

      {candidates.length === 0 ? (
        <Card className="section-tight">
          <EmptyState title="No candidates match those filters" />
        </Card>
      ) : (
        <div className="stack" style={{ marginTop: "1rem" }}>
          {candidates.map((candidate) => (
            <Card key={candidate.id}>
              <div className="row-between">
                <div className="grow">
                  <div className="row" style={{ gap: ".5rem" }}>
                    <strong>
                      <Link href={`/candidates/${candidate.slug}`}>{candidate.fullName}</Link>
                    </strong>
                    <VerificationBadge status={candidate.verificationStatus} />
                    {candidate.account ? (
                      <span className="badge badge-purple">Claimed by {candidate.account.fullName}</span>
                    ) : null}
                  </div>
                  <div className="small muted">
                    {candidate.party?.name ?? "Independent"}
                    {candidate.constituency
                      ? ` · ${candidate.constituency.name}, ${candidate.constituency.district}`
                      : ""}
                  </div>
                  <div className="small faint">
                    {candidate._count.sources} sources · {candidate._count.ratings} ratings ·{" "}
                    {candidate._count.promises} promises · added {formatDate(candidate.createdAt)}
                  </div>
                </div>
              </div>
              {canVerify ? (
                <>
                  <hr className="divider" />
                  <CandidateVerifyForm candidateId={candidate.id} />
                </>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <Pager
        page={page}
        pages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        basePath="/admin/candidates"
        query={{ q: params.q, verification: params.verification }}
      />
    </>
  );
}
