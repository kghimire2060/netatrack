import type { FactCheckVerdict, ProjectStatus, PromiseStatus } from "@prisma/client";

/**
 * The Accountability Score.
 *
 * Built from OFFICIAL, source-backed records only — promises, projects,
 * parliamentary activity and the fact-check record. Public `Rating` data is
 * deliberately excluded and never folded in, because docs/ARCHITECTURE.md
 * treats "official record" and "public perception" as structurally separate:
 * a brigading campaign must not be able to move a politician's headline
 * number, and a score a subject disputes has to be answerable with documents.
 * The star rating is rendered beside this score, never averaged into it.
 *
 * Three rules keep the number honest.
 *
 *  1. **A missing component is not a zero.** A representative with no recorded
 *     parliamentary data has not scored 0% on attendance — we simply do not
 *     know. Absent components drop out and the remaining weights are
 *     renormalised, so the score answers "how did they do on what we can
 *     actually check", not "how much data have we typed in".
 *  2. **Coverage is published with the score.** `coverage` is the share of the
 *     full weighting the available components represent. A 90/100 built on one
 *     component out of four is a different claim from a 90/100 built on all
 *     four, and the UI must be able to say so.
 *  3. **Unverifiable records leave the denominator.** A promise nobody can
 *     confirm either way, or a fact-check with no verdict, is removed rather
 *     than counted as a failure.
 *
 * With no scorable records at all, the score is `null` — never 0, and never a
 * placeholder average.
 */

// ------------------------------------------------------------------ weights

/**
 * Published in /methodology. Promises carry the most weight because they are
 * the politician's own stated commitments; parliament and projects are what
 * the office actually delivers; the fact-check record is a small, slow-moving
 * signal built on relatively few data points, so it is capped low.
 */
export const SCORE_WEIGHTS = {
  promises: 0.4,
  projects: 0.25,
  parliament: 0.25,
  factChecks: 0.1,
} as const;

export type ScoreComponentKey = keyof typeof SCORE_WEIGHTS;

export type ScoreComponent = {
  key: ScoreComponentKey;
  /** 0–100, or null when nothing scorable is recorded. */
  score: number | null;
  weight: number;
  /** How many records the component score rests on. */
  basis: number;
  /** Records recorded but excluded as unverifiable. */
  excluded: number;
};

export type AccountabilityScore = {
  /** 0–100 rounded, or null when no component has data. */
  total: number | null;
  /** Share of the full weighting that was actually available, 0–1. */
  coverage: number;
  components: Record<ScoreComponentKey, ScoreComponent>;
  /** Components that contributed, in weight order. */
  scored: ScoreComponentKey[];
  /** Components with nothing recorded behind them. */
  missing: ScoreComponentKey[];
};

// --------------------------------------------------------------- components

/**
 * Credit for a stated commitment.
 *
 * Partial credit is given on purpose: a promise genuinely under way is not the
 * same as one never begun, and scoring both zero would push a representative
 * to report nothing rather than report progress. DELAYED keeps a small credit
 * because the work exists but the deadline was missed; CANCELLED keeps none.
 * UNABLE_TO_VERIFY leaves the denominator entirely.
 */
const PROMISE_CREDIT: Record<PromiseStatus, number | null> = {
  COMPLETED: 1,
  IN_PROGRESS: 0.5,
  DELAYED: 0.25,
  NOT_STARTED: 0,
  CANCELLED: 0,
  UNABLE_TO_VERIFY: null,
};

/**
 * Project credit. STALLED scores below DELAYED because money has been released
 * against work that stopped, which is a worse outcome than a late start.
 * PROPOSED carries no credit: proposing a project is not delivering one.
 */
const PROJECT_CREDIT: Record<ProjectStatus, number | null> = {
  COMPLETED: 1,
  IN_PROGRESS: 0.5,
  APPROVED: 0.25,
  STALLED: 0.1,
  PROPOSED: 0,
  CANCELLED: 0,
  UNABLE_TO_VERIFY: null,
};

/**
 * Fact-check credit. A verdict of MISLEADING keeps partial credit rather than
 * scoring as an outright falsehood, because the two are editorially distinct
 * and collapsing them would overstate the finding. Checks that reached no
 * conclusion are excluded, not counted against the subject.
 */
const VERDICT_CREDIT: Record<FactCheckVerdict, number | null> = {
  TRUE: 1,
  MOSTLY_TRUE: 0.75,
  MISLEADING: 0.25,
  FALSE: 0,
  UNVERIFIED: null,
  INSUFFICIENT_EVIDENCE: null,
};

/** Averages the credit of scorable rows, reporting what was excluded. */
function creditAverage<T extends string>(
  values: T[],
  table: Record<T, number | null>
): { score: number | null; basis: number; excluded: number } {
  let sum = 0;
  let basis = 0;
  let excluded = 0;
  for (const value of values) {
    const credit = table[value];
    if (credit === null || credit === undefined) {
      excluded += 1;
      continue;
    }
    sum += credit;
    basis += 1;
  }
  return { score: basis === 0 ? null : (sum / basis) * 100, basis, excluded };
}

/**
 * Parliamentary participation.
 *
 * Attendance only. `questionsAsked`, `billsSponsored` and the other columns on
 * `PerformanceRecord` are raw counts with no published denominator, so turning
 * them into a percentage would require inventing a benchmark ("how many
 * questions is enough?") that no authority publishes. They are shown on the
 * profile as figures; they are not scored.
 *
 * Records without an attendance figure are skipped rather than treated as zero
 * attendance.
 */
function parliamentScore(
  records: { attendancePct: number | null }[]
): { score: number | null; basis: number; excluded: number } {
  const withAttendance = records.filter(
    (r): r is { attendancePct: number } => r.attendancePct !== null
  );
  if (withAttendance.length === 0) {
    return { score: null, basis: 0, excluded: records.length };
  }
  const mean =
    withAttendance.reduce((sum, r) => sum + r.attendancePct, 0) / withAttendance.length;
  return {
    score: Math.min(100, Math.max(0, mean)),
    basis: withAttendance.length,
    excluded: records.length - withAttendance.length,
  };
}

// ------------------------------------------------------------------ scoring

export function computeAccountabilityScore(input: {
  promiseStatuses: PromiseStatus[];
  projectStatuses: ProjectStatus[];
  performance: { attendancePct: number | null }[];
  factCheckVerdicts: FactCheckVerdict[];
}): AccountabilityScore {
  const raw = {
    promises: creditAverage(input.promiseStatuses, PROMISE_CREDIT),
    projects: creditAverage(input.projectStatuses, PROJECT_CREDIT),
    parliament: parliamentScore(input.performance),
    factChecks: creditAverage(input.factCheckVerdicts, VERDICT_CREDIT),
  };

  const keys = Object.keys(SCORE_WEIGHTS) as ScoreComponentKey[];
  const components = Object.fromEntries(
    keys.map((key) => [key, { key, weight: SCORE_WEIGHTS[key], ...raw[key] }])
  ) as Record<ScoreComponentKey, ScoreComponent>;

  const scored = keys.filter((key) => components[key].score !== null);
  const missing = keys.filter((key) => components[key].score === null);

  // Renormalise over what is actually present. Weighting an absent component
  // as zero would score a data gap as a failure.
  const availableWeight = scored.reduce((sum, key) => sum + SCORE_WEIGHTS[key], 0);
  const total =
    availableWeight === 0
      ? null
      : Math.round(
          scored.reduce((sum, key) => sum + (components[key].score as number) * SCORE_WEIGHTS[key], 0) /
            availableWeight
        );

  return { total, coverage: availableWeight, components, scored, missing };
}

/**
 * Band for the score badge. Kept coarse — four bands, not a colour per point —
 * because the underlying data is not precise enough to justify finer grading.
 */
export function scoreBand(total: number | null): "strong" | "fair" | "weak" | "unknown" {
  if (total === null) return "unknown";
  if (total >= 70) return "strong";
  if (total >= 45) return "fair";
  return "weak";
}

/**
 * How much of the score to trust. A score resting on one component out of four
 * is reported as provisional so the badge is never read as a full assessment.
 */
export function coverageBand(coverage: number): "full" | "partial" | "provisional" {
  if (coverage >= 0.9) return "full";
  if (coverage >= 0.5) return "partial";
  return "provisional";
}
