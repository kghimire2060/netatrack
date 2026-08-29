import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, Card, EmptyState, Pager } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";

export const metadata = { title: "News" };

const PAGE_SIZE = 10;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const { t } = await getTranslator();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const where = {
    status: "PUBLISHED" as const,
    ...(params.category ? { category: params.category } : {}),
  };

  const [total, articles, categories] = await Promise.all([
    prisma.newsArticle.count({ where }),
    prisma.newsArticle.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        publishedAt: true,
        author: { select: { fullName: true } },
        _count: { select: { revisions: true, factChecks: true } },
      },
    }),
    prisma.newsArticle.findMany({
      where: { status: "PUBLISHED", category: { not: null } },
      select: { category: true },
      distinct: ["category"],
    }),
  ]);

  return (
    <div className="wrap section">
      <h1>{t("news.title")}</h1>
      <p className="muted">{t("news.lede")}</p>

      <div className="chip-row" style={{ marginBottom: "1rem" }}>
        <Link href="/news" className={`chip${params.category ? "" : " active"}`}>
          {t("news.all")}
        </Link>
        {categories.map((row) => (
          <Link
            key={row.category}
            href={`/news?category=${encodeURIComponent(row.category ?? "")}`}
            className={`chip${params.category === row.category ? " active" : ""}`}
          >
            {row.category}
          </Link>
        ))}
      </div>

      {articles.length === 0 ? (
        <Card>
          <EmptyState title="No published articles yet" />
        </Card>
      ) : (
        <div className="stack">
          {articles.map((article) => (
            <Card key={article.id}>
              <div className="row" style={{ gap: ".5rem" }}>
                {article.category ? <Badge tone="muted">{article.category}</Badge> : null}
                <span className="small faint">{formatDate(article.publishedAt)}</span>
                {article._count.revisions > 0 ? <Badge tone="warn">{t("news.corrected")}</Badge> : null}
                {article._count.factChecks > 0 ? <Badge tone="purple">{t("news.factChecked")}</Badge> : null}
              </div>
              <h3 style={{ margin: ".35rem 0 .2rem" }}>
                <Link href={`/news/${article.slug}`}>{article.title}</Link>
              </h3>
              {article.excerpt ? <p className="muted" style={{ margin: 0 }}>{article.excerpt}</p> : null}
              {article.author ? (
                <p className="small faint" style={{ margin: ".3rem 0 0" }}>
                  By {article.author.fullName}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <Pager
        page={page}
        pages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        basePath="/news"
        query={{ category: params.category }}
      />
    </div>
  );
}
