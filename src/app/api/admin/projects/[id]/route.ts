import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, errorResponse, fail, ok, parseBody } from "@/lib/api";
import { projectUpdateSchema } from "@/lib/validation";
import { audit, safeSummary } from "@/lib/audit";

/**
 * Project progress update.
 *
 * Mirrors the promise update route: every status change writes a dated
 * `ProjectUpdate` row, so a project that quietly slipped from IN_PROGRESS to
 * STALLED leaves a visible record of when it did. Completion requires
 * evidence, for the same reason a completed promise does.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await guard("project.manage");
    const { id } = await params;
    const input = await parseBody(req, projectUpdateSchema);

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, sourceUrl: true, completedAt: true },
    });
    if (!project) return fail("Project not found", 404);

    if (input.status === "COMPLETED" && !input.evidenceUrl && !project.sourceUrl) {
      return fail("Marking a project completed requires an evidence link", 400);
    }

    await prisma.$transaction([
      prisma.project.update({
        where: { id: project.id },
        data: {
          status: input.status,
          // Left untouched when the update carries no figure: clearing a
          // published percentage because this update did not mention one
          // would lose a sourced number.
          progressPct: input.progressPct ?? undefined,
          // Stamped on the first transition into COMPLETED only, so a later
          // correcting update does not overwrite the real completion date.
          completedAt:
            input.status === "COMPLETED" && project.completedAt === null
              ? new Date()
              : undefined,
          lastUpdateAt: new Date(),
        },
      }),
      prisma.projectUpdate.create({
        data: {
          projectId: project.id,
          status: input.status,
          progressPct: input.progressPct ?? null,
          note: input.note ?? null,
          evidenceUrl: input.evidenceUrl ?? null,
          actorId: actor.userId,
        },
      }),
    ]);

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "project.update",
      targetType: "Project",
      targetId: project.id,
      summary: safeSummary({ title: project.title, from: project.status, to: input.status }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
