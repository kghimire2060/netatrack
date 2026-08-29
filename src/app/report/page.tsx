import Link from "next/link";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { Card } from "@/components/ui";
import { ReportIssueForm } from "@/components/civic-forms";
import { STATUS_BEHAVIOUR, COMPLAINT_FLOW } from "@/lib/complaint-workflow";
import { humanize } from "@/lib/format";

export const metadata = { title: "Report an issue" };

export default async function ReportPage() {
  const [actor, categories, allowAnonymous, slaHours, constituencies] = await Promise.all([
    getActor(),
    getSetting("complaints.categories"),
    getSetting("complaints.allowAnonymous"),
    getSetting("complaints.slaHours"),
    prisma.constituency.findMany({
      select: { id: true, name: true, district: true },
      orderBy: [{ district: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="wrap section">
      <h1>Report a citizen issue</h1>
      <p className="muted">
        Every submitted issue receives a public tracking ID and a transparent status timeline. You
        can follow it without an account.
      </p>

      <div className="grid grid-sidebar">
        <Card>
          {!actor && !allowAnonymous ? (
            <p>
              Anonymous reporting is currently disabled. Please <Link href="/login">log in</Link> or{" "}
              <Link href="/register">create an account</Link> to submit an issue.
            </p>
          ) : (
            <ReportIssueForm
              categories={[...(categories as readonly string[])]}
              signedIn={Boolean(actor)}
              constituencies={constituencies}
            />
          )}
        </Card>

        <aside className="stack">
          <Card title="What happens next">
            <ol className="small" style={{ paddingLeft: "1.1rem", margin: 0 }}>
              {COMPLAINT_FLOW.map((status) => (
                <li key={status} style={{ marginBottom: ".35rem" }}>
                  <strong>{humanize(status)}</strong>
                  <div className="faint">{STATUS_BEHAVIOUR[status]}</div>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Response commitment">
            <p className="small muted" style={{ margin: 0 }}>
              The current target for a first status update is {String(slaHours)} hours. Overdue
              issues are escalated automatically to the responsible administrator.
            </p>
          </Card>

          <div className="notice notice-blue">
            <strong>Your privacy.</strong> Your name, email and account details never appear on the
            public tracking page. Only the issue summary, status timeline and official responses are
            public.
          </div>

          <div className="notice">
            Do not include other people&apos;s personal details, identification numbers or medical
            information in the description.
          </div>
        </aside>
      </div>
    </div>
  );
}
