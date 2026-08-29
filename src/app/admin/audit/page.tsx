import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { Badge, Card, EmptyState, Pager } from "@/components/ui";
import { formatDateTime, humanize } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Audit log" };

const PAGE_SIZE = 40;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actor?: string; result?: string; page?: string }>;
}) {
  const actor = await requireActorPage("/admin/audit");
  const seesAll = await can({ userId: actor.userId, role: actor.role }, "audit.view.all");
  if (!seesAll) redirect("/admin");

  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(params.action ? { action: { contains: params.action } } : {}),
    ...(params.result ? { result: params.result } : {}),
    ...(params.actor
      ? {
          actor: {
            OR: [
              { fullName: { contains: params.actor, mode: "insensitive" as const } },
              { email: { contains: params.actor, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [total, entries, actions] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { fullName: true, email: true } } },
    }),
    prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true } }),
  ]);

  return (
    <>
      <h1>Audit log</h1>
      <p className="muted">
        Every privileged action records the actor, timestamp, target, result and a redacted change
        summary. Passwords, tokens, secrets and internal notes are never written here.
      </p>

      <Card className="section-tight">
        <form method="get" className="row" style={{ gap: ".6rem" }}>
          <input name="actor" defaultValue={params.actor ?? ""} placeholder="Actor name or email" className="grow" />
          <select name="action" defaultValue={params.action ?? ""} aria-label="Action">
            <option value="">All actions</option>
            {actions
              .sort((a, b) => a.action.localeCompare(b.action))
              .map((row) => (
                <option key={row.action} value={row.action}>
                  {row.action} ({row._count._all})
                </option>
              ))}
          </select>
          <select name="result" defaultValue={params.result ?? ""} aria-label="Result">
            <option value="">All results</option>
            <option value="SUCCESS">Success</option>
            <option value="DENIED">Denied</option>
            <option value="FAILURE">Failure</option>
          </select>
          <button className="btn btn-sm">Filter</button>
        </form>
      </Card>

      {entries.length === 0 ? (
        <Card className="section-tight">
          <EmptyState title="No audit entries match those filters" />
        </Card>
      ) : (
        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data responsive">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Result</th>
                <th>Change summary</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td data-label="When">{formatDateTime(entry.createdAt)}</td>
                  <td data-label="Actor">
                    {entry.actor?.fullName ?? <span className="faint">System / anonymous</span>}
                    {entry.actorRole ? (
                      <div className="small faint">{humanize(entry.actorRole)}</div>
                    ) : null}
                  </td>
                  <td data-label="Action">
                    <code className="mono small">{entry.action}</code>
                  </td>
                  <td data-label="Target">
                    {entry.targetType ?? "—"}
                    {entry.targetId ? (
                      <div className="small faint mono">{entry.targetId.slice(0, 8)}…</div>
                    ) : null}
                  </td>
                  <td data-label="Result">
                    <Badge tone={entry.result === "SUCCESS" ? "good" : "bad"}>{entry.result}</Badge>
                  </td>
                  <td data-label="Change summary">
                    <span className="small">{entry.changeSummary ?? "—"}</span>
                    {entry.ip ? <div className="small faint">{entry.ip}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager
        page={page}
        pages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        basePath="/admin/audit"
        query={{ action: params.action, actor: params.actor, result: params.result }}
      />
    </>
  );
}
