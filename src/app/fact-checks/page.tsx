import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, EmptyState, Stat } from "@/components/ui";
import { VerdictBadge } from "@/components/status";
import { formatDate, humanize } from "@/lib/format";

export const metadata = { title: "Fact checks" };

const VERDICTS = [
  "TRUE",
  "MOSTLY_TRUE",
  "MISLEADING",
  "FALSE",
  "UNVERIFIED",
  "INSUFFICIENT_EVIDENCE",
] as const;

export default async function FactChecksPage({
  searchParams,
}: {
  searchParams: Promise<{ verdict?: string }>;
}) {
  const params = await searchParams;
  const verdict = VERDICTS.find((value) => value === params.verdict);

  const [factChecks, counts] = await Promise.all([
    prisma.factCheck.findMany({
      where: { status: "PUBLISHED", ...(verdict ? { verdict } : {}) },
      orderBy: { publishedAt: "desc" },
      include: { candidate: { select: { fullName: true, slug: true } } },
      take: 50,
    }),
    prisma.factCheck.groupBy({
      by: ["verdict"],
      where: { status: "PUBLISHED" },
      _count: { _all: true },
    }),
  ]);

  const total = counts.reduce((sum, row) => sum + row._count._all, 0);
  const falseish = counts
    .filter((row) => row.verdict === "FALSE" || row.verdict === "MISLEADING")
    .reduce((sum, row) => sum + row._count._all, 0);

  return (
    <div className="wrap section">
      <h1>Fact checks</h1>
      <p className="muted">
        Claim intake → evidence collection → reviewer → verdict → editor approval → publication.
        Subjects may attach a response; a response never overwrites the verdict.
      </p>

      <div className="grid grid-3">
        <Stat label="Published checks" value={total} />
        <Stat label="False or misleading" value={falseish} accent="red" />
        <Stat
          label="Verified true"
          value={counts.find((row) => row.verdict === "TRUE")?._count._all ?? 0}
          accent="green"
        />
      </div>

      <div className="chip-row" style={{ margin: "1rem 0" }}>
        <Link href="/fact-checks" className={`chip${verdict ? "" : " active"}`}>
          All
        </Link>
        {VERDICTS.map((value) => (
          <Link
            key={value}
            href={`/fact-checks?verdict=${value}`}
            className={`chip${verdict === value ? " active" : ""}`}
          >
            {humanize(value)} ({counts.find((row) => row.verdict === value)?._count._all ?? 0})
          </Link>
        ))}
      </div>

      {factChecks.length === 0 ? (
        <Card>
          <EmptyState title="No published fact checks match that filter" />
        </Card>
      ) : (
        <div className="stack">
          {factChecks.map((factCheck) => (
            <Card key={factCheck.id}>
              <div className="row-between">
                <div className="grow">
                  <h3 style={{ margin: 0 }}>
                    <Link href={`/fact-checks/${factCheck.slug}`}>{factCheck.claim}</Link>
                  </h3>
                  <p className="small muted" style={{ margin: ".25rem 0 0" }}>
                    {factCheck.claimant ? `Claim by ${factCheck.claimant}` : "Claimant not recorded"}
                    {factCheck.candidate ? (
                      <>
                        {" · "}
                        <Link href={`/candidates/${factCheck.candidate.slug}`}>
                          {factCheck.candidate.fullName}
                        </Link>
                      </>
                    ) : null}
                    {" · "}
                    {formatDate(factCheck.publishedAt)}
                  </p>
                  {factCheck.summary ? (
                    <p className="small" style={{ margin: ".35rem 0 0" }}>
                      {factCheck.summary}
                    </p>
                  ) : null}
                </div>
                <VerdictBadge verdict={factCheck.verdict} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
