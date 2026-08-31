import Link from "next/link";
import { Badge } from "@/components/ui";
import { VerifiedBadge } from "@/components/dashboard/trust";
import { NotRecorded } from "@/components/candidate/unavailable";
import type { Contest } from "@/lib/constituencies";
import { formatCount, formatPct, type Locale, type Translator } from "@/lib/i18n";

/**
 * One block per election: the full field, ranked, with the margin stated once
 * at the top rather than repeated per row.
 *
 * Vote share is shown only where the source published it. It is not computed
 * from our own totals — we may hold a partial field, and dividing by an
 * incomplete denominator would inflate every share in the contest.
 */
export function ContestHistory({
  t,
  locale,
  contests,
}: {
  t: Translator;
  locale: Locale;
  contests: Contest[];
}) {
  return (
    <div className="stack">
      {contests.map((c) => (
        <section key={c.electionSlug} className="contest">
          <header className="contest-head">
            <div>
              <Link href={`/elections/${c.electionSlug}`} className="contest-title">
                {c.electionName}
              </Link>
              {c.bsYear ? (
                <span className="faint small">
                  {" "}
                  · {t("cand.bs")} {formatCount(c.bsYear, locale)}
                </span>
              ) : null}
            </div>
            <VerifiedBadge tier={c.tier} t={t} />
          </header>

          <dl className="contest-figures">
            <div>
              <dt>{t("con.winMargin")}</dt>
              <dd>{c.margin === null ? <NotRecorded t={t} /> : formatCount(c.margin, locale)}</dd>
            </div>
            <div>
              <dt>{t("con.turnout")}</dt>
              <dd>{c.turnoutPct === null ? <NotRecorded t={t} /> : formatPct(c.turnoutPct, locale, 1)}</dd>
            </div>
            <div>
              <dt>{t("con.votesCounted")}</dt>
              <dd>{formatCount(c.totalVotes, locale)}</dd>
            </div>
            <div>
              <dt>{t("con.candidatesField")}</dt>
              <dd>{formatCount(c.results.length, locale)}</dd>
            </div>
          </dl>

          <div className="table-wrap">
            <table className="data responsive">
              <thead>
                <tr>
                  <th className="num">{t("cand.rank")}</th>
                  <th>{t("res.candidate")}</th>
                  <th>{t("cand.party")}</th>
                  <th className="num">{t("res.votes")}</th>
                  <th className="num">{t("cand.voteShare")}</th>
                </tr>
              </thead>
              <tbody>
                {c.results.map((r) => (
                  <tr key={r.candidateSlug} className={r.isWinner ? "is-winner" : undefined}>
                    <td className="num" data-label={t("cand.rank")}>
                      {formatCount(r.rank, locale)}
                    </td>
                    <td data-label={t("res.candidate")}>
                      <Link href={`/candidates/${r.candidateSlug}`}>{r.candidateName}</Link>
                      {r.isWinner ? (
                        <>
                          {" "}
                          <Badge tone="good">{t("cand.elected")}</Badge>
                        </>
                      ) : null}
                    </td>
                    <td data-label={t("cand.party")}>
                      {r.partyShort ??
                        r.partyName ??
                        (r.isIndependent ? t("cand.independent") : <NotRecorded t={t} />)}
                    </td>
                    <td className="num" data-label={t("res.votes")}>
                      {formatCount(r.votes, locale)}
                    </td>
                    <td className="num" data-label={t("cand.voteShare")}>
                      {r.voteShare === null ? <NotRecorded t={t} /> : formatPct(r.voteShare, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {c.sourceName ? (
            <p className="source-line">
              {t("trust.source")}:{" "}
              {c.sourceUrl ? (
                <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                  {c.sourceName}
                </a>
              ) : (
                c.sourceName
              )}
            </p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
