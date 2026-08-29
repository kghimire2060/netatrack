import { prisma } from "@/lib/db";
import { requireActor, requestMeta } from "@/lib/auth";
import { claimReference } from "@/lib/tracking";
import { claimSchema } from "@/lib/validation";
import { created, errorResponse, fail, parseBody } from "@/lib/api";
import { audit } from "@/lib/audit";

/**
 * Candidate profile claim request (section 6):
 * request → evidence → staff review → admin approval → account linked.
 */
export async function POST(req: Request) {
  try {
    const actor = await requireActor();
    const input = await parseBody(req, claimSchema);

    const candidate = await prisma.candidate.findUnique({
      where: { id: input.candidateId },
      select: { id: true, fullName: true, accountId: true },
    });
    if (!candidate) return fail("Candidate not found", 404);
    if (candidate.accountId) return fail("This profile has already been claimed", 409);

    const pending = await prisma.candidateClaim.findFirst({
      where: {
        candidateId: candidate.id,
        requesterId: actor.userId,
        status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
      },
      select: { id: true },
    });
    if (pending) return fail("You already have a claim awaiting review for this profile", 409);

    const claim = await prisma.candidateClaim.create({
      data: {
        reference: claimReference(),
        candidateId: candidate.id,
        requesterId: actor.userId,
        evidenceUrl: input.evidenceUrl ?? null,
        statement: input.statement,
        status: "SUBMITTED",
      },
      select: { id: true, reference: true },
    });

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "candidate.claim_submitted",
      targetType: "CandidateClaim",
      targetId: claim.id,
      summary: `Claim ${claim.reference} for ${candidate.fullName}`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return created({ reference: claim.reference });
  } catch (error) {
    return errorResponse(error);
  }
}
