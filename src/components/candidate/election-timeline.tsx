import Link from "next/link";
import { Badge } from "@/components/ui";
import { VerifiedBadge } from "@/components/dashboard/trust";
import type { ElectionEntry } from "@/lib/candidates";
import { formatCount, formatPct, type Locale, type Translator } from "@/lib/i18n";
import { NotRecorded } from "./unavailable";

/**
 * Election history as a timeline, newest first.
 *
 * Every figure here is either recorded or derived by arithmetic on recorded
 * votes — rank is this candidate's position among the verified results in the
 * same contest, and margin is the gap to the winner (or to the runner-up, for
 * a winner). Where a contest has no published result the entry still appears,
 * showing the nomination alone: standing for a seat is itself a fact worth
 * recording, and blanking the row would hide it.
 */
export function ElectionTimeline({
  t,
  locale,
  entries,
}: {
  t: Translator;
  locale: Locale;
  entries: ElectionEntry[];
}) {
  return (
    <ol className="etimeline">
      {entries.map((e) => (
        <li key={e.key} className={e.isWinner ? "is-won" : e.isWinner === false ? "is-lost" : ""}>
          <span className="etimeline-node" aria-hidden />
          <div className="etimeline-body">
            <div className="etimeline-head">
              <Link href={`/elections/${e.electionSlug}`} className="etimeline-title">
                {e.electionName}
              </Link>
              {e.isWinner === true ? <Badge tone="good">{t("cand.elected")}</Badge> : null}
              {e.isWinner === false ? <Badge tone="muted">{t("cand.notElected")}</Badge> : null}
              {e.isWinner === null ? <Badge tone="muted">{t("cand.resultPending")}</Badge> : null}
              {e.tier ? <VerifiedBadge tier={e.tier} t={t} /> : null}
            </div>

            <p className="etimeline-meta">
              {e.constituencyName ? (
                <Link href={`/constituency/${e.constituencySlug}`}>{e.constituencyName}</Link>
              ) : (
                <NotRecorded t={t} />
              )}
              {e.partyName ? <> · {e.partyName}</> : null}
              {e.bsYear ? <> · {t("cand.bs")} {formatCount(e.bsYear, locale)}</> : null}
            </p>

            <dl className="etimeline-figures">
              <div>
                <dt>{t("cand.votes")}</dt>
                <dd>{e.votes === null ? <NotRecorded t={t} /> : formatCount(e.votes, locale)}</dd>
              </div>
              <div>
                <dt>{t("cand.voteShare")}</dt>
                <dd>{e.voteShare === null ? <NotRecorded t={t} /> : formatPct(e.voteShare, locale)}</dd>
              </div>
              <div>
                <dt>{t("cand.rank")}</dt>
                <dd>
                  {e.rank === null ? (
                    <NotRecorded t={t} />
                  ) : (
                    <>
                      {formatCount(e.rank, locale)}
                      {e.contested ? (
                        <span className="faint"> / {formatCount(e.contested, locale)}</span>
                      ) : null}
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt>{e.isWinner ? t("cand.marginWon") : t("cand.marginBehind")}</dt>
                <dd>{e.margin === null ? <NotRecorded t={t} /> : formatCount(e.margin, locale)}</dd>
              </div>
            </dl>

            {e.sourceName ? (
              <p className="source-line">
                {t("trust.source")}:{" "}
                {e.sourceUrl ? (
                  <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                    {e.sourceName}
                  </a>
                ) : (
                  e.sourceName
                )}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
