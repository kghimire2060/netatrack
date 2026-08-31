import type { Translator, Locale } from "@/lib/i18n";
import { formatCount } from "@/lib/i18n";
import type { PromiseSummary } from "@/lib/candidates";

/**
 * Commitment tracking at a glance.
 *
 * Colour note. Six buckets do not fit one bar: forcing a distinct hue on each
 * pushed the delayed/cancelled pair to ΔE 7.3, indistinguishable even with
 * full colour vision. So only the three *progress* states carry a hue — they
 * validate clean on both surfaces (worst adjacent pair ΔE 17.9 light, 15.5
 * dark) — and the three terminal states share a neutral separated by texture
 * instead. Every bucket is direct-labelled with its count either way, so
 * colour never carries identity alone, and a bucket at zero still appears in
 * the legend: "none in this state" reads differently from "not tracked".
 */
const SEGMENTS = [
  { key: "completed", fill: "var(--dv-pos)", cls: "", label: "cand.pCompleted" },
  { key: "inProgress", fill: "var(--dv-1)", cls: "", label: "cand.pInProgress" },
  { key: "delayed", fill: "var(--dv-2)", cls: "", label: "cand.pDelayed" },
  { key: "notStarted", fill: "var(--dv-mid)", cls: "", label: "cand.pNotStarted" },
  { key: "cancelled", fill: "var(--dv-mid)", cls: "is-hatched", label: "cand.pCancelled" },
  { key: "unknown", fill: "var(--dv-track)", cls: "is-dotted", label: "cand.pUnknown" },
] as const;

export function PromiseSummaryPanel({
  t,
  locale,
  summary,
}: {
  t: Translator;
  locale: Locale;
  summary: PromiseSummary;
}) {
  const value = (k: (typeof SEGMENTS)[number]["key"]) => summary[k];

  return (
    <div className="promise-summary">
      <div className="promise-head">
        <div>
          <div className="promise-total">{formatCount(summary.total, locale)}</div>
          <div className="promise-total-label">{t("cand.pTotal")}</div>
        </div>
        {summary.completionPct !== null ? (
          <div className="promise-pct">
            <span className="value">{formatCount(Math.round(summary.completionPct), locale)}%</span>
            <span className="label">{t("cand.pCompletedShare")}</span>
          </div>
        ) : null}
      </div>

      <div
        className="seg-bar promise-bar"
        role="img"
        aria-label={SEGMENTS.filter((s) => value(s.key) > 0)
          .map((s) => `${t(s.label)}: ${value(s.key)}`)
          .join(", ")}
      >
        {SEGMENTS.map((s) =>
          value(s.key) === 0 ? null : (
            <span
              key={s.key}
              className={`seg ${s.cls}`}
              style={{ width: `${(value(s.key) / summary.total) * 100}%`, background: s.fill }}
              title={`${t(s.label)}: ${value(s.key)}`}
            />
          )
        )}
      </div>

      <ul className="promise-legend">
        {SEGMENTS.map((s) => (
          <li key={s.key} className={value(s.key) === 0 ? "is-zero" : undefined}>
            <span className={`swatch ${s.cls}`} style={{ background: s.fill }} aria-hidden />
            <span className="legend-label">{t(s.label)}</span>
            <span className="legend-value">{formatCount(value(s.key), locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
