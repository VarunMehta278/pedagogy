import test from "node:test";
import assert from "node:assert/strict";

import {
  isCheckViolation,
  isEventFull,
  isForeignKeyViolation,
  isUniqueViolation,
  violatedConstraint,
} from "../src/utils/dbErrors";

/*
 * These decide whether a racing request sees a clean 409 or a
 * misleading 500, so the classification is pinned.
 */

test("recognises a unique violation", () => {
  assert.equal(isUniqueViolation({ code: "23505" }), true);
  assert.equal(isUniqueViolation({ code: "23503" }), false);
});

test("recognises foreign key and check violations", () => {
  assert.equal(isForeignKeyViolation({ code: "23503" }), true);
  assert.equal(isCheckViolation({ code: "23514" }), true);
});

test("survives the shapes a failed query can actually return", () => {
  for (const value of [null, undefined, {}, { code: 500 }, "boom"]) {
    assert.equal(isUniqueViolation(value as never), false);
  }
});

test("tells two different unique violations on one table apart", () => {
  const duplicateRegistration = {
    code: "23505",
    message:
      'duplicate key value violates unique constraint "registrations_one_per_student_event"',
  };

  const collidedCode = {
    code: "23505",
    message:
      'duplicate key value violates unique constraint "registrations_code_unique"',
  };

  assert.equal(
    violatedConstraint(
      duplicateRegistration,
      "registrations_one_per_student_event"
    ),
    true
  );

  assert.equal(
    violatedConstraint(
      duplicateRegistration,
      "registrations_code_unique"
    ),
    false
  );

  assert.equal(
    violatedConstraint(collidedCode, "registrations_code_unique"),
    true
  );
});

test("a non-unique error never matches a constraint name", () => {
  assert.equal(
    violatedConstraint(
      { code: "23503", message: "registrations_code_unique" },
      "registrations_code_unique"
    ),
    false
  );
});

test("recognises the capacity trigger firing", () => {
  assert.equal(
    isEventFull({ code: "P0001", message: "EVENT_FULL" }),
    true
  );

  // Postgres prefixes the message in some drivers.
  assert.equal(
    isEventFull({
      code: "P0001",
      message: 'raise exception EVENT_FULL',
    }),
    true
  );
});

test("does not mistake other errors for a full event", () => {
  assert.equal(isEventFull({ code: "23505", message: "duplicate key" }), false);
  assert.equal(isEventFull(null), false);
  assert.equal(isEventFull({}), false);
});
