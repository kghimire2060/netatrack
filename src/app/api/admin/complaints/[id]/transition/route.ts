import { prisma } from "@/lib/db";
import { requireActor, requestMeta } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { errorResponse, fail, ok, parseBody } from "@/lib/api";
import { complaintTransitionSchema } from "@/lib/validation";
import {
  NOTIFY_ON,
  isValidTransition,
  permissionForTransition,
} from "@/lib/complaint-workflow";
import { queueEmail, notifyInApp } from "@/lib/email";
import { templates } from "@/lib/email-templates";
import { audit, safeSummary } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

/**
 * The single entry point for moving a complaint through its lifecycle.
 *
 * Enforced here, never in the UI:
 *   1. the transition must be legal for the current state,
 *   2. the actor must hold the permission that transition requires,
 *   3. staff may only act on issues assigned to them unless they hold
 *      complaint.view.all,
 *   4. a resolution requires a resolution note,
 *   5. the reporter is notified for the states listed in NOTIFY_ON.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor();
    const { id } = await params;
    const input = await parseBody(req, complaintTransitionSchema);

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      select: {
        id: true,
        trackingId: true,
        status: true,
        assignedToId: true,
        reporterId: true,
        contactEmail: true,
        reporter: { select: { email: true, id: true } },
      },
    });
    if (!complaint) return fail("Issue not found", 404);

    // (3) scope check
    const seesAll = await prisma.user
      .findUnique({ where: { id: actor.userId }, select: { role: true } })
      .then(async (user) =>
        user ? isEscalated(user.role) : false
      );
    if (!seesAll && complaint.assignedToId !== actor.userId) {
      await requirePermission({ userId: actor.userId, role: actor.role }, "complaint.view.all");
    }

    // (1) legal transition
    if (!isValidTransition(complaint.status, input.status)) {
      return fail(`Cannot move an issue from ${complaint.status} to ${input.status}`, 409);
    }

    // (2) permission for this specific transition
    const permission = permissionForTransition(complaint.status, input.status);
    if (!permission) return fail("Transition not allowed", 409);
    await requirePermission({ userId: actor.userId, role: actor.role }, permission);

    // (4) resolution evidence
    if (input.status === "RESOLVED" && !input.resolutionNote) {
      return fail("A resolution note is required when resolving an issue", 400);
    }
    if (input.status === "ASSIGNED" && !input.assignedToId) {
      return fail("Choose a staff member to assign this issue to", 400);
    }

    const now = new Date();
    const data: Prisma.ComplaintUpdateInput = { status: input.status };
    if (input.priority) data.priority = input.priority;
    if (input.publicUpdate) data.publicResponse = input.publicUpdate;
    if (input.expectedUpdateAt) data.expectedUpdateAt = new Date(input.expectedUpdateAt);
    if (input.department !== undefined) data.department = input.department;
    if (input.internalNote) {
      data.internalNotes = { set: input.internalNote };
    }
    if (input.assignedToId) data.assignedTo = { connect: { id: input.assignedToId } };
    if (input.status === "VERIFIED") {
      data.verifiedBy = { connect: { id: actor.userId } };
      data.verifiedAt = now;
    }
    if (input.status === "RESOLVED") {
      data.resolutionNote = input.resolutionNote;
      data.resolvedAt = now;
      data.reopenRequested = false;
    }
    if (input.status === "CLOSED") data.closedAt = now;
    if (complaint.status === "CLOSED" || complaint.status === "RESOLVED") {
      if (input.status === "IN_PROGRESS") {
        data.closedAt = null;
        data.resolvedAt = null;
        data.reopenRequested = false;
      }
    }

    await prisma.$transaction([
      prisma.complaint.update({ where: { id: complaint.id }, data }),
      prisma.complaintEvent.create({
        data: {
          complaintId: complaint.id,
          status: input.status,
          actorId: actor.userId,
          actorLabel: labelFor(actor.role),
          publicUpdate: input.publicUpdate ?? null,
          internalNote: input.internalNote ?? null,
          isPublic: Boolean(input.publicUpdate),
        },
      }),
    ]);

    // (5) notifications
    if (NOTIFY_ON.includes(input.status)) {
      const to = complaint.reporter?.email ?? complaint.contactEmail;
      if (to) {
        const mail =
          input.status === "RESOLVED"
            ? templates.complaintResolved(complaint.trackingId, input.resolutionNote ?? null)
            : templates.complaintStatus(
                complaint.trackingId,
                input.status,
                input.publicUpdate ?? null
              );
        await queueEmail({
          to,
          type: `complaint.${input.status.toLowerCase()}`,
          userId: complaint.reporterId,
          relatedType: "Complaint",
          relatedId: complaint.id,
          ...mail,
        });
      }
    }
    if (input.status === "ASSIGNED" && input.assignedToId) {
      await notifyInApp({
        userId: input.assignedToId,
        type: "complaint.assigned",
        subject: `Issue ${complaint.trackingId} assigned to you`,
        body: input.publicUpdate ?? "You have been assigned a citizen issue.",
        relatedType: "Complaint",
        relatedId: complaint.id,
      });
    }

    const meta = await requestMeta();
    await audit({
      actorId: actor.userId,
      actorRole: actor.role,
      action: `complaint.${input.status.toLowerCase()}`,
      targetType: "Complaint",
      targetId: complaint.id,
      summary: safeSummary({
        trackingId: complaint.trackingId,
        from: complaint.status,
        to: input.status,
        assignedToId: input.assignedToId ?? undefined,
      }),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true, status: input.status });
  } catch (error) {
    return errorResponse(error);
  }
}

function isEscalated(role: string) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

function labelFor(role: string) {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return "Admin";
  if (role === "STAFF") return "Staff";
  return "Citizen";
}
