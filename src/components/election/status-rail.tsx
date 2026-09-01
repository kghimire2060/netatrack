import type { ElectionStatus } from "@prisma/client";
import { STATUS_FLOW } from "@/lib/election-dashboard";
import { enumLabel, type Locale } from "@/lib/i18n";

/**
 * The election lifecycle, with the current stage marked.
 *
 * Shows where an election sits without implying progress it has not made: a
 * COMPLETED election has its earlier stages marked done, an ARCHIVED one is
 * shown off to the side rather than as the end of a happy path, and the
 * deprecated ACTIVE/CANCELLED values map onto the rail rather than breaking it.
 */
export function StatusRail({
  status,
  locale,
}: {
  status: ElectionStatus;
  locale: Locale;
}) {
  const normalised: ElectionStatus =
    status === "ACTIVE" ? "LIVE" : status === "CANCELLED" ? "ARCHIVED" : status;
  const index = STATUS_FLOW.indexOf(normalised);

  return (
    <ol className="status-rail" aria-label={enumLabel(normalised, locale)}>
      {STATUS_FLOW.map((s, i) => {
        const state =
          i < index ? "is-done" : i === index ? "is-current" : "is-future";
        return (
          <li key={s} className={`status-step ${state}`} aria-current={i === index || undefined}>
            <span className="status-dot" aria-hidden />
            <span className="status-label">{enumLabel(s, locale)}</span>
          </li>
        );
      })}
    </ol>
  );
}
