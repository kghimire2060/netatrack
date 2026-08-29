import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { Card, EmptyState, Stat } from "@/components/ui";
import { PromiseBadge } from "@/components/status";
import { PromiseUpdateForm } from "@/components/admin-forms";
import { formatDateTime } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";

export const metadata = { title: "Promises" };

export default async function AdminPromisesPage() {
  const actor = await requireActorPage("/admin/promises");
  const { t, locale } = await getTranslator();
  if (!(await can({ userId: actor.userId, role: actor.role }, "promise.manage"))) redirect("/admin");
  const canManage = await can({ userId: actor.userId, role: actor.role }, "promise.manage");

  const [promises, counts] = await Promise.all([
    prisma.promise.findMany({
      orderBy: { lastUpdateAt: "desc" },
      take: 80,
      include: {
        candidate: { select: { fullName: true, slug: true } },
        constituency: { select: { name: true } },
        updates: { orderBy: { createdAt: "desc" }, take: 1, include: { actor: { select: { fullName: true } } } },
      },
    }),
    prisma.promise.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const stale = promises.filter(
    (promise) =>
      promise.status === "IN_PROGRESS" &&
      Date.now() - promise.lastUpdateAt.getTime() > 90 * 86_400_000
  ).length;

  return (
    <>
      <h1>{t("adm.promises")}</h1>
      <p className="muted">
        Every status change writes a dated update record. A promise cannot be marked completed
        without an evidence link.
      </p>

      <div className="grid grid-4">
        <Stat label={t("prom.tracked")} value={promises.length} />
        <Stat
          label={t("prom.completed")}
          value={counts.find((r) => r.status === "COMPLETED")?._count._all ?? 0}
          accent="green"
        />
        <Stat
          label={t("prom.delayed")}
          value={counts.find((r) => r.status === "DELAYED")?._count._all ?? 0}
          accent="red"
        />
        <Stat label={t("adm.needsAttention")} value={stale} accent="orange" />
      </div>

      {promises.length === 0 ? (
        <Card className="section-tight">
          <EmptyState title={t("adm.noMatch")} />
        </Card>
      ) : (
        <div className="stack" style={{ marginTop: "1rem" }}>
          {promises.map((promise) => (
            <Card key={promise.id}>
              <div className="row-between">
                <div className="grow">
                  <div className="row" style={{ gap: ".5rem" }}>
                    <strong>{promise.title}</strong>
                    <PromiseBadge status={promise.status} />
                    {promise.evidenceUrl ? null : <span className="badge badge-muted">No evidence</span>}
                  </div>
                  <div className="small faint">
                    {promise.candidate ? (
                      <Link href={`/candidates/${promise.candidate.slug}`}>
                        {promise.candidate.fullName}
                      </Link>
                    ) : (
                      "Party commitment"
                    )}
                    {promise.constituency ? ` · ${promise.constituency.name}` : ""} ·{" "}
                    {promise.category ?? "Uncategorised"} · last update{" "}
                    {formatDateTime(promise.lastUpdateAt)}
                    {promise.updates[0]?.actor
                      ? ` by ${promise.updates[0].actor.fullName}`
                      : ""}
                  </div>
                  {promise.updates[0]?.note ? (
                    <p className="small" style={{ margin: ".35rem 0 0" }}>
                      {promise.updates[0].note}
                    </p>
                  ) : null}
                </div>
              </div>
              {canManage ? (
                <>
                  <hr className="divider" />
                  <PromiseUpdateForm promiseId={promise.id} status={promise.status} />
                </>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
