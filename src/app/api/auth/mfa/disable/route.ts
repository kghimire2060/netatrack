import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireActor, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { errorResponse, fail, ok, parseBody } from "@/lib/api";

const schema = z.object({ password: z.string().min(1) });

/** Disabling MFA is itself a privileged action: it requires the password. */
export async function POST(req: Request) {
  try {
    const actor = await requireActor();
    const { password } = await parseBody(req, schema);

    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { passwordHash: true, role: true },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return fail("Incorrect password", 401);
    }
    if (user.role === "SUPER_ADMIN") {
      return fail("Multi-factor authentication is mandatory for Super Admin accounts", 403);
    }

    await prisma.user.update({
      where: { id: actor.userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "auth.mfa_disabled",
      targetType: "User",
      targetId: actor.userId,
    });
    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
