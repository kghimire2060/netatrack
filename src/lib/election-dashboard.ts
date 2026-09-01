import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import { resolveProvince, PROVINCES, type Province } from "./geography";
import type { GovernmentLevel, VerificationTier, ElectionStatus } from "@prisma/client";

/**
 * The election dashboard data layer.
 *
 * One rule shapes everything here: a number is reported with the basis it came
 * from, and the two are never merged. Seats *won* come from counted results.
 * Party *composition* comes from our member records. They answer different
 * questions and can legitimately disagree — a by-election, a defection, a seat
 * we have not ingested — so the UI labels which it is showing rather than
 * silently presenting one as the other.
 *
 * Nothing is projected, extrapolated or estimated. With no results recorded,
 * the standings table reports composition and says so; it does not invent a
 * count.
 */

// ------------------------------------------------------------------ standings

/** Where a standings row's numbers came from. Rendered, not just tracked. */
export type StandingBasis = "results" | "membership";

export type PartyStanding = {
  partyId: string | null;
  name: string;
  shortName: string | null;
  colorHex: string | null;
  /** Seats with a verified winning result. */
  won: number;
  /** Ahead on partial counting — only meaningful while COUNTING. */
  leading: number;
  /** Members we hold records for, whatever the election outcome. */
  members: number;
  /** Share of counted votes. Null unless results carry vote totals. */
  voteSharePct: number | null;
  basis: StandingBasis;
  tier: VerificationTier;
};

export type Dashboard = NonNullable<Awaited<ReturnType<typeof getElectionDashboard>>>;

export async function getElectionDashboard(slug: string) {
  const election = await prisma.election.findUnique({ where: { slug } });
  if (!election) return null;

  const [results, parties, citations, events, constituencyCounts, memberCounts] =
    await Promise.all([
      prisma.result.findMany({
        where: { electionId: election.id, status: "VERIFIED" },
        select: {
          votes: true, voteShare: true, isWinner: true, tier: true,
          partyId: true, constituencyId: true,
        },
      }),
      prisma.party.findMany({
        select: { id: true, name: true, shortName: true, colorHex: true, tier: true },
        orderBy: { name: "asc" },
      }),
      prisma.dataSource.findMany({
        where: { entityType: "Election", entityId: election.id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true, sourceName: true, sourceUrl: true,
          sourceType: true, tier: true, note: true,
        },
      }),
      prisma.electionEvent.findMany({
        where: { electionId: election.id },
        orderBy: [{ startsAt: "asc" }],
        select: { id: true, title: true, bsDate: true, startsAt: true, sourceName: true },
      }),
      prisma.constituency.groupBy({
        by: ["level"],
        _count: { _all: true },
        _sum: { registeredVoters: true, pollingStationCount: true },
      }),
      // Current composition: who we hold records for, by party.
      prisma.candidate.groupBy({
        by: ["partyId"],
        where: { level: election.level },
        _count: { _all: true },
      }),
    ]);

  const seatLevel = constituencyCounts.find((c) => c.level === election.level);
  const totalConstituencies = seatLevel?._count._all ?? 0;
  const recordedVoters = seatLevel?._sum.registeredVoters ?? null;
  const pollingStations = seatLevel?._sum.pollingStationCount ?? null;

  // ---- standings
  const totalCountedVotes = results.reduce((s, r) => s + r.votes, 0);
  const memberByParty = new Map(memberCounts.map((m) => [m.partyId, m._count._all]));
  const hasResults = results.length > 0;

  const standings: PartyStanding[] = parties
    .map((p) => {
      const own = results.filter((r) => r.partyId === p.id);
      const votes = own.reduce((s, r) => s + r.votes, 0);
      return {
        partyId: p.id,
        name: p.name,
        shortName: p.shortName,
        colorHex: p.colorHex,
        won: own.filter((r) => r.isWinner).length,
        // Leading is only a real concept mid-count. Once a contest is decided
        // the winner is a winner, not a leader, so this stays 0 elsewhere.
        leading:
          election.status === "COUNTING"
            ? own.filter((r) => !r.isWinner).length
            : 0,
        members: memberByParty.get(p.id) ?? 0,
        voteSharePct:
          hasResults && totalCountedVotes > 0 ? (votes / totalCountedVotes) * 100 : null,
        basis: hasResults ? ("results" as const) : ("membership" as const),
        tier: p.tier,
      };
    })
    .filter((s) => s.won > 0 || s.members > 0)
    .sort((a, b) => b.won - a.won || b.members - a.members || a.name.localeCompare(b.name));

  const independents = memberByParty.get(null) ?? 0;
  if (independents > 0) {
    standings.push({
      partyId: null,
      name: "Independent",
      shortName: "IND",
      colorHex: null,
      won: results.filter((r) => r.partyId === null && r.isWinner).length,
      leading: 0,
      members: independents,
      voteSharePct: null,
      basis: hasResults ? "results" : "membership",
      tier: "NETATRACK",
    });
  }

  // ---- counting progress, stated only from what is recorded
  const decided = results.filter((r) => r.isWinner).length;
  const counting = {
    declared: decided,
    /** Official seat total where published, else what we hold. */
    total: election.totalSeats ?? totalConstituencies,
    /** Null rather than 0% when nothing is recorded — they differ. */
    pct:
      (election.totalSeats ?? totalConstituencies) > 0 && hasResults
        ? (decided / (election.totalSeats ?? totalConstituencies)) * 100
        : null,
  };

  const stamps = results.length
    ? await prisma.result.findFirst({
        where: { electionId: election.id },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      })
    : null;

  return {
    election,
    standings,
    hasResults,
    counting,
    citations,
    events,
    totals: {
      constituencies: totalConstituencies,
      officialConstituencies: election.officialConstituencies,
      candidates: memberCounts.reduce((s, m) => s + m._count._all, 0),
      officialCandidates: election.officialCandidates,
      recordedVoters,
      officialVoters: election.officialVoters,
      pollingStations,
      countedVotes: hasResults ? totalCountedVotes : null,
    },
    lastUpdated: stamps?.updatedAt ?? election.updatedAt,
  };
}

// ----------------------------------------------------------------- geography

export type ProvinceTile = {
  province: Province;
  seats: number;
  candidates: number;
  voters: number | null;
  declared: number;
};

/**
 * Seats per province for the cartogram.
 *
 * Deliberately not a geographic map: accurate Nepal boundary data is not in
 * this project, and approximating a country's borders on a political platform
 * asserts something we cannot source. Tiles sit in real west-to-east
 * provincial order, so spatial intuition survives without false geography.
 */
export async function getProvinceTiles(level: GovernmentLevel): Promise<ProvinceTile[]> {
  // Counted in the database, not in JavaScript. The previous shape pulled
  // every candidate row and every winning result across the wire to length()
  // them here — fine at 275 rows, wrong in principle, and wrong in practice
  // the moment local elections add ~35,000 representatives.
  const [seatRows, candRows, declaredRows] = await Promise.all([
    prisma.constituency.groupBy({
      by: ["province"],
      where: { level },
      _count: { _all: true },
      _sum: { registeredVoters: true },
    }),
    prisma.$queryRaw<{ province: string; n: bigint }[]>`
      SELECT co."province" AS province, COUNT(*)::bigint AS n
      FROM "Candidate" c
      JOIN "Constituency" co ON co.id = c."constituencyId"
      WHERE c."level"::text = ${level}
      GROUP BY co."province"
    `,
    prisma.$queryRaw<{ province: string; n: bigint }[]>`
      SELECT co."province" AS province, COUNT(*)::bigint AS n
      FROM "Result" r
      JOIN "Constituency" co ON co.id = r."constituencyId"
      WHERE r."isWinner" = true AND r."status"::text = 'VERIFIED'
      GROUP BY co."province"
    `,
  ]);

  const bucket = (rows: { province: string; n: bigint }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const p = resolveProvince(r.province);
      if (p) m.set(p.slug, (m.get(p.slug) ?? 0) + Number(r.n));
    }
    return m;
  };
  const candByProvince = bucket(candRows);
  const declaredByProvince = bucket(declaredRows);

  const seats = new Map<string, { n: number; voters: number | null }>();
  for (const r of seatRows) {
    const p = resolveProvince(r.province);
    if (!p) continue;
    const prev = seats.get(p.slug);
    seats.set(p.slug, {
      n: (prev?.n ?? 0) + r._count._all,
      voters: (prev?.voters ?? 0) + (r._sum.registeredVoters ?? 0),
    });
  }

  return PROVINCES.map((province) => {
    const s = seats.get(province.slug);
    return {
      province,
      seats: s?.n ?? 0,
      candidates: candByProvince.get(province.slug) ?? 0,
      voters: s?.voters || null,
      declared: declaredByProvince.get(province.slug) ?? 0,
    };
  }).filter((t) => t.seats > 0);
}

// ------------------------------------------------------------------ explorer

export type ExplorerFilters = {
  province?: string;
  district?: string;
  party?: string;
  q?: string;
  status?: "declared" | "pending" | "all";
  page?: number;
};

export const EXPLORER_PAGE_SIZE = 30;

/**
 * Constituency-by-constituency view, filtered from the URL so every state is
 * linkable and cacheable. Filtering happens in SQL, not in the browser: 1,247
 * rows should never be shipped to a phone to be filtered client-side.
 */
export async function exploreConstituencies(
  level: GovernmentLevel,
  electionId: string,
  f: ExplorerFilters
) {
  const page = Math.max(1, f.page ?? 1);

  const where = {
    level,
    ...(f.province
      ? { province: { equals: f.province, mode: "insensitive" as const } }
      : {}),
    ...(f.district
      ? { district: { equals: f.district, mode: "insensitive" as const } }
      : {}),
    ...(f.q
      ? {
          OR: [
            { name: { contains: f.q, mode: "insensitive" as const } },
            { nameNe: { contains: f.q } },
            { district: { contains: f.q, mode: "insensitive" as const } },
            { candidates: { some: { fullName: { contains: f.q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
    ...(f.party ? { candidates: { some: { party: { shortName: f.party } } } } : {}),
    ...(f.status === "declared"
      ? { results: { some: { electionId, isWinner: true, status: "VERIFIED" as const } } }
      : f.status === "pending"
        ? { results: { none: { electionId, status: "VERIFIED" as const } } }
        : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.constituency.count({ where }),
    prisma.constituency.findMany({
      where,
      orderBy: [{ province: "asc" }, { district: "asc" }, { number: "asc" }, { name: "asc" }],
      skip: (page - 1) * EXPLORER_PAGE_SIZE,
      take: EXPLORER_PAGE_SIZE,
      select: {
        id: true, slug: true, name: true, district: true, province: true,
        registeredVoters: true, tier: true,
        results: {
          where: { electionId, status: "VERIFIED" },
          orderBy: { votes: "desc" },
          take: 2,
          select: {
            votes: true, voteShare: true, isWinner: true, tier: true,
            candidate: { select: { fullName: true, slug: true } },
            party: { select: { shortName: true, name: true, colorHex: true } },
          },
        },
        candidates: {
          take: 3,
          select: {
            fullName: true, slug: true,
            party: { select: { shortName: true, colorHex: true } },
          },
        },
      },
    }),
  ]);

  return {
    rows: rows.map((c) => {
      const winner = c.results.find((r) => r.isWinner) ?? null;
      const runnerUp = c.results.find((r) => r !== winner) ?? null;
      return {
        ...c,
        winner,
        margin:
          winner && runnerUp ? winner.votes - runnerUp.votes : null,
        provinceRef: resolveProvince(c.province),
      };
    }),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / EXPLORER_PAGE_SIZE)),
  };
}

/** Distinct districts for the filter, scoped to a province when one is chosen. */
export async function districtsFor(level: GovernmentLevel, province?: string) {
  const rows = await prisma.constituency.findMany({
    where: {
      level,
      ...(province ? { province: { equals: province, mode: "insensitive" as const } } : {}),
    },
    select: { district: true },
    distinct: ["district"],
    orderBy: { district: "asc" },
  });
  return rows.map((r) => r.district);
}

// ---------------------------------------------------------------- comparison

export type ComparisonRow = {
  slug: string;
  name: string;
  year: number;
  status: ElectionStatus;
  tier: VerificationTier;
  totalSeats: number | null;
  declared: number;
  isCurrent: boolean;
};

/** Past elections at the same level, for the historical strip. */
export async function compareElections(current: {
  id: string;
  level: GovernmentLevel;
}): Promise<ComparisonRow[]> {
  const rows = await prisma.election.findMany({
    where: { level: current.level },
    orderBy: [{ year: "desc" }],
    select: {
      id: true, slug: true, name: true, year: true, status: true,
      tier: true, totalSeats: true,
      _count: { select: { results: true } },
    },
  });

  const declaredCounts = await prisma.result.groupBy({
    by: ["electionId"],
    where: { isWinner: true, status: "VERIFIED" },
    _count: { _all: true },
  });
  const declaredBy = new Map(declaredCounts.map((d) => [d.electionId, d._count._all]));

  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    year: r.year,
    status: r.status,
    tier: r.tier,
    totalSeats: r.totalSeats,
    declared: declaredBy.get(r.id) ?? 0,
    isCurrent: r.id === current.id,
  }));
}

// -------------------------------------------------------------------- cached

/**
 * The parts of the page that do not depend on the reader's filters.
 *
 * Header, standings, map and comparison are identical for everyone looking at
 * the same election, so they are computed once per minute and shared. Only the
 * explorer query varies with the URL. On a counting night that turns a
 * thousand concurrent readers into one set of aggregate queries per minute
 * plus one cheap paged query each.
 *
 * Sixty seconds is well inside how often a returning officer publishes, so
 * nothing is stale in a way a reader would notice.
 */
const SHARED_TTL = 60;

const cachedShell = (slug: string) =>
  unstable_cache(
    async () => {
      const d = await getElectionDashboard(slug);
      if (!d) return null;
      const [tiles, comparison] = await Promise.all([
        getProvinceTiles(d.election.level),
        compareElections(d.election),
      ]);
      return { dashboard: d, tiles, comparison };
    },
    ["election-shell", slug],
    { revalidate: SHARED_TTL, tags: [`election:${slug}`] }
  )();

/**
 * `unstable_cache` round-trips its value through JSON, so every Date returns
 * as a string while the types still claim Date. That is a silent lie until
 * something calls a Date method on it: the countdown did, and every UPCOMING
 * election 500'd with `startsAt.getTime is not a function` while COMPLETED
 * pages looked fine because they short-circuit before touching it.
 *
 * Reviving here restores the contract the types promise, so callers can treat
 * the result as they would an uncached read.
 */
const asDate = (v: unknown): Date | null =>
  v == null ? null : v instanceof Date ? v : new Date(v as string);

export async function getCachedShell(slug: string) {
  const shell = await cachedShell(slug);
  if (!shell) return null;

  const e = shell.dashboard.election;
  return {
    ...shell,
    dashboard: {
      ...shell.dashboard,
      lastUpdated: asDate(shell.dashboard.lastUpdated)!,
      election: {
        ...e,
        electionDate: asDate(e.electionDate),
        nominationStartAt: asDate(e.nominationStartAt),
        nominationEndAt: asDate(e.nominationEndAt),
        countingStartAt: asDate(e.countingStartAt),
        resultDeclaredAt: asDate(e.resultDeclaredAt),
        verifiedAt: asDate(e.verifiedAt),
        createdAt: asDate(e.createdAt)!,
        updatedAt: asDate(e.updatedAt)!,
      },
      events: shell.dashboard.events.map((ev) => ({ ...ev, startsAt: asDate(ev.startsAt) })),
    },
  };
}

/** Filter option lists change only when geography does. */
export const getCachedDistricts = (level: GovernmentLevel, province?: string) =>
  unstable_cache(
    () => districtsFor(level, province),
    ["election-districts", level, province ?? "all"],
    { revalidate: 3600 }
  )();

export const getCachedParties = () =>
  unstable_cache(
    () =>
      prisma.party.findMany({
        select: { shortName: true, name: true },
        orderBy: { name: "asc" },
      }),
    ["election-parties"],
    { revalidate: 3600 }
  )();

// -------------------------------------------------------------------- status

/**
 * A countdown is only honest before polling. Requirement: never show one after
 * an election has finished — and equally not for an archived or unverified
 * record, where the date itself is not something we stand behind.
 */
export function showsCountdown(status: ElectionStatus, tier: VerificationTier): boolean {
  return (
    (status === "UPCOMING" || status === "LIVE") &&
    (tier === "OFFICIAL" || tier === "NETATRACK")
  );
}

/** Ordered lifecycle for the status rail. ACTIVE/CANCELLED are deprecated. */
export const STATUS_FLOW: ElectionStatus[] = [
  "UPCOMING",
  "LIVE",
  "COUNTING",
  "COMPLETED",
  "ARCHIVED",
];
