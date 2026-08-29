import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, errorResponse, fail, ok, parseBody } from "@/lib/api";
import { candidateSelfEditSchema } from "@/lib/validation";
import { audit, safeSummary } from "@/lib/audit";

/**
 * Candidate self-service edit (section 6).
 *
 * Only the account linked by an APPROVED claim may call this, and only the
 * whitelisted fields in `candidateSelfEditSchema` can change. Verification
 * status, fact-checks, ratings and official results are unreachable from here.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await guard("candidate.edit.own");
    const { id } = await params;

    const candidate = await prisma.candidate.findUnique({
      where: { id },
      select: { id: true, accountId: true, fullName: true },
    });
    if (!candidate) return fail("Candidate not found", 404);
    if (candidate.accountId !== actor.userId) {
      return fail("You can only edit the candidate profile linked to your account", 403);
    }

    const input = await parseBody(req, candidateSelfEditSchema);
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        biography: input.biography ?? null,
        education: input.education ?? null,
        experience: input.experience ?? null,
        previousPositions: input.previousPositions ?? null,
        agenda: input.agenda ?? null,
        keyIssues: input.keyIssues ?? null,
        photoUrl: input.photoUrl ?? null,
        socialLinks: input.socialLinks ?? undefined,
      },
    });

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "candidate.self_edit",
      targetType: "Candidate",
      targetId: candidate.id,
      summary: safeSummary({ fields: Object.keys(input).join(",") }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
