import Link from "next/link";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/auth";
import { Card, EmptyState } from "@/components/ui";
import { ComplaintBadge } from "@/components/status";
import { TrackLookup, ComplaintFeedbackForm } from "@/components/civic-forms";
import { isValidTrackingId, normalizeTrackingId } from "@/lib/tracking";
import { STATUS_TONE, STATUS_BEHAVIOUR } from "@/lib/complaint-workflow";
import { formatDateTime, humanize, relativeTime } from "@/lib/format";

export const metadata = { title: "Track an issue" };

/**
 * Public tracking page (section 8). Renders only public fields: internal notes,
 * staff identities and the reporter are never selected here.
 */
export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const raw = params.id?.trim();
  const trackingId = raw ? normalizeTrackingId(raw) : null;
  const valid = trackingId ? isValidTrackingId(trackingId) : false;

  const complaint =
    trackingId && valid
      ? await prisma.complaint.findUnique({
          where: { trackingId },
          select: {
            trackingId: true,
            title: true,
            description: true,
            category: true,
            priority: true,
            status: true,
            province: true,
            district: true,
            locationDetail: true,
            publicResponse: true,
            resolutionNote: true,
            expectedUpdateAt: true,
            createdAt: true,
            updatedAt: true,
            resolvedAt: true,
            citizenFeedback: true,
            reopenRequested: true,
            events: {
              where: { isPublic: true },
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                status: true,
                actorLabel: true,
                publicUpdate: true,
                createdAt: true,
              },
            },
            attachments: {
              where: { isPublic: true },
              select: { id: true, fileName: true, fileUrl: true },
            },
          },
        })
      : null;

  const actor = await getActor();
  const myIssues = actor
    ? await prisma.complaint.findMany({
        where: { reporterId: actor.userId },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { trackingId: true, title: true, status: true, updatedAt: true },
      })
    : [];

  return (
    <div className="wrap section">
      <h1>Track an issue</h1>
      <p className="muted">
        Enter the tracking ID you received when the issue was submitted. No account is required.
      </p>

      <Card>
        <TrackLookup initial={trackingId ?? ""} />
      </Card>

      {trackingId && !valid ? (
        <div className="alert alert-error" style={{ marginTop: "1rem" }}>
          <strong>{trackingId}</strong> is not a valid tracking ID format. IDs look like{" "}
          <code className="mono">NT-ISSUE-00000001</code>.
        </div>
      ) : null}

      {trackingId && valid && !complaint ? (
        <Card className="section-tight">
          <EmptyState
            title="No issue found with that tracking ID"
            hint="Check for typing errors, or contact support if you believe this is wrong."
          />
        </Card>
      ) : null}

      {complaint ? (
        <div className="grid grid-sidebar" style={{ marginTop: "1rem" }}>
          <div className="stack">
            <Card>
              <div className="row-between">
                <div>
                  <div className="mono small faint">{complaint.trackingId}</div>
                  <h2 style={{ margin: ".1rem 0" }}>{complaint.title}</h2>
                  <div className="small muted">
                    {complaint.category} · {humanize(complaint.priority)} priority
                    {complaint.district ? ` · ${complaint.district}` : ""}
                    {complaint.province ? `, ${complaint.province}` : ""}
                  </div>
                </div>
                <ComplaintBadge status={complaint.status} />
              </div>
              <hr className="divider" />
              <p style={{ whiteSpace: "pre-wrap" }}>{complaint.description}</p>
              {complaint.locationDetail ? (
                <p className="small muted">Location: {complaint.locationDetail}</p>
              ) : null}
            </Card>

            <Card title="Progress timeline">
              <ul className="timeline">
                {complaint.events.map((event) => (
                  <li key={event.id} className={`is-${STATUS_TONE[event.status]}`}>
                    <div className="when">{formatDateTime(event.createdAt)}</div>
                    <div className="what">
                      {humanize(event.status)}{" "}
                      <span className="small faint">· {event.actorLabel}</span>
                    </div>
                    {event.publicUpdate ? (
                      <p className="small" style={{ margin: ".15rem 0 0" }}>
                        {event.publicUpdate}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>

            {complaint.publicResponse || complaint.resolutionNote ? (
              <Card title="Official response">
                {complaint.publicResponse ? <p>{complaint.publicResponse}</p> : null}
                {complaint.resolutionNote ? (
                  <>
                    <div className="label">Resolution</div>
                    <p style={{ margin: 0 }}>{complaint.resolutionNote}</p>
                  </>
                ) : null}
              </Card>
            ) : null}

            {complaint.attachments.length > 0 ? (
              <Card title="Public evidence">
                <ul className="small" style={{ paddingLeft: "1.1rem", margin: 0 }}>
                  {complaint.attachments.map((attachment) => (
                    <li key={attachment.id}>
                      <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                        {attachment.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {complaint.status === "RESOLVED" || complaint.status === "CLOSED" ? (
              <Card title="Your feedback">
                {complaint.citizenFeedback ? (
                  <p className="small muted">
                    Feedback already recorded
                    {complaint.reopenRequested ? " — a reopen request is pending review." : "."}
                  </p>
                ) : (
                  <ComplaintFeedbackForm trackingId={complaint.trackingId} />
                )}
              </Card>
            ) : null}
          </div>

          <aside className="stack">
            <Card title="Status detail">
              <dl className="kv">
                <dt>Current status</dt>
                <dd>
                  <ComplaintBadge status={complaint.status} />
                </dd>
                <dt>Submitted</dt>
                <dd>{formatDateTime(complaint.createdAt)}</dd>
                <dt>Last update</dt>
                <dd>{relativeTime(complaint.updatedAt)}</dd>
                <dt>Next expected update</dt>
                <dd>{formatDateTime(complaint.expectedUpdateAt)}</dd>
                {complaint.resolvedAt ? (
                  <>
                    <dt>Resolved</dt>
                    <dd>{formatDateTime(complaint.resolvedAt)}</dd>
                  </>
                ) : null}
              </dl>
              <hr className="divider" />
              <p className="small muted" style={{ margin: 0 }}>
                {STATUS_BEHAVIOUR[complaint.status]}
              </p>
            </Card>

            <div className="notice notice-blue">
              Internal notes, personal information and staff communications are never shown on this
              page.
            </div>
          </aside>
        </div>
      ) : null}

      {actor && myIssues.length > 0 ? (
        <Card title="Your recent issues" className="section-tight">
          <div className="table-wrap">
            <table className="data responsive">
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Last update</th>
                </tr>
              </thead>
              <tbody>
                {myIssues.map((issue) => (
                  <tr key={issue.trackingId}>
                    <td data-label="Tracking ID">
                      <Link className="mono" href={`/track?id=${issue.trackingId}`}>
                        {issue.trackingId}
                      </Link>
                    </td>
                    <td data-label="Issue">{issue.title}</td>
                    <td data-label="Status">
                      <ComplaintBadge status={issue.status} />
                    </td>
                    <td data-label="Last update">{relativeTime(issue.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
