import { z } from "zod";
import { requestMeta } from "@/lib/auth";
import { guard, errorResponse, ok, parseBody } from "@/lib/api";
import { setSetting, invalidateSettingsCache } from "@/lib/settings";
import { audit, safeSummary } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

const schema = z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]));

export async function PATCH(req: Request) {
  try {
    const actor = await guard("settings.manage");
    const input = await parseBody(req, schema);

    for (const [key, value] of Object.entries(input)) {
      await setSetting(key, value as Prisma.InputJsonValue);
    }
    invalidateSettingsCache();

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "settings.update",
      targetType: "Setting",
      summary: safeSummary({ keys: Object.keys(input).join(",") }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
