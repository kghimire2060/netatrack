import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge, Breadcrumb, Card } from "@/components/ui";
import { VerdictBadge } from "@/components/status";
import { formatDate, formatDateTime } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await prisma.newsArticle.findUnique({ where: { slug }, select: { title: true } });
  return { title: article?.title ?? "Article" };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const article = await prisma.newsArticle.findUnique({
    where: { slug },
    include: {
      author: { select: { fullName: true } },
      revisions: { orderBy: { createdAt: "desc" }, include: { editor: { select: { fullName: true } } } },
      factChecks: {
        where: { status: "PUBLISHED" },
        select: { slug: true, claim: true, verdict: true },
      },
    },
  });

  if (!article || article.status !== "PUBLISHED") notFound();

  const corrections = article.revisions.filter((revision) => revision.isCorrection);

  return (
    <div className="wrap section">
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "News", href: "/news" }, { label: article.title }]}
      />

      <article style={{ maxWidth: "72ch" }}>
        <div className="row" style={{ gap: ".5rem" }}>
          {article.category ? <Badge tone="muted">{article.category}</Badge> : null}
          <span className="small faint">Published {formatDate(article.publishedAt)}</span>
        </div>
        <h1>{article.title}</h1>
        {article.excerpt ? <p className="muted" style={{ fontSize: "1.05rem" }}>{article.excerpt}</p> : null}
        {article.author ? <p className="small faint">By {article.author.fullName}</p> : null}

        {corrections.length > 0 ? (
          <div className="notice" style={{ margin: "1rem 0" }}>
            <strong>This article has been corrected.</strong> The correction history is shown at the
            end of the article and is never removed.
          </div>
        ) : null}

        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>{article.body}</div>

        {article.sources ? (
          <Card title="Sources" className="section-tight">
            <div className="small" style={{ whiteSpace: "pre-wrap" }}>
              {article.sources}
            </div>
          </Card>
        ) : null}

        {article.factChecks.length > 0 ? (
          <Card title="Related fact checks" className="section-tight">
            <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
              {article.factChecks.map((factCheck) => (
                <li key={factCheck.slug} className="small">
                  <Link href={`/fact-checks/${factCheck.slug}`}>{factCheck.claim}</Link>{" "}
                  <VerdictBadge verdict={factCheck.verdict} />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {article.revisions.length > 0 ? (
          <Card title="Correction and revision history" className="section-tight">
            <ul className="timeline">
              {article.revisions.map((revision) => (
                <li key={revision.id} className={revision.isCorrection ? "is-warn" : "is-muted"}>
                  <div className="when">{formatDateTime(revision.createdAt)}</div>
                  <div className="what">
                    {revision.isCorrection ? "Correction" : "Pre-publication edit"}
                  </div>
                  <p className="small" style={{ margin: ".15rem 0 0" }}>
                    {revision.summary}
                    {revision.editor ? (
                      <span className="faint"> — {revision.editor.fullName}</span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </article>
    </div>
  );
}
