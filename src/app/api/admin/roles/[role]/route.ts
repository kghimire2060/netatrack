import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, errorResponse, fail, ok, parseBody } from "@/lib/api";
import { assertCanGrant, invalidatePermissionCache } from "@/lib/rbac";
import { ALL_PERMISSIONS, type Permission, type RoleName } from "@/lib/permissions";
import { audit, safeSummary } from "@/lib/audit";
import type { Role } from "@prisma/client";

const ROLES: RoleName[] = ["SUPER_ADMIN", "ADMIN", "STAFF", "CITIZEN", "CANDIDATE", "RESEARCHER"];

const schema = z.object({ permissions: z.array(z.string()).max(200) });

/** Replaces the permission set for one role. SUPER_ADMIN is not editable. */
export async function PATCH(req: Request, { params }: { params: Promise<{ role: string }> }) {
  try {
    const actor = await guard("role.manage");
    const { role: roleParam } = await params;
    const role = roleParam.toUpperCase() as RoleName;

    if (!ROLES.includes(role)) return fail("Unknown role", 404);
    if (role === "SUPER_ADMIN") {
      return fail("The Super Admin role always holds every permission and cannot be edited", 400);
    }

    const { permissions } = await parseBody(req, schema);
    const unknown = permissions.filter((p) => !ALL_PERMISSIONS.includes(p as Permission));
    if (unknown.length > 0) return fail(`Unknown permissions: ${unknown.join(", ")}`, 400);

    // Nobody can grant a permission they do not themselves hold, and
    // SUPER_ADMIN-only permissions can never be delegated.
    for (const permission of permissions) {
      await assertCanGrant({ userId: actor.userId, role: actor.role }, permission as Permission);
    }

    const before = await prisma.rolePermission.findMany({
      where: { role: role as Role },
      select: { permission: true },
    });

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { role: role as Role } }),
      prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({ role: role as Role, permission })),
        skipDuplicates: true,
      }),
    ]);
    invalidatePermissionCache();

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "role.permissions_updated",
      targetType: "Role",
      targetId: role,
      summary: safeSummary({
        role,
        added: permissions.filter((p) => !before.some((b) => b.permission === p)).join(",") || "none",
        removed: before.filter((b) => !permissions.includes(b.permission)).map((b) => b.permission).join(",") || "none",
      }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true, count: permissions.length });
  } catch (error) {
    return errorResponse(error);
  }
}
