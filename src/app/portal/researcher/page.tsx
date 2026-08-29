import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Card, EmptyState, Stat } from "@/components/ui";
import { DatasetExport } from "@/components/account-forms";
import { DATASETS } from "@/lib/datasets";
import { formatDateTime, formatNumber } from "@/lib/format";

export const metadata = { title: "Researcher portal" };

/** Approved-access analytics and dataset exports (section 14). */
export default async function ResearcherPortalPage() {
  const actor = await requireActor().catch(() => null);
  if (!actor) redirect("/login?next=/portal/researcher");

  const allowed = await can({ userId: actor.userId, role: actor.role }, "analytics.advanced");

  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { researcherApproved: true, role: true, researcherNote: true },
  });
  const privileged = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const approved = privileged || Boolean(user?.researcherApproved);

  if (!allowed) {
    return (
      <div className="wrap section" style={{ maxWidth: "640px" }}>
        <h1>Researcher portal</h1>
        <Card>
          <p>
            Researcher access is granted by an administrator. Contact the platform team to request
            the Researcher role for your account, describing the research and the datasets needed.
          </p>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Approved researchers receive dataset-level access to aggregated data. Citizen personal
            information, authentication material and reporter identities are never included in any
            dataset.
          </p>
        </Card>
      </div>
    );
  }

  const [exports, issueCount, ratingCount, resultCount, promiseCount] = await Promise.all([
    prisma.exportLog.findMany({
      where: { userId: actor.userId },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.complaint.count(),
    prisma.rating.count({ where: { status: "VISIBLE" } }),
    prisma.result.count({ where: { status: "VERIFIED" } }),
    prisma.promise.count(),
  ]);

  return (
    <div className="wrap section">
      <h1>Researcher portal</h1>
      <p className="muted">
        Approved, aggregated datasets. Every export is rate limited and recorded in the audit log.
      </p>

      {!approved ? (
        <div className="alert alert-warn">
          Your researcher access is awaiting administrator approval. You can browse the dataset
          catalogue, but exports are blocked until approval.
          {user?.researcherNote ? <div className="small">Note: {user.researcherNote}</div> : null}
        </div>
      ) : null}

      <div className="grid grid-4">
        <Stat label="Verified results" value={formatNumber(resultCount)} />
        <Stat label="Citizen issues" value={formatNumber(issueCount)} />
        <Stat label="Visible ratings" value={formatNumber(ratingCount)} accent="purple" />
        <Stat label="Promises tracked" value={formatNumber(promiseCount)} accent="green" />
      </div>

      <div className="grid grid-sidebar" style={{ marginTop: "1.2rem" }}>
        <Card title="Dataset catalogue">
          <DatasetExport
            datasets={Object.entries(DATASETS).map(([key, dataset]) => ({ key, ...dataset }))}
          />
        </Card>

        <aside className="stack">
          <Card title="Access rules">
            <ul className="small muted" style={{ paddingLeft: "1.1rem", margin: 0 }}>
              <li>Access is granted explicitly by an Admin or Super Admin.</li>
              <li>Export permission is separate from view permission.</li>
              <li>Exports are rate limited to 10 per hour.</li>
              <li>No dataset contains passwords, tokens or unnecessary citizen personal data.</li>
              <li>Every export and API credential use is audited.</li>
            </ul>
          </Card>

          <Card title="Your recent exports">
            {exports.length === 0 ? (
              <EmptyState title="No exports yet" />
            ) : (
              <ul className="timeline">
                {exports.map((entry) => (
                  <li key={entry.id}>
                    <div className="when">{formatDateTime(entry.createdAt)}</div>
                    <div className="what small">
                      {entry.dataset} · {formatNumber(entry.rowCount)} rows ·{" "}
                      {entry.format.toUpperCase()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="notice notice-purple">
            Publishing analysis from these datasets? Please cite the retrieval date and link to{" "}
            <Link href="/methodology">the methodology</Link>.
          </div>
        </aside>
      </div>
    </div>
  );
}
