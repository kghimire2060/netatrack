import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { Badge, Card, EmptyState, Pager } from "@/components/ui";
import { MarkAllRead, MarkRead } from "@/components/notification-actions";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Notifications" };

const PAGE_SIZE = 25;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await requireActor().catch(() => null);
  if (!actor) redirect("/login?next=/account/notifications");

  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [total, notifications, unread] = await Promise.all([
    prisma.notification.count({ where: { userId: actor.userId } }),
    prisma.notification.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        type: true,
        subject: true,
        channel: true,
        readAt: true,
        createdAt: true,
        relatedType: true,
        relatedId: true,
      },
    }),
    prisma.notification.count({ where: { userId: actor.userId, readAt: null } }),
  ]);

  return (
    <div className="wrap section" style={{ maxWidth: "780px" }}>
      <div className="row-between">
        <div>
          <h1>Notifications</h1>
          <p className="muted">
            {unread > 0 ? `${unread} unread` : "Everything is read"} · {total} total
          </p>
        </div>
        {unread > 0 ? <MarkAllRead /> : null}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <EmptyState
            title="No notifications yet"
            hint="Issue updates, claim decisions and security alerts appear here."
          />
        </Card>
      ) : (
        <div className="stack">
          {notifications.map((notification) => (
            <Card key={notification.id} className={notification.readAt ? "" : "card-hover"}>
              <div className="row-between">
                <div className="grow">
                  <div className="row" style={{ gap: ".5rem" }}>
                    <strong>{notification.subject}</strong>
                    {notification.readAt ? null : <Badge tone="warn">New</Badge>}
                    <Badge tone="muted">{notification.channel}</Badge>
                  </div>
                  <div className="small faint">
                    <code className="mono">{notification.type}</code> ·{" "}
                    {formatDateTime(notification.createdAt)}
                  </div>
                </div>
                {notification.readAt ? null : <MarkRead id={notification.id} />}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pager
        page={page}
        pages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        basePath="/account/notifications"
      />
    </div>
  );
}
