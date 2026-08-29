import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Card, EmptyState, Stat } from "@/components/ui";
import { ContentBadge } from "@/components/status";
import { NewsWorkflowForm } from "@/components/admin-forms";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "News" };

export default async function AdminNewsPage() {
  const actor = await requireActor();
  if (!(await can({ userId: actor.userId, role: actor.role }, "news.edit"))) redirect("/admin");
  const canEdit = await can({ userId: actor.userId, role: actor.role }, "news.edit");
  const canPublish = await can({ userId: actor.userId, role: actor.role }, "news.publish");

  const [articles, counts] = await Promise.all([
    prisma.newsArticle.findMany({
      orderBy: { updatedAt: "desc" },
      take: 60,
      include: {
        author: { select: { fullName: true } },
        _count: { select: { revisions: true } },
      },
    }),
    prisma.newsArticle.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return (
    <>
      <h1>News</h1>
      <p className="muted">
        Draft → editorial review → source review → approval → publish. Editing a published article
        requires a correction summary, which is preserved in the public revision history.
      </p>

      <div className="grid grid-4">
        <Stat label="Total articles" value={articles.length} />
        <Stat
          label="Published"
          value={counts.find((r) => r.status === "PUBLISHED")?._count._all ?? 0}
          accent="green"
        />
        <Stat
          label="In review"
          value={counts
            .filter((r) => r.status === "EDITORIAL_REVIEW" || r.status === "SOURCE_REVIEW")
            .reduce((sum, r) => sum + r._count._all, 0)}
          accent="orange"
        />
        <Stat label="Drafts" value={counts.find((r) => r.status === "DRAFT")?._count._all ?? 0} />
      </div>

      {articles.length === 0 ? (
        <Card className="section-tight">
          <EmptyState title="No articles yet" />
        </Card>
      ) : (
        <div className="stack" style={{ marginTop: "1rem" }}>
          {articles.map((article) => (
            <Card key={article.id}>
              <div className="row-between">
                <div className="grow">
                  <div className="row" style={{ gap: ".5rem" }}>
                    <strong>
                      {article.status === "PUBLISHED" ? (
                        <Link href={`/news/${article.slug}`}>{article.title}</Link>
                      ) : (
                        article.title
                      )}
                    </strong>
                    <ContentBadge status={article.status} />
                    {article._count.revisions > 0 ? (
                      <span className="badge badge-warn">{article._count.revisions} revisions</span>
                    ) : null}
                  </div>
                  <div className="small faint">
                    {article.category ?? "Uncategorised"} ·{" "}
                    {article.author?.fullName ?? "No author"} · updated{" "}
                    {formatDateTime(article.updatedAt)}
                    {article.sources ? "" : " · no sources recorded"}
                  </div>
                </div>
              </div>
              {canEdit ? (
                <>
                  <hr className="divider" />
                  <NewsWorkflowForm
                    articleId={article.id}
                    status={article.status}
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
