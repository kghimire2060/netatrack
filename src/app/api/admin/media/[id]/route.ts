import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, errorResponse, fail, ok, parseBody } from "@/lib/api";
import { audit, safeSummary } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  tier: z.enum(["OFFICIAL", "NETATRACK", "UNVERIFIED", "DISPUTED"]).optional(),
});

/** Publish, archive or re-tier a photograph. Same publication bar as creation. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await guard("media.manage");
    const { id } = await params;
    const input = await parseBody(req, schema);

    const item = await prisma.mediaItem.findUnique({
      where: { id },
      select: { id: true, status: true, altText: true, credit: true },
    });
    if (!item) return fail("Photograph not found", 404);

    if (input.status === "PUBLISHED" && !item.altText) {
      return fail("Publishing requires alt text describing the photograph", 400);
    }
    if (input.status === "PUBLISHED" && !item.credit) {
      return fail("Publishing requires a credit for the photograph", 400);
    }

    await prisma.mediaItem.update({
      where: { id: item.id },
      data: { status: input.status, tier: input.tier ?? undefined },
    });

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "media.update",
      targetType: "MediaItem",
      targetId: item.id,
      summary: safeSummary({ from: item.status, to: input.status }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
