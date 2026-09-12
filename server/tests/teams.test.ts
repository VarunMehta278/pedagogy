import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTeamCode,
  normaliseTeamCode,
  teamSizeStatus,
  validateTeamConfig,
} from "../src/utils/teams";

/*
 * Team codes are typed by hand at a registration desk and read aloud,
 * and the size rules decide who can compete, so both are pinned.
 */

test("team codes are prefixed and fixed length", () => {
  const code = buildTeamCode(() => 0);

  assert.match(code, /^PED-[A-Z0-9]{5}$/);
  assert.equal(code.length, 9);
});

test("team codes avoid the characters people misread", () => {
  // 200 codes drawn across the whole alphabet must contain no
  // I, O, 0 or 1 — the pairs that get mistyped at a desk.
  let i = 0;
  const codes = Array.from({ length: 200 }, () =>
    buildTeamCode(() => {
      i += 1;
      return (i % 32) / 32;
    })
  );

  for (const code of codes) {
    assert.doesNotMatch(code.slice(4), /[IO01]/);
  }
});

test("codes are normalised the way a student would mistype them", () => {
  assert.equal(normaliseTeamCode("  ped-a72k "), "PED-A72K");
  assert.equal(normaliseTeamCode("PED - A72K"), "PED-A72K");
});

test("individual events ignore team sizes", () => {
  assert.equal(validateTeamConfig("individual", 5, 2), null);
});

test("rejects a bad participation type", () => {
  assert.equal(
    validateTeamConfig("solo", 1, 1),
    "participation_type must be individual or team"
  );
});

test("team events require a minimum of at least 1", () => {
  assert.equal(
    validateTeamConfig("team", 0, 4),
    "Minimum team size must be a whole number of at least 1"
  );

  assert.equal(
    validateTeamConfig("team", 1.5, 4),
    "Minimum team size must be a whole number of at least 1"
  );
});

test("maximum cannot be below the minimum", () => {
  assert.equal(
    validateTeamConfig("team", 4, 2),
    "Maximum team size must be a whole number not smaller than the minimum"
  );
});

test("accepts a sane team configuration", () => {
  assert.equal(validateTeamConfig("team", 2, 4), null);
  assert.equal(validateTeamConfig("team", 1, 1), null);
});

test("reports undersized teams without calling them full", () => {
  const status = teamSizeStatus(2, {
    min_team_size: 3,
    max_team_size: 5,
  });

  assert.equal(status.complete, false);
  assert.equal(status.full, false);
  assert.equal(
    status.message,
    "Needs at least 3 members (currently 2)"
  );
});

test("a team at the maximum is full and complete", () => {
  const status = teamSizeStatus(4, {
    min_team_size: 2,
    max_team_size: 4,
  });

  assert.equal(status.complete, true);
  assert.equal(status.full, true);
  assert.equal(status.message, null);
});
