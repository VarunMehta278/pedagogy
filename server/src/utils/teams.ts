import type { EventTeamConfig } from "../types/team";

/*
 * Team rules with no database access, so they can be unit tested
 * directly — the same reason utils/scoring.ts and utils/password.ts
 * sit apart from their controllers.
 */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/*
 * Team codes get read aloud across a noisy hall and typed by hand, so
 * the alphabet drops the characters that get confused: I, O, 0 and 1.
 */
export const buildTeamCode = (
  random: () => number = Math.random
): string => {
  let body = "";

  for (let i = 0; i < 5; i += 1) {
    body += CODE_ALPHABET[
      Math.floor(random() * CODE_ALPHABET.length)
    ];
  }

  return `PED-${body}`;
};

export const normaliseTeamCode = (value: string): string =>
  value.trim().toUpperCase().replace(/\s+/g, "");

/*
 * Returns a message describing the first problem with an event's team
 * settings, or null when they are usable.
 */
export const validateTeamConfig = (
  participationType: unknown,
  minSize: unknown,
  maxSize: unknown
): string | null => {
  if (
    participationType !== "individual" &&
    participationType !== "team"
  ) {
    return "participation_type must be individual or team";
  }

  if (participationType === "individual") {
    return null;
  }

  const min = Number(minSize);
  const max = Number(maxSize);

  if (!Number.isInteger(min) || min < 1) {
    return "Minimum team size must be a whole number of at least 1";
  }

  if (!Number.isInteger(max) || max < min) {
    return "Maximum team size must be a whole number not smaller than the minimum";
  }

  if (max > 50) {
    return "Maximum team size cannot exceed 50";
  }

  return null;
};

export const isTeamEvent = (
  event: Partial<EventTeamConfig> | null | undefined
): boolean => event?.participation_type === "team";

/*
 * Whether a team satisfies the event's size rules.
 *
 * This flags an undersized team rather than blocking it: a team that
 * loses a member the night before is the organiser's call to make,
 * not the system's.
 */
export const teamSizeStatus = (
  memberCount: number,
  config: Pick<EventTeamConfig, "min_team_size" | "max_team_size">
): { complete: boolean; full: boolean; message: string | null } => {
  const complete = memberCount >= config.min_team_size;
  const full = memberCount >= config.max_team_size;

  return {
    complete,
    full,
    message: complete
      ? null
      : `Needs at least ${config.min_team_size} members (currently ${memberCount})`,
  };
};
