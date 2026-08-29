import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, EmptyState, Meter, Stat } from "@/components/ui";
import { PromiseBadge } from "@/components/status";
import { formatDate, humanize } from "@/lib/format";
import type { PromiseStatus } from "@prisma/client";

export const metadata = { title: "Promise tracker" };

const STATUSES: PromiseStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "DELAYED",
  "CANCELLED",
  "UNABLE_TO_VERIFY",
];

/** Manifesto and promise tracker (section 12). */
export default async function PromisesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; candidate?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.find((value) => value === params.status);

  const [promises, counts, candidates] = await Promise.all([
    prisma.promise.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(params.candidate ? { candidate: { slug: params.candidate } } : {}),
      },
      orderBy: { lastUpdateAt: "desc" },
      take: 100,
      include: {
        candidate: { select: { fullName: true, slug: true, party: { select: { shortName: true } } } },
        constituency: { select: { name: true } },
        manifesto: { select: { title: true } },
      },
    }),
    prisma.promise.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.candidate.findMany({
      where: { promises: { some: {} } },
      select: { slug: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const total = counts.reduce((sum, row) => sum + row._count._all, 0);
  const completed = counts.find((row) => row.status === "COMPLETED")?._count._all ?? 0;
  const delayed = counts.find((row) => row.status === "DELAYED")?._count._all ?? 0;

  return (
    <div className="wrap section">
      <h1>Manifesto and promise tracker</h1>
      <p className="muted">
        Campaign commitments converted into trackable records. Every status change is recorded, and
        a promise cannot be marked completed without an evidence link.
      </p>

      <div className="grid grid-4">
        <Stat label="Promises tracked" value={total} />
        <Stat label="Completed" value={completed} accent="green" />
        <Stat label="Delayed" value={delayed} accent="red" />
        <Stat
          label="Completion rate"
          value={total === 0 ? "—" : `${Math.round((completed / total) * 100)}%`}
          accent="purple"
        />
      </div>

      <Card className="section-tight">
        <div className="stack">
          {STATUSES.map((value) => {
            const count = counts.find((row) => row.status === value)?._count._all ?? 0;
            return (
              <div className="bar-row" key={value}>
                <span className="small">{humanize(value)}</span>
                <Meter
                  value={count}
                  max={total || 1}
                  tone={value === "COMPLETED" ? "good" : value === "DELAYED" ? "red" : "warn"}
                />
                <span className="small faint">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="row" style={{ margin: "1rem 0" }}>
        <div className="chip-row grow">
          <Link href="/promises" className={`chip${status ? "" : " active"}`}>
            All statuses
          </Link>
          {STATUSES.map((value) => (
            <Link
              key={value}
              href={`/promises?status=${value}`}
              className={`chip${status === value ? " active" : ""}`}
            >
              {humanize(value)}
            </Link>
          ))}
        </div>
        <form method="get">
          <select name="candidate" defaultValue={params.candidate ?? ""} aria-label="Candidate">
            <option value="">All candidates</option>
            {candidates.map((candidate) => (
              <option key={candidate.slug} value={candidate.slug}>
                {candidate.fullName}
              </option>
            ))}
          </select>{" "}
          <button className="btn btn-sm btn-ghost">Filter</button>
        </form>
      </div>

      {promises.length === 0 ? (
        <Card>
          <EmptyState title="No promises match those filters" />
        </Card>
      ) : (
        <div className="table-wrap">
          <table className="data responsive">
            <thead>
              <tr>
                <th>Promise</th>
                <th>Representative</th>
                <th>Status</th>
                <th>Evidence</th>
                <th>Last update</th>
              </tr>
            </thead>
            <tbody>
              {promises.map((promise) => (
                <tr key={promise.id}>
                  <td data-label="Promise">
                    <strong>{promise.title}</strong>
                    <div className="small faint">
                      {promise.category ?? "Uncategorised"}
                      {promise.constituency ? ` · ${promise.constituency.name}` : ""}
                      {promise.manifesto ? ` · ${promise.manifesto.title}` : ""}
                    </div>
                  </td>
                  <td data-label="Representative">
                    {promise.candidate ? (
                      <Link href={`/candidates/${promise.candidate.slug}`}>
                        {promise.candidate.fullName}
                      </Link>
                    ) : (
                      <span className="faint">Party commitment</span>
                    )}
                  </td>
                  <td data-label="Status">
                    <PromiseBadge status={promise.status} />
                  </td>
                  <td data-label="Evidence">
                    {promise.evidenceUrl ? (
                      <a href={promise.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow">
                        Source
                      </a>
                    ) : (
                      <span className="faint">None</span>
                    )}
                  </td>
                  <td data-label="Last update">{formatDate(promise.lastUpdateAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
