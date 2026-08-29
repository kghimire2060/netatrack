import { prisma } from "@/lib/db";
import { requestMeta, revokeAllSessions } from "@/lib/auth";
import { guard, errorResponse, fail, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/rbac";
import { userAdminSchema } from "@/lib/validation";
import { audit, safeSummary } from "@/lib/audit";

/**
 * User administration. Two escalation guards apply:
 *   - changing a role requires user.role.assign,
 *   - only a SUPER_ADMIN may create another SUPER_ADMIN or modify one.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await guard("user.edit");
    const { id } = await params;
    const input = await parseBody(req, userAdminSchema);

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true, email: true, fullName: true },
    });
    if (!target) return fail("User not found", 404);

    if (target.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
      return fail("Only a Super Admin can modify a Super Admin account", 403);
    }
    if (input.role && input.role !== target.role) {
      await requirePermission({ userId: actor.userId, role: actor.role }, "user.role.assign");
      if (input.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
        return fail("Only a Super Admin can grant the Super Admin role", 403);
      }
    }
    if (input.status && input.status !== target.status && target.id === actor.userId) {
      return fail("You cannot change your own account status", 400);
    }
    if (input.status === "SUSPENDED" || input.status === "LOCKED" || input.status === "DELETED") {
      await requirePermission({ userId: actor.userId, role: actor.role }, "user.suspend");
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        status: input.status ?? undefined,
        role: input.role ?? undefined,
        researcherApproved: input.researcherApproved ?? undefined,
        approvedAt: input.researcherApproved ? new Date() : undefined,
        researcherNote: input.reason ?? undefined,
      },
      select: { id: true, role: true, status: true },
    });

    // Suspension, locking or deletion must take effect immediately.
    if (updated.status !== "ACTIVE") await revokeAllSessions(updated.id);

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "user.admin_update",
      targetType: "User",
      targetId: target.id,
      summary: safeSummary({
        email: target.email,
        roleFrom: target.role,
        roleTo: updated.role,
        statusFrom: target.status,
        statusTo: updated.status,
        reason: input.reason ?? "",
      }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
