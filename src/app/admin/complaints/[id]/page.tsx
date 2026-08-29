import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Badge, Breadcrumb, Card } from "@/components/ui";
import { ComplaintBadge } from "@/components/status";
import { ComplaintActionPanel } from "@/components/admin-forms";
import { allowedTransitions, permissionForTransition, STATUS_TONE } from "@/lib/complaint-workflow";
import { formatDateTime, humanize, relativeTime } from "@/lib/format";
import type { Permission } from "@/lib/permissions";

export const metadata = { title: "Issue detail" };

export default async function AdminComplaintDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireActor();
  const { id } = await params;

  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: {
      reporter: { select: { id: true, fullName: true, email: true } },
      assignedTo: { select: { id: true, fullName: true } },
      verifiedBy: { select: { fullName: true } },
      constituency: { select: { name: true, district: true } },
      attachments: { orderBy: { createdAt: "asc" } },
      events: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { fullName: true } } },
      },
    },
  });

  if (!complaint) notFound();

  const seesAll = await can({ userId: actor.userId, role: actor.role }, "complaint.view.all");
  if (!seesAll && complaint.assignedToId !== actor.userId) redirect("/admin/complaints");

  // Only offer transitions the signed-in actor may actually perform.
  const candidateTransitions = allowedTransitions(complaint.status);
  const transitions: string[] = [];
  for (const target of candidateTransitions) {
    const permission = permissionForTransition(complaint.status, target);
    if (permission && (await can({ userId: actor.userId, role: actor.role }, permission as Permission))) {
      transitions.push(target);
    }
  }

  const staff = await prisma.user.findMany({
    where: { role: { in: ["STAFF", "ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" },
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Issue queue", href: "/admin/complaints" },
          { label: complaint.trackingId },
        ]}
      />

      <div className="row-between">
        <div>
          <div className="mono small faint">{complaint.trackingId}</div>
          <h1 style={{ margin: ".1rem 0" }}>{complaint.title}</h1>
          <div className="row small muted">
            <ComplaintBadge status={complaint.status} />
            <Badge tone={complaint.priority === "URGENT" ? "bad" : "muted"}>
              {humanize(complaint.priority)}
            </Badge>
            <span>{complaint.category}</span>
            <span>Submitted {formatDateTime(complaint.createdAt)}</span>
          </div>
        </div>
        <Link className="btn btn-sm btn-ghost" href={`/track?id=${complaint.trackingId}`}>
          View public page
        </Link>
      </div>

      <div className="grid grid-sidebar" style={{ marginTop: "1rem" }}>
        <div className="stack">
          <Card title="Description">
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{complaint.description}</p>
            {complaint.locationDetail ? (
              <p className="small muted" style={{ marginTop: ".6rem", marginBottom: 0 }}>
                Location detail: {complaint.locationDetail}
              </p>
            ) : null}
          </Card>

          <Card title="Take action">
            <ComplaintActionPanel
              complaintId={complaint.id}
              currentStatus={complaint.status}
              transitions={transitions}
              staff={staff}
              assignedToId={complaint.assignedToId}
              department={complaint.department}
            />
          </Card>

          <Card title="Full timeline (internal)">
            <ul className="timeline">
              {complaint.events.map((event) => (
                <li key={event.id} className={`is-${STATUS_TONE[event.status]}`}>
                  <div className="when">{formatDateTime(event.createdAt)}</div>
                  <div className="what">
                    {humanize(event.status)}{" "}
                    <span className="small faint">
                      · {event.actor?.fullName ?? event.actorLabel}
                    </span>
                    {event.isPublic ? (
                      <Badge tone="good">Public</Badge>
                    ) : (
                      <Badge tone="muted">Internal</Badge>
                    )}
                  </div>
                  {event.publicUpdate ? (
                    <p className="small" style={{ margin: ".15rem 0 0" }}>
                      {event.publicUpdate}
                    </p>
                  ) : null}
                  {event.internalNote ? (
                    <p
                      className="small"
                      style={{
                        margin: ".25rem 0 0",
                        padding: ".35rem .6rem",
                        background: "#fdf0e0",
                        borderRadius: "7px",
                      }}
                    >
                      <strong>Internal:</strong> {event.internalNote}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>

          {complaint.attachments.length > 0 ? (
            <Card title="Evidence">
              <ul className="small" style={{ paddingLeft: "1.1rem", margin: 0 }}>
                {complaint.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                      {attachment.fileName}
                    </a>{" "}
                    {attachment.isPublic ? (
                      <Badge tone="good">Public</Badge>
                    ) : (
                      <Badge tone="muted">Internal</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <aside className="stack">
          <Card title="Case detail">
            <dl className="kv">
              <dt>Reporter</dt>
              <dd>
                {complaint.reporter ? (
                  complaint.reporter.fullName
                ) : complaint.contactEmail ? (
                  <span className="faint">Anonymous (contact on file)</span>
                ) : (
                  <span className="faint">Anonymous</span>
                )}
              </dd>
              <dt>Assigned to</dt>
              <dd>{complaint.assignedTo?.fullName ?? <span className="faint">Unassigned</span>}</dd>
              <dt>Department</dt>
              <dd>{complaint.department ?? "—"}</dd>
              <dt>Verified by</dt>
              <dd>{complaint.verifiedBy?.fullName ?? "—"}</dd>
              <dt>Constituency</dt>
              <dd>
                {complaint.constituency
                  ? `${complaint.constituency.name}, ${complaint.constituency.district}`
                  : (complaint.district ?? "—")}
              </dd>
              <dt>Next update due</dt>
              <dd>
                {complaint.expectedUpdateAt ? (
                  <span
                    style={
                      complaint.expectedUpdateAt < new Date() &&
                      complaint.status !== "RESOLVED" &&
                      complaint.status !== "CLOSED"
                        ? { color: "var(--red)", fontWeight: 700 }
                        : undefined
                    }
                  >
                    {relativeTime(complaint.expectedUpdateAt)}
                  </span>
                ) : (
                  "—"
                )}
              </dd>
              <dt>Last updated</dt>
              <dd>{formatDateTime(complaint.updatedAt)}</dd>
            </dl>
          </Card>

          {complaint.internalNotes ? (
            <Card title="Latest internal note">
              <p className="small" style={{ margin: 0 }}>
                {complaint.internalNotes}
              </p>
            </Card>
          ) : null}

          {complaint.citizenFeedback || complaint.reopenRequested ? (
            <Card title="Citizen feedback">
              {complaint.reopenRequested ? (
                <div className="alert alert-warn">
                  The citizen has requested that this issue be reopened.
                </div>
              ) : null}
              {complaint.citizenRating ? (
                <p className="small">Satisfaction: {complaint.citizenRating}/5</p>
              ) : null}
              {complaint.citizenFeedback ? (
                <p className="small" style={{ margin: 0 }}>
                  {complaint.citizenFeedback}
                </p>
              ) : null}
            </Card>
          ) : null}

          <div className="notice notice-blue">
            Only the <strong>public update</strong> field and the status appear on the citizen
            tracking page. Internal notes never leave this screen.
          </div>
        </aside>
      </div>
    </>
  );
}
