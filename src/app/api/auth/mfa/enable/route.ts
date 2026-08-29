import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { verifyCode } from "@/lib/totp";
import { audit } from "@/lib/audit";
import { errorResponse, fail, ok, parseBody } from "@/lib/api";

const schema = z.object({ code: z.string().trim().min(6).max(6) });

export async function POST(req: Request) {
  try {
    const actor = await requireActor();
    const { code } = await parseBody(req, schema);

    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { mfaSecret: true },
    });
    if (!user?.mfaSecret) return fail("Start MFA setup first", 400);
    if (!verifyCode(user.mfaSecret, code)) return fail("That code is not valid", 400);

    await prisma.user.update({ where: { id: actor.userId }, data: { mfaEnabled: true } });
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "auth.mfa_enabled",
      targetType: "User",
      targetId: actor.userId,
    });
    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
