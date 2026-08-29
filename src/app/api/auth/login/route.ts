import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { verifyCode } from "@/lib/totp";
import { audit } from "@/lib/audit";
import { queueEmail } from "@/lib/email";
import { templates } from "@/lib/email-templates";
import { loginSchema } from "@/lib/validation";
import { errorResponse, fail, ok, limitByIp, parseBody, requestMeta } from "@/lib/api";
import { LIMITS } from "@/lib/rate-limit";

const MAX_FAILED = 8;
const LOCK_MINUTES = 15;

export async function POST(req: Request) {
  const limited = await limitByIp("login", LIMITS.login);
  if (limited) return limited;

  try {
    const input = await parseBody(req, loginSchema);
    const meta = await requestMeta();
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // Constant-ish response for unknown accounts: never reveal which half failed.
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      if (user) {
        const failed = user.failedLoginCount + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: failed,
            lockedUntil:
              failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil,
          },
        });
        await audit({
          actorId: user.id,
          action: "auth.login",
          result: "DENIED",
          targetType: "User",
          targetId: user.id,
          summary: `Failed password attempt (${failed})`,
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
      }
      return fail("Invalid email or password", 401);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return fail("Too many failed attempts. Try again later.", 423);
    }
    if (user.status === "PENDING" || !user.emailVerified) {
      return fail("Verify your email address before logging in", 403);
    }
    if (user.status !== "ACTIVE") {
      return fail("This account is not active. Contact an administrator.", 403);
    }

    // MFA for privileged accounts (section 4).
    if (user.mfaEnabled && user.mfaSecret) {
      if (!input.mfaCode) return ok({ ok: true, mfaRequired: true });
      if (!verifyCode(user.mfaSecret, input.mfaCode)) {
        await audit({
          actorId: user.id,
          action: "auth.mfa",
          result: "DENIED",
          targetType: "User",
          targetId: user.id,
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
        return fail("Incorrect authentication code", 401);
      }
    }

    await createSession(user, meta);
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    // Privileged login alert (section 10).
    if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
      const mail = templates.securityAlert(
        user.fullName,
        `A privileged login to your ${user.role.replace("_", " ").toLowerCase()} account was recorded from ${meta.ip ?? "an unknown address"}.`
      );
      await queueEmail({ to: user.email, type: "security.privileged_login", userId: user.id, ...mail });
    }

    await audit({
      actorId: user.id,
      actorRole: user.role,
      action: "auth.login",
      targetType: "User",
      targetId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true, role: user.role });
  } catch (error) {
    return errorResponse(error);
  }
}
