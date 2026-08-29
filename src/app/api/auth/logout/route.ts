import { destroySession, getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ok } from "@/lib/api";

export async function POST() {
  const session = await getSession();
  await destroySession();
  if (session) {
    await audit({ actorId: session.userId, actorRole: session.role, action: "auth.logout" });
  }
  return ok({ ok: true });
}
