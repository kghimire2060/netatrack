import Link from "next/link";
import { VerifiedBadge } from "@/components/dashboard/trust";
import { Unavailable, NotRecorded } from "@/components/candidate/unavailable";
import { provinceName, type Province } from "@/lib/geography";
import { formatCount, formatPct, type Locale, type Translator } from "@/lib/i18n";

type Row = {
  id: string;
  slug: string;
  name: string;
  district: string;
  registeredVoters: number | null;
  tier: import("@prisma/client").VerificationTier;
  provinceRef: Province | null;
  margin: number | null;
  winner: {
    votes: number;
    voteShare: number | null;
    tier: import("@prisma/client").VerificationTier;
    candidate: { fullName: string; slug: string };
    party: { shortName: string | null; name: string; colorHex: string | null } | null;
  } | null;
  candidates: {
    fullName: string;
    slug: string;
    party: { shortName: string | null; colorHex: string | null } | null;
  }[];
};

/**
 * Result cards, one per constituency.
 *
 * A seat with no published result gets a card that says so rather than being
 * hidden: a reader scanning for their own constituency should find it and
 * learn that nothing is counted yet, not conclude the seat does not exist.
 */
export function Explorer({
  t,
  locale,
  rows,
}: {
  t: Translator;
  locale: Locale;
  rows: Row[];
}) {
  if (rows.length === 0) {
    return <Unavailable t={t} title={t("ed.noMatch")} hint={t("ed.noMatchHint")} />;
  }

  return (
    <ul className="result-cards">
      {rows.map((r) => (
        <li key={r.id} className={`result-card${r.winner ? " is-declared" : ""}`}>
          <div className="result-card-head">
            <Link href={`/constituency/${r.slug}`} className="result-card-title">
              {r.name}
            </Link>
            <VerifiedBadge tier={r.winner?.tier ?? r.tier} t={t} />
          </div>

          <p className="result-card-place">
            {r.district}
            {r.provinceRef ? ` · ${provinceName(r.provinceRef, locale)}` : ""}
          </p>

          {r.winner ? (
            <>
              <div className="result-winner">
                <span
                  className="party-swatch"
                  style={{ background: r.winner.party?.colorHex ?? "var(--dv-mid)" }}
                  aria-hidden
                />
                <Link href={`/candidates/${r.winner.candidate.slug}`} className="result-winner-name">
                  {r.winner.candidate.fullName}
                </Link>
                <span className="result-party">
                  {r.winner.party?.shortName ?? r.winner.party?.name ?? <NotRecorded t={t} />}
                </span>
              </div>
              <dl className="result-figures">
                <div>
                  <dt>{t("res.votes")}</dt>
                  <dd>{formatCount(r.winner.votes, locale)}</dd>
                </div>
                <div>
                  <dt>{t("cand.voteShare")}</dt>
                  <dd>
                    {r.winner.voteShare === null ? "—" : formatPct(r.winner.voteShare, locale, 1)}
                  </dd>
                </div>
                <div>
                  <dt>{t("ed.margin")}</dt>
                  <dd>{r.margin === null ? "—" : formatCount(r.margin, locale)}</dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="result-awaiting">
              <strong>{t("ed.awaiting")}</strong>
              <p className="small muted">{t("ed.awaitingHint")}</p>
              {r.candidates.length > 0 ? (
                <ul className="result-runners">
                  {r.candidates.map((c) => (
                    <li key={c.slug}>
                      <span
                        className="party-dot"
                        style={{ background: c.party?.colorHex ?? "var(--dv-mid)" }}
                        aria-hidden
                      />
                      <Link href={`/candidates/${c.slug}`}>{c.fullName}</Link>
                      {c.party?.shortName ? (
                        <span className="faint"> · {c.party.shortName}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}

          {r.registeredVoters !== null ? (
            <p className="result-card-foot">
              {t("ed.voters")}: {formatCount(r.registeredVoters, locale)}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Filters, as a plain GET form.
 *
 * No client JavaScript: every state is a URL, which makes it shareable,
 * bookmarkable, crawlable and cacheable at the edge. On an election night the
 * cheapest request is the one that never reaches the database, and identical
 * filter URLs collapse onto the same cache entry.
 */
export function ExplorerFilters({
  t,
  locale,
  provinces,
  districts,
  parties,
  current,
  action,
}: {
  t: Translator;
  locale: Locale;
  provinces: Province[];
  districts: string[];
  parties: { shortName: string | null; name: string }[];
  current: { province?: string; district?: string; party?: string; q?: string; status?: string };
  action: string;
}) {
  const active = Boolean(
    current.province || current.district || current.party || current.q || current.status
  );

  return (
    <form method="get" action={action} className="ed-filters">
      <input
        type="search"
        name="q"
        defaultValue={current.q ?? ""}
        placeholder={t("ed.searchPlaceholder")}
        aria-label={t("ed.searchPlaceholder")}
        className="ed-filter-search"
      />

      <select name="province" defaultValue={current.province ?? ""} aria-label={t("con.province")}>
        <option value="">{t("ed.allProvinces")}</option>
        {provinces.map((p) => (
          <option key={p.slug} value={p.slug}>
            {provinceName(p, locale)}
          </option>
        ))}
      </select>

      <select name="district" defaultValue={current.district ?? ""} aria-label={t("con.district")}>
        <option value="">{t("ed.allDistricts")}</option>
        {districts.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <select name="party" defaultValue={current.party ?? ""} aria-label={t("cand.party")}>
        <option value="">{t("ed.allParties")}</option>
        {parties
          .filter((p) => p.shortName)
          .map((p) => (
            <option key={p.shortName!} value={p.shortName!}>
              {p.shortName}
            </option>
          ))}
      </select>

      <select name="status" defaultValue={current.status ?? ""} aria-label={t("ed.status")}>
        <option value="">{t("ed.allStatuses")}</option>
        <option value="declared">{t("ed.declared")}</option>
        <option value="pending">{t("ed.pending")}</option>
      </select>

      <button className="btn btn-sm" type="submit">
        {t("ed.apply")}
      </button>
      {active ? (
        <Link className="btn btn-sm btn-ghost" href={action}>
          {t("ed.clear")}
        </Link>
      ) : null}
    </form>
  );
}
