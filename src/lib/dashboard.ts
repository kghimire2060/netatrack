import { prisma } from "./db";
import { getCurrentElection } from "./elections";
import { RATING_DIMENSIONS } from "./ratings";

/**
 * Homepage data layer.
 *
 * One module so the page issues a single parallel batch instead of scattering
 * queries through the JSX. Every figure is computed from real rows — where a
 * table is empty the section returns an empty result and the UI says so rather
 * than showing an invented number. On an accountability platform a fabricated
 * engagement figure would undermine the thing the product exists to do.
 */

export type Kpi = { key: string; value: number; href: string };

export type TrendingLeader = {
  id: string;
  slug: string;
  fullName: string;
  photoUrl: string | null;
  office: string | null;
  party: string | null;
  partyIndex: number;
  constituency: string | null;
  district: string | null;
  ratingCount: number;
  ratingAverage: number;
  promiseTotal: number;
  promiseDone: number;
  factChecks: number;
  /** Why this leader is listed, so the ranking is never a black box. */
  basis: "rated" | "factchecked" | "office" | "incumbent";
  score: number;
};

export type ProvincePulse = {
  province: string;
  federal: number;
  provincial: number;
  local: number;
  candidates: number;
  issues: number;
  complaints: number;
  voters: number;
  topDistricts: { district: string; seats: number }[];
};

export type SentimentSlice = { key: string; label: string; count: number };

export type OpinionSummary = {
  totalRatings: number;
  totalVotes: number;
  average: number;
  dimensions: { key: string; label: string; weight: number; average: number }[];
  sentiment: SentimentSlice[];
  polls: {
    id: string;
    question: string;
    total: number;
    options: { id: string; label: string; count: number }[];
  }[];
};

export type CommitmentSummary = {
  total: number;
  byStatus: { status: string; count: number }[];
  completionRate: number;
  withEvidence: number;
  recent: {
    id: string;
    title: string;
    status: string;
    candidate: string | null;
    candidateSlug: string | null;
    updatedAt: Date;
  }[];
};

export type RadarItem = {
  id: string;
  kind: "news" | "factcheck" | "issue" | "result" | "promise";
  title: string;
  meta: string | null;
  href: string;
  at: Date;
  tone: "info" | "good" | "warn" | "bad" | "purple" | "muted";
  /**
   * A feed headed "what moved recently" must not present a fifteen-month-old
   * article as current. Anything past the window, or with no usable date, is
   * labelled historical instead of being silently mixed in.
   */
  age: "recent" | "historical";
};

/** Party colours are assigned by a stable index so a filter never repaints them. */
export const PARTY_ORDER_KEY = "party-index";

export type Provenance = {
  sourceName: string | null;
  sourceUrl: string | null;
  verifiedAt: Date | null;
  verified: boolean;
};

export type Freshness = {
  /** Most recent write across the tables the homepage reads. */
  lastUpdated: Date | null;
  /** Candidate records still awaiting editorial verification. */
  candidatesPending: number;
  candidatesVerified: number;
};

export async function getDashboard() {
  const now = new Date();

  const [
    leaderCount,
    federalCount,
    provincialCount,
    commitmentCount,
    ratingCount,
    pollVoteCount,
    parties,
    nextEvent,
    election,
  ] = await Promise.all([
    prisma.candidate.count(),
    prisma.constituency.count({ where: { level: "FEDERAL" } }),
    prisma.constituency.count({ where: { level: "PROVINCIAL" } }),
    prisma.promise.count(),
    prisma.rating.count({ where: { status: "VISIBLE" } }),
    prisma.pollVote.count(),
    prisma.party.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, shortName: true } }),
    // A countdown is only honest when the date is both in the future and
    // sourced. Undated milestones (BS string only) and unverified elections
    // are excluded rather than converted by assumption.
    prisma.electionEvent.findFirst({
      where: {
        startsAt: { not: null, gte: now },
        // Only a milestone belonging to a presentable election can drive a
        // countdown; an unverified record must not produce a live clock.
        election: { tier: { in: ["OFFICIAL", "NETATRACK"] } },
      },
      orderBy: { startsAt: "asc" },
      select: {
        title: true, startsAt: true, bsDate: true, detail: true,
        sourceName: true, sourceUrl: true,
        election: { select: { name: true, slug: true, tier: true } },
      },
    }),
    // Which election is "current" is decided in one place, by status and date,
    // so the homepage cannot drift from the elections pages or name a year of
    // its own. See src/lib/elections.ts.
    getCurrentElection(),
  ]);

  const partyIndex = new Map(parties.map((p, i) => [p.id, i]));

  const [lastCandidate, lastComplaint, lastNews, candidatesVerified] = await Promise.all([
    prisma.candidate.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.complaint.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.newsArticle.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.candidate.count({ where: { verificationStatus: "VERIFIED" } }),
  ]);

  const stamps = [
    lastCandidate?.updatedAt, lastComplaint?.updatedAt, lastNews?.updatedAt, election?.updatedAt,
  ].filter((d): d is Date => Boolean(d));

  const freshness: Freshness = {
    lastUpdated: stamps.length > 0 ? new Date(Math.max(...stamps.map((d) => d.getTime()))) : null,
    candidatesPending: leaderCount - candidatesVerified,
    candidatesVerified,
  };

  const kpis: Kpi[] = [
    { key: "leaders", value: leaderCount, href: "/candidates" },
    { key: "constituencies", value: federalCount, href: "/constituencies" },
    { key: "commitments", value: commitmentCount, href: "/promises" },
    { key: "opinions", value: ratingCount + pollVoteCount, href: "/opinion" },
  ];

  return {
    kpis,
    freshness,
    provincialCount,
    parties: parties.map((p, i) => ({ ...p, index: i })),
    nextEvent,
    election,
    trending: await getTrendingLeaders(partyIndex),
    pulse: await getProvincePulse(),
    opinion: await getOpinion(),
    commitments: await getCommitments(),
    radar: await getRadar(),
  };
}

/**
 * Ranked by measurable activity, not a hidden score: visible ratings, published
 * fact checks and tracked commitments. With none of those recorded the list
 * falls back to holders of a parliamentary office, and every card states which
 * of those put it there.
 */
async function getTrendingLeaders(partyIndex: Map<string, number>): Promise<TrendingLeader[]> {
  const candidates = await prisma.candidate.findMany({
    where: {
      OR: [
        { ratings: { some: { status: "VISIBLE" } } },
        { factChecks: { some: { status: "PUBLISHED" } } },
        { promises: { some: {} } },
        { office: { not: null } },
        { isIncumbent: true },
      ],
    },
    select: {
      id: true,
      slug: true,
      fullName: true,
      photoUrl: true,
      office: true,
      isIncumbent: true,
      partyId: true,
      party: { select: { name: true, shortName: true } },
      constituency: { select: { name: true, district: true } },
      ratings: { where: { status: "VISIBLE" }, select: { weightedScore: true } },
      promises: { select: { status: true } },
      _count: { select: { factChecks: true } },
    },
    take: 60,
  });

  return candidates
    .map((c) => {
      const ratingCount = c.ratings.length;
      const ratingAverage =
        ratingCount === 0 ? 0 : c.ratings.reduce((s, r) => s + r.weightedScore, 0) / ratingCount;
      const promiseDone = c.promises.filter((p) => p.status === "COMPLETED").length;
      const basis: TrendingLeader["basis"] =
        ratingCount > 0 ? "rated"
        : c._count.factChecks > 0 ? "factchecked"
        : c.office ? "office"
        : "incumbent";
      const score =
        ratingCount * 4 + c._count.factChecks * 3 + c.promises.length * 2 + (c.office ? 5 : 0) + (c.isIncumbent ? 2 : 0);
      return {
        id: c.id,
        slug: c.slug,
        fullName: c.fullName,
        photoUrl: c.photoUrl,
        office: c.office,
        party: c.party?.shortName ?? c.party?.name ?? null,
        partyIndex: c.partyId ? (partyIndex.get(c.partyId) ?? 0) : 0,
        constituency: c.constituency?.name ?? null,
        district: c.constituency?.district ?? null,
        ratingCount,
        ratingAverage: Math.round(ratingAverage * 10) / 10,
        promiseTotal: c.promises.length,
        promiseDone,
        factChecks: c._count.factChecks,
        basis,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName))
    .slice(0, 8);
}

async function getProvincePulse(): Promise<ProvincePulse[]> {
  const rows = await prisma.constituency.findMany({
    select: {
      province: true,
      district: true,
      level: true,
      registeredVoters: true,
      _count: { select: { candidates: true, issues: true, complaints: true } },
    },
  });

  const map = new Map<string, ProvincePulse & { districts: Map<string, number> }>();
  for (const row of rows) {
    const key = row.province;
    const entry =
      map.get(key) ??
      {
        province: key,
        federal: 0,
        provincial: 0,
        local: 0,
        candidates: 0,
        issues: 0,
        complaints: 0,
        voters: 0,
        topDistricts: [],
        districts: new Map<string, number>(),
      };
    if (row.level === "FEDERAL") {
      entry.federal += 1;
      entry.districts.set(row.district, (entry.districts.get(row.district) ?? 0) + 1);
    } else if (row.level === "PROVINCIAL") entry.provincial += 1;
    else entry.local += 1;
    entry.candidates += row._count.candidates;
    entry.issues += row._count.issues;
    entry.complaints += row._count.complaints;
    entry.voters += row.registeredVoters ?? 0;
    map.set(key, entry);
  }

  return [...map.values()]
    .map(({ districts, ...rest }) => ({
      ...rest,
      topDistricts: [...districts.entries()]
        .map(([district, seats]) => ({ district, seats }))
        .sort((a, b) => b.seats - a.seats || a.district.localeCompare(b.district))
        .slice(0, 4),
    }))
    .sort((a, b) => b.federal - a.federal);
}

async function getOpinion(): Promise<OpinionSummary> {
  const [ratings, polls, pollVotes] = await Promise.all([
    prisma.rating.findMany({
      where: { status: "VISIBLE" },
      select: {
        weightedScore: true,
        publicTrust: true,
        communication: true,
        localIssueFocus: true,
        policyClarity: true,
        responsiveness: true,
        overall: true,
      },
      take: 20_000,
    }),
    prisma.poll.findMany({
      where: { status: "OPEN" },
      take: 2,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        question: true,
        options: { orderBy: { order: "asc" }, select: { id: true, label: true, _count: { select: { votes: true } } } },
      },
    }),
    prisma.pollVote.count(),
  ]);

  const count = ratings.length;
  const average = count === 0 ? 0 : ratings.reduce((s, r) => s + r.weightedScore, 0) / count;

  // Ordered sentiment on a 1-5 scale, collapsed to the three bands a reader
  // actually acts on. Rendered as a diverging bar centred on neutral.
  const sentiment: SentimentSlice[] = [
    { key: "negative", label: "negative", count: ratings.filter((r) => r.weightedScore < 2.5).length },
    { key: "neutral", label: "neutral", count: ratings.filter((r) => r.weightedScore >= 2.5 && r.weightedScore < 3.5).length },
    { key: "positive", label: "positive", count: ratings.filter((r) => r.weightedScore >= 3.5).length },
  ];

  const dimensions = RATING_DIMENSIONS.map((d) => ({
    key: d.key,
    label: d.label,
    weight: d.weight,
    average:
      count === 0 ? 0 : Math.round((ratings.reduce((s, r) => s + r[d.key], 0) / count) * 10) / 10,
  }));

  return {
    totalRatings: count,
    totalVotes: pollVotes,
    average: Math.round(average * 10) / 10,
    dimensions,
    sentiment,
    polls: polls.map((p) => ({
      id: p.id,
      question: p.question,
      total: p.options.reduce((s, o) => s + o._count.votes, 0),
      options: p.options.map((o) => ({ id: o.id, label: o.label, count: o._count.votes })),
    })),
  };
}

const COMMITMENT_ORDER = ["COMPLETED", "IN_PROGRESS", "DELAYED", "NOT_STARTED", "CANCELLED", "UNABLE_TO_VERIFY"];

async function getCommitments(): Promise<CommitmentSummary> {
  const [grouped, total, withEvidence, recent] = await Promise.all([
    prisma.promise.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.promise.count(),
    prisma.promise.count({ where: { evidenceUrl: { not: null } } }),
    prisma.promise.findMany({
      orderBy: { lastUpdateAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        lastUpdateAt: true,
        candidate: { select: { fullName: true, slug: true } },
      },
    }),
  ]);

  const counts = new Map(grouped.map((g) => [g.status as string, g._count._all]));
  const completed = counts.get("COMPLETED") ?? 0;

  return {
    total,
    byStatus: COMMITMENT_ORDER.map((status) => ({ status, count: counts.get(status) ?? 0 })).filter(
      (row) => row.count > 0 || ["COMPLETED", "IN_PROGRESS", "DELAYED", "NOT_STARTED"].includes(row.status)
    ),
    completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
    withEvidence,
    recent: recent.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      candidate: p.candidate?.fullName ?? null,
      candidateSlug: p.candidate?.slug ?? null,
      updatedAt: p.lastUpdateAt,
    })),
  };
}

/** One merged, time-ordered stream of everything that changed recently. */
async function getRadar(): Promise<RadarItem[]> {
  const [news, factChecks, complaints, results, promiseUpdates] = await Promise.all([
    prisma.newsArticle.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 6,
      select: { id: true, slug: true, title: true, category: true, publishedAt: true },
    }),
    prisma.factCheck.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: { id: true, slug: true, claim: true, verdict: true, publishedAt: true, claimant: true },
    }),
    prisma.complaint.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, trackingId: true, title: true, status: true, district: true, updatedAt: true },
    }),
    prisma.historicalResult.findMany({
      orderBy: { bsYear: "desc" },
      take: 3,
      select: { id: true, winnerName: true, bsYear: true, margin: true, constituency: { select: { name: true, slug: true } } },
    }),
    prisma.promiseUpdate.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, status: true, createdAt: true, promise: { select: { title: true } } },
    }),
  ]);

  const items: Omit<RadarItem, "age">[] = [
    ...news.map((n) => ({
      id: `news-${n.id}`,
      kind: "news" as const,
      title: n.title,
      meta: n.category,
      href: `/news/${n.slug}`,
      at: n.publishedAt ?? new Date(0),
      tone: "info" as const,
    })),
    ...factChecks.map((f) => ({
      id: `fc-${f.id}`,
      kind: "factcheck" as const,
      title: f.claim,
      meta: f.claimant,
      href: `/fact-checks/${f.slug}`,
      at: f.publishedAt ?? new Date(0),
      tone: (f.verdict === "FALSE" || f.verdict === "MISLEADING" ? "bad" : f.verdict === "TRUE" || f.verdict === "MOSTLY_TRUE" ? "good" : "muted") as RadarItem["tone"],
    })),
    ...complaints.map((c) => ({
      id: `issue-${c.id}`,
      kind: "issue" as const,
      title: c.title,
      meta: c.district,
      href: `/track?id=${c.trackingId}`,
      at: c.updatedAt,
      tone: (c.status === "RESOLVED" || c.status === "CLOSED" ? "good" : "warn") as RadarItem["tone"],
    })),
    ...results.map((r) => ({
      id: `res-${r.id}`,
      kind: "result" as const,
      title: `${r.winnerName} — ${r.constituency.name}`,
      meta: `BS ${r.bsYear}`,
      href: `/constituency/${r.constituency.slug}`,
      at: new Date(0),
      tone: "purple" as const,
    })),
    ...promiseUpdates.map((u) => ({
      id: `pu-${u.id}`,
      kind: "promise" as const,
      title: u.promise.title,
      meta: null,
      href: "/promises",
      at: u.createdAt,
      tone: "info" as const,
    })),
  ];

  const RECENT_WINDOW_DAYS = 90;
  const cutoff = Date.now() - RECENT_WINDOW_DAYS * 86_400_000;

  return items
    .map((item) => ({
      ...item,
      age: (item.at.getTime() > cutoff ? "recent" : "historical") as RadarItem["age"],
    }))
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10);
}
