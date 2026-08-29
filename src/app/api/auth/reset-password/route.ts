import { prisma } from "@/lib/db";
import { consumeToken, hashPassword, revokeAllSessions } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { resetPasswordSchema } from "@/lib/validation";
import { errorResponse, fail, limitByIp, ok, parseBody, requestMeta } from "@/lib/api";
import { LIMITS } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = await limitByIp("reset", LIMITS.passwordReset);
  if (limited) return limited;

  try {
    const input = await parseBody(req, resetPasswordSchema);
    const record = await consumeToken(input.token, "PASSWORD_RESET");
    if (!record) return fail("This reset link is invalid, used or expired", 400);

    await prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: await hashPassword(input.password),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // A password change invalidates every existing session.
    await revokeAllSessions(record.userId);

    const meta = await requestMeta();
    await audit({
      actorId: record.userId,
      action: "auth.password_reset",
      targetType: "User",
      targetId: record.userId,
      summary: "Password changed via reset link; all sessions revoked",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
