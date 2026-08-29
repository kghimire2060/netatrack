import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Breadcrumb, Card } from "@/components/ui";
import { VerdictBadge } from "@/components/status";
import { formatDate } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const factCheck = await prisma.factCheck.findUnique({ where: { slug }, select: { claim: true } });
  return { title: factCheck?.claim.slice(0, 60) ?? "Fact check" };
}

export default async function FactCheckPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const factCheck = await prisma.factCheck.findUnique({
    where: { slug },
    include: {
      evidence: true,
      candidate: { select: { fullName: true, slug: true } },
      article: { select: { title: true, slug: true } },
      reviewer: { select: { fullName: true } },
      editor: { select: { fullName: true } },
    },
  });

  if (!factCheck || factCheck.status !== "PUBLISHED") notFound();

  return (
    <div className="wrap section">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Fact checks", href: "/fact-checks" },
          { label: factCheck.claim.slice(0, 40) + "…" },
        ]}
      />

      <div style={{ maxWidth: "72ch" }}>
        <VerdictBadge verdict={factCheck.verdict} />
        <h1 style={{ marginTop: ".5rem" }}>{factCheck.claim}</h1>
        <p className="muted">
          {factCheck.claimant ? `Claimed by ${factCheck.claimant}` : "Claimant not recorded"}
          {factCheck.claimDate ? ` on ${formatDate(factCheck.claimDate)}` : ""}
          {factCheck.candidate ? (
            <>
              {" · "}
              <Link href={`/candidates/${factCheck.candidate.slug}`}>
                {factCheck.candidate.fullName}
              </Link>
            </>
          ) : null}
        </p>

        {factCheck.summary ? (
          <Card title="Verdict summary">
            <p style={{ margin: 0 }}>{factCheck.summary}</p>
          </Card>
        ) : null}

        {factCheck.analysis ? (
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75, marginTop: "1rem" }}>
            {factCheck.analysis}
          </div>
        ) : null}

        {factCheck.evidence.length > 0 ? (
          <Card title="Evidence" className="section-tight">
            <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
              {factCheck.evidence.map((item) => (
                <li key={item.id} className="small" style={{ marginBottom: ".3rem" }}>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer nofollow">
                      {item.label}
                    </a>
                  ) : (
                    item.label
                  )}
                  {item.note ? <div className="faint">{item.note}</div> : null}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {factCheck.subjectResponse ? (
          <Card title="Response from the subject" className="section-tight">
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{factCheck.subjectResponse}</p>
            <p className="small faint" style={{ marginTop: ".6rem", marginBottom: 0 }}>
              Published unedited alongside the verdict. A response is a right of reply — it does not
              change the editorial finding.
            </p>
          </Card>
        ) : null}

        <Card title="Editorial record" className="section-tight">
          <dl className="kv">
            <dt>Published</dt>
            <dd>{formatDate(factCheck.publishedAt)}</dd>
            <dt>Reviewer</dt>
            <dd>{factCheck.reviewer?.fullName ?? "Not recorded"}</dd>
            <dt>Approving editor</dt>
            <dd>{factCheck.editor?.fullName ?? "Not recorded"}</dd>
            {factCheck.claimSource ? (
              <>
                <dt>Claim source</dt>
                <dd>
                  <a href={factCheck.claimSource} target="_blank" rel="noopener noreferrer nofollow">
                    {factCheck.claimSource}
                  </a>
                </dd>
              </>
            ) : null}
            {factCheck.article ? (
              <>
                <dt>Related article</dt>
                <dd>
                  <Link href={`/news/${factCheck.article.slug}`}>{factCheck.article.title}</Link>
                </dd>
              </>
            ) : null}
          </dl>
        </Card>
      </div>
    </div>
  );
}
