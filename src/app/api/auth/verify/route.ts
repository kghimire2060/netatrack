import { z } from "zod";
import { prisma } from "@/lib/db";
import { consumeToken } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { errorResponse, fail, ok, parseBody, requestMeta } from "@/lib/api";

const schema = z.object({ token: z.string().min(10) });

/** Verify email → activate account → assign default role → log activity. */
export async function POST(req: Request) {
  try {
    const { token } = await parseBody(req, schema);
    const record = await consumeToken(token, "EMAIL_VERIFICATION");
    if (!record) return fail("This verification link is invalid or has expired", 400);

    const user = await prisma.user.update({
      where: { id: record.userId },
      data: {
        emailVerified: true,
        status: "ACTIVE",
      },
      select: { id: true, role: true, email: true },
    });

    const meta = await requestMeta();
    await audit({
      actorId: user.id,
      actorRole: user.role,
      action: "auth.verify_email",
      targetType: "User",
      targetId: user.id,
      summary: "Email verified; account activated",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
