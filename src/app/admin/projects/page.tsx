import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { Card, EmptyState, Stat } from "@/components/ui";
import { ProjectBadge } from "@/components/status";
import { ProjectCreateForm, ProjectUpdateForm } from "@/components/admin-forms";
import { formatDate, formatDateTime } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";

export const metadata = { title: "Projects" };

export default async function AdminProjectsPage() {
  const actor = await requireActorPage("/admin/projects");
  const { t } = await getTranslator();
  if (!(await can({ userId: actor.userId, role: actor.role }, "project.manage"))) redirect("/admin");

  const [projects, counts, constituencies, candidates] = await Promise.all([
    prisma.project.findMany({
      orderBy: { lastUpdateAt: "desc" },
      take: 80,
      include: {
        constituency: { select: { name: true, district: true, slug: true } },
        candidate: { select: { fullName: true, slug: true } },
        updates: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { actor: { select: { fullName: true } } },
        },
        _count: { select: { media: true } },
      },
    }),
    prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.constituency.findMany({
      orderBy: [{ district: "asc" }, { name: "asc" }],
      select: { id: true, name: true, district: true },
    }),
    prisma.candidate.findMany({
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);

  // A project in progress with no update for six months is the case the
  // tracker exists to surface: the work has not been abandoned on paper, but
  // nobody has confirmed it is still moving.
  const stale = projects.filter(
    (project) =>
      project.status === "IN_PROGRESS" &&
      Date.now() - project.lastUpdateAt.getTime() > 180 * 86_400_000
  ).length;

  return (
    <>
      <h1>{t("cand.projects")}</h1>
      <p className="muted">
        Constituency works recorded from published budget documents and implementing-agency
        records. Every status change writes a dated update, and a project cannot be recorded as
        completed without a source.
      </p>

      <div className="grid grid-4">
        <Stat label="Tracked" value={projects.length} />
        <Stat
          label="Completed"
          value={counts.find((r) => r.status === "COMPLETED")?._count._all ?? 0}
          accent="green"
        />
        <Stat
          label="Stalled"
          value={counts.find((r) => r.status === "STALLED")?._count._all ?? 0}
          accent="red"
        />
        <Stat label="No recent update" value={stale} accent="orange" />
      </div>

      <Card title="Record a project" className="section-tight">
        <ProjectCreateForm constituencies={constituencies} candidates={candidates} />
      </Card>

      {projects.length === 0 ? (
        <Card className="section-tight">
          <EmptyState title={t("adm.noMatch")} />
        </Card>
      ) : (
        <div className="stack" style={{ marginTop: "1rem" }}>
          {projects.map((project) => (
            <Card key={project.id}>
              <div className="row" style={{ gap: ".5rem" }}>
                <strong>{project.title}</strong>
                <ProjectBadge status={project.status} />
                {project.sourceUrl || project.sourceName ? null : (
                  <span className="badge badge-muted">No source</span>
                )}
                {project._count.media === 0 ? (
                  <span className="badge badge-muted">No photographs</span>
                ) : null}
              </div>

              <div className="small faint">
                {project.candidate ? (
                  <Link href={`/candidates/${project.candidate.slug}`}>
                    {project.candidate.fullName}
                  </Link>
                ) : (
                  "Not attributed"
                )}
                {" · "}
                <Link href={`/constituency/${project.constituency.slug}`}>
                  {project.constituency.name}, {project.constituency.district}
                </Link>
                {project.sector ? ` · ${project.sector}` : ""}
                {project.progressPct !== null ? ` · ${project.progressPct}% published` : ""}
                {project.targetDate ? ` · target ${formatDate(project.targetDate)}` : ""}
                {" · last update "}
                {formatDateTime(project.lastUpdateAt)}
                {project.updates[0]?.actor ? ` by ${project.updates[0].actor.fullName}` : ""}
              </div>

              {project.updates[0]?.note ? (
                <p className="small" style={{ margin: ".35rem 0 0" }}>
                  {project.updates[0].note}
                </p>
              ) : null}

              <hr className="divider" />
              <ProjectUpdateForm projectId={project.id} status={project.status} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
