import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can, permissionsForRole } from "@/lib/rbac";
import { Card } from "@/components/ui";
import { RolePermissionEditor } from "@/components/admin-forms";
import { PERMISSIONS, SUPER_ADMIN_ONLY, type RoleName } from "@/lib/permissions";
import { humanize } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";
import { enumLabel } from "@/lib/i18n";

export const metadata = { title: "Roles and permissions" };

const ROLES: RoleName[] = ["SUPER_ADMIN", "ADMIN", "STAFF", "CITIZEN", "CANDIDATE", "RESEARCHER"];

export default async function AdminRolesPage() {
  const actor = await requireActorPage("/admin/roles");
  const { t, locale } = await getTranslator();
  if (!(await can({ userId: actor.userId, role: actor.role }, "role.manage"))) redirect("/admin");

  const granted = await Promise.all(
    ROLES.map(async (role) => ({ role, permissions: [...(await permissionsForRole(role))] }))
  );

  const counts = await prisma.user.groupBy({ by: ["role"], _count: { _all: true } });
  const catalog = Object.entries(PERMISSIONS).map(([key, description]) => ({ key, description }));

  return (
    <>
      <h1>{t("adm.roles")}</h1>
      <p className="muted">
        Authorization is enforced on the server for every action. Changes here take effect
        immediately and are recorded in the audit log.
      </p>

      <div className="notice">
        Two safeguards apply and cannot be bypassed from this screen: you can never grant a
        permission you do not hold yourself, and{" "}
        <code className="mono">{SUPER_ADMIN_ONLY.join(", ")}</code> stay exclusive to Super Admin.
      </div>

      <div className="stack" style={{ marginTop: "1rem" }}>
        {granted.map(({ role, permissions }) => (
          <Card
            key={role}
            title={`${enumLabel(role, locale)} — ${permissions.length}`}
            action={
              <span className="small faint">
                {counts.find((row) => row.role === role)?._count._all ?? 0} accounts
              </span>
            }
          >
            <RolePermissionEditor
              role={role}
              granted={permissions}
              catalog={catalog}
              lockedPermissions={SUPER_ADMIN_ONLY}
            />
          </Card>
        ))}
      </div>
    </>
  );
}
