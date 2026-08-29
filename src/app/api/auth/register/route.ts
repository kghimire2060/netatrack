import { prisma } from "@/lib/db";
import { hashPassword, issueToken } from "@/lib/auth";
import { queueEmail } from "@/lib/email";
import { templates } from "@/lib/email-templates";
import { audit } from "@/lib/audit";
import { registerSchema } from "@/lib/validation";
import { created, errorResponse, limitByIp, parseBody, requestMeta } from "@/lib/api";
import { LIMITS } from "@/lib/rate-limit";

/**
 * Register → validate → check duplicate → create PENDING account →
 * issue verification token → send SMTP email → log activity (section 4).
 */
export async function POST(req: Request) {
  const limited = await limitByIp("register", LIMITS.register);
  if (limited) return limited;

  try {
    const input = await parseBody(req, registerSchema);
    const meta = await requestMeta();

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      // Do not confirm or deny account existence beyond this generic conflict.
      return created({ ok: true });
    }

    const user = await prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash: await hashPassword(input.password),
        role: "CITIZEN",
        status: "PENDING",
      },
    });

    const token = await issueToken(user.id, "EMAIL_VERIFICATION", 24 * 60);
    const mail = templates.verifyAccount(user.fullName, token);
    await queueEmail({ to: user.email, type: "auth.verify", userId: user.id, ...mail });

    await audit({
      actorId: user.id,
      actorRole: user.role,
      action: "auth.register",
      targetType: "User",
      targetId: user.id,
      summary: "Pending account created; verification email queued",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return created({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
