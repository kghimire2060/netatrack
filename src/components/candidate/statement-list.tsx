import Link from "next/link";
import type {
  ContentStatus,
  FactCheckVerdict,
  StatementContext,
  VerificationTier,
} from "@prisma/client";
import { StatementContextBadge, VerdictBadge } from "@/components/status";
import { VerifiedBadge } from "@/components/dashboard/trust";
import type { Locale, Translator } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

/**
 * Recorded public statements.
 *
 * A statement and a fact-check are shown as two separate facts, in that order:
 * what the person said, then — only where one exists — our verdict on it. Most
 * statements carry no verdict, and that is the honest common case; folding the
 * two together would imply every quote we publish has been adjudicated.
 *
 * The quote is rendered verbatim in the language it was given in. Where the
 * statement was made in Nepali and the stored record is a translation,
 * `quoteNe` holds the original and it is shown to a Nepali reader instead of
 * a round-trip translation of our own English.
 */

export type StatementRow = {
  id: string;
  quote: string;
  quoteNe: string | null;
  context: StatementContext;
  venue: string | null;
  statedAt: Date | null;
  topic: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  tier: VerificationTier;
  factCheck: { slug: string; verdict: FactCheckVerdict; status: ContentStatus } | null;
};

export function StatementList({
  t,
  locale,
  statements,
}: {
  t: Translator;
  locale: Locale;
  statements: StatementRow[];
}) {
  return (
    <ul className="statement-list">
      {statements.map((s) => {
        // A draft or unpublished fact-check must not surface a verdict on a
        // public page — the verdict is not editorially final until published.
        const check = s.factCheck?.status === "PUBLISHED" ? s.factCheck : null;

        return (
          <li key={s.id} className="statement-row">
            <blockquote className="statement-quote">
              {locale === "ne" && s.quoteNe ? s.quoteNe : s.quote}
            </blockquote>

            <div className="statement-meta">
              <StatementContextBadge context={s.context} />
              {s.topic ? <span className="chip">{s.topic}</span> : null}
              <VerifiedBadge tier={s.tier} t={t} />
            </div>

            <div className="small faint statement-attribution">
              {/* No inferred date: an undated quote says so. */}
              <span>{s.statedAt ? formatDate(s.statedAt) : t("cand.stmtUndated")}</span>
              {s.venue ? <span>{s.venue}</span> : null}
              {s.sourceUrl ? (
                <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                  {s.sourceName ?? t("common.source")}
                </a>
              ) : s.sourceName ? (
                <span>{s.sourceName}</span>
              ) : (
                <span className="withheld">{t("cand.stmtNoSource")}</span>
              )}
            </div>

            {check ? (
              <div className="statement-check">
                <VerdictBadge verdict={check.verdict} />
                <Link href={`/fact-checks/${check.slug}`} className="small">
                  {t("cand.stmtReadCheck")}
                </Link>
              </div>
            ) : (
              <p className="small faint statement-nocheck">{t("cand.stmtNotChecked")}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
