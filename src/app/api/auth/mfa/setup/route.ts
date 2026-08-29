import { prisma } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { generateSecret, otpauthUrl } from "@/lib/totp";
import { errorResponse, ok } from "@/lib/api";

/**
 * Issues a fresh TOTP secret. It is stored but MFA stays disabled until the
 * user proves possession by confirming a code at /api/auth/mfa/enable.
 */
export async function POST() {
  try {
    const actor = await requireActor();
    const secret = generateSecret();
    await prisma.user.update({
      where: { id: actor.userId },
      data: { mfaSecret: secret, mfaEnabled: false },
    });
    return ok({ secret, otpauth: otpauthUrl(secret, actor.email) });
  } catch (error) {
    return errorResponse(error);
  }
}
