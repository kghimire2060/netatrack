import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { Badge, Card, EmptyState, Pager, Stat } from "@/components/ui";
import { ComplaintBadge } from "@/components/status";
import { COMPLAINT_FLOW } from "@/lib/complaint-workflow";
import { humanize, relativeTime } from "@/lib/format";
import type { ComplaintStatus, Prisma } from "@prisma/client";
import { getTranslator } from "@/lib/locale-server";
import { enumLabel } from "@/lib/i18n";

export const metadata = { title: "Issue queue" };

const PAGE_SIZE = 20;

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    mine?: string;
    overdue?: string;
    reopen?: string;
    page?: string;
  }>;
}) {
  const actor = await requireActorPage("/admin/complaints");
  const { t, locale } = await getTranslator();
  const seesAll = await can({ userId: actor.userId, role: actor.role }, "complaint.view.all");
  const seesAssigned = await can(
    { userId: actor.userId, role: actor.role },
    "complaint.view.assigned"
  );
  if (!seesAll && !seesAssigned) redirect("/admin");

  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const status = COMPLAINT_FLOW.find((value) => value === params.status);

  // Staff without complaint.view.all are hard-scoped to their own assignments.
  const scope: Prisma.ComplaintWhereInput = seesAll
    ? params.mine === "1"
      ? { assignedToId: actor.userId }
      : {}
    : { assignedToId: actor.userId };

  const where: Prisma.ComplaintWhereInput = {
    ...scope,
    ...(status ? { status } : {}),
    ...(params.overdue === "1"
      ? { expectedUpdateAt: { lt: new Date() }, status: { notIn: ["RESOLVED", "CLOSED"] } }
      : {}),
    ...(params.reopen === "1" ? { reopenRequested: true } : {}),
    ...(params.q
      ? {
          OR: [
            { trackingId: { contains: params.q.toUpperCase() } },
            { title: { contains: params.q, mode: "insensitive" as const } },
            { category: { contains: params.q, mode: "insensitive" as const } },
            { district: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, complaints, counts] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({
      where,
      orderBy: [{ expectedUpdateAt: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        trackingId: true,
        title: true,
        category: true,
        status: true,
        priority: true,
        district: true,
        expectedUpdateAt: true,
        reopenRequested: true,
        createdAt: true,
        updatedAt: true,
        assignedTo: { select: { fullName: true } },
      },
    }),
    prisma.complaint.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
  ]);

  const open = counts
    .filter((row) => row.status !== "RESOLVED" && row.status !== "CLOSED")
    .reduce((sum, row) => sum + row._count._all, 0);

  return (
    <>
      <div className="row-between">
        <div>
          <h1>{t("adm.issueQueue")}</h1>
          <p className="muted">
            {seesAll
              ? "All citizen issues. Internal notes are visible here and never on the public page."
              : "Issues assigned to you. Ask an administrator for wider access if you need it."}
          </p>
        </div>
      </div>

      <div className="grid grid-4">
        <Stat label={t("adm.openIssues")} value={open} />
        <Stat
          label={t("adm.resolved24")}
          value={counts.find((row) => row.status === "RESOLVED")?._count._all ?? 0}
          accent="green"
        />
        <Stat
          label={t("adm.status")}
          value={counts.find((row) => row.status === "CLOSED")?._count._all ?? 0}
        />
        <Stat label={t("adm.total")} value={total} accent="purple" />
      </div>

      <Card className="section-tight">
        <form method="get" className="row" style={{ gap: ".6rem" }}>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Tracking ID, title, category or district"
            className="grow"
          />
          <select name="status" defaultValue={params.status ?? ""} aria-label="Status">
            <option value="">{t("adm.allStatuses")}</option>
            {COMPLAINT_FLOW.map((value) => (
              <option key={value} value={value}>
                {enumLabel(value, locale)}
              </option>
            ))}
          </select>
          <label className="row small">
            <input type="checkbox" name="overdue" value="1" defaultChecked={params.overdue === "1"} />
            <span>{t("adm.overdue")}</span>
          </label>
          <label className="row small">
            <input type="checkbox" name="reopen" value="1" defaultChecked={params.reopen === "1"} />
            <span>{t("adm.reopenRequested")}</span>
          </label>
          {seesAll ? (
            <label className="row small">
              <input type="checkbox" name="mine" value="1" defaultChecked={params.mine === "1"} />
              <span>{t("adm.mine")}</span>
            </label>
          ) : null}
          <button className="btn btn-sm">{t("common.filter")}</button>
        </form>
      </Card>

      {complaints.length === 0 ? (
        <Card className="section-tight">
          <EmptyState title={t("adm.noMatch")} />
        </Card>
      ) : (
        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data responsive">
            <thead>
              <tr>
                <th>{t("adm.trackingId")}</th>
                <th>{t("adm.issue")}</th>
                <th>{t("adm.category")}</th>
                <th>{t("adm.priority")}</th>
                <th>{t("adm.status")}</th>
                <th>{t("adm.assignee")}</th>
                <th>{t("adm.due")}</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((complaint) => {
                const overdue =
                  complaint.expectedUpdateAt !== null &&
                  complaint.expectedUpdateAt < new Date() &&
                  complaint.status !== "RESOLVED" &&
                  complaint.status !== "CLOSED";
                return (
                  <tr key={complaint.id}>
                    <td data-label="Tracking ID">
                      <Link className="mono" href={`/admin/complaints/${complaint.id}`}>
                        {complaint.trackingId}
                      </Link>
                    </td>
                    <td data-label="Issue">
                      {complaint.title}
                      {complaint.reopenRequested ? (
                        <>
                          {" "}
                          <Badge tone="warn">Reopen requested</Badge>
                        </>
                      ) : null}
                      <div className="small faint">{complaint.district ?? "Location not given"}</div>
                    </td>
                    <td data-label="Category">{complaint.category}</td>
                    <td data-label="Priority">
                      <Badge
                        tone={
                          complaint.priority === "URGENT"
                            ? "bad"
                            : complaint.priority === "HIGH"
                              ? "warn"
                              : "muted"
                        }
                      >
                        {enumLabel(complaint.priority, locale)}
                      </Badge>
                    </td>
                    <td data-label="Status">
                      <ComplaintBadge status={complaint.status} />
                    </td>
                    <td data-label="Assignee">
                      {complaint.assignedTo?.fullName ?? <span className="faint">{t("adm.unassigned")}</span>}
                    </td>
                    <td data-label="Due">
                      <span style={overdue ? { color: "var(--red)", fontWeight: 700 } : undefined}>
                        {complaint.expectedUpdateAt
                          ? relativeTime(complaint.expectedUpdateAt)
                          : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pager
        page={page}
        pages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        basePath="/admin/complaints"
        query={{
          q: params.q,
          status: params.status,
          mine: params.mine,
          overdue: params.overdue,
          reopen: params.reopen,
        }}
      />
    </>
  );
}
