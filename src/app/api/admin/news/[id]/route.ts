import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestMeta } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { guard, errorResponse, fail, ok, parseBody } from "@/lib/api";
import { audit, safeSummary } from "@/lib/audit";

const schema = z.object({
  status: z
    .enum(["DRAFT", "EDITORIAL_REVIEW", "SOURCE_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"])
    .optional(),
  title: z.string().trim().min(6).max(200).optional(),
  excerpt: z.string().trim().max(400).optional().nullable(),
  body: z.string().trim().min(50).optional(),
  sources: z.string().trim().max(2000).optional().nullable(),
  /// Required when the body changes after publication (section 13).
  correctionSummary: z.string().trim().max(500).optional().nullable(),
});

/**
 * Editorial workflow: Draft → Editorial Review → Source Review → Approval →
 * Publish → Correction history. Corrections never overwrite: every body change
 * after publication writes a NewsRevision that stays visible.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await guard("news.edit");
    const { id } = await params;
    const input = await parseBody(req, schema);

    const article = await prisma.newsArticle.findUnique({
      where: { id },
      select: { id: true, status: true, title: true, body: true, publishedAt: true },
    });
    if (!article) return fail("Article not found", 404);

    if (input.status === "PUBLISHED" || input.status === "APPROVED") {
      await requirePermission({ userId: actor.userId, role: actor.role }, "news.publish");
    }

    const bodyChanged = input.body !== undefined && input.body !== article.body;
    const wasPublished = article.status === "PUBLISHED";
    if (bodyChanged && wasPublished && !input.correctionSummary) {
      return fail("Editing a published article requires a correction summary", 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.newsArticle.update({
        where: { id: article.id },
        data: {
          title: input.title ?? undefined,
          excerpt: input.excerpt ?? undefined,
          body: input.body ?? undefined,
          sources: input.sources ?? undefined,
          status: input.status ?? undefined,
          publishedAt:
            input.status === "PUBLISHED" && !article.publishedAt ? new Date() : undefined,
        },
      });

      if (bodyChanged || input.correctionSummary) {
        await tx.newsRevision.create({
          data: {
            articleId: article.id,
            editorId: actor.userId,
            summary: input.correctionSummary ?? "Content updated before publication",
            isCorrection: wasPublished,
            bodySnapshot: article.body,
          },
        });
      }
    });

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: input.status === "PUBLISHED" ? "news.publish" : "news.update",
      targetType: "NewsArticle",
      targetId: article.id,
      summary: safeSummary({
        title: article.title,
        status: input.status ?? article.status,
        correction: input.correctionSummary ?? "",
      }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
