import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { Badge, Card, EmptyState, Stat } from "@/components/ui";
import { ModerationForm } from "@/components/admin-forms";
import { formatDateTime, humanize } from "@/lib/format";
import type { ModerationStatus } from "@prisma/client";

export const metadata = { title: "Rating moderation" };

export default async function AdminRatingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await requireActorPage("/admin/ratings");
  if (!(await can({ userId: actor.userId, role: actor.role }, "rating.moderate"))) redirect("/admin");

  const params = await searchParams;
  const status = ["VISIBLE", "FLAGGED", "HIDDEN", "REMOVED"].includes(params.status ?? "")
    ? (params.status as ModerationStatus)
    : undefined;

  const [ratings, counts, reports] = await Promise.all([
    prisma.rating.findMany({
      where: status ? { status } : { OR: [{ status: "FLAGGED" }, { reports: { some: { resolved: false } } }] },
      orderBy: { updatedAt: "desc" },
      take: 60,
      include: {
        candidate: { select: { fullName: true, slug: true } },
        user: { select: { fullName: true, email: true, createdAt: true } },
        reports: { include: { reporter: { select: { fullName: true } } } },
      },
    }),
    prisma.rating.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.ratingReport.count({ where: { resolved: false } }),
  ]);

  return (
    <>
      <h1>Rating moderation</h1>
      <p className="muted">
        Hidden and removed ratings are excluded from every published average and count. A moderation
        reason is recorded with the decision and written to the audit log.
      </p>

      <div className="grid grid-4">
        <Stat
          label="Visible"
          value={counts.find((r) => r.status === "VISIBLE")?._count._all ?? 0}
          accent="green"
        />
        <Stat
          label="Flagged"
          value={counts.find((r) => r.status === "FLAGGED")?._count._all ?? 0}
          accent="orange"
        />
        <Stat label="Hidden or removed" value={counts.filter((r) => r.status === "HIDDEN" || r.status === "REMOVED").reduce((sum, r) => sum + r._count._all, 0)} />
        <Stat label="Open reports" value={reports} accent={reports > 0 ? "red" : undefined} />
      </div>

      <div className="chip-row" style={{ margin: "1rem 0" }}>
        <Link href="/admin/ratings" className={`chip${status ? "" : " active"}`}>
          Needs attention
        </Link>
        {["VISIBLE", "FLAGGED", "HIDDEN", "REMOVED"].map((value) => (
          <Link
            key={value}
            href={`/admin/ratings?status=${value}`}
            className={`chip${status === value ? " active" : ""}`}
          >
            {humanize(value)}
          </Link>
        ))}
      </div>

      {ratings.length === 0 ? (
        <Card>
          <EmptyState title="Nothing needs moderation" hint="Flagged ratings and open reports appear here." />
        </Card>
      ) : (
        <div className="stack">
          {ratings.map((rating) => (
            <Card key={rating.id}>
              <div className="row-between">
                <div className="grow">
                  <div className="row" style={{ gap: ".5rem" }}>
                    <strong>
                      <Link href={`/candidates/${rating.candidate.slug}`}>
                        {rating.candidate.fullName}
                      </Link>
                    </strong>
                    <Badge tone={rating.status === "VISIBLE" ? "good" : "warn"}>
                      {humanize(rating.status)}
                    </Badge>
                    <span className="badge badge-navy">{rating.weightedScore.toFixed(1)}/5</span>
                  </div>
                  <div className="small faint">
                    By {rating.user.fullName} · account created{" "}
                    {formatDateTime(rating.user.createdAt)} · rated{" "}
                    {formatDateTime(rating.updatedAt)}
                  </div>
                  {rating.comment ? (
                    <p className="small" style={{ margin: ".4rem 0 0" }}>
                      {rating.comment}
                    </p>
                  ) : (
                    <p className="small faint" style={{ margin: ".4rem 0 0" }}>
                      No comment supplied.
                    </p>
                  )}
                  {rating.reports.length > 0 ? (
                    <div className="notice" style={{ marginTop: ".5rem" }}>
                      <strong>{rating.reports.length} report(s):</strong>{" "}
                      {rating.reports.map((report) => report.reason).join("; ")}
                    </div>
                  ) : null}
                  {rating.moderationNote ? (
                    <p className="small muted" style={{ margin: ".3rem 0 0" }}>
                      Previous decision: {rating.moderationNote}
                    </p>
                  ) : null}
                </div>
              </div>
              <hr className="divider" />
              <ModerationForm ratingId={rating.id} currentStatus={rating.status} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
