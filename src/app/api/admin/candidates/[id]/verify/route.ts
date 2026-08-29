import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, errorResponse, ok, parseBody } from "@/lib/api";
import { audit, safeSummary } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "REJECTED"]),
  sourceLabel: z.string().trim().max(200).optional().nullable(),
  sourceUrl: z.string().url().max(500).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
});

/**
 * Verification decision on a candidate record. Candidate accounts can never
 * reach this endpoint — it requires candidate.verify, which the CANDIDATE role
 * does not hold.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await guard("candidate.verify");
    const { id } = await params;
    const input = await parseBody(req, schema);

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        verificationStatus: input.status,
        verifiedAt: input.status === "VERIFIED" ? new Date() : null,
      },
      select: { id: true, fullName: true },
    });

    if (input.sourceLabel) {
      await prisma.candidateSource.create({
        data: {
          candidateId: candidate.id,
          field: "verification",
          label: input.sourceLabel,
          url: input.sourceUrl ?? null,
          note: input.note ?? null,
          addedById: actor.userId,
        },
      });
    }

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "candidate.verify",
      targetType: "Candidate",
      targetId: candidate.id,
      summary: safeSummary({ candidate: candidate.fullName, status: input.status, note: input.note ?? "" }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
