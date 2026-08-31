import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, EmptyState } from "@/components/ui";
import { ElectionBadge } from "@/components/status";
import { formatDate } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";

export const metadata = { title: "Election calendar" };

export default async function CalendarPage() {
  const { t } = await getTranslator();
  const now = new Date();
  const events = await prisma.electionEvent.findMany({
    orderBy: { startsAt: "asc" },
    include: { election: { select: { name: true, slug: true, status: true } } },
  });

  // A milestone with only a Bikram Sambat string has no verified Gregorian
  // instant, so it is listed separately instead of being guessed into order.
  const dated = events.filter((e) => e.startsAt !== null);
  const undated = events.filter((e) => e.startsAt === null);
  const upcoming = dated.filter((e) => (e.endsAt ?? e.startsAt!) >= now);
  const past = dated.filter((e) => (e.endsAt ?? e.startsAt!) < now).reverse();

  return (
    <div className="wrap section">
      <h1>{t("elec.calendar")}</h1>
      <p className="muted">
        Nomination windows, campaign periods, polling days and counting milestones across all
        recorded elections.
      </p>

      <div className="grid grid-sidebar">
        <Card title={t("elec.upcoming")}>
          {upcoming.length === 0 ? (
            <EmptyState title="No upcoming scheduled events" />
          ) : (
            <ul className="timeline">
              {upcoming.map((event) => (
                <li key={event.id}>
                  <div className="when">
                    {formatDate(event.startsAt)}
                    {event.endsAt ? ` – ${formatDate(event.endsAt)}` : ""}
                  </div>
                  <div className="what">{event.title}</div>
                  <div className="small muted">
                    <Link href={`/elections/${event.election.slug}`}>{event.election.name}</Link>{" "}
                    <ElectionBadge status={event.election.status} />
                  </div>
                  {event.detail ? <p className="small muted" style={{ margin: ".2rem 0 0" }}>{event.detail}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("elec.past")}>
          {undated.length > 0 ? (
            <div className="notice" style={{ marginBottom: ".9rem" }}>
              <strong>{undated.length} milestone(s) have no confirmed calendar date.</strong>
              <ul className="small" style={{ margin: ".35rem 0 0", paddingInlineStart: "1.1rem" }}>
                {undated.map((e) => (
                  <li key={e.id}>
                    {e.title}
                    {e.bsDate ? ` — ${e.bsDate} (Bikram Sambat, unconverted)` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {past.length === 0 ? (
            <p className="small muted">Nothing recorded yet.</p>
          ) : (
            <ul className="timeline">
              {past.slice(0, 20).map((event) => (
                <li key={event.id} className="is-muted">
                  <div className="when">{formatDate(event.startsAt)}</div>
                  <div className="what">{event.title}</div>
                  <div className="small muted">{event.election.name}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
