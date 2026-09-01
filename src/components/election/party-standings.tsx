import type { PartyStanding } from "@/lib/election-dashboard";
import { VerifiedBadge } from "@/components/dashboard/trust";
import { NotRecorded } from "@/components/candidate/unavailable";
import { formatCount, formatPct, type Locale, type Translator } from "@/lib/i18n";

/**
 * Party standings.
 *
 * The `basis` column is the point of this table. With counted results it shows
 * seats won; without them it shows how many sitting members we hold records
 * for. Those answer different questions, so the header states which one is on
 * screen instead of letting a reader assume the stronger claim.
 *
 * Bar width encodes the same figure the number states — colour is a party's
 * own, which is identity, not magnitude, so every row is labelled too.
 */
export function PartyStandings({
  t,
  locale,
  standings,
  basis,
}: {
  t: Translator;
  locale: Locale;
  standings: PartyStanding[];
  basis: "results" | "membership";
}) {
  const key = basis === "results" ? "won" : "members";
  const max = Math.max(1, ...standings.map((s) => (basis === "results" ? s.won : s.members)));
  const total = standings.reduce((n, s) => n + (basis === "results" ? s.won : s.members), 0);

  return (
    <div className="standings">
      <p className="standings-basis">
        {basis === "results" ? t("ed.basisResults") : t("ed.basisMembership")}
      </p>

      <div className="table-wrap">
        <table className="data responsive">
          <thead>
            <tr>
              <th>{t("cand.party")}</th>
              <th className="num">{basis === "results" ? t("ed.won") : t("ed.members")}</th>
              {basis === "results" ? <th className="num">{t("ed.leading")}</th> : null}
              <th className="num">{t("ed.share")}</th>
              <th className="standings-bar-col">{t("ed.distribution")}</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => {
              const value = basis === "results" ? s.won : s.members;
              const pctOfTotal = total > 0 ? (value / total) * 100 : 0;
              return (
                <tr key={s.partyId ?? "independent"}>
                  <td data-label={t("cand.party")}>
                    <span className="party-cell">
                      <span
                        className="party-swatch"
                        style={{ background: s.colorHex ?? "var(--dv-mid)" }}
                        aria-hidden
                      />
                      <span>
                        <strong>{s.shortName ?? s.name}</strong>
                        <span className="faint small"> {s.name}</span>
                      </span>
                    </span>
                  </td>
                  <td className="num" data-label={basis === "results" ? t("ed.won") : t("ed.members")}>
                    {formatCount(value, locale)}
                  </td>
                  {basis === "results" ? (
                    <td className="num" data-label={t("ed.leading")}>
                      {s.leading > 0 ? formatCount(s.leading, locale) : "—"}
                    </td>
                  ) : null}
                  <td className="num" data-label={t("ed.share")}>
                    {s.voteSharePct === null ? (
                      <NotRecorded t={t} />
                    ) : (
                      formatPct(s.voteSharePct, locale, 1)
                    )}
                  </td>
                  <td className="standings-bar-col" data-label={t("ed.distribution")}>
                    <span className="standings-bar" title={`${pctOfTotal.toFixed(1)}%`}>
                      <span
                        style={{
                          width: `${(value / max) * 100}%`,
                          background: s.colorHex ?? "var(--dv-mid)",
                        }}
                      />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {basis === "membership" ? (
        <p className="small faint standings-note">{t("ed.membershipNote")}</p>
      ) : null}
    </div>
  );
}
