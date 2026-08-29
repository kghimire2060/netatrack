import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { guard, errorResponse, fail, limitByIp, parseBody, toCsv } from "@/lib/api";
import { LIMITS } from "@/lib/rate-limit";
import { DATASETS, runDataset, type DatasetKey } from "@/lib/datasets";
import { audit } from "@/lib/audit";

const schema = z.object({
  dataset: z.string(),
  format: z.enum(["csv", "json"]).default("csv"),
});

/**
 * Approved-dataset export (section 14).
 *
 * Requires analytics.export AND an administrator-approved researcher flag.
 * Every export is rate limited and written to ExportLog with the row count.
 */
export async function POST(req: Request) {
  const limited = await limitByIp("export", LIMITS.export);
  if (limited) return limited;

  try {
    const actor = await guard("analytics.export");
    const input = await parseBody(req, schema);

    if (!(input.dataset in DATASETS)) return fail("Unknown dataset", 404);
    const dataset = input.dataset as DatasetKey;

    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { researcherApproved: true, role: true },
    });
    const privileged = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
    if (!privileged && !user?.researcherApproved) {
      return fail("Your researcher access has not been approved yet", 403);
    }

    const rows = await runDataset(dataset);
    const meta = await requestMeta();

    await prisma.exportLog.create({
      data: {
        userId: actor.userId,
        dataset,
        rowCount: rows.length,
        format: input.format,
      },
    });
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "analytics.export",
      targetType: "Dataset",
      targetId: dataset,
      summary: `${rows.length} rows as ${input.format}`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    if (input.format === "json") {
      return new Response(JSON.stringify({ dataset, rows }, null, 2), {
        headers: {
          "content-type": "application/json",
          "content-disposition": `attachment; filename="netatrack-${dataset}.json"`,
        },
      });
    }

    return new Response(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="netatrack-${dataset}.csv"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
