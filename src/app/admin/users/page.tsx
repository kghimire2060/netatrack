import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { Card, EmptyState, Pager, Stat } from "@/components/ui";
import { AccountBadge } from "@/components/status";
import { UserAdminForm } from "@/components/admin-forms";
import { formatDate, formatDateTime, humanize } from "@/lib/format";
import type { Prisma } from "@prisma/client";
import { getTranslator } from "@/lib/locale-server";
import { enumLabel } from "@/lib/i18n";

export const metadata = { title: "Users" };

const PAGE_SIZE = 20;
const ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF", "CITIZEN", "CANDIDATE", "RESEARCHER"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  const actor = await requireActorPage("/admin/users");
  const { t, locale } = await getTranslator();
  if (!(await can({ userId: actor.userId, role: actor.role }, "user.view"))) redirect("/admin");

  const canEdit = await can({ userId: actor.userId, role: actor.role }, "user.edit");
  const canAssignRole = await can({ userId: actor.userId, role: actor.role }, "user.role.assign");

  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where: Prisma.UserWhereInput = {
    ...(params.q
      ? {
          OR: [
            { fullName: { contains: params.q, mode: "insensitive" as const } },
            { email: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(params.role && ROLES.includes(params.role)
      ? { role: params.role as Prisma.EnumRoleFilter["equals"] }
      : {}),
    ...(params.status ? { status: params.status as Prisma.EnumAccountStatusFilter["equals"] } : {}),
  };

  const [total, users, byRole, pendingCount] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        mfaEnabled: true,
        researcherApproved: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { complaints: true, ratings: true } },
      },
    }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.user.count({ where: { status: "PENDING" } }),
  ]);

  // A non-Super-Admin can never hand out the Super Admin role.
  const assignableRoles = actor.role === "SUPER_ADMIN" ? ROLES : ROLES.filter((r) => r !== "SUPER_ADMIN");

  return (
    <>
      <h1>{t("adm.users")}</h1>
      <p className="muted">
        Account status, role assignment and researcher approval. Every change is written to the
        audit log with the actor and reason.
      </p>

      <div className="grid grid-4">
        <Stat label={t("adm.totalAccounts")} value={total} />
        <Stat label={t("adm.pending")} value={pendingCount} accent="orange" />
        <Stat
          label={t("adm.staffAndAdmins")}
          value={byRole
            .filter((row) => ["STAFF", "ADMIN", "SUPER_ADMIN"].includes(row.role))
            .reduce((sum, row) => sum + row._count._all, 0)}
        />
        <Stat
          label={t("adm.researchers")}
          value={byRole.find((row) => row.role === "RESEARCHER")?._count._all ?? 0}
          accent="purple"
        />
      </div>

      <Card className="section-tight">
        <form method="get" className="row" style={{ gap: ".6rem" }}>
          <input name="q" defaultValue={params.q ?? ""} placeholder={t("cand.searchPlaceholder")} className="grow" />
          <select name="role" defaultValue={params.role ?? ""} aria-label="Role">
            <option value="">{t("adm.allRoles")}</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {enumLabel(role, locale)}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={params.status ?? ""} aria-label="Status">
            <option value="">{t("adm.allStatuses")}</option>
            {["PENDING", "ACTIVE", "SUSPENDED", "LOCKED", "DELETED"].map((status) => (
              <option key={status} value={status}>
                {enumLabel(status, locale)}
              </option>
            ))}
          </select>
          <button className="btn btn-sm">{t("common.filter")}</button>
        </form>
      </Card>

      {users.length === 0 ? (
        <Card className="section-tight">
          <EmptyState title={t("adm.noMatch")} />
        </Card>
      ) : (
        <div className="stack" style={{ marginTop: "1rem" }}>
          {users.map((user) => (
            <Card key={user.id}>
              <div className="row-between">
                <div className="grow">
                  <div className="row" style={{ gap: ".5rem" }}>
                    <strong>{user.fullName}</strong>
                    <AccountBadge status={user.status} />
                    <span className="badge badge-navy">{enumLabel(user.role, locale)}</span>
                    {user.mfaEnabled ? <span className="badge badge-good">MFA</span> : null}
                    {!user.emailVerified ? (
                      <span className="badge badge-warn">Email unverified</span>
                    ) : null}
                    {user.researcherApproved ? (
                      <span className="badge badge-purple">Researcher approved</span>
                    ) : null}
                  </div>
                  <div className="small muted">{user.email}</div>
                  <div className="small faint">
                    Joined {formatDate(user.createdAt)} · last login{" "}
                    {formatDateTime(user.lastLoginAt)} · {user._count.complaints} issues ·{" "}
                    {user._count.ratings} ratings
                  </div>
                </div>
              </div>
              {canEdit ? (
                <>
                  <hr className="divider" />
                  <UserAdminForm
                    userId={user.id}
                    role={user.role}
                    status={user.status}
                    researcherApproved={user.researcherApproved}
                    canAssignRole={canAssignRole && !(user.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN")}
                    assignableRoles={assignableRoles}
                  />
                </>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <Pager
        page={page}
        pages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        basePath="/admin/users"
        query={{ q: params.q, role: params.role, status: params.status }}
      />
    </>
  );
}
