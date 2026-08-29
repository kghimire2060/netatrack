import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { permissionsForRole } from "@/lib/rbac";
import { Card, EmptyState, Stat, Stars } from "@/components/ui";
import { ComplaintBadge } from "@/components/status";
import { formatDate, formatDateTime, humanize, relativeTime } from "@/lib/format";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const actor = await requireActor().catch(() => null);
  if (!actor) redirect("/login?next=/account");

  const [user, complaints, ratings, notifications, permissions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actor.userId },
      select: {
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        mfaEnabled: true,
        researcherApproved: true,
        candidateProfile: { select: { slug: true, fullName: true } },
      },
    }),
    prisma.complaint.findMany({
      where: { reporterId: actor.userId },
      orderBy: { updatedAt: "desc" },
      select: {
        trackingId: true,
        title: true,
        status: true,
        category: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.rating.findMany({
      where: { userId: actor.userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        weightedScore: true,
        updatedAt: true,
        status: true,
        candidate: { select: { fullName: true, slug: true } },
      },
    }),
    prisma.notification.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, subject: true, type: true, createdAt: true, readAt: true },
    }),
    permissionsForRole(actor.role),
  ]);

  if (!user) redirect("/login");

  const open = complaints.filter((c) => c.status !== "CLOSED" && c.status !== "RESOLVED").length;

  return (
    <div className="wrap section">
      <div className="row-between">
        <div>
          <h1>{user.fullName}</h1>
          <p className="muted">
            {humanize(user.role)} · {user.email} · member since {formatDate(user.createdAt)}
          </p>
        </div>
        <div className="row">
          <Link className="btn btn-sm btn-ghost" href="/account/security">
            Security
          </Link>
          {user.candidateProfile ? (
            <Link className="btn btn-sm btn-ghost" href="/portal/candidate">
              Candidate portal
            </Link>
          ) : null}
          {permissions.has("analytics.advanced") ? (
            <Link className="btn btn-sm btn-ghost" href="/portal/researcher">
              Researcher portal
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-4">
        <Stat label="Issues submitted" value={complaints.length} />
        <Stat label="Issues open" value={open} accent="orange" />
        <Stat label="Ratings given" value={ratings.length} accent="purple" />
        <Stat
          label="MFA"
          value={user.mfaEnabled ? "On" : "Off"}
          accent={user.mfaEnabled ? "green" : "red"}
          hint={user.mfaEnabled ? undefined : <Link href="/account/security">Enable</Link>}
        />
      </div>

      <div className="grid grid-sidebar" style={{ marginTop: "1.2rem" }}>
        <div className="stack">
          <Card title="My reported issues">
            {complaints.length === 0 ? (
              <EmptyState
                title="You have not reported any issues yet"
                action={
                  <Link className="btn btn-sm" href="/report">
                    Report an issue
                  </Link>
                }
              />
            ) : (
              <div className="table-wrap">
                <table className="data responsive">
                  <thead>
                    <tr>
                      <th>Tracking ID</th>
                      <th>Issue</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((complaint) => (
                      <tr key={complaint.trackingId}>
                        <td data-label="Tracking ID">
                          <Link className="mono" href={`/track?id=${complaint.trackingId}`}>
                            {complaint.trackingId}
                          </Link>
                        </td>
                        <td data-label="Issue">{complaint.title}</td>
                        <td data-label="Category">{complaint.category}</td>
                        <td data-label="Status">
                          <ComplaintBadge status={complaint.status} />
                        </td>
                        <td data-label="Updated">{relativeTime(complaint.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="My candidate ratings">
            {ratings.length === 0 ? (
              <EmptyState
                title="You have not rated any candidates"
                hint="Ratings are public opinion and can be updated at any time."
              />
            ) : (
              <div className="table-wrap">
                <table className="data responsive">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>My rating</th>
                      <th>Status</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratings.map((rating) => (
                      <tr key={rating.id}>
                        <td data-label="Candidate">
                          <Link href={`/candidates/${rating.candidate.slug}`}>
                            {rating.candidate.fullName}
                          </Link>
                        </td>
                        <td data-label="My rating">
                          <span className="row">
                            <Stars value={rating.weightedScore} />
                            <strong>{rating.weightedScore.toFixed(1)}</strong>
                          </span>
                        </td>
                        <td data-label="Status">{humanize(rating.status)}</td>
                        <td data-label="Updated">{formatDate(rating.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <aside className="stack">
          <Card
            title="Notifications"
            action={
              <Link className="small" href="/account/notifications">
                View all
              </Link>
            }
          >
            {notifications.length === 0 ? (
              <p className="small muted">No notifications yet.</p>
            ) : (
              <ul className="timeline">
                {notifications.map((notification) => (
                  <li key={notification.id} className={notification.readAt ? "is-muted" : ""}>
                    <div className="when">{formatDateTime(notification.createdAt)}</div>
                    <div className="what small">{notification.subject}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Account">
            <dl className="kv">
              <dt>Role</dt>
              <dd>{humanize(user.role)}</dd>
              <dt>Status</dt>
              <dd>{humanize(user.status)}</dd>
              <dt>Last login</dt>
              <dd>{formatDateTime(user.lastLoginAt)}</dd>
              {user.role === "RESEARCHER" ? (
                <>
                  <dt>Researcher access</dt>
                  <dd>{user.researcherApproved ? "Approved" : "Awaiting approval"}</dd>
                </>
              ) : null}
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
