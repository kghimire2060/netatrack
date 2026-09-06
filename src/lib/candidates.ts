import { prisma } from "./db";
import type { ElectedPost, ProjectStatus, PromiseStatus, VerificationTier } from "@prisma/client";
import { computeAccountabilityScore } from "./accountability";

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

// ------------------------------------------------------------ project buckets

export type ProjectSummary = {
  total: number;
  completed: number;
  inProgress: number;
  approved: number;
  proposed: number;
  stalled: number;
  cancelled: number;
  /** Recorded, but the implementing body publishes nothing checkable. */
  unknown: number;
  /** Share completed, or null when there is nothing to divide by. */
  completionPct: number | null;
  /** Sums in NPR across projects that publish a figure; null when none do. */
  budgetNpr: number | null;
  spentNpr: number | null;
  /**
   * How many projects each sum covers.
   *
   * These routinely differ — an allocation is published long before any
   * expenditure is — and without them a reader would divide one total by the
   * other and get an execution rate computed over two different sets of
   * projects. The UI states both counts rather than inviting that division.
   */
  budgetCount: number;
  spentCount: number;
};

export function summarizeProjects(
  rows: { status: ProjectStatus; budgetNpr: number | null; spentNpr: number | null }[]
): ProjectSummary {
  const count = (s: ProjectStatus) => rows.filter((x) => x.status === s).length;
  const total = rows.length;
  const completed = count("COMPLETED");

  // Summed only over rows that publish a figure. A project with no published
  // budget contributes nothing rather than a zero, and if none publish one the
  // total is null so the UI says "not recorded" instead of "NPR 0".
  const sum = (pick: (r: (typeof rows)[number]) => number | null) => {
    const values = rows.map(pick).filter((v): v is number => v !== null);
    return {
      total: values.length === 0 ? null : values.reduce((a, b) => a + b, 0),
      count: values.length,
    };
  };
  const budget = sum((r) => r.budgetNpr);
  const spent = sum((r) => r.spentNpr);

  return {
    total,
    completed,
    inProgress: count("IN_PROGRESS"),
    approved: count("APPROVED"),
    proposed: count("PROPOSED"),
    stalled: count("STALLED"),
    cancelled: count("CANCELLED"),
    unknown: count("UNABLE_TO_VERIFY"),
    completionPct: total === 0 ? null : (completed / total) * 100,
    budgetNpr: budget.total,
    spentNpr: spent.total,
    budgetCount: budget.count,
    spentCount: spent.count,
  };
}

// ------------------------------------------------------------------------ age

/**
 * Whole years elapsed, or null with no recorded date of birth.
 *
 * Computed rather than stored so it never goes stale, and computed from the
 * calendar rather than by dividing milliseconds, which drifts across leap
 * years and can report a birthday a day early.
 */
/**
 * What the profile can honestly say about a politician's age.
 *
 * Two different facts, kept apart because they are not interchangeable:
 *
 *  - `CURRENT` — derived from a recorded date of birth. Valid today.
 *  - `AT_ELECTION` — the age the Election Commission published for a given
 *    election. The ECN's result tables print उमेर (age), not a birth date, so
 *    for most real records this is all that exists.
 *
 * The second is never silently rendered as the first. An age of 45 published
 * in 2079 BS does not make someone 45 today, and it cannot be converted into a
 * birth date either: an age in whole years pins a birthday only to within a
 * twelve-month window, so back-computing one would invent a fact the authority
 * never published.
 */
export type AgeFact =
  | { kind: "CURRENT"; years: number; dateOfBirth: Date }
  | { kind: "AT_ELECTION"; years: number; electionName: string; electionYear: number; bsYear: number | null };

export function ageFrom(dateOfBirth: Date | null, now = new Date()): number | null {
  if (!dateOfBirth) return null;
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = now.getMonth() - dateOfBirth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dateOfBirth.getDate())) age -= 1;
  return age < 0 || age > 120 ? null : age;
}

// ----------------------------------------------------------- election history

/** The columns that identify one race, used as a Prisma OR filter. */
type ContestFilter = {
  electionId: string;
  constituencyId: string;
  post: ElectedPost | null;
  wardNumber: number | null;
};

export type ElectionEntry = {
  key: string;
  /** The post contested, as the Election Commission reports it. */
  post: ElectedPost | null;
  wardNumber: number | null;
  /** Age in whole years as published for this election; never derived. */
  ageAtElection: number | null;
  symbol: string | null;
  /** कैफियत — the authority's own remark on the result row. */
  remark: string | null;
  electionName: string;
  electionSlug: string;
  electionYear: number;
  bsYear: number | null;
  constituencyName: string | null;
  /// Devanagari name as the Commission publishes it, for the Nepali UI.
  constituencyNameNe: string | null;
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
      statements: {
        where: { status: "PUBLISHED" },
        orderBy: [{ statedAt: "desc" }, { createdAt: "desc" }],
        take: 20,
        include: {
          factCheck: {
            select: { slug: true, verdict: true, status: true },
          },
        },
      },
      media: {
        where: { status: "PUBLISHED" },
        orderBy: [{ position: "asc" }, { capturedAt: "desc" }],
        take: 24,
      },
      projects: {
        orderBy: [{ lastUpdateAt: "desc" }],
        include: {
          constituency: { select: { name: true, slug: true, district: true } },
          promise: { select: { id: true, title: true } },
          media: {
            where: { status: "PUBLISHED" },
            orderBy: [{ position: "asc" }, { capturedAt: "desc" }],
            take: 4,
          },
        },
      },
      /**
       * Citizen issues routed to this representative.
       *
       * Columns are listed explicitly rather than spread, for the same reason
       * as src/app/api/complaints/[trackingId]/route.ts: `internalNotes` and
       * the reporter's identity must never reach a public page, and a spread
       * would leak them the moment a column is added to the model.
       */
      complaints: {
        where: { status: { notIn: ["SUBMITTED", "UNDER_REVIEW"] } },
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: {
          trackingId: true,
          title: true,
          category: true,
          status: true,
          priority: true,
          publicResponse: true,
          createdAt: true,
          updatedAt: true,
          resolvedAt: true,
        },
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

  // Prisma returns Decimal for money columns. Converted once here so the page
  // never has to know, and so a null budget stays null rather than becoming 0.
  const projects = candidate.projects.map((project) => ({
    ...project,
    budgetNpr: project.budgetNpr === null ? null : project.budgetNpr.toNumber(),
    spentNpr: project.spentNpr === null ? null : project.spentNpr.toNumber(),
  }));
  const projectSummary = summarizeProjects(projects);

  const age = ageFrom(candidate.dateOfBirth);

  // Prefer a recorded birth date; fall back to the most recent published age,
  // labelled with the election it was published for.
  const publishedAge = [...candidate.candidacies]
    .filter((c) => c.ageAtElection !== null)
    .sort((a, b) => b.election.year - a.election.year)[0];

  const ageFact: AgeFact | null =
    age !== null && candidate.dateOfBirth !== null
      ? { kind: "CURRENT", years: age, dateOfBirth: candidate.dateOfBirth }
      : publishedAge
        ? {
            kind: "AT_ELECTION",
            years: publishedAge.ageAtElection as number,
            electionName: publishedAge.election.name,
            electionYear: publishedAge.election.year,
            bsYear: publishedAge.election.bsYear,
          }
        : null;

  // Official records only — public ratings are deliberately not an input.
  // See src/lib/accountability.ts for why.
  const score = computeAccountabilityScore({
    promiseStatuses: candidate.promises.map((p) => p.status),
    projectStatuses: projects.map((p) => p.status),
    performance: candidate.performance.map((r) => ({ attendancePct: r.attendancePct })),
    factCheckVerdicts: candidate.factChecks.map((f) => f.verdict),
  });

  // Which sections actually have something behind them. Drives the honest
  // "not recorded yet" treatment instead of rendering hollow zeroed panels.
  const availability = {
    photo: Boolean(candidate.photoUrl),
    biography: Boolean(candidate.biography),
    education: Boolean(candidate.education),
    experience: Boolean(candidate.experience || candidate.previousPositions),
    office: Boolean(candidate.office),
    seat: Boolean(candidate.constituency || candidate.prGroup),
    dateOfBirth: ageFact !== null,
    history: history.length > 0,
    performance: candidate.performance.length > 0,
    promises: candidate.promises.length > 0,
    projects: projects.length > 0,
    statements: candidate.statements.length > 0,
    media: candidate.media.length > 0,
    complaints: candidate.complaints.length > 0,
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
    ...projects.map((p) => p.lastUpdateAt),
    ...candidate.statements.map((s) => s.updatedAt),
    ...candidate.sources.map((s) => s.createdAt),
  ];
  const lastUpdated = new Date(Math.max(...stamps.map((d) => d.getTime())));

  return {
    ...candidate,
    projects,
    history,
    promiseSummary: promises,
    projectSummary,
    age,
    ageFact,
    score,
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
    post: ElectedPost | null; wardNumber: number | null;
    ageAtElection: number | null; symbol: string | null;
    election: { name: string; slug: string; year: number; bsYear: number | null };
    constituency: { name: string; slug: string; nameNe: string | null };
    party: { name: string } | null;
  }[];
  results: {
    electionId: string; constituencyId: string; votes: number; voteShare: number | null;
    post: ElectedPost | null; wardNumber: number | null; remark: string | null;
    isWinner: boolean; tier: VerificationTier; sourceName: string | null; sourceUrl: string | null;
    election: { name: string; slug: string; year: number; bsYear: number | null };
    constituency: { name: string; slug: string; nameNe: string | null };
    party: { name: string } | null;
  }[];
}): Promise<ElectionEntry[]> {
  /**
   * A contest is one race, not one place.
   *
   * The Election Commission reports a local body's results per post: a
   * municipality runs a mayoral race and a separate race in every ward on the
   * same day. Keying a contest on (election, constituency) alone would pool
   * all of them, and this candidate's rank would be computed against hundreds
   * of people who never stood against them — "7th of 340" for a ward member.
   * Post and ward are therefore part of the key.
   */
  const contestKey = (r: {
    electionId: string;
    constituencyId: string;
    post: ElectedPost | null;
    wardNumber: number | null;
  }) => `${r.electionId}::${r.constituencyId}::${r.post ?? ""}::${r.wardNumber ?? ""}`;

  const contests = new Map<string, ContestFilter>();
  for (const r of candidate.results) {
    contests.set(contestKey(r), {
      electionId: r.electionId,
      constituencyId: r.constituencyId,
      post: r.post,
      wardNumber: r.wardNumber,
    });
  }

  // All verified results for each contest this candidate has a result in.
  const peers = new Map<string, { candidateId: string; votes: number }[]>();
  if (contests.size > 0) {
    const rows = await prisma.result.findMany({
      where: { status: "VERIFIED", OR: [...contests.values()] },
      select: {
        electionId: true, constituencyId: true, post: true, wardNumber: true,
        candidateId: true, votes: true,
      },
      orderBy: { votes: "desc" },
    });
    for (const row of rows) {
      const key = contestKey(row);
      peers.set(key, [...(peers.get(key) ?? []), { candidateId: row.candidateId, votes: row.votes }]);
    }
  }

  const entries = new Map<string, ElectionEntry>();

  for (const c of candidate.candidacies) {
    entries.set(contestKey(c), {
      key: c.id,
      electionName: c.election.name,
      electionSlug: c.election.slug,
      electionYear: c.election.year,
      bsYear: c.election.bsYear,
      constituencyName: c.constituency.name,
      constituencyNameNe: c.constituency.nameNe,
      constituencySlug: c.constituency.slug,
      partyName: c.party?.name ?? null,
      post: c.post,
      wardNumber: c.wardNumber,
      ageAtElection: c.ageAtElection,
      symbol: c.symbol,
      remark: null,
      votes: null, voteShare: null, rank: null, contested: null,
      isWinner: null, margin: null,
      nominationStatus: c.nominationStatus,
      tier: null, sourceName: null, sourceUrl: null,
    });
  }

  for (const r of candidate.results) {
    const key = contestKey(r);
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
      constituencyNameNe: r.constituency.nameNe,
      constituencySlug: r.constituency.slug,
      partyName: r.party?.name ?? base?.partyName ?? null,
      // Post and ward come from the result row; the age and symbol are
      // properties of standing, so they carry over from the candidacy.
      post: r.post ?? base?.post ?? null,
      wardNumber: r.wardNumber ?? base?.wardNumber ?? null,
      ageAtElection: base?.ageAtElection ?? null,
      symbol: base?.symbol ?? null,
      remark: r.remark,
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
