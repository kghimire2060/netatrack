import { prisma } from "@/lib/db";
import { isValidTrackingId, normalizeTrackingId } from "@/lib/tracking";
import { errorResponse, fail, limitByIp, ok } from "@/lib/api";
import { LIMITS } from "@/lib/rate-limit";

/**
 * Public tracking endpoint (section 8).
 *
 * Deliberately narrow: internal notes, reporter identity, staff assignment and
 * non-public attachments are never included in this response.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const limited = await limitByIp("track", LIMITS.publicRead);
  if (limited) return limited;

  try {
    const { trackingId: raw } = await params;
    const trackingId = normalizeTrackingId(raw);
    if (!isValidTrackingId(trackingId)) return fail("Not a valid tracking ID", 400);

    const complaint = await prisma.complaint.findUnique({
      where: { trackingId },
      select: {
        trackingId: true,
        title: true,
        category: true,
        priority: true,
        status: true,
        province: true,
        district: true,
        publicResponse: true,
        resolutionNote: true,
        expectedUpdateAt: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        events: {
          where: { isPublic: true },
          orderBy: { createdAt: "asc" },
          select: { status: true, actorLabel: true, publicUpdate: true, createdAt: true },
        },
        attachments: {
          where: { isPublic: true },
          select: { fileName: true, fileUrl: true, mimeType: true, createdAt: true },
        },
      },
    });

    if (!complaint) return fail("No issue found with that tracking ID", 404);
    return ok(complaint);
  } catch (error) {
    return errorResponse(error);
  }
}
