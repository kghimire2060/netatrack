import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, errorResponse, ok, parseBody } from "@/lib/api";
import { audit, safeSummary } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["VISIBLE", "FLAGGED", "HIDDEN", "REMOVED"]),
  moderationNote: z.string().trim().max(500).optional().nullable(),
});

/** Rating moderation (section 7). Moderators must record a reason. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await guard("rating.moderate");
    const { id } = await params;
    const input = await parseBody(req, schema);

    const rating = await prisma.rating.update({
      where: { id },
      data: { status: input.status, moderationNote: input.moderationNote ?? null },
      select: { id: true, candidateId: true },
    });

    await prisma.ratingReport.updateMany({ where: { ratingId: id }, data: { resolved: true } });

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "rating.moderate",
      targetType: "Rating",
      targetId: rating.id,
      summary: safeSummary({ status: input.status, note: input.moderationNote ?? "" }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
