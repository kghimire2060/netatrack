import { prisma } from "./db";

/**
 * Researcher datasets (section 14).
 *
 * Every dataset here is aggregated or de-identified by construction: no email
 * addresses, no reporter identities, no free-text citizen contact details, no
 * authentication material. Export permission is separate from view permission
 * and every export is written to ExportLog.
 */

export type DatasetKey =
  | "election_results"
  | "candidate_ratings"
  | "issue_categories"
  | "issue_response_times"
  | "promise_progress"
  | "constituency_profile";

export const DATASETS: Record<
  DatasetKey,
  { label: string; description: string; grain: string }
> = {
  election_results: {
    label: "Official election results",
    description: "Verified results by election, constituency, candidate and party.",
    grain: "one row per candidate per constituency per election",
  },
  candidate_ratings: {
    label: "Candidate rating aggregates",
    description:
      "Rating counts and dimension averages per candidate. Individual raters are never included.",
    grain: "one row per candidate",
  },
  issue_categories: {
    label: "Citizen issue volumes",
    description: "Issue counts by category, district and status. No citizen identifiers.",
    grain: "one row per category per district per status",
  },
  issue_response_times: {
    label: "Issue response performance",
    description: "Median and mean hours from submission to first verification and to resolution.",
    grain: "one row per category",
  },
  promise_progress: {
    label: "Manifesto promise progress",
    description: "Promise status distribution by candidate and category.",
    grain: "one row per promise",
  },
  constituency_profile: {
    label: "Constituency profile",
    description: "Registered voters, candidate counts, polling stations and issue volumes.",
    grain: "one row per constituency",
  },
};

export async function runDataset(key: DatasetKey): Promise<Record<string, unknown>[]> {
  switch (key) {
    case "election_results": {
      const rows = await prisma.result.findMany({
        where: { status: "VERIFIED" },
        select: {
          votes: true,
          voteShare: true,
          isWinner: true,
          turnoutPct: true,
          sourceName: true,
          publishedAt: true,
          election: { select: { name: true, year: true, type: true } },
          constituency: { select: { name: true, district: true, province: true } },
          candidate: { select: { fullName: true } },
          party: { select: { name: true } },
        },
        orderBy: [{ election: { year: "desc" } }, { votes: "desc" }],
        take: 20_000,
      });
      return rows.map((row) => ({
        election: row.election.name,
        year: row.election.year,
        electionType: row.election.type,
        province: row.constituency.province,
        district: row.constituency.district,
        constituency: row.constituency.name,
        candidate: row.candidate.fullName,
        party: row.party?.name ?? "",
        votes: row.votes,
        voteSharePct: row.voteShare ?? "",
        turnoutPct: row.turnoutPct ?? "",
        isWinner: row.isWinner,
        source: row.sourceName ?? "",
        publishedAt: row.publishedAt?.toISOString() ?? "",
      }));
    }

    case "candidate_ratings": {
      const candidates = await prisma.candidate.findMany({
        select: {
          fullName: true,
          party: { select: { name: true } },
          constituency: { select: { name: true, district: true } },
          ratings: {
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
          },
        },
        take: 20_000,
      });
      return candidates
        .filter((candidate) => candidate.ratings.length > 0)
        .map((candidate) => {
          const count = candidate.ratings.length;
          const mean = (pick: (r: (typeof candidate.ratings)[number]) => number) =>
            Math.round((candidate.ratings.reduce((sum, r) => sum + pick(r), 0) / count) * 100) / 100;
          return {
            candidate: candidate.fullName,
            party: candidate.party?.name ?? "",
            constituency: candidate.constituency?.name ?? "",
            district: candidate.constituency?.district ?? "",
            ratingCount: count,
            weightedAverage: mean((r) => r.weightedScore),
            publicTrust: mean((r) => r.publicTrust),
            communication: mean((r) => r.communication),
            localIssueFocus: mean((r) => r.localIssueFocus),
            policyClarity: mean((r) => r.policyClarity),
            responsiveness: mean((r) => r.responsiveness),
            overall: mean((r) => r.overall),
          };
        });
    }

    case "issue_categories": {
      const grouped = await prisma.complaint.groupBy({
        by: ["category", "district", "status"],
        _count: { _all: true },
      });
      return grouped.map((row) => ({
        category: row.category,
        district: row.district ?? "",
        status: row.status,
        issues: row._count._all,
      }));
    }

    case "issue_response_times": {
      const complaints = await prisma.complaint.findMany({
        select: { category: true, createdAt: true, verifiedAt: true, resolvedAt: true },
        take: 50_000,
      });
      const byCategory = new Map<string, { verify: number[]; resolve: number[]; total: number }>();
      for (const complaint of complaints) {
        const bucket = byCategory.get(complaint.category) ?? { verify: [], resolve: [], total: 0 };
        bucket.total += 1;
        if (complaint.verifiedAt) {
          bucket.verify.push(hours(complaint.createdAt, complaint.verifiedAt));
        }
        if (complaint.resolvedAt) {
          bucket.resolve.push(hours(complaint.createdAt, complaint.resolvedAt));
        }
        byCategory.set(complaint.category, bucket);
      }
      return [...byCategory.entries()].map(([category, bucket]) => ({
        category,
        issues: bucket.total,
        verified: bucket.verify.length,
        resolved: bucket.resolve.length,
        meanHoursToVerify: mean(bucket.verify),
        medianHoursToVerify: median(bucket.verify),
        meanHoursToResolve: mean(bucket.resolve),
        medianHoursToResolve: median(bucket.resolve),
      }));
    }

    case "promise_progress": {
      const promises = await prisma.promise.findMany({
        select: {
          title: true,
          category: true,
          status: true,
          lastUpdateAt: true,
          evidenceUrl: true,
          candidate: { select: { fullName: true, party: { select: { name: true } } } },
          constituency: { select: { name: true, district: true } },
        },
        take: 20_000,
      });
      return promises.map((promise) => ({
        promise: promise.title,
        category: promise.category ?? "",
        status: promise.status,
        candidate: promise.candidate?.fullName ?? "",
        party: promise.candidate?.party?.name ?? "",
        constituency: promise.constituency?.name ?? "",
        district: promise.constituency?.district ?? "",
        hasEvidence: Boolean(promise.evidenceUrl),
        lastUpdate: promise.lastUpdateAt.toISOString(),
      }));
    }

    case "constituency_profile": {
      const constituencies = await prisma.constituency.findMany({
        select: {
          name: true,
          district: true,
          province: true,
          registeredVoters: true,
          _count: { select: { candidates: true, pollingStations: true, complaints: true } },
        },
        orderBy: [{ province: "asc" }, { district: "asc" }],
      });
      return constituencies.map((constituency) => ({
        province: constituency.province,
        district: constituency.district,
        constituency: constituency.name,
        registeredVoters: constituency.registeredVoters ?? "",
        candidates: constituency._count.candidates,
        pollingStations: constituency._count.pollingStations,
        citizenIssues: constituency._count.complaints,
      }));
    }
  }
}

function hours(from: Date, to: Date) {
  return Math.round(((to.getTime() - from.getTime()) / 3_600_000) * 10) / 10;
}

function mean(values: number[]) {
  if (values.length === 0) return "";
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function median(values: number[]) {
  if (values.length === 0) return "";
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  return Math.round(value * 10) / 10;
}
