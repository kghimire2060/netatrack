import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { smtpConfigured } from "@/lib/email";
import { Badge, Card, EmptyState, Stat } from "@/components/ui";
import { SmtpTestForm } from "@/components/admin-forms";
import { formatDateTime } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";

export const metadata = { title: "Email and notifications" };

export default async function AdminNotificationsPage() {
  const actor = await requireActorPage("/admin/notifications");
  const { t, locale } = await getTranslator();
  if (!(await can({ userId: actor.userId, role: actor.role }, "settings.manage"))) redirect("/admin");

  const [counts, recent, byType] = await Promise.all([
    prisma.notification.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        type: true,
        subject: true,
        toEmail: true,
        status: true,
        attempts: true,
        error: true,
        createdAt: true,
        sentAt: true,
      },
    }),
    prisma.notification.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);

  const failed = counts.find((row) => row.status === "FAILED")?._count._all ?? 0;

  return (
    <>
      <h1>{t("adm.notifications")}</h1>
      <p className="muted">
        Every transactional message is queued in the database first, then delivered. The delivery log
        records the outcome and error reason — never the recipient&apos;s message content.
      </p>

      {!smtpConfigured() ? (
        <div className="alert alert-warn">
          <strong>SMTP is not configured.</strong> Messages are logged to the server console instead
          of being sent. Set <code className="mono">SMTP_HOST</code>,{" "}
          <code className="mono">SMTP_PORT</code>, <code className="mono">SMTP_USER</code> and{" "}
          <code className="mono">SMTP_PASS</code> in the environment, and configure SPF, DKIM and
          DMARC on the sending domain before launch.
        </div>
      ) : null}

      <div className="grid grid-4">
        <Stat label={t("adm.queued")} value={counts.find((r) => r.status === "QUEUED")?._count._all ?? 0} />
        <Stat
          label={t("adm.sent")}
          value={counts.find((r) => r.status === "SENT")?._count._all ?? 0}
          accent="green"
        />
        <Stat label={t("adm.failed")} value={failed} accent={failed > 0 ? "red" : undefined} />
        <Stat label={t("adm.messageTypes")} value={byType.length} accent="purple" />
      </div>

      <div className="grid grid-sidebar" style={{ marginTop: "1.2rem" }}>
        <Card title={t("adm.deliveryLog")}>
          {recent.length === 0 ? (
            <EmptyState title={t("adm.noMatch")} />
          ) : (
            <div className="table-wrap">
              <table className="data responsive">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((notification) => (
                    <tr key={notification.id}>
                      <td data-label="Type">
                        <code className="mono small">{notification.type}</code>
                      </td>
                      <td data-label="Recipient">{notification.toEmail ?? "in-app"}</td>
                      <td data-label="Subject">
                        {notification.subject}
                        {notification.error ? (
                          <div className="small" style={{ color: "var(--red)" }}>
                            {notification.error}
                          </div>
                        ) : null}
                      </td>
                      <td data-label="Status">
                        <Badge
                          tone={
                            notification.status === "SENT"
                              ? "good"
                              : notification.status === "FAILED"
                                ? "bad"
                                : "warn"
                          }
                        >
                          {notification.status}
                        </Badge>
                        {notification.attempts > 1 ? (
                          <div className="small faint">{notification.attempts} attempts</div>
                        ) : null}
                      </td>
                      <td data-label="Created">{formatDateTime(notification.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <aside className="stack">
          <Card title={t("adm.testSend")}>
            <SmtpTestForm defaultTo={actor.email} />
          </Card>

          <Card title={t("adm.messageTypes")}>
            <ul className="small" style={{ paddingLeft: "1.1rem", margin: 0 }}>
              {byType
                .sort((a, b) => b._count._all - a._count._all)
                .map((row) => (
                  <li key={row.type}>
                    <code className="mono">{row.type}</code> — {row._count._all}
                  </li>
                ))}
            </ul>
          </Card>

          <Card title="Retry failed messages">
            <p className="small muted" style={{ margin: 0 }}>
              Run <code className="mono">npm run mailer</code> to retry every queued or failed
              message. In production, run it on a schedule as a background worker.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}
