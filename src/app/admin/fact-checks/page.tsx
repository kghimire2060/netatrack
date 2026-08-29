import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { Card, EmptyState, Stat } from "@/components/ui";
import { ContentBadge, VerdictBadge } from "@/components/status";
import { FactCheckReviewForm } from "@/components/admin-forms";
import { formatDateTime } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";

export const metadata = { title: "Fact checks" };

export default async function AdminFactChecksPage() {
  const actor = await requireActorPage("/admin/fact-checks");
  const { t, locale } = await getTranslator();
  if (!(await can({ userId: actor.userId, role: actor.role }, "factcheck.review"))) redirect("/admin");
  const canReview = await can({ userId: actor.userId, role: actor.role }, "factcheck.review");
  const canPublish = await can({ userId: actor.userId, role: actor.role }, "factcheck.publish");

  const [factChecks, counts] = await Promise.all([
    prisma.factCheck.findMany({
      orderBy: { updatedAt: "desc" },
      take: 60,
      include: {
        candidate: { select: { fullName: true, slug: true } },
        reviewer: { select: { fullName: true } },
        editor: { select: { fullName: true } },
        _count: { select: { evidence: true } },
      },
    }),
    prisma.factCheck.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return (
    <>
      <h1>{t("adm.factChecks")}</h1>
      <p className="muted">
        Claim intake → evidence → reviewer → verdict → editor approval → publish. A subject response
        can be attached but never replaces the verdict.
      </p>

      <div className="grid grid-3">
        <Stat label={t("adm.total")} value={factChecks.length} />
        <Stat
          label={t("adm.published")}
          value={counts.find((r) => r.status === "PUBLISHED")?._count._all ?? 0}
          accent="green"
        />
        <Stat
          label={t("adm.inPipeline")}
          value={counts
            .filter((r) => r.status !== "PUBLISHED" && r.status !== "ARCHIVED")
            .reduce((sum, r) => sum + r._count._all, 0)}
          accent="orange"
        />
      </div>

      {factChecks.length === 0 ? (
        <Card className="section-tight">
          <EmptyState title={t("adm.noMatch")} />
        </Card>
      ) : (
        <div className="stack" style={{ marginTop: "1rem" }}>
          {factChecks.map((factCheck) => (
            <Card key={factCheck.id}>
              <div className="row-between">
                <div className="grow">
                  <div className="row" style={{ gap: ".5rem" }}>
                    <strong>
                      {factCheck.status === "PUBLISHED" ? (
                        <Link href={`/fact-checks/${factCheck.slug}`}>{factCheck.claim}</Link>
                      ) : (
                        factCheck.claim
                      )}
                    </strong>
                    <VerdictBadge verdict={factCheck.verdict} />
                    <ContentBadge status={factCheck.status} />
                  </div>
                  <div className="small faint">
                    {factCheck.claimant ? `Claim by ${factCheck.claimant}` : "Claimant not recorded"}
                    {factCheck.candidate ? ` · ${factCheck.candidate.fullName}` : ""} ·{" "}
                    {factCheck._count.evidence} evidence items · reviewer{" "}
                    {factCheck.reviewer?.fullName ?? "unassigned"} · updated{" "}
                    {formatDateTime(factCheck.updatedAt)}
                  </div>
                  {factCheck.subjectResponse ? (
                    <div className="notice notice-purple" style={{ marginTop: ".5rem" }}>
                      Subject response attached — published alongside the verdict.
                    </div>
                  ) : null}
                  {factCheck._count.evidence === 0 && factCheck.status !== "DRAFT" ? (
                    <div className="notice" style={{ marginTop: ".5rem" }}>
                      No evidence records attached yet.
                    </div>
                  ) : null}
                </div>
              </div>
              {canReview ? (
                <>
                  <hr className="divider" />
                  <FactCheckReviewForm
                    factCheckId={factCheck.id}
                    verdict={factCheck.verdict}
                    status={factCheck.status}
                    canPublish={canPublish}
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
