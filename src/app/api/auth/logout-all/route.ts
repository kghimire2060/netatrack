import { requireActor, revokeAllSessions, destroySession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { errorResponse, ok } from "@/lib/api";

/** Revokes every session for the current user, including this one. */
export async function POST() {
  try {
    const actor = await requireActor();
    await revokeAllSessions(actor.userId);
    await destroySession();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "auth.logout_all",
      summary: "All sessions revoked by the account owner",
    });
    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
