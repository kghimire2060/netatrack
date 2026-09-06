import Link from "next/link";
import type { ProjectStatus, VerificationTier } from "@prisma/client";
import { ProjectBadge } from "@/components/status";
import { VerifiedBadge } from "@/components/dashboard/trust";
import { Meter } from "@/components/ui";
import { NotRecorded } from "./unavailable";
import { ProjectMediaStrip, type MediaRow } from "./media-gallery";
import type { ProjectSummary } from "@/lib/candidates";
import { formatCount, type Locale, type Translator } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

/**
 * Constituency projects — the delivery record beside the promise record.
 *
 * Deliberately shows budget *and* spend where both are published, and shows
 * neither where they are not. An allocation with no expenditure figure tells a
 * reader nothing about delivery, so inferring one from the other (or from
 * `progressPct`) is exactly what this panel avoids.
 */

/** Same colour contract as the promise bar: hues for progress states only. */
const SEGMENTS = [
  { key: "completed", fill: "var(--dv-pos)", cls: "", label: "cand.prjCompleted" },
  { key: "inProgress", fill: "var(--dv-1)", cls: "", label: "cand.prjInProgress" },
  { key: "approved", fill: "var(--dv-2)", cls: "", label: "cand.prjApproved" },
  { key: "stalled", fill: "var(--dv-mid)", cls: "is-hatched", label: "cand.prjStalled" },
  { key: "proposed", fill: "var(--dv-mid)", cls: "", label: "cand.prjProposed" },
  { key: "cancelled", fill: "var(--dv-track)", cls: "is-hatched", label: "cand.prjCancelled" },
  { key: "unknown", fill: "var(--dv-track)", cls: "is-dotted", label: "cand.prjUnknown" },
] as const;

export function ProjectSummaryPanel({
  t,
  locale,
  summary,
}: {
  t: Translator;
  locale: Locale;
  summary: ProjectSummary;
}) {
  const value = (k: (typeof SEGMENTS)[number]["key"]) => summary[k];

  return (
    <div className="promise-summary">
      <div className="promise-head">
        <div>
          <div className="promise-total">{formatCount(summary.total, locale)}</div>
          <div className="promise-total-label">{t("cand.prjTotal")}</div>
        </div>
        {summary.completionPct !== null ? (
          <div className="promise-pct">
            <span className="value">{formatCount(Math.round(summary.completionPct), locale)}%</span>
            <span className="label">{t("cand.prjCompletedShare")}</span>
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

      {/* Money is shown only where the implementing body published a figure.
          A budget with no matching spend figure is still worth showing, but is
          never presented as if it were delivery. */}
      {summary.budgetNpr !== null || summary.spentNpr !== null ? (
        <div className="project-money">
          <div>
            <span className="label">{t("cand.prjBudget")}</span>
            <strong>{npr(summary.budgetNpr, locale, t)}</strong>
            <span className="small faint">
              {t("cand.prjAcross")} {formatCount(summary.budgetCount, locale)}/
              {formatCount(summary.total, locale)}
            </span>
          </div>
          <div>
            <span className="label">{t("cand.prjSpent")}</span>
            <strong>{npr(summary.spentNpr, locale, t)}</strong>
            <span className="small faint">
              {t("cand.prjAcross")} {formatCount(summary.spentCount, locale)}/
              {formatCount(summary.total, locale)}
            </span>
          </div>
          <p className="small faint">
            {t("cand.prjMoneyNote")}
            {/* The two sums cover different projects whenever an allocation is
                published without a matching expenditure figure, so dividing
                one by the other does not give an execution rate. Said plainly
                rather than left for the reader to work out. */}
            {summary.budgetCount !== summary.spentCount ? ` ${t("cand.prjMoneyMismatch")}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  titleNe: string | null;
  description: string | null;
  sector: string | null;
  status: ProjectStatus;
  progressPct: number | null;
  budgetNpr: number | null;
  spentNpr: number | null;
  startedAt: Date | null;
  targetDate: Date | null;
  completedAt: Date | null;
  wardNumber: number | null;
  locationDetail: string | null;
  implementingBody: string | null;
  lastUpdateAt: Date;
  tier: VerificationTier;
  sourceName: string | null;
  sourceUrl: string | null;
  constituency: { name: string; slug: string; district: string };
  promise: { id: string; title: string } | null;
  media: MediaRow[];
};

export function ProjectList({
  t,
  locale,
  projects,
}: {
  t: Translator;
  locale: Locale;
  projects: ProjectRow[];
}) {
  return (
    <ul className="project-list">
      {projects.map((p) => (
        <li key={p.id} className="project-row">
          <div className="project-head">
            <div className="grow">
              <div className="project-title">
                <strong>{locale === "ne" && p.titleNe ? p.titleNe : p.title}</strong>
                <ProjectBadge status={p.status} />
                <VerifiedBadge tier={p.tier} t={t} />
              </div>
              <div className="small faint">
                {p.sector ? `${p.sector} · ` : ""}
                <Link href={`/constituency/${p.constituency.slug}`}>{p.constituency.name}</Link>
                {p.wardNumber !== null ? ` · ${t("cand.prjWard")} ${formatCount(p.wardNumber, locale)}` : ""}
                {p.locationDetail ? ` · ${p.locationDetail}` : ""}
              </div>
            </div>
          </div>

          {p.description ? <p className="small">{p.description}</p> : null}

          {/* Progress is rendered only when the implementing body published a
              figure. Deriving one from the status would turn a label into a
              number the source never stated. */}
          {p.progressPct !== null ? (
            <div className="bar-row project-progress">
              <span className="small">{t("cand.prjProgress")}</span>
              <Meter value={p.progressPct} max={100} />
              <span className="small faint">{formatCount(Math.round(p.progressPct), locale)}%</span>
            </div>
          ) : (
            <p className="small faint" style={{ margin: 0 }}>
              {t("cand.prjNoProgress")}
            </p>
          )}

          <dl className="project-facts">
            <div>
              <dt>{t("cand.prjBudget")}</dt>
              <dd>{npr(p.budgetNpr, locale, t)}</dd>
            </div>
            <div>
              <dt>{t("cand.prjSpent")}</dt>
              <dd>{npr(p.spentNpr, locale, t)}</dd>
            </div>
            <div>
              <dt>{t("cand.prjStarted")}</dt>
              <dd>{p.startedAt ? formatDate(p.startedAt) : <NotRecorded t={t} />}</dd>
            </div>
            <div>
              <dt>{p.completedAt ? t("cand.prjCompletedOn") : t("cand.prjTarget")}</dt>
              <dd>
                {p.completedAt ? (
                  formatDate(p.completedAt)
                ) : p.targetDate ? (
                  formatDate(p.targetDate)
                ) : (
                  <NotRecorded t={t} />
                )}
              </dd>
            </div>
            <div>
              <dt>{t("cand.prjImplementer")}</dt>
              <dd>{p.implementingBody ?? <NotRecorded t={t} />}</dd>
            </div>
          </dl>

          {p.media.length > 0 ? <ProjectMediaStrip t={t} locale={locale} media={p.media} /> : null}

          <div className="project-foot small faint">
            {p.promise ? (
              <span className="project-promise-link">
                {t("cand.prjDeliversPromise")}: <em>{p.promise.title}</em>
              </span>
            ) : null}
            <span>
              {t("cand.lastUpdated")} {formatDate(p.lastUpdateAt)}
            </span>
            {p.sourceUrl ? (
              <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                {p.sourceName ?? t("common.source")}
              </a>
            ) : p.sourceName ? (
              <span>{p.sourceName}</span>
            ) : (
              <span className="withheld">{t("cand.prjNoSource")}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * NPR amounts.
 *
 * Rendered in lakh/crore, the units Nepali budget documents actually use — a
 * reader who sees "NPR 25,00,00,000" in a government notice should not have to
 * translate it from "250 million" to check us against the source.
 */
function npr(value: number | null, locale: Locale, t: Translator) {
  if (value === null) return <NotRecorded t={t} />;
  if (value >= 10_000_000) {
    return `${t("cand.nprPrefix")} ${formatCount(Math.round(value / 100_000) / 100, locale)} ${t("cand.crore")}`;
  }
  if (value >= 100_000) {
    return `${t("cand.nprPrefix")} ${formatCount(Math.round(value / 1_000) / 100, locale)} ${t("cand.lakh")}`;
  }
  return `${t("cand.nprPrefix")} ${formatCount(Math.round(value), locale)}`;
}
