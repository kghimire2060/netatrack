import { prisma } from "@/lib/db";
import { getActor, requestMeta } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { normalizeTrackingId } from "@/lib/tracking";
import { complaintFeedbackSchema } from "@/lib/validation";
import { errorResponse, fail, ok, parseBody } from "@/lib/api";

/** Citizen closure feedback and reopen request (section 8). */
export async function POST(req: Request) {
  try {
    const input = await parseBody(req, complaintFeedbackSchema);
    const trackingId = normalizeTrackingId(input.trackingId);

    const complaint = await prisma.complaint.findUnique({
      where: { trackingId },
      select: { id: true, status: true, reporterId: true },
    });
    if (!complaint) return fail("No issue found with that tracking ID", 404);
    if (complaint.status !== "RESOLVED" && complaint.status !== "CLOSED") {
      return fail("Feedback can be given once the issue is resolved", 400);
    }

    const actor = await getActor();
    // A registered reporter's issue can only receive feedback from that reporter.
    if (complaint.reporterId && complaint.reporterId !== actor?.userId) {
      return fail("Only the citizen who reported this issue can send feedback", 403);
    }

    await prisma.complaint.update({
      where: { id: complaint.id },
      data: {
        citizenFeedback: input.feedback ?? null,
        citizenRating: input.rating ?? null,
        reopenRequested: input.requestReopen,
      },
    });

    await prisma.complaintEvent.create({
      data: {
        complaintId: complaint.id,
        status: complaint.status,
        actorId: actor?.userId ?? null,
        actorLabel: "Citizen",
        publicUpdate: input.requestReopen
          ? "Citizen requested that this issue be reopened."
          : "Citizen submitted closure feedback.",
        isPublic: true,
      },
    });

    const meta = await requestMeta();
    await audit({
      actorId: actor?.userId ?? null,
      actorRole: actor?.role ?? null,
      action: input.requestReopen ? "complaint.reopen_requested" : "complaint.feedback",
      targetType: "Complaint",
      targetId: complaint.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
