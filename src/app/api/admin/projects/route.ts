import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, created, errorResponse, fail, parseBody } from "@/lib/api";
import { projectWriteSchema } from "@/lib/validation";
import { slugify } from "@/lib/tracking";
import { audit, safeSummary } from "@/lib/audit";

/**
 * Create a constituency project record.
 *
 * Two rules are enforced here rather than in the form, because the form is
 * only a convenience and this route is the actual boundary:
 *
 *  1. A project marked COMPLETED must carry a source. The delivery record is
 *     the most contested claim on a profile, and an unsourced "completed" is
 *     precisely the assertion this platform exists not to make.
 *  2. `progressPct` is stored only when supplied. It is never derived from
 *     the status, which would publish a percentage no source ever stated.
 */
export async function POST(req: Request) {
  try {
    const actor = await guard("project.manage");
    const input = await parseBody(req, projectWriteSchema);

    if (input.status === "COMPLETED" && !input.sourceUrl && !input.sourceName) {
      return fail("Recording a project as completed requires a source", 400);
    }

    const constituency = await prisma.constituency.findUnique({
      where: { id: input.constituencyId },
      select: { id: true },
    });
    if (!constituency) return fail("Constituency not found", 404);

    // A slug collision is likely: "Ward 5 road upgrading" recurs across
    // districts and years. Suffix rather than reject, so an editor entering a
    // real second project is not blocked by an unrelated first one.
    const base = slugify(input.title) || "project";
    let slug = base;
    for (let n = 2; await prisma.project.findUnique({ where: { slug }, select: { id: true } }); n++) {
      slug = `${base}-${n}`;
    }

    const project = await prisma.project.create({
      data: {
        slug,
        title: input.title,
        titleNe: input.titleNe ?? null,
        description: input.description ?? null,
        sector: input.sector ?? null,
        status: input.status,
        progressPct: input.progressPct ?? null,
        budgetNpr: input.budgetNpr ?? null,
        spentNpr: input.spentNpr ?? null,
        startedAt: input.startedAt ? new Date(input.startedAt) : null,
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
        completedAt: input.completedAt ? new Date(input.completedAt) : null,
        wardNumber: input.wardNumber ?? null,
        locationDetail: input.locationDetail ?? null,
        implementingBody: input.implementingBody ?? null,
        constituencyId: input.constituencyId,
        candidateId: input.candidateId ?? null,
        promiseId: input.promiseId ?? null,
        sourceName: input.sourceName ?? null,
        sourceUrl: input.sourceUrl ?? null,
        // A newly entered record is unverified until someone checks it against
        // the cited source. Supplying a URL is not the same as verifying it.
        tier: "UNVERIFIED",
        lastUpdateAt: new Date(),
      },
      select: { id: true, slug: true },
    });

    // The opening state is part of the trail, not an implicit starting point.
    await prisma.projectUpdate.create({
      data: {
        projectId: project.id,
        status: input.status,
        progressPct: input.progressPct ?? null,
        note: "Record created",
        evidenceUrl: input.sourceUrl ?? null,
        actorId: actor.userId,
      },
    });

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "project.create",
      targetType: "Project",
      targetId: project.id,
      summary: safeSummary({ title: input.title, status: input.status }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return created({ ok: true, id: project.id, slug: project.slug });
  } catch (error) {
    return errorResponse(error);
  }
}
