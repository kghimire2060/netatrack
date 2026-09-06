import Link from "next/link";
import type { ComplaintStatus, Priority } from "@prisma/client";
import { ComplaintBadge } from "@/components/status";
import { Badge } from "@/components/ui";
import type { Locale, Translator } from "@/lib/i18n";
import { enumLabel } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

/**
 * Citizen issues routed to this representative.
 *
 * This is the most defamation-exposed panel on the profile, so three
 * constraints are structural rather than cosmetic:
 *
 *  1. **Only issues past verification appear.** The data layer excludes
 *     SUBMITTED and UNDER_REVIEW, so an unchecked allegation is never
 *     published against a named person.
 *  2. **No reporter identity, ever.** The query selects public columns by
 *     name; `internalNotes`, `reporterId` and `contactEmail` are not among
 *     them and must never be added here.
 *  3. **The routing is stated as editorial, not as fault.** The panel says an
 *     editor filed the issue *with* this representative. It does not say the
 *     representative caused it, and an unresolved issue is not scored against
 *     them anywhere in the Accountability Score.
 */

export type ComplaintRow = {
  trackingId: string;
  title: string;
  category: string;
  status: ComplaintStatus;
  priority: Priority;
  publicResponse: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
};

export function ComplaintList({
  t,
  locale,
  complaints,
}: {
  t: Translator;
  locale: Locale;
  complaints: ComplaintRow[];
}) {
  return (
    <>
      <p className="small muted">{t("cand.complaintsNote")}</p>
      <ul className="complaint-list">
        {complaints.map((c) => (
          <li key={c.trackingId} className="complaint-row">
            <div className="complaint-head">
              <strong>{c.title}</strong>
              <ComplaintBadge status={c.status} />
              {c.priority === "URGENT" || c.priority === "HIGH" ? (
                <Badge tone="bad">{enumLabel(c.priority, locale)}</Badge>
              ) : null}
            </div>

            <div className="small faint">
              {c.category} · {t("cand.complaintFiled")} {formatDate(c.createdAt)}
              {c.resolvedAt ? ` · ${t("cand.complaintResolved")} ${formatDate(c.resolvedAt)}` : ""}
            </div>

            {/* The representative's or department's own public response, shown
                beside the issue rather than only in the tracking page, so the
                profile is not a one-sided list of grievances. */}
            {c.publicResponse ? (
              <p className="small complaint-response">{c.publicResponse}</p>
            ) : (
              <p className="small faint">{t("cand.complaintNoResponse")}</p>
            )}

            <Link className="small" href={`/track?id=${encodeURIComponent(c.trackingId)}`}>
              {c.trackingId}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
