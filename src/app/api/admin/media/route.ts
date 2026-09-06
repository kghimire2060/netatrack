import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, created, errorResponse, fail, parseBody } from "@/lib/api";
import { mediaWriteSchema } from "@/lib/validation";
import { audit, safeSummary } from "@/lib/audit";

/**
 * Attach an evidence photograph to a politician or a project.
 *
 * Publishing requires alt text and a credit. Both are refusals rather than
 * warnings: an uncredited photograph published as evidence of delivery is an
 * unsourced claim, and an image with no alt text is evidence a screen-reader
 * user cannot reach at all. Either can be filled in later on a draft.
 */
export async function POST(req: Request) {
  try {
    const actor = await guard("media.manage");
    const input = await parseBody(req, mediaWriteSchema);

    if (!input.candidateId && !input.projectId) {
      return fail("A photograph must be attached to a politician or a project", 400);
    }
    if (input.publish && !input.altText) {
      return fail("Publishing requires alt text describing the photograph", 400);
    }
    if (input.publish && !input.credit) {
      return fail("Publishing requires a credit for the photograph", 400);
    }

    if (input.candidateId) {
      const candidate = await prisma.candidate.findUnique({
        where: { id: input.candidateId },
        select: { id: true },
      });
      if (!candidate) return fail("Candidate not found", 404);
    }
    if (input.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { id: true },
      });
      if (!project) return fail("Project not found", 404);
    }

    const item = await prisma.mediaItem.create({
      data: {
        candidateId: input.candidateId ?? null,
        projectId: input.projectId ?? null,
        kind: input.kind,
        imageUrl: input.imageUrl,
        thumbnailUrl: input.thumbnailUrl ?? null,
        caption: input.caption ?? null,
        captionNe: input.captionNe ?? null,
        altText: input.altText ?? null,
        // Left null when unknown rather than defaulting to now: the gallery
        // must never caption a photograph with its upload date.
        capturedAt: input.capturedAt ? new Date(input.capturedAt) : null,
        credit: input.credit ?? null,
        sourceUrl: input.sourceUrl ?? null,
        position: input.position,
        tier: "UNVERIFIED",
        status: input.publish ? "PUBLISHED" : "DRAFT",
      },
      select: { id: true },
    });

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "media.create",
      targetType: "MediaItem",
      targetId: item.id,
      summary: safeSummary({ kind: input.kind, published: String(input.publish) }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return created({ ok: true, id: item.id });
  } catch (error) {
    return errorResponse(error);
  }
}
