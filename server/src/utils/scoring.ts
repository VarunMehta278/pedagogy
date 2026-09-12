/*
 * Scoring maths, kept free of any database access so it can be
 * tested directly.
 *
 * Two levels of averaging:
 *
 *   1. Within one judge, the criteria are combined as a weighted
 *      average, so a criterion with weight 3 counts three times as
 *      much as one with weight 1.
 *
 *   2. Across judges, the judge totals are combined as a plain
 *      average — every judge's opinion carries equal weight.
 *
 * Both results stay on the same scale as the criteria themselves
 * (a set of criteria marked out of 10 produces a total out of 10),
 * which makes a score readable without knowing the weights.
 */

export type Criterion = {
  id: string;
  max_score: number;
  weight: number;
};

export type CriterionScore = {
  criterion_id: string;
  score: number;
};

export type JudgeTotal = {
  total: number;
  maxTotal: number;
};

/* Rounds to 3 decimals without floating-point tails like 7.669999. */
export const round3 = (value: number) =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;

/*
 * Returns a message describing the first problem found, or null when
 * the scores are a valid, complete set for these criteria.
 */
export const validateScores = (
  criteria: Criterion[],
  scores: CriterionScore[]
): string | null => {
  if (criteria.length === 0) {
    return "This event has no evaluation criteria yet";
  }

  const byId = new Map(scores.map((s) => [s.criterion_id, s]));

  for (const criterion of criteria) {
    const entry = byId.get(criterion.id);

    if (!entry) {
      return "A score is missing for one of the criteria";
    }

    const value = Number(entry.score);

    if (!Number.isFinite(value)) {
      return "Every score must be a number";
    }

    if (value < 0) {
      return "Scores cannot be negative";
    }

    if (value > Number(criterion.max_score)) {
      return `A score exceeds the maximum of ${criterion.max_score}`;
    }
  }

  const known = new Set(criteria.map((c) => c.id));

  for (const score of scores) {
    if (!known.has(score.criterion_id)) {
      return "A score was submitted for a criterion that does not belong to this event";
    }
  }

  return null;
};

/*
 * The weighted average for a single judge.
 */
export const calculateJudgeTotal = (
  criteria: Criterion[],
  scores: CriterionScore[]
): JudgeTotal => {
  const byId = new Map(scores.map((s) => [s.criterion_id, s]));

  let weighted = 0;
  let weightedMax = 0;
  let totalWeight = 0;

  for (const criterion of criteria) {
    const weight = Number(criterion.weight);
    const entry = byId.get(criterion.id);
    const value = entry ? Number(entry.score) : 0;

    weighted += value * weight;
    weightedMax += Number(criterion.max_score) * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return { total: 0, maxTotal: 0 };
  }

  return {
    total: round3(weighted / totalWeight),
    maxTotal: round3(weightedMax / totalWeight),
  };
};

/*
 * The plain average across every judge who has submitted.
 *
 * Judges who have not submitted for this participant are simply not
 * in the list — a missing evaluation must never be counted as zero,
 * which would quietly punish anyone a judge has not reached yet.
 */
export const aggregateJudgeTotals = (
  totals: number[]
): number | null => {
  if (totals.length === 0) {
    return null;
  }

  const sum = totals.reduce((acc, value) => acc + value, 0);

  return round3(sum / totals.length);
};

/*
 * Ranks participants by final score, highest first.
 *
 * Equal scores share a position (two firsts are followed by a third,
 * not a second), and anyone without a score is left unranked rather
 * than being placed last.
 */
/*
 * The ranked subject. On a team event registration_id carries the
 * team id and student_id is null, because the team is what placed —
 * not any one member.
 */
export type Rankable = {
  registration_id: string;
  student_id: string | null;
  finalScore: number | null;
};

export type Ranked = Rankable & { position: number };

export const rankParticipants = (
  participants: Rankable[]
): Ranked[] => {
  const scored = participants
    .filter(
      (p): p is Rankable & { finalScore: number } =>
        p.finalScore !== null
    )
    .sort((a, b) => b.finalScore - a.finalScore);

  const ranked: Ranked[] = [];

  let position = 0;
  let previousScore: number | null = null;

  scored.forEach((participant, index) => {
    if (
      previousScore === null ||
      participant.finalScore !== previousScore
    ) {
      position = index + 1;
      previousScore = participant.finalScore;
    }

    ranked.push({ ...participant, position });
  });

  return ranked;
};
