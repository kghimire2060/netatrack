import { formatCount, formatPct, type Locale, type Translator } from "@/lib/i18n";
import { Meter } from "@/components/ui";
import { NotRecorded } from "./unavailable";

type Record_ = {
  id: string;
  periodLabel: string;
  attendancePct: number | null;
  questionsAsked: number | null;
  billsSponsored: number | null;
  committeeMeetings: number | null;
  constituencyActivities: number | null;
  issueResponses: number | null;
  sourceName: string | null;
  sourceUrl: string | null;
};

const METRICS = [
  { key: "questionsAsked", label: "cand.mQuestions" },
  { key: "billsSponsored", label: "cand.mBills" },
  { key: "committeeMeetings", label: "cand.mCommittee" },
  { key: "constituencyActivities", label: "cand.mLocal" },
  { key: "issueResponses", label: "cand.mResponses" },
] as const;

/**
 * Measurable public record, one panel per reporting period.
 *
 * Attendance gets a meter because a percentage has a natural ceiling to read
 * against; the counts do not, so they stay as figures rather than being given
 * an invented denominator. A metric the source did not report shows as not
 * recorded — never as zero, which would read as "did nothing".
 */
export function PerformancePanel({
  t,
  locale,
  records,
}: {
  t: Translator;
  locale: Locale;
  records: Record_[];
}) {
  return (
    <div className="stack">
      {records.map((r) => (
        <div key={r.id} className="perf-period">
          <div className="perf-head">
            <h3>{r.periodLabel}</h3>
            {r.sourceName ? (
              <span className="source-line">
                {r.sourceUrl ? (
                  <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                    {r.sourceName}
                  </a>
                ) : (
                  r.sourceName
                )}
              </span>
            ) : null}
          </div>

          <div className="perf-attendance">
            <span className="label">{t("cand.mAttendance")}</span>
            {r.attendancePct === null ? (
              <NotRecorded t={t} />
            ) : (
              <>
                <Meter value={r.attendancePct} max={100} tone="good" />
                <span className="value">{formatPct(r.attendancePct, locale)}</span>
              </>
            )}
          </div>

          <dl className="perf-metrics">
            {METRICS.map((m) => (
              <div key={m.key}>
                <dt>{t(m.label)}</dt>
                <dd>
                  {r[m.key] === null ? <NotRecorded t={t} /> : formatCount(r[m.key], locale)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
