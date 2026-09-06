import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, errorResponse, fail, ok, parseBody } from "@/lib/api";
import { candidateDetailsSchema } from "@/lib/validation";
import { audit, safeSummary } from "@/lib/audit";

/**
 * Editorial identity fields on a candidate record.
 *
 * Kept off `candidateSelfEditSchema` on purpose. A claimed candidate account
 * may edit its own biography and agenda, but not its recorded Nepali name,
 * date of birth or office: those are identity facts an editor sources from
 * the Election Commission record, and a subject rewriting them would defeat
 * the point of recording them.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await guard("candidate.edit");
    const { id } = await params;
    const input = await parseBody(req, candidateDetailsSchema);

    const candidate = await prisma.candidate.findUnique({
      where: { id },
      select: { id: true, fullName: true },
    });
    if (!candidate) return fail("Candidate not found", 404);

    // A date of birth in the future, or one implying an age below the
    // constitutional minimum for candidacy, is a data-entry error rather than
    // a fact worth storing.
    let dateOfBirth: Date | null | undefined;
    if (input.dateOfBirth === null) {
      dateOfBirth = null;
    } else if (input.dateOfBirth !== undefined) {
      const parsed = new Date(input.dateOfBirth);
      const years = (Date.now() - parsed.getTime()) / (365.25 * 86_400_000);
      if (years < 18 || years > 120) {
        return fail("Date of birth must give an age between 18 and 120", 400);
      }
      dateOfBirth = parsed;
    }

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        fullNameNe: input.fullNameNe ?? undefined,
        photoUrl: input.photoUrl ?? undefined,
        office: input.office ?? undefined,
        dateOfBirth,
      },
    });

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "candidate.details_edit",
      targetType: "Candidate",
      targetId: candidate.id,
      summary: safeSummary({
        name: candidate.fullName,
        fields: Object.keys(input).join(","),
      }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
