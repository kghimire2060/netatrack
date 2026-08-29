import { getActor } from "@/lib/auth";
import { permissionsForRole } from "@/lib/rbac";
import { ok } from "@/lib/api";

export async function GET() {
  const actor = await getActor();
  if (!actor) return ok({ authenticated: false });
  const permissions = await permissionsForRole(actor.role);
  return ok({
    authenticated: true,
    user: {
      id: actor.userId,
      email: actor.email,
      fullName: actor.fullName,
      role: actor.role,
    },
    permissions: [...permissions],
  });
}
