import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, errorResponse, fail, ok, parseBody } from "@/lib/api";
import { audit, safeSummary } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  /** Set once the quote has been checked against its cited source. */
  tier: z.enum(["OFFICIAL", "NETATRACK", "UNVERIFIED", "DISPUTED"]).optional(),
});

/**
 * Publish, archive or re-tier a statement.
 *
 * Archiving rather than deleting is deliberate: a quote we published and later
 * withdrew is part of our own record, and a reader who saw it should be able
 * to find out what happened to it.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await guard("statement.manage");
    const { id } = await params;
    const input = await parseBody(req, schema);

    const statement = await prisma.statement.findUnique({
      where: { id },
      select: { id: true, status: true, sourceName: true, sourceUrl: true },
    });
    if (!statement) return fail("Statement not found", 404);

    // Same bar as creation — a draft with no source cannot be promoted.
    if (input.status === "PUBLISHED" && !statement.sourceUrl && !statement.sourceName) {
      return fail("A statement cannot be published without a source", 400);
    }

    await prisma.statement.update({
      where: { id: statement.id },
      data: { status: input.status, tier: input.tier ?? undefined },
    });

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "statement.update",
      targetType: "Statement",
      targetId: statement.id,
      summary: safeSummary({ from: statement.status, to: input.status, tier: input.tier ?? "" }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
