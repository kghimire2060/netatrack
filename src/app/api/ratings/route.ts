import { prisma } from "@/lib/db";
import { hashIp, requestMeta } from "@/lib/auth";
import { guard, created, errorResponse, fail, limitByIp, parseBody } from "@/lib/api";
import { LIMITS } from "@/lib/rate-limit";
import { ratingSchema } from "@/lib/validation";
import { weightedScore } from "@/lib/ratings";
import { getSetting } from "@/lib/settings";
import { audit } from "@/lib/audit";

/**
 * Submit or update a candidate rating (section 7).
 *
 * Safeguards: authenticated users only, one rating per user per candidate
 * (updates replace), rate limiting, and an IP hash retained for abuse detection
 * without storing the raw address.
 */
export async function POST(req: Request) {
  const limited = await limitByIp("rating", LIMITS.rating);
  if (limited) return limited;

  try {
    const actor = await guard("rating.create");
    if (!(await getSetting("ratings.enabled"))) {
      return fail("Candidate ratings are currently disabled", 403);
    }

    const input = await parseBody(req, ratingSchema);
    const candidate = await prisma.candidate.findUnique({
      where: { id: input.candidateId },
      select: { id: true, accountId: true },
    });
    if (!candidate) return fail("Candidate not found", 404);
    if (candidate.accountId === actor.userId) {
      return fail("You cannot rate your own candidate profile", 403);
    }

    const scores = {
      publicTrust: input.publicTrust,
      communication: input.communication,
      localIssueFocus: input.localIssueFocus,
      policyClarity: input.policyClarity,
      responsiveness: input.responsiveness,
      overall: input.overall,
    };
    const score = weightedScore(scores);
    const meta = await requestMeta();

    const rating = await prisma.rating.upsert({
      where: { userId_candidateId: { userId: actor.userId, candidateId: candidate.id } },
      update: { ...scores, weightedScore: score, comment: input.comment ?? null },
      create: {
        ...scores,
        weightedScore: score,
        comment: input.comment ?? null,
        userId: actor.userId,
        candidateId: candidate.id,
        ipHash: hashIp(meta.ip),
      },
      select: { id: true },
    });

    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "rating.submit",
      targetType: "Candidate",
      targetId: candidate.id,
      summary: `weightedScore=${score}`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return created({ id: rating.id, weightedScore: score });
  } catch (error) {
    return errorResponse(error);
  }
}
