import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import {
  getCachedShell, getCachedDistricts, getCachedParties,
  exploreConstituencies, showsCountdown,
} from "@/lib/election-dashboard";
import { PROVINCES, provinceName } from "@/lib/geography";
import { Breadcrumb, Card, Meter, Pager } from "@/components/ui";
import { ElectionBadge } from "@/components/status";
import { VerifiedBadge, SourceList } from "@/components/dashboard/trust";
import { ElectionCountdown } from "@/components/dashboard/countdown";
import { StatusRail } from "@/components/election/status-rail";
import { PartyStandings } from "@/components/election/party-standings";
import { ProvinceMap } from "@/components/election/province-map";
import { Explorer, ExplorerFilters } from "@/components/election/explorer";
import { Unavailable, NotRecorded } from "@/components/candidate/unavailable";
import { getTranslator } from "@/lib/locale-server";
import { formatCount, formatPct, enumLabel } from "@/lib/i18n";
import { formatDate, formatDateTime } from "@/lib/format";

/**
 * Election pages carry the heaviest traffic of anything here, and every
 * visitor on a counting night wants the same handful of URLs. Sixty seconds of
 * shared caching turns that stampede into one query per minute per filter
 * combination, while still being fresher than any human refresh cycle.
 */
export const revalidate = 60;

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string>> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const e = await prisma.election.findUnique({
    where: { slug },
    select: { name: true, year: true, status: true, totalSeats: true, level: true },
  });
  if (!e) return { title: "Election" };
  return {
    title: `${e.name} — results and constituency breakdown`,
    description: `Live status, party standings and constituency-by-constituency results for the ${e.name}. Sourced records with verification status shown on every figure.`,
    alternates: { canonical: `/elections/${slug}` },
    openGraph: {
      title: e.name,
      description: `Party standings and constituency results${e.totalSeats ? ` across ${e.totalSeats} seats` : ""}.`,
      type: "website",
    },
  };
}

export default async function ElectionDashboard({ params, searchParams }: Params) {
  const { slug } = await params;
  const sp = await searchParams;
  const { t, locale } = await getTranslator();

  const shell = await getCachedShell(slug);
  if (!shell) notFound();

  const { dashboard: d, tiles, comparison } = shell;
  const { election } = d;
  const basePath = `/elections/${slug}`;
  const filters = {
    province: sp.province || undefined,
    district: sp.district || undefined,
    party: sp.party || undefined,
    q: sp.q || undefined,
    status: (sp.status as "declared" | "pending" | undefined) || undefined,
    page: Number.parseInt(sp.page ?? "1", 10) || 1,
  };

  const [districts, parties] = await Promise.all([
    getCachedDistricts(election.level, filters.province),
    getCachedParties(),
  ]);

  const countdownEvent = showsCountdown(election.status, election.tier)
    ? d.events.find((e) => e.startsAt && e.startsAt.getTime() > Date.now())
    : null;

  return (
    <div className="wrap section ed">
      <Breadcrumb
        items={[
          { label: t("nav.home"), href: "/" },
          { label: t("nav.elections"), href: "/elections" },
          { label: election.name },
        ]}
      />

      {/* ========================= 1. HEADER ========================= */}
      <Card className="ed-hero">
        <div className="ed-hero-top">
          <div>
            <div className="ed-titles">
              <h1>{election.name}</h1>
              <ElectionBadge status={election.status} />
              <VerifiedBadge tier={election.tier} t={t} />
            </div>
            <p className="ed-sub">
              {enumLabel(election.type, locale)} · {formatCount(election.year, locale)}
              {election.bsYear ? ` · ${t("cand.bs")} ${formatCount(election.bsYear, locale)}` : ""}
            </p>
          </div>

          {/* Requirement: never a countdown once an election has finished. */}
          {countdownEvent?.startsAt ? (
            <div className="ed-countdown">
              <span className="badge badge-bad">{countdownEvent.title}</span>
              <ElectionCountdown
                targetIso={countdownEvent.startsAt.toISOString()}
                labels={{
                  days: t("cd.days"), hours: t("cd.hours"), minutes: t("cd.minutes"),
                  seconds: t("cd.seconds"), passed: t("cd.passed"),
                }}
              />
            </div>
          ) : null}
        </div>

        <StatusRail status={election.status} locale={locale} />

        <dl className="ed-meta">
          <div>
            <dt>{t("ed.pollingDay")}</dt>
            <dd>{election.electionDate ? formatDate(election.electionDate) : <NotRecorded t={t} />}</dd>
          </div>
          <div>
            <dt>{t("ed.lastUpdated")}</dt>
            <dd>{formatDateTime(d.lastUpdated)}</dd>
          </div>
          <div>
            <dt>{t("ed.source")}</dt>
            <dd>
              {election.sourceUrl ? (
                <a href={election.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                  {election.sourceName}
                </a>
              ) : (
                election.sourceName ?? <NotRecorded t={t} />
              )}
            </dd>
          </div>
        </dl>
      </Card>

      {/* ================= 2. NATIONAL OVERVIEW ==================== */}
      <div className="ed-stats">
        <OfficialStat
          label={t("ed.constituencies")}
          official={d.totals.officialConstituencies}
          recorded={d.totals.constituencies}
          locale={locale}
          t={t}
        />
        <OfficialStat
          label={t("ed.candidates")}
          official={d.totals.officialCandidates}
          recorded={d.totals.candidates}
          locale={locale}
          t={t}
        />
        <OfficialStat
          label={t("ed.voters")}
          official={d.totals.officialVoters}
          recorded={d.totals.recordedVoters}
          locale={locale}
          t={t}
        />
        <div className="stat">
          <div className="label">{t("ed.seatsDeclared")}</div>
          <div className="value">
            {d.counting.pct === null ? "—" : formatCount(d.counting.declared, locale)}
            <span className="faint"> / {formatCount(d.counting.total, locale)}</span>
          </div>
          <div className="hint">
            {d.counting.pct === null ? (
              t("ed.countingNotStarted")
            ) : (
              <>
                {formatPct(d.counting.pct, locale, 0)} · <Meter value={d.counting.pct} max={100} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================= 3. PARTY STANDINGS ====================== */}
      <Card title={t("ed.standings")}>
        {d.standings.length === 0 ? (
          <Unavailable t={t} title={t("ed.countingNotStarted")} />
        ) : (
          <PartyStandings
            t={t}
            locale={locale}
            standings={d.standings}
            basis={d.hasResults ? "results" : "membership"}
          />
        )}
      </Card>

      {/* ================= 4. MAP ================================== */}
      <Card title={t("ed.map")}>
        {tiles.length === 0 ? (
          <Unavailable t={t} title={t("ed.countingNotStarted")} />
        ) : (
          <>
            <ProvinceMap
              tiles={tiles.map((x) => ({
                slug: x.province.slug,
                nameEn: x.province.nameEn,
                nameNe: x.province.nameNe,
                number: x.province.number,
                seats: x.seats,
                candidates: x.candidates,
                voters: x.voters,
                declared: x.declared,
              }))}
              activeProvince={filters.province ?? null}
              labels={{
                seats: t("con.seats"),
                candidates: t("ed.candidates"),
                voters: t("ed.voters"),
                declared: t("ed.declared"),
                viewAll: t("ed.clear"),
                note: t("ed.mapNote"),
              }}
            />
            <p className="small faint ed-map-note">{t("ed.mapDisclaimer")}</p>
            {election.prSeats ? (
              <p className="small faint ed-map-note">{t("ed.mapPrOnly")}</p>
            ) : null}
          </>
        )}
      </Card>

      {/* ============ 5 + 6. EXPLORER WITH FILTERS ================= */}
      <Card title={t("ed.explorer")}>
        <ExplorerFilters
          t={t}
          locale={locale}
          provinces={PROVINCES.filter((p) => tiles.some((x) => x.province.slug === p.slug))}
          districts={districts}
          parties={parties}
          current={filters}
          action={basePath}
        />
        <Suspense fallback={<ExplorerSkeleton />}>
          <ExplorerResults
            electionId={election.id}
            level={election.level}
            filters={filters}
            basePath={basePath}
          />
        </Suspense>
      </Card>

      {/* ================= 8. HISTORICAL COMPARISON ================ */}
      <Card title={t("ed.comparison")}>
        <div className="table-wrap">
          <table className="data responsive">
            <thead>
              <tr>
                <th>{t("nav.elections")}</th>
                <th>{t("ed.status")}</th>
                <th className="num">{t("res.totalSeats")}</th>
                <th className="num">{t("ed.seatsDeclared")}</th>
                <th>{t("trust.verified")}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((c) => (
                <tr key={c.slug} className={c.isCurrent ? "is-winner" : undefined}>
                  <td data-label={t("nav.elections")}>
                    <Link href={`/elections/${c.slug}`}>{c.name}</Link>
                    {c.isCurrent ? <span className="faint small"> · {t("ed.thisElection")}</span> : null}
                  </td>
                  <td data-label={t("ed.status")}>
                    <ElectionBadge status={c.status} />
                  </td>
                  <td className="num" data-label={t("res.totalSeats")}>
                    {c.totalSeats === null ? "—" : formatCount(c.totalSeats, locale)}
                  </td>
                  <td className="num" data-label={t("ed.seatsDeclared")}>
                    {formatCount(c.declared, locale)}
                  </td>
                  <td data-label={t("trust.verified")}>
                    <VerifiedBadge tier={c.tier} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small faint" style={{ marginBottom: 0 }}>{t("ed.comparisonNote")}</p>
      </Card>

      {/* ================= 9. SOURCES ============================== */}
      <Card title={t("con.sources")}>
        <SourceList t={t} citations={d.citations} />
      </Card>

      <p className="profile-disclaimer">{t("cand.disclaimer")}</p>
    </div>
  );
}

/** Split out so the shell streams while the filtered query runs. */
async function ExplorerResults({
  electionId,
  level,
  filters,
  basePath,
}: {
  electionId: string;
  level: import("@prisma/client").GovernmentLevel;
  filters: Parameters<typeof exploreConstituencies>[2];
  basePath: string;
}) {
  const { t, locale } = await getTranslator();
  const res = await exploreConstituencies(level, electionId, filters);

  return (
    <>
      <p className="ed-count small muted">
        {t("ed.showing")} {formatCount(res.rows.length, locale)} {t("ed.of")}{" "}
        {formatCount(res.total, locale)}
      </p>
      <Explorer t={t} locale={locale} rows={res.rows} />
      {res.pages > 1 ? (
        <Pager
          page={res.page}
          pages={res.pages}
          basePath={basePath}
          query={{
            q: filters.q,
            province: filters.province,
            district: filters.district,
            party: filters.party,
            status: filters.status,
          }}
        />
      ) : null}
    </>
  );
}

function ExplorerSkeleton() {
  return (
    <ul className="result-cards" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="result-card is-skeleton">
          <span className="skeleton-line" style={{ width: "55%" }} />
          <span className="skeleton-line" style={{ width: "35%" }} />
          <span className="skeleton-line" style={{ width: "80%" }} />
        </li>
      ))}
    </ul>
  );
}

/**
 * A figure the authority published beside the figure we hold.
 *
 * Shown side by side rather than reconciled: when they disagree that is worth
 * seeing, and picking one silently would hide an ingestion gap.
 */
function OfficialStat({
  label, official, recorded, locale, t,
}: {
  label: string;
  official: number | null;
  recorded: number | null;
  locale: import("@/lib/i18n").Locale;
  t: import("@/lib/i18n").Translator;
}) {
  const gap = official !== null && recorded !== null && official !== recorded;
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">
        {official !== null
          ? formatCount(official, locale)
          : recorded !== null
            ? formatCount(recorded, locale)
            : "—"}
      </div>
      <div className="hint">
        {official !== null ? (
          gap ? (
            <>
              {t("ed.official")} · {t("ed.recorded")} {formatCount(recorded, locale)}{" "}
              <span className="ed-gap">{t("ed.gap")}</span>
            </>
          ) : (
            t("ed.official")
          )
        ) : recorded !== null ? (
          t("ed.recorded")
        ) : (
          t("cand.notRecordedShort")
        )}
      </div>
    </div>
  );
}
