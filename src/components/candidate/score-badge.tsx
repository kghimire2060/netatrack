import Link from "next/link";
import { Meter } from "@/components/ui";
import {
  coverageBand,
  scoreBand,
  type AccountabilityScore,
  type ScoreComponentKey,
} from "@/lib/accountability";
import { formatCount, formatPct, type Locale } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

/**
 * The Accountability Score badge.
 *
 * Three things are always rendered together and none of them is optional:
 * the number, what it was built from, and how much of the full weighting was
 * available. A bare "82/100" invites a reader to treat a score built on one
 * component as equivalent to one built on four, so coverage is stated on the
 * face of the badge rather than hidden behind the methodology link.
 *
 * Public star ratings are rendered elsewhere on the profile and are never an
 * input here — see src/lib/accountability.ts.
 */

const COMPONENT_LABEL: Record<ScoreComponentKey, TranslationKey> = {
  promises: "cand.scorePromises",
  projects: "cand.scoreProjects",
  parliament: "cand.scoreParliament",
  factChecks: "cand.scoreFactChecks",
};

export function ScoreBadge({
  score,
  t,
  locale,
}: {
  score: AccountabilityScore;
  t: (key: TranslationKey) => string;
  locale: Locale;
}) {
  const band = scoreBand(score.total);

  // With nothing scorable recorded, say so in words. A "0/100" here would be a
  // claim about the politician rather than about our data.
  if (score.total === null) {
    return (
      <div className="score-badge score-unknown">
        <div className="score-badge-head">
          <span className="score-star" aria-hidden="true">
            ⭐
          </span>
          <span className="score-label">{t("cand.accountabilityScore")}</span>
        </div>
        <p className="small faint" style={{ margin: 0 }}>
          {t("cand.scoreUnavailable")}
        </p>
      </div>
    );
  }

  const coverage = coverageBand(score.coverage);

  return (
    <div className={`score-badge score-${band}`}>
      <div className="score-badge-head">
        <span className="score-star" aria-hidden="true">
          ⭐
        </span>
        <span className="score-label">{t("cand.accountabilityScore")}</span>
      </div>

      <div className="score-figure">
        {formatCount(score.total, locale)}
        <small>/{formatCount(100, locale)}</small>
      </div>

      <div className={`score-coverage score-coverage-${coverage}`}>
        {t(
          coverage === "full"
            ? "cand.coverageFull"
            : coverage === "partial"
              ? "cand.coveragePartial"
              : "cand.coverageProvisional"
        )}
      </div>

      <ul className="score-components">
        {score.scored.map((key) => {
          const component = score.components[key];
          return (
            <li key={key}>
              <span className="small">{t(COMPONENT_LABEL[key])}</span>
              <Meter value={component.score ?? 0} max={100} />
              <span className="small faint">{formatPct(component.score, locale, 0)}</span>
            </li>
          );
        })}
        {score.missing.map((key) => (
          <li key={key} className="score-missing">
            <span className="small">{t(COMPONENT_LABEL[key])}</span>
            <span className="small faint score-missing-note">{t("cand.scoreNotRecorded")}</span>
          </li>
        ))}
      </ul>

      <p className="small faint score-note">
        {t("cand.scoreOfficialOnly")}{" "}
        <Link href="/methodology">{t("cand.scoreMethodology")}</Link>
      </p>
    </div>
  );
}
