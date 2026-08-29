import { prisma } from "@/lib/db";
import { getActor, requestMeta } from "@/lib/auth";
import { generateTrackingId } from "@/lib/tracking";
import { queueEmail } from "@/lib/email";
import { templates } from "@/lib/email-templates";
import { audit } from "@/lib/audit";
import { getSetting } from "@/lib/settings";
import { complaintCreateSchema } from "@/lib/validation";
import { created, errorResponse, fail, limitByIp, parseBody } from "@/lib/api";
import { LIMITS } from "@/lib/rate-limit";

/**
 * Submit a citizen issue (section 8). On success the complaint receives a
 * public Tracking ID, an opening timeline event and a confirmation email.
 */
export async function POST(req: Request) {
  const limited = await limitByIp("complaint", LIMITS.complaintCreate);
  if (limited) return limited;

  try {
    const input = await parseBody(req, complaintCreateSchema);
    const actor = await getActor();
    const meta = await requestMeta();

    if (!actor && !(await getSetting("complaints.allowAnonymous"))) {
      return fail("Log in to submit an issue", 401);
    }

    const categories = await getSetting("complaints.categories");
    if (!(categories as readonly string[]).includes(input.category)) {
      return fail("Unknown category", 400);
    }

    const slaHours = Number(await getSetting("complaints.slaHours"));
    const trackingId = await generateTrackingId();

    const complaint = await prisma.complaint.create({
      data: {
        trackingId,
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority,
        province: input.province ?? null,
        district: input.district ?? null,
        locationDetail: input.locationDetail ?? null,
        constituencyId: input.constituencyId ?? null,
        reporterId: actor?.userId ?? null,
        contactEmail: actor ? null : (input.contactEmail ?? null),
        expectedUpdateAt: new Date(Date.now() + slaHours * 3_600_000),
        events: {
          create: {
            status: "SUBMITTED",
            actorId: actor?.userId ?? null,
            actorLabel: "Citizen",
            publicUpdate: "Issue submitted successfully.",
          },
        },
      },
      select: { id: true, trackingId: true, title: true },
    });

    const notifyTo = actor?.email ?? input.contactEmail ?? null;
    if (notifyTo) {
      const mail = templates.complaintCreated(complaint.trackingId, complaint.title);
      await queueEmail({
        to: notifyTo,
        type: "complaint.created",
        userId: actor?.userId ?? null,
        relatedType: "Complaint",
        relatedId: complaint.id,
        ...mail,
      });
    }

    await audit({
      actorId: actor?.userId ?? null,
      actorRole: actor?.role ?? null,
      action: "complaint.create",
      targetType: "Complaint",
      targetId: complaint.id,
      summary: `Tracking ID ${complaint.trackingId}; category ${input.category}`,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return created({ trackingId: complaint.trackingId });
  } catch (error) {
    return errorResponse(error);
  }
}
