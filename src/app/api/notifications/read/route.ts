import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { errorResponse, ok, parseBody } from "@/lib/api";

const schema = z.object({ id: z.string().uuid().optional() });

/** Marks one notification, or all of them, as read for the current user. */
export async function POST(req: Request) {
  try {
    const actor = await requireActor();
    const { id } = await parseBody(req, schema);

    const result = await prisma.notification.updateMany({
      // Scoped to the caller: an id belonging to someone else matches nothing.
      where: { userId: actor.userId, readAt: null, ...(id ? { id } : {}) },
      data: { readAt: new Date() },
    });

    return ok({ ok: true, updated: result.count });
  } catch (error) {
    return errorResponse(error);
  }
}
