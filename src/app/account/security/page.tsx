import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { Card, EmptyState } from "@/components/ui";
import { MfaSetup, RevokeSessionsButton } from "@/components/account-forms";
import { formatDateTime, relativeTime } from "@/lib/format";

export const metadata = { title: "Account security" };

export default async function SecurityPage() {
  const actor = await requireActor().catch(() => null);
  if (!actor) redirect("/login?next=/account/security");

  const [user, sessions, recentActivity] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actor.userId },
      select: { mfaEnabled: true, role: true, lastLoginAt: true, failedLoginCount: true },
    }),
    prisma.session.findMany({
      where: { userId: actor.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
    }),
    prisma.auditLog.findMany({
      where: { actorId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, action: true, result: true, createdAt: true, ip: true },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="wrap section" style={{ maxWidth: "820px" }}>
      <h1>Account security</h1>
      <p className="muted">
        Manage multi-factor authentication and review where your account is signed in.
      </p>

      <Card title="Multi-factor authentication">
        <MfaSetup enabled={user.mfaEnabled} mandatory={user.role === "SUPER_ADMIN"} />
      </Card>

      <Card title="Active sessions" className="section-tight">
        {sessions.length === 0 ? (
          <EmptyState title="No active sessions" />
        ) : (
          <div className="table-wrap">
            <table className="data responsive">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Address</th>
                  <th>Started</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td data-label="Device">{session.userAgent ?? "Unknown device"}</td>
                    <td data-label="Address">{session.ip ?? "—"}</td>
                    <td data-label="Started">{relativeTime(session.createdAt)}</td>
                    <td data-label="Expires">{formatDateTime(session.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: ".9rem" }}>
          <RevokeSessionsButton />
        </div>
      </Card>

      <Card title="Recent account activity" className="section-tight">
        {recentActivity.length === 0 ? (
          <p className="small muted">No recorded activity.</p>
        ) : (
          <ul className="timeline">
            {recentActivity.map((entry) => (
              <li key={entry.id} className={entry.result === "SUCCESS" ? "" : "is-warn"}>
                <div className="when">{formatDateTime(entry.createdAt)}</div>
                <div className="what small">
                  {entry.action}{" "}
                  {entry.result !== "SUCCESS" ? (
                    <span className="badge badge-warn">{entry.result}</span>
                  ) : null}
                </div>
                {entry.ip ? <div className="small faint">{entry.ip}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
