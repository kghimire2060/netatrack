import Link from "next/link";
import type { SourceType, VerificationTier } from "@prisma/client";
import type { Translator } from "@/lib/i18n";
import { formatDateTime, relativeTime } from "@/lib/format";

/**
 * The trust layer.
 *
 * Every claim on the homepage carries where it came from and when it was last
 * checked. A record without a source is never dressed up as verified — the
 * badge states the actual state, including "unverified" and "historical".
 */

export type TrustState = "verified" | "unverified" | "historical";

const TIER_STYLE: Record<VerificationTier, { cls: string; icon: string }> = {
  OFFICIAL: { cls: "trust-badge is-official", icon: "\u2713" },
  NETATRACK: { cls: "trust-badge is-netatrack", icon: "\u2713" },
  UNVERIFIED: { cls: "trust-badge is-unverified", icon: "!" },
  DISPUTED: { cls: "trust-badge is-disputed", icon: "\u26a0" },
};

/**
 * States a record's verification level.
 *
 * Prefer `tier` — it comes straight from the database column and distinguishes
 * a record confirmed against the authority's own publication (OFFICIAL) from
 * one we cross-checked against a secondary source (NETATRACK). The older
 * `state` prop is kept for the few call sites that describe a presentation
 * state rather than a stored tier, such as labelling a historical record.
 */
export function VerifiedBadge({
  tier,
  state,
  t,
}: {
  tier?: VerificationTier;
  state?: TrustState;
  t: Translator;
}) {
  if (tier) {
    const style = TIER_STYLE[tier];
    return (
      <span className={style.cls} title={t(`tier.${tier}.note`)}>
        <span aria-hidden>{style.icon}</span>
        {t(`tier.${tier}`)}
      </span>
    );
  }

  const map: Record<TrustState, { cls: string; icon: string; key: Parameters<Translator>[0] }> = {
    verified: { cls: "trust-badge is-verified", icon: "\u2713", key: "trust.verified" },
    unverified: { cls: "trust-badge is-unverified", icon: "!", key: "trust.unverified" },
    historical: { cls: "trust-badge is-historical", icon: "\u25f7", key: "trust.historical" },
  };
  const m = map[state ?? "unverified"];
  return (
    <span className={m.cls}>
      <span aria-hidden>{m.icon}</span>
      {t(m.key)}
    </span>
  );
}

/**
 * Every source behind one record, so a reader can check the claim rather than
 * take the badge on faith. Renders nothing when there is nothing to cite —
 * an empty list is never padded out.
 */
export function SourceList({
  t,
  citations,
}: {
  t: Translator;
  citations: {
    id: string;
    sourceName: string;
    sourceUrl: string | null;
    sourceType: SourceType;
    tier: VerificationTier;
    note: string | null;
  }[];
}) {
  if (citations.length === 0) {
    return <p className="source-line">{t("tier.noSource")}</p>;
  }
  return (
    <div className="source-list">
      <h3 className="source-list-title">{t("tier.sources")}</h3>
      <ul>
        {citations.map((c) => (
          <li key={c.id}>
            <VerifiedBadge tier={c.tier} t={t} />{" "}
            {c.sourceUrl ? (
              <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
                {c.sourceName}
              </a>
            ) : (
              <span>{c.sourceName}</span>
            )}
            {c.note ? <span className="source-note">{c.note}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Source attribution. Renders nothing when there is no source to cite. */
export function SourceLine({
  t,
  sourceName,
  sourceUrl,
  verifiedAt,
}: {
  t: Translator;
  sourceName: string | null;
  sourceUrl: string | null;
  verifiedAt: Date | null;
}) {
  if (!sourceName) return null;
  return (
    <span className="source-line">
      {t("trust.source")}:{" "}
      {sourceUrl ? (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
          {sourceName}
        </a>
      ) : (
        sourceName
      )}
      {verifiedAt ? (
        <>
          {" · "}
          <span title={formatDateTime(verifiedAt)}>
            {t("trust.checked")} {relativeTime(verifiedAt)}
          </span>
        </>
      ) : null}
    </span>
  );
}

/**
 * The strip under the hero. States plainly what is verified, what is not, and
 * when the underlying rows last changed — computed from row timestamps, not a
 * decorative "live" label.
 */
export function TrustBar({
  t,
  election,
  lastUpdated,
  candidatesVerified,
  candidatesPending,
}: {
  t: Translator;
  election: {
    name: string;
    slug: string;
    tier: VerificationTier;
    sourceName: string | null;
    sourceUrl: string | null;
    verifiedAt: Date | null;
  } | null;
  lastUpdated: Date | null;
  candidatesVerified: number;
  candidatesPending: number;
}) {
  return (
    <div className="trust-bar">
      {election ? (
        <span className="trust-item">
          <VerifiedBadge tier={election.tier} t={t} />
          <SourceLine
            t={t}
            sourceName={election.sourceName}
            sourceUrl={election.sourceUrl}
            verifiedAt={election.verifiedAt}
          />
        </span>
      ) : (
        <span className="trust-item">
          <VerifiedBadge state="unverified" t={t} />
          <span className="source-line">{t("trust.noVerifiedElection")}</span>
        </span>
      )}

      {lastUpdated ? (
        <span className="trust-item">
          <span className="trust-dot" aria-hidden />
          <span className="source-line" title={formatDateTime(lastUpdated)}>
            {t("trust.lastUpdated")}: {formatDateTime(lastUpdated)}
          </span>
        </span>
      ) : null}

      {candidatesVerified + candidatesPending > 0 ? (
        <span className="trust-item">
          <Link
            className="source-line"
            href="/candidates"
            title={candidatesPending === 0 ? t("trust.corroboratedNote") : undefined}
          >
            {candidatesPending > 0 ? (
              <>
                {t("trust.pendingReview")}: {candidatesPending.toLocaleString("en-US")} /{" "}
                {(candidatesVerified + candidatesPending).toLocaleString("en-US")}
              </>
            ) : (
              <>
                {candidatesVerified.toLocaleString("en-US")} / {candidatesVerified.toLocaleString("en-US")}{" "}
                {t("trust.corroborated")}
              </>
            )}
          </Link>
        </span>
      ) : null}
    </div>
  );
}
