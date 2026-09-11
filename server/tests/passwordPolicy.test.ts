import test from "node:test";
import assert from "node:assert/strict";

import { getPasswordProblem } from "../src/utils/password";

/*
 * The registration form in client/lib/password.ts shows
 * these rules as a live checklist. If the two ever drift,
 * a user sees four green ticks and then a rejection from
 * the API, so the rules are pinned here.
 */

test("rejects a password shorter than 8 characters", () => {
  assert.equal(
    getPasswordProblem("Short1a"),
    "Password must be at least 8 characters"
  );
});

test("rejects a password with no uppercase letter", () => {
  assert.equal(
    getPasswordProblem("alllowercase1"),
    "Password must contain at least one uppercase letter"
  );
});

test("rejects a password with no lowercase letter", () => {
  assert.equal(
    getPasswordProblem("ALLUPPERCASE1"),
    "Password must contain at least one lowercase letter"
  );
});

test("rejects a password with no number", () => {
  assert.equal(
    getPasswordProblem("NoNumbersHere"),
    "Password must contain at least one number"
  );
});

test("rejects an empty password", () => {
  assert.equal(
    getPasswordProblem(""),
    "Password must be at least 8 characters"
  );
});

test("accepts a password meeting every rule", () => {
  assert.equal(getPasswordProblem("Password1"), null);
});

test("accepts a password of exactly the minimum length", () => {
  assert.equal(getPasswordProblem("Abcdefg1"), null);
});

test("accepts symbols without requiring them", () => {
  assert.equal(
    getPasswordProblem("Str0ng!Passw0rd"),
    null
  );
});

test("reports the length problem first for a password failing several rules", () => {
  /*
   * Order matters for the message the user sees: the
   * shortest fix should be named first.
   */
  assert.equal(
    getPasswordProblem("ab"),
    "Password must be at least 8 characters"
  );
});
