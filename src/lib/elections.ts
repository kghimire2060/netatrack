import { prisma } from "./db";
import type {
  Election,
  ElectionStatus,
  SourceType,
  VerificationTier,
} from "@prisma/client";

/**
 * The single source of election facts for the whole application.
 *
 * No component may hardcode an election name, year, date or status. Everything
 * election-shaped is read through this module, so adding the next election is
 * a row in the database rather than a code change.
 *
 * Two rules the rest of the app depends on:
 *
 *  1. Nothing UNVERIFIED or ARCHIVED is ever returned as *current*. It can be
 *     listed, clearly labelled, but it cannot become the headline.
 *  2. A date that has not been published stays null. It is never derived from
 *     a Bikram Sambat string, and no caller should substitute a guess.
 */

// ---------------------------------------------------------------- selection

/**
 * Statuses that can represent "what is happening now", best first. An election
 * being counted outranks one merely scheduled, and a completed one is only the
 * headline when nothing is live.
 */
const CURRENT_PRIORITY: ElectionStatus[] = ["LIVE", "COUNTING", "UPCOMING", "COMPLETED"];

/** Tiers we are willing to present as fact. */
const PRESENTABLE: VerificationTier[] = ["OFFICIAL", "NETATRACK"];

export type ElectionSummary = Election & {
  /** Counts from our own tables, so a gap against the official figure shows. */
  recorded: { constituencies: number; candidates: number; results: number };
  /** Milestones with a published date, soonest first. */
  milestones: {
    id: string;
    title: string;
    detail: string | null;
    bsDate: string | null;
    startsAt: Date | null;
    sourceName: string | null;
    sourceUrl: string | null;
  }[];
  citations: {
    id: string;
    sourceName: string;
    sourceUrl: string | null;
    sourceType: SourceType;
    tier: VerificationTier;
    verifiedAt: Date | null;
    note: string | null;
  }[];
};

/**
 * The election the homepage should lead with, chosen from status and date
 * rather than a hardcoded slug.
 *
 * Returns null when nothing qualifies — an empty state is correct, and far
 * better than promoting an unverified record to fill the space.
 */
export async function getCurrentElection(): Promise<ElectionSummary | null> {
  const candidates = await prisma.election.findMany({
    where: { tier: { in: PRESENTABLE }, status: { notIn: ["ARCHIVED", "CANCELLED"] } },
    orderBy: [{ electionDate: "desc" }],
  });
  if (candidates.length === 0) return null;

  const now = Date.now();
  const ranked = [...candidates].sort((a, b) => {
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus !== 0) return byStatus;
    // Within a status, the one nearest to today wins: the next election if it
    // is ahead of us, the most recent if it is behind.
    const da = a.electionDate ? Math.abs(a.electionDate.getTime() - now) : Number.MAX_SAFE_INTEGER;
    const dbb = b.electionDate ? Math.abs(b.electionDate.getTime() - now) : Number.MAX_SAFE_INTEGER;
    return da - dbb;
  });

  return decorate(ranked[0]);
}

function statusRank(status: ElectionStatus): number {
  const i = CURRENT_PRIORITY.indexOf(status);
  return i === -1 ? CURRENT_PRIORITY.length : i;
}

export async function getElectionBySlug(slug: string): Promise<ElectionSummary | null> {
  const election = await prisma.election.findUnique({ where: { slug } });
  return election ? decorate(election) : null;
}

/**
 * All elections, newest first. Unverified and archived records are included —
 * hiding them would lose the audit trail — but they carry their tier so the UI
 * can label them rather than present them as current.
 */
export async function listElections(options: { presentableOnly?: boolean } = {}) {
  return prisma.election.findMany({
    where: options.presentableOnly ? { tier: { in: PRESENTABLE } } : undefined,
    orderBy: [{ electionDate: "desc" }, { year: "desc" }],
    include: { _count: { select: { candidacies: true, results: true, events: true } } },
  });
}

async function decorate(election: Election): Promise<ElectionSummary> {
  const [constituencies, candidates, results, events, citations] = await Promise.all([
    // Constituencies are not owned by an election, so the meaningful count is
    // the seats at that election's level.
    prisma.constituency.count({ where: { level: election.level } }),
    prisma.candidate.count({ where: { level: election.level } }),
    prisma.result.count({ where: { electionId: election.id } }),
    prisma.electionEvent.findMany({
      where: { electionId: election.id },
      orderBy: [{ startsAt: "asc" }],
      select: {
        id: true, title: true, detail: true, bsDate: true,
        startsAt: true, sourceName: true, sourceUrl: true,
      },
    }),
    prisma.dataSource.findMany({
      where: { entityType: "Election", entityId: election.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, sourceName: true, sourceUrl: true,
        sourceType: true, tier: true, verifiedAt: true, note: true,
      },
    }),
  ]);

  return { ...election, recorded: { constituencies, candidates, results }, milestones: events, citations };
}

/**
 * Official figures beside what our own tables actually hold.
 *
 * The two are reported separately on purpose. When the authority published a
 * figure we did not fully ingest, the gap is visible instead of being papered
 * over by showing only whichever number is larger. A null `official` means the
 * authority's figure was not sourced — not that it is zero.
 */
export type ElectionStat = {
  key: "constituencies" | "candidates" | "results" | "voters";
  official: number | null;
  recorded: number | null;
  /** True when both numbers are known and disagree. */
  gap: boolean;
};

export async function getElectionStats(election: ElectionSummary): Promise<ElectionStat[]> {
  const rows: ElectionStat[] = [
    { key: "constituencies", official: election.officialConstituencies, recorded: election.recorded.constituencies, gap: false },
    { key: "candidates", official: election.officialCandidates, recorded: election.recorded.candidates, gap: false },
    { key: "results", official: null, recorded: election.recorded.results, gap: false },
    // We never count voters ourselves, so there is nothing to compare against.
    { key: "voters", official: election.officialVoters, recorded: null, gap: false },
  ];
  for (const r of rows) {
    r.gap = r.official !== null && r.recorded !== null && r.official !== r.recorded;
  }
  return rows;
}

// ------------------------------------------------------------- trust helpers

export type TrustLabel = "official" | "netatrack" | "unverified" | "disputed";

export function trustLabel(tier: VerificationTier): TrustLabel {
  switch (tier) {
    case "OFFICIAL": return "official";
    case "NETATRACK": return "netatrack";
    case "DISPUTED": return "disputed";
    default: return "unverified";
  }
}

/** True when a record is solid enough to be stated as fact in the UI. */
export function isPresentable(tier: VerificationTier): boolean {
  return PRESENTABLE.includes(tier);
}

/**
 * When the underlying data last changed, across the tables the election view
 * reads. Computed from row timestamps — never a "live" label with no basis.
 */
export async function getElectionDataFreshness(): Promise<Date | null> {
  const [election, result, candidate] = await Promise.all([
    prisma.election.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.result.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.candidate.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);
  const stamps = [election?.updatedAt, result?.updatedAt, candidate?.updatedAt].filter(
    (d): d is Date => Boolean(d)
  );
  return stamps.length ? new Date(Math.max(...stamps.map((d) => d.getTime()))) : null;
}

/** Attach a citation to any record. Used by the import and admin paths. */
export async function citeSource(input: {
  entityType: "Election" | "Result" | "Party" | "Constituency" | "Candidate";
  entityId: string;
  sourceName: string;
  sourceUrl?: string | null;
  sourceType?: SourceType;
  tier?: VerificationTier;
  field?: string | null;
  note?: string | null;
  verifiedAt?: Date | null;
}) {
  return prisma.dataSource.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      field: input.field ?? null,
      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl ?? null,
      sourceType: input.sourceType ?? "OTHER",
      tier: input.tier ?? "UNVERIFIED",
      verifiedAt: input.verifiedAt ?? null,
      note: input.note ?? null,
    },
  });
}
