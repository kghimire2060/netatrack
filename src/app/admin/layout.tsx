import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { permissionsForRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { AdminSidebar } from "@/components/admin-sidebar";

/**
 * Admin shell. This gate is convenience: every admin API route independently
 * re-checks the caller's permission, so reaching a page never implies the
 * right to act.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/login?next=/admin");

  const rolePermissions = await permissionsForRole(actor.role);
  const overrides = await prisma.userPermissionOverride.findMany({
    where: { userId: actor.userId },
    select: { permission: true, granted: true },
  });

  const permissions = new Set(rolePermissions);
  for (const override of overrides) {
    if (override.granted) permissions.add(override.permission);
    else permissions.delete(override.permission);
  }

  // Entry requires at least one *staff-side* permission. Permissions every
  // citizen holds (candidate.view, news.view) and the read/analyse permissions
  // held by candidates and researchers deliberately do not count — those roles
  // have their own portals at /portal/candidate and /portal/researcher.
  const OPERATIONAL = [
    "complaint.view.all",
    "complaint.update",
    "complaint.assign",
    "candidate.edit",
    "candidate.verify",
    "user.view",
    "role.manage",
    "news.edit",
    "factcheck.review",
    "promise.manage",
    "result.manage",
    "rating.moderate",
    "poll.manage",
    "settings.manage",
    "audit.view.all",
  ];
  if (!OPERATIONAL.some((permission) => permissions.has(permission))) redirect("/account");

  return (
    <div className="admin-shell">
      <AdminSidebar permissions={[...permissions]} />
      <div className="admin-main">{children}</div>
    </div>
  );
}
