/**
 * Candidate rating methodology (section 7).
 *
 * These weights are published verbatim on /methodology. Ratings measure public
 * perception only — they are never combined with, or displayed as, official
 * election results.
 */

export const RATING_DIMENSIONS = [
  {
    key: "publicTrust",
    label: "Public Trust",
    weight: 0.2,
    purpose: "User perception of trustworthiness",
  },
  {
    key: "communication",
    label: "Communication",
    weight: 0.15,
    purpose: "Clarity and accessibility of public communication",
  },
  {
    key: "localIssueFocus",
    label: "Local Issue Focus",
    weight: 0.2,
    purpose: "Perceived attention to constituency concerns",
  },
  {
    key: "policyClarity",
    label: "Policy / Agenda Clarity",
    weight: 0.15,
    purpose: "Specificity and clarity of stated agenda",
  },
  {
    key: "responsiveness",
    label: "Responsiveness",
    weight: 0.15,
    purpose: "Perceived responsiveness to citizens",
  },
  {
    key: "overall",
    label: "Overall Performance",
    weight: 0.15,
    purpose: "Overall assessment where performance data exists",
  },
] as const;

export type RatingDimensionKey = (typeof RATING_DIMENSIONS)[number]["key"];

export type RatingScores = Record<RatingDimensionKey, number>;

export function weightedScore(scores: RatingScores): number {
  const total = RATING_DIMENSIONS.reduce(
    (sum, dimension) => sum + scores[dimension.key] * dimension.weight,
    0
  );
  return Math.round(total * 100) / 100;
}

export type RatingSummary = {
  count: number;
  average: number;
  distribution: [number, number, number, number, number]; // buckets for 1..5
  dimensionAverages: Record<RatingDimensionKey, number>;
  lastUpdated: Date | null;
};

export function summarize(
  ratings: Array<RatingScores & { weightedScore: number; updatedAt: Date }>
): RatingSummary {
  const empty = RATING_DIMENSIONS.reduce(
    (acc, d) => ({ ...acc, [d.key]: 0 }),
    {} as Record<RatingDimensionKey, number>
  );

  if (ratings.length === 0) {
    return {
      count: 0,
      average: 0,
      distribution: [0, 0, 0, 0, 0],
      dimensionAverages: empty,
      lastUpdated: null,
    };
  }

  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  const totals = { ...empty };
  let sum = 0;
  let lastUpdated = ratings[0].updatedAt;

  for (const rating of ratings) {
    sum += rating.weightedScore;
    const bucket = Math.min(5, Math.max(1, Math.round(rating.weightedScore))) - 1;
    distribution[bucket] += 1;
    for (const dimension of RATING_DIMENSIONS) {
      totals[dimension.key] += rating[dimension.key];
    }
    if (rating.updatedAt > lastUpdated) lastUpdated = rating.updatedAt;
  }

  const dimensionAverages = { ...empty };
  for (const dimension of RATING_DIMENSIONS) {
    dimensionAverages[dimension.key] =
      Math.round((totals[dimension.key] / ratings.length) * 100) / 100;
  }

  return {
    count: ratings.length,
    average: Math.round((sum / ratings.length) * 100) / 100,
    distribution,
    dimensionAverages,
    lastUpdated,
  };
}
