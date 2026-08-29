import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, errorResponse, fail, ok, parseBody } from "@/lib/api";
import { audit, safeSummary } from "@/lib/audit";

const schema = z.object({
  status: z.enum([
    "NOT_STARTED",
    "IN_PROGRESS",
    "COMPLETED",
    "DELAYED",
    "CANCELLED",
    "UNABLE_TO_VERIFY",
  ]),
  note: z.string().trim().max(2000).optional().nullable(),
  evidenceUrl: z.string().url().max(500).optional().nullable(),
});

/**
 * Promise progress update (section 12). A status of COMPLETED requires
 * evidence, so the tracker stays evidence-backed rather than assertion-based.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await guard("promise.manage");
    const { id } = await params;
    const input = await parseBody(req, schema);

    const promise = await prisma.promise.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, evidenceUrl: true },
    });
    if (!promise) return fail("Promise not found", 404);

    if (input.status === "COMPLETED" && !input.evidenceUrl && !promise.evidenceUrl) {
      return fail("Marking a promise completed requires an evidence link", 400);
    }

    await prisma.$transaction([
      prisma.promise.update({
        where: { id: promise.id },
        data: {
          status: input.status,
          evidenceUrl: input.evidenceUrl ?? undefined,
          evidenceNote: input.note ?? undefined,
          lastUpdateAt: new Date(),
        },
      }),
      prisma.promiseUpdate.create({
        data: {
          promiseId: promise.id,
          status: input.status,
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
      action: "promise.update",
      targetType: "Promise",
      targetId: promise.id,
      summary: safeSummary({ title: promise.title, from: promise.status, to: input.status }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
