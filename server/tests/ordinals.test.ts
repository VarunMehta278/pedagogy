import test from "node:test";
import assert from "node:assert/strict";

import {
  getOrdinalPosition,
  getOrdinalSuffix,
} from "../src/utils/ordinals";

/*
 * These print on certificates and in the notification a
 * student receives, so the awkward cases are pinned. The
 * original code returned "21th" and "11st".
 */

test("handles the first three positions", () => {
  assert.equal(getOrdinalSuffix(1), "st");
  assert.equal(getOrdinalSuffix(2), "nd");
  assert.equal(getOrdinalSuffix(3), "rd");
});

test("uses 'th' for the irregular teens", () => {
  assert.equal(getOrdinalSuffix(11), "th");
  assert.equal(getOrdinalSuffix(12), "th");
  assert.equal(getOrdinalSuffix(13), "th");
});

test("resumes the normal pattern after the teens", () => {
  assert.equal(getOrdinalSuffix(21), "st");
  assert.equal(getOrdinalSuffix(22), "nd");
  assert.equal(getOrdinalSuffix(23), "rd");
  assert.equal(getOrdinalSuffix(24), "th");
});

test("handles the second set of teens at 111-113", () => {
  assert.equal(getOrdinalSuffix(111), "th");
  assert.equal(getOrdinalSuffix(112), "th");
  assert.equal(getOrdinalSuffix(113), "th");
  assert.equal(getOrdinalSuffix(121), "st");
});

test("the notification wording matches the same rules", () => {
  assert.equal(getOrdinalPosition(1), "1st place");
  assert.equal(getOrdinalPosition(11), "11th place");
  assert.equal(getOrdinalPosition(21), "21st place");
  assert.equal(getOrdinalPosition(112), "112th place");
});
