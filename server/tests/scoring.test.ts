import test from "node:test";
import assert from "node:assert/strict";

import {
  aggregateJudgeTotals,
  calculateJudgeTotal,
  rankParticipants,
  validateScores,
  type Criterion,
} from "../src/utils/scoring";

/*
 * These decide who wins an event, so the awkward cases are pinned.
 */

const criteria: Criterion[] = [
  { id: "innovation", max_score: 10, weight: 2 },
  { id: "execution", max_score: 10, weight: 3 },
  { id: "presentation", max_score: 10, weight: 1 },
];

test("weights a judge's criteria rather than averaging them flat", () => {
  const { total, maxTotal } = calculateJudgeTotal(criteria, [
    { criterion_id: "innovation", score: 8 },
    { criterion_id: "execution", score: 7 },
    { criterion_id: "presentation", score: 9 },
  ]);

  // (8*2 + 7*3 + 9*1) / 6 = 46/6
  assert.equal(total, 7.667);

  // The maximum stays on the same scale as the criteria.
  assert.equal(maxTotal, 10);
});

test("equal weights behave like a plain average", () => {
  const flat: Criterion[] = [
    { id: "a", max_score: 10, weight: 1 },
    { id: "b", max_score: 10, weight: 1 },
  ];

  const { total } = calculateJudgeTotal(flat, [
    { criterion_id: "a", score: 6 },
    { criterion_id: "b", score: 8 },
  ]);

  assert.equal(total, 7);
});

test("criteria with different maximums stay on their own scale", () => {
  const mixed: Criterion[] = [
    { id: "a", max_score: 5, weight: 1 },
    { id: "b", max_score: 100, weight: 1 },
  ];

  const { total, maxTotal } = calculateJudgeTotal(mixed, [
    { criterion_id: "a", score: 5 },
    { criterion_id: "b", score: 100 },
  ]);

  assert.equal(total, 52.5);
  assert.equal(maxTotal, 52.5);
});

test("averages the judges equally", () => {
  assert.equal(aggregateJudgeTotals([7.667, 8.333]), 8);
});

test("a judge who has not submitted is absent, never a zero", () => {
  // Two judges assigned, only one has scored. The final score must
  // be that judge's score, not half of it.
  assert.equal(aggregateJudgeTotals([9]), 9);
  assert.equal(aggregateJudgeTotals([]), null);
});

test("rejects an incomplete or out-of-range submission", () => {
  assert.equal(
    validateScores(criteria, [
      { criterion_id: "innovation", score: 8 },
    ]),
    "A score is missing for one of the criteria"
  );

  assert.equal(
    validateScores(criteria, [
      { criterion_id: "innovation", score: 11 },
      { criterion_id: "execution", score: 7 },
      { criterion_id: "presentation", score: 9 },
    ]),
    "A score exceeds the maximum of 10"
  );

  assert.equal(
    validateScores(criteria, [
      { criterion_id: "innovation", score: -1 },
      { criterion_id: "execution", score: 7 },
      { criterion_id: "presentation", score: 9 },
    ]),
    "Scores cannot be negative"
  );
});

test("rejects a score for a criterion from another event", () => {
  assert.equal(
    validateScores(criteria, [
      { criterion_id: "innovation", score: 8 },
      { criterion_id: "execution", score: 7 },
      { criterion_id: "presentation", score: 9 },
      { criterion_id: "someone-elses-criterion", score: 10 },
    ]),
    "A score was submitted for a criterion that does not belong to this event"
  );
});

test("accepts a complete, in-range submission", () => {
  assert.equal(
    validateScores(criteria, [
      { criterion_id: "innovation", score: 0 },
      { criterion_id: "execution", score: 10 },
      { criterion_id: "presentation", score: 5 },
    ]),
    null
  );
});

test("ranks highest first", () => {
  const ranked = rankParticipants([
    { registration_id: "r1", student_id: "s1", finalScore: 7 },
    { registration_id: "r2", student_id: "s2", finalScore: 9 },
    { registration_id: "r3", student_id: "s3", finalScore: 8 },
  ]);

  assert.deepEqual(
    ranked.map((r) => [r.student_id, r.position]),
    [
      ["s2", 1],
      ["s3", 2],
      ["s1", 3],
    ]
  );
});

test("a tie shares a position and the next place is skipped", () => {
  const ranked = rankParticipants([
    { registration_id: "r1", student_id: "s1", finalScore: 9 },
    { registration_id: "r2", student_id: "s2", finalScore: 9 },
    { registration_id: "r3", student_id: "s3", finalScore: 7 },
  ]);

  assert.deepEqual(
    ranked.map((r) => r.position),
    [1, 1, 3]
  );
});

test("participants nobody judged are left out of the ranking", () => {
  const ranked = rankParticipants([
    { registration_id: "r1", student_id: "s1", finalScore: 6 },
    { registration_id: "r2", student_id: "s2", finalScore: null },
  ]);

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].student_id, "s1");
});
