import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActorPage } from "@/lib/page-guards";
import { can } from "@/lib/rbac";
import { Badge, Card, EmptyState, Meter, Stat } from "@/components/ui";
import { formatDate, formatNumber, humanize } from "@/lib/format";
import { getTranslator } from "@/lib/locale-server";
import { enumLabel } from "@/lib/i18n";

export const metadata = { title: "Polls" };

export default async function AdminPollsPage() {
  const actor = await requireActorPage("/admin/polls");
  const { t, locale } = await getTranslator();
  if (!(await can({ userId: actor.userId, role: actor.role }, "poll.manage"))) redirect("/admin");

  const polls = await prisma.poll.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      options: { orderBy: { order: "asc" }, include: { _count: { select: { votes: true } } } },
      _count: { select: { votes: true } },
    },
  });

  const totalVotes = polls.reduce((sum, poll) => sum + poll._count.votes, 0);

  return (
    <>
      <h1>{t("adm.polls")}</h1>
      <p className="muted">
        One vote per account per poll. Poll results are perception data and are never mixed with
        official election figures.
      </p>

      <div className="grid grid-3">
        <Stat label={t("adm.polls")} value={polls.length} />
        <Stat
          label="Open"
          value={polls.filter((poll) => poll.status === "OPEN").length}
          accent="green"
        />
        <Stat label="Total votes" value={formatNumber(totalVotes)} accent="purple" />
      </div>

      {polls.length === 0 ? (
        <Card className="section-tight">
          <EmptyState title={t("adm.noMatch")} />
        </Card>
      ) : (
        <div className="stack" style={{ marginTop: "1rem" }}>
          {polls.map((poll) => {
            const total = poll._count.votes;
            return (
              <Card key={poll.id}>
                <div className="row-between">
                  <div className="grow">
                    <div className="row" style={{ gap: ".5rem" }}>
                      <strong>{poll.question}</strong>
                      <Badge tone={poll.status === "OPEN" ? "good" : "muted"}>
                        {enumLabel(poll.status, locale)}
                      </Badge>
                    </div>
                    <div className="small faint">
                      {formatNumber(total)} responses
                      {poll.startsAt ? ` · opens ${formatDate(poll.startsAt)}` : ""}
                      {poll.endsAt ? ` · closes ${formatDate(poll.endsAt)}` : ""}
                    </div>
                  </div>
                </div>
                <hr className="divider" />
                {poll.options.map((option) => (
                  <div className="bar-row" key={option.id} style={{ marginBottom: ".35rem" }}>
                    <span className="small">{option.label}</span>
                    <Meter value={option._count.votes} max={total || 1} />
                    <span className="small faint">
                      {total === 0 ? "0%" : `${Math.round((option._count.votes / total) * 100)}%`}
                    </span>
                  </div>
                ))}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
