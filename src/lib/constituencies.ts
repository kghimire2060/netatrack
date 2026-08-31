import { prisma } from "./db";
import { resolveProvince, districtSlug, type Province } from "./geography";
import type { GovernmentLevel, VerificationTier } from "@prisma/client";

/**
 * The constituency data layer.
 *
 * Same contract as elections.ts and candidates.ts: pages read, this module
 * decides. Nothing here estimates. Where a figure was never published —
 * registered voters for a local body, turnout for an uncounted contest — the
 * value stays null and the UI reports it as unrecorded.
 *
 * `province` is normalised on the way out because the column is stored with
 * inconsistent casing across environments; see lib/geography.ts.
 */

// ------------------------------------------------------------------ browsing

export type DistrictNode = {
  name: string;
  slug: string;
  counts: { total: number; federal: number; provincial: number; local: number };
};

export type ProvinceNode = {
  province: Province;
  districts: DistrictNode[];
  counts: { total: number; federal: number; provincial: number; local: number };
};

/**
 * The Province → District → Constituency tree that navigation is built on.
 *
 * One grouped query rather than a query per province: 1,247 rows across 77
 * districts is small enough to shape in memory, and it keeps the page to a
 * single round trip.
 */
export async function getGeographyTree(): Promise<{
  provinces: ProvinceNode[];
  unresolved: { raw: string; count: number }[];
}> {
  const rows = await prisma.constituency.groupBy({
    by: ["province", "district", "level"],
    _count: { _all: true },
  });

  const byProvince = new Map<string, ProvinceNode>();
  const unresolved = new Map<string, number>();

  for (const row of rows) {
    const province = resolveProvince(row.province);
    const n = row._count._all;
    if (!province) {
      // Surfaced rather than dropped: an unmapped spelling is a data problem
      // worth seeing, not something to quietly discard.
      unresolved.set(row.province, (unresolved.get(row.province) ?? 0) + n);
      continue;
    }

    let node = byProvince.get(province.slug);
    if (!node) {
      node = { province, districts: [], counts: blank() };
      byProvince.set(province.slug, node);
    }

    let district = node.districts.find((d) => d.name === row.district);
    if (!district) {
      district = { name: row.district, slug: districtSlug(row.district), counts: blank() };
      node.districts.push(district);
    }

    bump(node.counts, row.level, n);
    bump(district.counts, row.level, n);
  }

  const provinces = [...byProvince.values()].sort(
    (a, b) => a.province.number - b.province.number
  );
  for (const p of provinces) p.districts.sort((a, b) => a.name.localeCompare(b.name));

  return {
    provinces,
    unresolved: [...unresolved.entries()].map(([raw, count]) => ({ raw, count })),
  };
}

const blank = () => ({ total: 0, federal: 0, provincial: 0, local: 0 });

function bump(c: ReturnType<typeof blank>, level: GovernmentLevel, n: number) {
  c.total += n;
  if (level === "FEDERAL") c.federal += n;
  else if (level === "PROVINCIAL") c.provincial += n;
  else c.local += n;
}

// -------------------------------------------------------------------- profile

export type ContestResult = {
  candidateName: string;
  candidateSlug: string;
  partyName: string | null;
  partyShort: string | null;
  /**
   * From the candidate record, not inferred from a null party. A missing party
   * link means "not recorded"; standing without a party is a separate fact.
   */
  isIndependent: boolean;
  votes: number;
  voteShare: number | null;
  isWinner: boolean;
  rank: number;
};

export type Contest = {
  electionName: string;
  electionSlug: string;
  electionYear: number;
  bsYear: number | null;
  results: ContestResult[];
  winner: ContestResult | null;
  /** Winner's votes minus the runner-up's. Null with fewer than two results. */
  margin: number | null;
  totalVotes: number;
  /** Only where the authority published it — never derived from our own rows. */
  turnoutPct: number | null;
  tier: VerificationTier;
  sourceName: string | null;
  sourceUrl: string | null;
};

export async function getConstituencyProfile(slug: string) {
  const c = await prisma.constituency.findUnique({
    where: { slug },
    include: {
      pollingStations: { orderBy: { name: "asc" } },
      candidates: {
        include: {
          party: { select: { name: true, shortName: true, colorHex: true } },
          ratings: { where: { status: "VISIBLE" }, select: { weightedScore: true } },
        },
        orderBy: { fullName: "asc" },
      },
      results: {
        where: { status: "VERIFIED" },
        include: {
          election: { select: { name: true, slug: true, year: true, bsYear: true } },
          candidate: { select: { fullName: true, slug: true, isIndependent: true } },
          party: { select: { name: true, shortName: true } },
        },
        orderBy: [{ votes: "desc" }],
      },
      complaints: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { trackingId: true, title: true, status: true, category: true, createdAt: true },
      },
      issues: { orderBy: { position: "asc" } },
      promises: { take: 10, orderBy: { lastUpdateAt: "desc" } },
      historicalResults: { orderBy: [{ bsYear: "desc" }] },
      newsArticles: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 6,
        select: { slug: true, title: true, excerpt: true, publishedAt: true, category: true },
      },
      parent: { select: { name: true, slug: true, level: true } },
      children: { select: { name: true, slug: true, level: true }, orderBy: { name: "asc" } },
      _count: { select: { complaints: true, candidates: true, pollingStations: true } },
    },
  });

  if (!c) return null;

  const contests = buildContests(c.results);
  const current = contests[0] ?? null;

  // The sitting member: the winner of the most recent contest that has one.
  // Falls back to a candidate flagged incumbent when no result is recorded,
  // which is how the 110 PR members and un-ingested seats behave.
  const winnerSlug = contests.find((x) => x.winner)?.winner?.candidateSlug ?? null;
  const representative =
    (winnerSlug ? c.candidates.find((x) => x.slug === winnerSlug) : null) ??
    c.candidates.find((x) => x.isIncumbent) ??
    null;

  const stamps: Date[] = [
    ...c.results.map((r) => r.updatedAt),
    ...c.complaints.map((x) => x.createdAt),
    ...c.promises.map((p) => p.lastUpdateAt),
  ];
  const lastUpdated = stamps.length ? new Date(Math.max(...stamps.map((d) => d.getTime()))) : null;

  const availability = {
    voters: c.registeredVoters !== null,
    pollingStations: (c.pollingStationCount ?? c.pollingStations.length) > 0,
    wards: c.wards !== null,
    population: c.population !== null,
    area: c.areaSqKm !== null,
    number: c.number !== null,
    results: contests.length > 0,
    representative: representative !== null,
    candidates: c.candidates.length > 0,
    issues: c.issues.length > 0 || c.complaints.length > 0,
    news: c.newsArticles.length > 0,
    source: Boolean(c.sourceName),
  };

  return {
    ...c,
    provinceRef: resolveProvince(c.province),
    contests,
    currentContest: current,
    representative,
    lastUpdated,
    availability,
    completeness: {
      known: Object.values(availability).filter(Boolean).length,
      of: Object.keys(availability).length,
    },
  };
}

export type ConstituencyProfile = NonNullable<
  Awaited<ReturnType<typeof getConstituencyProfile>>
>;

/** Group flat result rows into one contest per election, newest first. */
function buildContests(
  rows: {
    votes: number;
    voteShare: number | null;
    isWinner: boolean;
    turnoutPct: number | null;
    tier: VerificationTier;
    sourceName: string | null;
    sourceUrl: string | null;
    election: { name: string; slug: string; year: number; bsYear: number | null };
    candidate: { fullName: string; slug: string; isIndependent: boolean };
    party: { name: string; shortName: string | null } | null;
  }[]
): Contest[] {
  const byElection = new Map<string, typeof rows>();
  for (const r of rows) {
    byElection.set(r.election.slug, [...(byElection.get(r.election.slug) ?? []), r]);
  }

  const contests: Contest[] = [];
  for (const group of byElection.values()) {
    const sorted = [...group].sort((a, b) => b.votes - a.votes);
    const results: ContestResult[] = sorted.map((r, i) => ({
      candidateName: r.candidate.fullName,
      candidateSlug: r.candidate.slug,
      partyName: r.party?.name ?? null,
      partyShort: r.party?.shortName ?? null,
      isIndependent: r.candidate.isIndependent,
      votes: r.votes,
      voteShare: r.voteShare,
      isWinner: r.isWinner,
      rank: i + 1,
    }));

    const head = sorted[0];
    contests.push({
      electionName: head.election.name,
      electionSlug: head.election.slug,
      electionYear: head.election.year,
      bsYear: head.election.bsYear,
      results,
      winner: results.find((x) => x.isWinner) ?? null,
      margin: sorted.length >= 2 ? sorted[0].votes - sorted[1].votes : null,
      totalVotes: sorted.reduce((s, r) => s + r.votes, 0),
      // Turnout is a published figure. Where several rows carry it they agree,
      // so the first non-null is taken; it is never computed from our totals,
      // which would need an electorate size we may not hold.
      turnoutPct: sorted.find((r) => r.turnoutPct !== null)?.turnoutPct ?? null,
      tier: head.tier,
      sourceName: head.sourceName,
      sourceUrl: head.sourceUrl,
    });
  }

  return contests.sort((a, b) => b.electionYear - a.electionYear);
}

/**
 * Winning vote share per election, oldest first — the series behind the trend
 * chart. Returns fewer than two points when there is not enough recorded
 * history to draw a trend, and the caller shows nothing rather than a line
 * through a single dot.
 */
export function trendSeries(contests: Contest[]) {
  return [...contests]
    .reverse()
    .map((c) => ({
      label: String(c.electionYear),
      winnerShare: c.winner?.voteShare ?? null,
      turnout: c.turnoutPct,
      totalVotes: c.totalVotes,
      party: c.winner?.partyShort ?? c.winner?.partyName ?? null,
    }));
}
