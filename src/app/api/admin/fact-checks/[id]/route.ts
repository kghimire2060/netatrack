import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { guard, errorResponse, fail, ok, parseBody } from "@/lib/api";
import { audit, safeSummary } from "@/lib/audit";

const schema = z.object({
  verdict: z
    .enum(["TRUE", "MOSTLY_TRUE", "MISLEADING", "FALSE", "UNVERIFIED", "INSUFFICIENT_EVIDENCE"])
    .optional(),
  summary: z.string().trim().max(1000).optional().nullable(),
  analysis: z.string().trim().max(20000).optional().nullable(),
  status: z
    .enum(["DRAFT", "EDITORIAL_REVIEW", "SOURCE_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"])
    .optional(),
  subjectResponse: z.string().trim().max(4000).optional().nullable(),
});

/**
 * Fact-check workflow: Claim intake → Evidence → Reviewer → Verdict → Editor
 * approval → Publish.
 *
 * A candidate account may only attach a subject response (factcheck.respond);
 * it can never change the verdict, the analysis or the status.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = await parseBody(req, schema);

    const onlyResponse =
      input.subjectResponse !== undefined &&
      input.verdict === undefined &&
      input.summary === undefined &&
      input.analysis === undefined &&
      input.status === undefined;

    const actor = onlyResponse ? await guard("factcheck.respond") : await guard("factcheck.review");

    const factCheck = await prisma.factCheck.findUnique({
      where: { id },
      select: { id: true, claim: true, status: true, verdict: true, candidateId: true, publishedAt: true },
    });
    if (!factCheck) return fail("Fact check not found", 404);

    if (onlyResponse) {
      // A candidate may respond only on a fact check about their own profile.
      const candidate = factCheck.candidateId
        ? await prisma.candidate.findUnique({
            where: { id: factCheck.candidateId },
            select: { accountId: true },
          })
        : null;
      const isSubject = candidate?.accountId === actor.userId;
      if (!isSubject) {
        await requirePermission({ userId: actor.userId, role: actor.role }, "factcheck.review");
      }
    }

    if (input.status === "PUBLISHED" || input.status === "APPROVED") {
      await requirePermission({ userId: actor.userId, role: actor.role }, "factcheck.publish");
    }

    await prisma.factCheck.update({
      where: { id: factCheck.id },
      data: {
        verdict: input.verdict ?? undefined,
        summary: input.summary ?? undefined,
        analysis: input.analysis ?? undefined,
        status: input.status ?? undefined,
        subjectResponse: input.subjectResponse ?? undefined,
        reviewerId: onlyResponse ? undefined : actor.userId,
        editorId: input.status === "PUBLISHED" ? actor.userId : undefined,
        publishedAt:
          input.status === "PUBLISHED" && !factCheck.publishedAt ? new Date() : undefined,
      },
    });

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: onlyResponse ? "factcheck.subject_response" : "factcheck.update",
      targetType: "FactCheck",
      targetId: factCheck.id,
      summary: safeSummary({
        claim: factCheck.claim.slice(0, 80),
        verdictFrom: factCheck.verdict,
        verdictTo: input.verdict ?? factCheck.verdict,
        status: input.status ?? factCheck.status,
      }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
