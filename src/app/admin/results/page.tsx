import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Badge, Card, EmptyState, Stat } from "@/components/ui";
import { VerificationBadge } from "@/components/status";
import { ResultPublishForm } from "@/components/admin-forms";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";

export const metadata = { title: "Results" };

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ election?: string; status?: string }>;
}) {
  const actor = await requireActor();
  if (!(await can({ userId: actor.userId, role: actor.role }, "result.manage"))) redirect("/admin");
  const canPublish = await can({ userId: actor.userId, role: actor.role }, "result.publish");

  const params = await searchParams;
  const elections = await prisma.election.findMany({
    orderBy: { year: "desc" },
    select: { id: true, slug: true, name: true },
  });
  const selected = params.election ?? elections[0]?.slug;
  const election = elections.find((item) => item.slug === selected);

  const results = election
    ? await prisma.result.findMany({
        where: {
          electionId: election.id,
          ...(params.status ? { status: params.status as "PENDING" | "VERIFIED" | "REJECTED" } : {}),
        },
        orderBy: [{ constituency: { name: "asc" } }, { votes: "desc" }],
        include: {
          candidate: { select: { fullName: true, slug: true } },
          party: { select: { shortName: true, name: true } },
          constituency: { select: { name: true, district: true } },
        },
      })
    : [];

  const pending = results.filter((result) => result.status === "PENDING").length;

  return (
    <>
      <h1>Election results</h1>
      <p className="muted">
        An official result cannot be verified without a recorded source. Publishing writes an audit
        entry with the source and vote count.
      </p>

      <div className="grid grid-3">
        <Stat label="Result records" value={results.length} />
        <Stat label="Awaiting verification" value={pending} accent="orange" />
        <Stat
          label="Verified"
          value={results.filter((result) => result.status === "VERIFIED").length}
          accent="green"
        />
      </div>

      <Card className="section-tight">
        <form method="get" className="row" style={{ gap: ".6rem" }}>
          <select name="election" defaultValue={selected ?? ""} aria-label="Election">
            {elections.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={params.status ?? ""} aria-label="Status">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button className="btn btn-sm">Filter</button>
        </form>
      </Card>

      {results.length === 0 ? (
        <Card className="section-tight">
          <EmptyState title="No result records for this election" />
        </Card>
      ) : (
        <div className="stack" style={{ marginTop: "1rem" }}>
          {results.map((result) => (
            <Card key={result.id}>
              <div className="row-between">
                <div className="grow">
                  <div className="row" style={{ gap: ".5rem" }}>
                    <strong>{result.constituency.name}</strong>
                    <span className="muted">
                      <Link href={`/candidates/${result.candidate.slug}`}>
                        {result.candidate.fullName}
                      </Link>
                    </span>
                    {result.isWinner ? <Badge tone="good">Elected</Badge> : null}
                    <VerificationBadge status={result.status} />
                  </div>
                  <div className="small faint">
                    {result.party?.shortName ?? result.party?.name ?? "Independent"} ·{" "}
                    {formatNumber(result.votes)} votes · {formatPercent(result.voteShare)} share ·
                    turnout {formatPercent(result.turnoutPct)} · updated{" "}
                    {formatDateTime(result.updatedAt)}
                  </div>
                </div>
              </div>
              {canPublish ? (
                <>
                  <hr className="divider" />
                  <ResultPublishForm
                    resultId={result.id}
                    sourceName={result.sourceName}
                    sourceUrl={result.sourceUrl}
                  />
                </>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
