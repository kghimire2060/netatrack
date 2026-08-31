import Link from "next/link";
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

export function VerifiedBadge({ state, t }: { state: TrustState; t: Translator }) {
  const map: Record<TrustState, { cls: string; icon: string; key: Parameters<Translator>[0] }> = {
    verified: { cls: "trust-badge is-verified", icon: "✓", key: "trust.verified" },
    unverified: { cls: "trust-badge is-unverified", icon: "!", key: "trust.unverified" },
    historical: { cls: "trust-badge is-historical", icon: "◷", key: "trust.historical" },
  };
  const m = map[state];
  return (
    <span className={m.cls}>
      <span aria-hidden>{m.icon}</span>
      {t(m.key)}
    </span>
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
          <VerifiedBadge state="verified" t={t} />
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

      {candidatesPending > 0 ? (
        <span className="trust-item">
          <Link className="source-line" href="/candidates">
            {t("trust.pendingReview")}: {candidatesPending.toLocaleString("en-US")}
            {candidatesVerified > 0 ? ` / ${(candidatesVerified + candidatesPending).toLocaleString("en-US")}` : ""}
          </Link>
        </span>
      ) : null}
    </div>
  );
}
