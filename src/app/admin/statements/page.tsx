import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { Card, EmptyState, Stat } from "@/components/ui";
import { ContentBadge, StatementContextBadge, VerdictBadge } from "@/components/status";
import { StatementCreateForm, ContentStatusForm } from "@/components/admin-forms";
import { formatDate } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";

export const metadata = { title: "Statements" };

export default async function AdminStatementsPage() {
  const actor = await requireActorPage("/admin/statements");
  const { t } = await getTranslator();
  if (!(await can({ userId: actor.userId, role: actor.role }, "statement.manage")))
    redirect("/admin");

  const [statements, counts, candidates] = await Promise.all([
    prisma.statement.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 80,
      include: {
        candidate: { select: { fullName: true, slug: true } },
        factCheck: { select: { slug: true, verdict: true, status: true } },
      },
    }),
    prisma.statement.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.candidate.findMany({
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);

  const unsourced = statements.filter((s) => !s.sourceUrl && !s.sourceName).length;

  return (
    <>
      <h1>{t("cand.statements")}</h1>
      <p className="muted">
        Quotes are stored verbatim with where and when they were said. A statement cannot be
        published without a source, and a statement is never the same record as a fact-check
        verdict on it.
      </p>

      <div className="grid grid-4">
        <Stat label="Recorded" value={statements.length} />
        <Stat
          label="Published"
          value={counts.find((r) => r.status === "PUBLISHED")?._count._all ?? 0}
          accent="green"
        />
        <Stat
          label="Draft"
          value={counts.find((r) => r.status === "DRAFT")?._count._all ?? 0}
          accent="orange"
        />
        <Stat label="No source" value={unsourced} accent="red" />
      </div>

      <Card title="Record a statement" className="section-tight">
        <StatementCreateForm candidates={candidates} />
      </Card>

      {statements.length === 0 ? (
        <Card className="section-tight">
          <EmptyState title={t("adm.noMatch")} />
        </Card>
      ) : (
        <div className="stack" style={{ marginTop: "1rem" }}>
          {statements.map((s) => (
            <Card key={s.id}>
              <div className="row" style={{ gap: ".5rem" }}>
                <Link href={`/candidates/${s.candidate.slug}`}>
                  <strong>{s.candidate.fullName}</strong>
                </Link>
                <ContentBadge status={s.status} />
                <StatementContextBadge context={s.context} />
                {s.sourceUrl || s.sourceName ? null : (
                  <span className="badge badge-muted">No source</span>
                )}
              </div>

              <blockquote className="statement-quote" style={{ marginTop: ".5rem" }}>
                {s.quote}
              </blockquote>

              <div className="small faint" style={{ marginTop: ".35rem" }}>
                {s.statedAt ? formatDate(s.statedAt) : "Date not recorded"}
                {s.venue ? ` · ${s.venue}` : ""}
                {s.topic ? ` · ${s.topic}` : ""}
                {s.sourceUrl ? (
                  <>
                    {" · "}
                    <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                      {s.sourceName ?? "Source"}
                    </a>
                  </>
                ) : s.sourceName ? (
                  ` · ${s.sourceName}`
                ) : (
                  ""
                )}
              </div>

              {s.factCheck ? (
                <div className="row" style={{ gap: ".4rem", marginTop: ".4rem" }}>
                  <VerdictBadge verdict={s.factCheck.verdict} />
                  <Link className="small" href={`/fact-checks/${s.factCheck.slug}`}>
                    Fact-check ({s.factCheck.status.toLowerCase()})
                  </Link>
                </div>
              ) : null}

              <hr className="divider" />
              <ContentStatusForm
                url={`/api/admin/statements/${s.id}`}
                status={s.status}
                label="Statement"
              />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
