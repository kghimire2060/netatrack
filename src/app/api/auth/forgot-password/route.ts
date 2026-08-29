import { prisma } from "@/lib/db";
import { issueToken } from "@/lib/auth";
import { queueEmail } from "@/lib/email";
import { templates } from "@/lib/email-templates";
import { audit } from "@/lib/audit";
import { forgotPasswordSchema } from "@/lib/validation";
import { errorResponse, limitByIp, ok, parseBody, requestMeta } from "@/lib/api";
import { LIMITS } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = await limitByIp("forgot", LIMITS.passwordReset);
  if (limited) return limited;

  try {
    const { email } = await parseBody(req, forgotPasswordSchema);
    const user = await prisma.user.findUnique({ where: { email } });

    // Always answer the same way — this endpoint must not confirm which
    // addresses are registered.
    if (user && user.status !== "DELETED") {
      const token = await issueToken(user.id, "PASSWORD_RESET", 60);
      const mail = templates.passwordReset(user.fullName, token);
      await queueEmail({ to: user.email, type: "auth.password_reset", userId: user.id, ...mail });

      const meta = await requestMeta();
      await audit({
        actorId: user.id,
        action: "auth.password_reset_requested",
        targetType: "User",
        targetId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    }

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
