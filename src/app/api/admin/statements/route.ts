import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, created, errorResponse, fail, parseBody } from "@/lib/api";
import { statementWriteSchema } from "@/lib/validation";
import { audit, safeSummary } from "@/lib/audit";

/**
 * Record a public statement.
 *
 * Publishing a quote attributed to a named person is the highest-risk write on
 * this platform, so the source requirement is hard rather than advisory: a
 * statement cannot reach PUBLISHED without one. It may still be saved as a
 * draft while an editor tracks the source down.
 */
export async function POST(req: Request) {
  try {
    const actor = await guard("statement.manage");
    const input = await parseBody(req, statementWriteSchema);

    if (input.publish && !input.sourceUrl && !input.sourceName) {
      return fail("A statement cannot be published without a source", 400);
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: input.candidateId },
      select: { id: true, fullName: true },
    });
    if (!candidate) return fail("Candidate not found", 404);

    if (input.factCheckId) {
      const factCheck = await prisma.factCheck.findUnique({
        where: { id: input.factCheckId },
        select: { id: true },
      });
      if (!factCheck) return fail("Fact-check not found", 404);
    }

    const statement = await prisma.statement.create({
      data: {
        candidateId: candidate.id,
        quote: input.quote,
        quoteNe: input.quoteNe ?? null,
        context: input.context,
        venue: input.venue ?? null,
        statedAt: input.statedAt ? new Date(input.statedAt) : null,
        topic: input.topic ?? null,
        sourceName: input.sourceName ?? null,
        sourceUrl: input.sourceUrl ?? null,
        factCheckId: input.factCheckId ?? null,
        // Unverified until a human checks the quote against the cited source.
        tier: "UNVERIFIED",
        status: input.publish ? "PUBLISHED" : "DRAFT",
      },
      select: { id: true },
    });

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "statement.create",
      targetType: "Statement",
      targetId: statement.id,
      summary: safeSummary({
        candidate: candidate.fullName,
        context: input.context,
        published: String(input.publish),
      }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return created({ ok: true, id: statement.id });
  } catch (error) {
    return errorResponse(error);
  }
}
