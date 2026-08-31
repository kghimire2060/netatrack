import { prisma } from "./db";
import type { PromiseStatus, VerificationTier } from "@prisma/client";

/**
 * The candidate profile data layer.
 *
 * Same contract as src/lib/elections.ts: one place decides what a profile
 * contains, so the page renders and never computes. Two rules matter most.
 *
 *  1. Nothing is inferred. Rank and winning margin are *derived* from recorded
 *     vote counts, which is arithmetic on real data; every other figure is
 *     read from a row or reported absent. A field with no value is "not
 *     recorded", never a zero, an average, or a placeholder.
 *  2. Absence is data. Most profiles legitimately hold only a name, a party
 *     and a seat, so `availability` reports exactly which sections have
 *     something behind them and the UI states that plainly.
 */

// --------------------------------------------------------------- field trust

/**
 * A profile field is treated as verified when a source row cites it by name.
 * `CandidateSource.field` already carries that mapping, so education and the
 * other free-text fields inherit provenance without a new table.
 */
export type FieldTrust = { verified: boolean; sources: { label: string; url: string | null }[] };

function fieldTrust(
  sources: { field: string | null; label: string; url: string | null }[],
  field: string
): FieldTrust {
  const matched = sources.filter(
    (s) => s.field != null && s.field.toLowerCase().split(/[+,\s]+/).includes(field.toLowerCase())
  );
  return { verified: matched.length > 0, sources: matched.map((s) => ({ label: s.label, url: s.url })) };
}

// ------------------------------------------------------------ promise buckets

export type PromiseSummary = {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  /** Recorded but not confirmable either way. */
  unknown: number;
  /** Surfaced separately rather than folded into another bucket. */
  delayed: number;
  cancelled: number;
  /** Share completed, or null when there is nothing to divide by. */
  completionPct: number | null;
};

export function summarizePromises(statuses: PromiseStatus[]): PromiseSummary {
  const count = (s: PromiseStatus) => statuses.filter((x) => x === s).length;
  const total = statuses.length;
  const completed = count("COMPLETED");
  return {
    total,
    completed,
    inProgress: count("IN_PROGRESS"),
    notStarted: count("NOT_STARTED"),
    unknown: count("UNABLE_TO_VERIFY"),
    delayed: count("DELAYED"),
    cancelled: count("CANCELLED"),
    completionPct: total === 0 ? null : (completed / total) * 100,
  };
}

// ----------------------------------------------------------- election history

export type ElectionEntry = {
  key: string;
  electionName: string;
  electionSlug: string;
  electionYear: number;
  bsYear: number | null;
  constituencyName: string | null;
  constituencySlug: string | null;
  partyName: string | null;
  /** Null when no verified result has been published for this contest. */
  votes: number | null;
  voteShare: number | null;
  /** Position among candidates with a recorded result in the same contest. */
  rank: number | null;
  /** How many candidates that rank is out of. */
  contested: number | null;
  isWinner: boolean | null;
  /**
   * Votes ahead of the runner-up for a winner, or behind the winner for a
   * loser. Null unless at least two results are recorded for the contest.
   */
  margin: number | null;
  nominationStatus: string | null;
  tier: VerificationTier | null;
  sourceName: string | null;
  sourceUrl: string | null;
};

// ------------------------------------------------------------------- profile

export async function getCandidateProfile(slug: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { slug },
    include: {
      party: true,
      constituency: true,
      sources: { orderBy: { createdAt: "desc" } },
      documents: { where: { isPublic: true } },
      promises: { orderBy: { lastUpdateAt: "desc" } },
      performance: { orderBy: { periodLabel: "desc" } },
      factChecks: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 5,
        select: { slug: true, claim: true, verdict: true, publishedAt: true },
      },
      newsArticles: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 6,
        select: { slug: true, title: true, excerpt: true, publishedAt: true, category: true },
      },
      candidacies: {
        include: { election: true, constituency: true, party: true },
        orderBy: { election: { year: "desc" } },
      },
      results: {
        where: { status: "VERIFIED" },
        include: { election: true, constituency: true, party: true },
        orderBy: { election: { year: "desc" } },
      },
      ratings: {
        where: { status: "VISIBLE" },
        select: {
          publicTrust: true, communication: true, localIssueFocus: true,
          policyClarity: true, responsiveness: true, overall: true,
          weightedScore: true, updatedAt: true, comment: true, userId: true,
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!candidate) return null;

  const history = await buildHistory(candidate);
  const promises = summarizePromises(candidate.promises.map((p) => p.status));

  // Which sections actually have something behind them. Drives the honest
  // "not recorded yet" treatment instead of rendering hollow zeroed panels.
  const availability = {
    photo: Boolean(candidate.photoUrl),
    biography: Boolean(candidate.biography),
    education: Boolean(candidate.education),
    experience: Boolean(candidate.experience || candidate.previousPositions),
    office: Boolean(candidate.office),
    seat: Boolean(candidate.constituency || candidate.prGroup),
    history: history.length > 0,
    performance: candidate.performance.length > 0,
    promises: candidate.promises.length > 0,
    news: candidate.newsArticles.length > 0 || candidate.factChecks.length > 0,
    ratings: candidate.ratings.length > 0,
    sources: candidate.sources.length > 0,
  };
  const known = Object.values(availability).filter(Boolean).length;

  const trust = {
    education: fieldTrust(candidate.sources, "education"),
    party: fieldTrust(candidate.sources, "party"),
    constituency: fieldTrust(candidate.sources, "constituency"),
    profile: fieldTrust(candidate.sources, "profile"),
  };

  // The most recent change across the records this page renders, so the
  // timestamp reflects the profile rather than just the candidate row.
  const stamps: Date[] = [
    candidate.updatedAt,
    ...candidate.results.map((r) => r.updatedAt),
    ...candidate.promises.map((p) => p.lastUpdateAt),
    ...candidate.sources.map((s) => s.createdAt),
  ];
  const lastUpdated = new Date(Math.max(...stamps.map((d) => d.getTime())));

  return {
    ...candidate,
    history,
    promiseSummary: promises,
    availability,
    completeness: { known, of: Object.keys(availability).length },
    trust,
    lastUpdated,
  };
}

export type CandidateProfile = NonNullable<Awaited<ReturnType<typeof getCandidateProfile>>>;

/**
 * Merge candidacies and results into one timeline.
 *
 * Rank and margin need every candidate's votes in the same contest, not just
 * this one, so the contests are re-read in a single grouped query rather than
 * guessed from the profile's own rows.
 */
async function buildHistory(candidate: {
  id: string;
  candidacies: {
    id: string; electionId: string; constituencyId: string; nominationStatus: string;
    election: { name: string; slug: string; year: number; bsYear: number | null };
    constituency: { name: string; slug: string };
    party: { name: string } | null;
  }[];
  results: {
    electionId: string; constituencyId: string; votes: number; voteShare: number | null;
    isWinner: boolean; tier: VerificationTier; sourceName: string | null; sourceUrl: string | null;
    election: { name: string; slug: string; year: number; bsYear: number | null };
    constituency: { name: string; slug: string };
    party: { name: string } | null;
  }[];
}): Promise<ElectionEntry[]> {
  const contests = new Set<string>();
  for (const r of candidate.results) contests.add(`${r.electionId}::${r.constituencyId}`);

  // All verified results for each contest this candidate has a result in.
  const peers = new Map<string, { candidateId: string; votes: number }[]>();
  if (contests.size > 0) {
    const rows = await prisma.result.findMany({
      where: {
        status: "VERIFIED",
        OR: [...contests].map((k) => {
          const [electionId, constituencyId] = k.split("::");
          return { electionId, constituencyId };
        }),
      },
      select: { electionId: true, constituencyId: true, candidateId: true, votes: true },
      orderBy: { votes: "desc" },
    });
    for (const row of rows) {
      const key = `${row.electionId}::${row.constituencyId}`;
      peers.set(key, [...(peers.get(key) ?? []), { candidateId: row.candidateId, votes: row.votes }]);
    }
  }

  const entries = new Map<string, ElectionEntry>();

  for (const c of candidate.candidacies) {
    entries.set(`${c.electionId}::${c.constituencyId}`, {
      key: c.id,
      electionName: c.election.name,
      electionSlug: c.election.slug,
      electionYear: c.election.year,
      bsYear: c.election.bsYear,
      constituencyName: c.constituency.name,
      constituencySlug: c.constituency.slug,
      partyName: c.party?.name ?? null,
      votes: null, voteShare: null, rank: null, contested: null,
      isWinner: null, margin: null,
      nominationStatus: c.nominationStatus,
      tier: null, sourceName: null, sourceUrl: null,
    });
  }

  for (const r of candidate.results) {
    const key = `${r.electionId}::${r.constituencyId}`;
    const field = peers.get(key) ?? [];
    const sorted = [...field].sort((a, b) => b.votes - a.votes);
    const index = sorted.findIndex((x) => x.candidateId === candidate.id);

    // A margin needs a second candidate to measure against.
    let margin: number | null = null;
    if (sorted.length >= 2 && index !== -1) {
      margin = index === 0 ? sorted[0].votes - sorted[1].votes : sorted[0].votes - sorted[index].votes;
    }

    const base = entries.get(key);
    entries.set(key, {
      key: base?.key ?? key,
      electionName: r.election.name,
      electionSlug: r.election.slug,
      electionYear: r.election.year,
      bsYear: r.election.bsYear,
      constituencyName: r.constituency.name,
      constituencySlug: r.constituency.slug,
      partyName: r.party?.name ?? base?.partyName ?? null,
      votes: r.votes,
      voteShare: r.voteShare,
      rank: index === -1 ? null : index + 1,
      contested: sorted.length > 0 ? sorted.length : null,
      isWinner: r.isWinner,
      margin,
      nominationStatus: base?.nominationStatus ?? null,
      tier: r.tier,
      sourceName: r.sourceName,
      sourceUrl: r.sourceUrl,
    });
  }

  return [...entries.values()].sort((a, b) => b.electionYear - a.electionYear);
}
