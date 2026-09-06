import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { Card, EmptyState, Stat } from "@/components/ui";
import { ContentBadge, MediaKindBadge } from "@/components/status";
import { MediaCreateForm, ContentStatusForm } from "@/components/admin-forms";
import { formatDate } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";

export const metadata = { title: "Evidence photographs" };

export default async function AdminMediaPage() {
  const actor = await requireActorPage("/admin/media");
  const { t } = await getTranslator();
  if (!(await can({ userId: actor.userId, role: actor.role }, "media.manage"))) redirect("/admin");

  const [media, counts, candidates, projects] = await Promise.all([
    prisma.mediaItem.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        candidate: { select: { fullName: true, slug: true } },
        project: { select: { title: true } },
      },
    }),
    prisma.mediaItem.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.candidate.findMany({
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    prisma.project.findMany({
      orderBy: { lastUpdateAt: "desc" },
      take: 200,
      select: { id: true, title: true },
    }),
  ]);

  // Both block publication, so surfacing the count tells an editor how much
  // sits in the queue for a reason they can actually fix.
  const blocked = media.filter((m) => !m.altText || !m.credit).length;

  return (
    <>
      <h1>{t("cand.mediaEvidence")}</h1>
      <p className="muted">
        Photographic evidence of projects and activity. Publishing requires alt text and a credit.
        The date taken is stored separately from the upload date, so a photograph is never captioned
        with the day it was added.
      </p>

      <div className="grid grid-4">
        <Stat label="Recorded" value={media.length} />
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
        <Stat label="Missing alt text or credit" value={blocked} accent="red" />
      </div>

      <Card title="Record a photograph" className="section-tight">
        <MediaCreateForm candidates={candidates} projects={projects} />
      </Card>

      {media.length === 0 ? (
        <Card className="section-tight">
          <EmptyState title={t("adm.noMatch")} />
        </Card>
      ) : (
        <div className="stack" style={{ marginTop: "1rem" }}>
          {media.map((item) => (
            <Card key={item.id}>
              <div className="row" style={{ gap: ".8rem", alignItems: "flex-start" }}>
                <img
                  src={item.thumbnailUrl ?? item.imageUrl}
                  alt={item.altText ?? ""}
                  style={{
                    width: "7rem",
                    aspectRatio: "4 / 3",
                    objectFit: "cover",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    flex: "0 0 auto",
                  }}
                />
                <div className="grow">
                  <div className="row" style={{ gap: ".5rem" }}>
                    <ContentBadge status={item.status} />
                    <MediaKindBadge kind={item.kind} />
                    {item.altText ? null : <span className="badge badge-muted">No alt text</span>}
                    {item.credit ? null : <span className="badge badge-muted">No credit</span>}
                  </div>

                  {item.caption ? (
                    <p className="small" style={{ margin: ".35rem 0 0" }}>
                      {item.caption}
                    </p>
                  ) : null}

                  <div className="small faint" style={{ marginTop: ".3rem" }}>
                    {item.candidate ? (
                      <Link href={`/candidates/${item.candidate.slug}`}>
                        {item.candidate.fullName}
                      </Link>
                    ) : null}
                    {item.project ? `${item.candidate ? " · " : ""}${item.project.title}` : ""}
                    {item.capturedAt ? ` · taken ${formatDate(item.capturedAt)}` : " · date taken not recorded"}
                    {item.credit ? ` · © ${item.credit}` : ""}
                  </div>
                </div>
              </div>

              <hr className="divider" />
              <ContentStatusForm
                url={`/api/admin/media/${item.id}`}
                status={item.status}
                label="Photograph"
              />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
