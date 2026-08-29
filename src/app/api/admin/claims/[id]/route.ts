import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, errorResponse, fail, ok, parseBody } from "@/lib/api";
import { queueEmail } from "@/lib/email";
import { templates } from "@/lib/email-templates";
import { audit, safeSummary } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(1000).optional().nullable(),
});

/**
 * Claim review (section 6). Approval links the requester's account to the
 * candidate record and switches their role to CANDIDATE, which grants
 * candidate.edit.own — and nothing else.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await guard("candidate.claim.review");
    const { id } = await params;
    const input = await parseBody(req, schema);

    const claim = await prisma.candidateClaim.findUnique({
      where: { id },
      select: {
        id: true,
        reference: true,
        status: true,
        candidateId: true,
        requesterId: true,
        candidate: { select: { fullName: true, accountId: true } },
        requester: { select: { email: true, fullName: true, role: true } },
      },
    });
    if (!claim) return fail("Claim not found", 404);
    if (claim.status === "APPROVED" || claim.status === "REJECTED") {
      return fail("This claim has already been decided", 409);
    }
    if (input.status === "APPROVED" && claim.candidate.accountId) {
      return fail("That candidate profile is already linked to another account", 409);
    }

    await prisma.$transaction(async (tx) => {
      await tx.candidateClaim.update({
        where: { id: claim.id },
        data: {
          status: input.status,
          reviewNote: input.reviewNote ?? null,
          reviewerId: actor.userId,
        },
      });

      if (input.status === "APPROVED") {
        await tx.candidate.update({
          where: { id: claim.candidateId },
          data: { accountId: claim.requesterId },
        });
        // Do not demote an existing staff/admin account.
        if (claim.requester.role === "CITIZEN") {
          await tx.user.update({
            where: { id: claim.requesterId },
            data: { role: "CANDIDATE" },
          });
        }
        // Any other pending claim on this profile is now moot.
        await tx.candidateClaim.updateMany({
          where: {
            candidateId: claim.candidateId,
            id: { not: claim.id },
            status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
          },
          data: { status: "REJECTED", reviewNote: "Profile claimed by another verified account" },
        });
      }
    });

    if (input.status !== "UNDER_REVIEW") {
      const mail = templates.candidateClaim(
        input.status,
        claim.candidate.fullName,
        input.reviewNote
      );
      await queueEmail({
        to: claim.requester.email,
        type: `candidate.claim_${input.status.toLowerCase()}`,
        userId: claim.requesterId,
        relatedType: "CandidateClaim",
        relatedId: claim.id,
        ...mail,
      });
    }

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: `candidate.claim_${input.status.toLowerCase()}`,
      targetType: "CandidateClaim",
      targetId: claim.id,
      summary: safeSummary({
        reference: claim.reference,
        candidate: claim.candidate.fullName,
        note: input.reviewNote ?? "",
      }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
