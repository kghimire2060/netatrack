import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, errorResponse, fail, ok, parseBody } from "@/lib/api";
import { audit, safeSummary } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "REJECTED"]),
  sourceName: z.string().trim().max(200).optional().nullable(),
  sourceUrl: z.string().url().max(500).optional().nullable(),
});

/**
 * Publish/verify an official result (section 11).
 *
 * A result cannot be verified without a named source: official figures must
 * always display where they came from and when they were updated.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await guard("result.publish");
    const { id } = await params;
    const input = await parseBody(req, schema);

    const existing = await prisma.result.findUnique({
      where: { id },
      select: { id: true, sourceName: true, votes: true, candidateId: true },
    });
    if (!existing) return fail("Result not found", 404);

    const sourceName = input.sourceName ?? existing.sourceName;
    if (input.status === "VERIFIED" && !sourceName) {
      return fail("A source must be recorded before an official result can be verified", 400);
    }

    await prisma.result.update({
      where: { id },
      data: {
        status: input.status,
        sourceName: input.sourceName ?? undefined,
        sourceUrl: input.sourceUrl ?? undefined,
        publishedAt: input.status === "VERIFIED" ? new Date() : null,
      },
    });

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "result.publish",
      targetType: "Result",
      targetId: id,
      summary: safeSummary({ status: input.status, source: sourceName ?? "", votes: existing.votes }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
