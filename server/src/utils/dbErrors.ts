/*
 * Postgres error classification.
 *
 * The database is now the real guard against duplicates — application
 * "check, then insert" cannot be, because two concurrent requests both
 * pass the check. That means the losing request gets a constraint
 * violation back, and it must become a clean 409 rather than a 500:
 * a 500 tells the user the server is broken when in fact the server
 * did exactly its job.
 *
 * Kept free of imports so it can be unit tested directly.
 */

/* Postgres SQLSTATE codes, as Supabase surfaces them. */
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
export const PG_CHECK_VIOLATION = "23514";
export const PG_NOT_NULL_VIOLATION = "23502";

type MaybePgError =
  | { code?: unknown; message?: unknown; details?: unknown }
  | null
  | undefined;

const codeOf = (error: MaybePgError): string | null => {
  if (!error || typeof error !== "object") return null;

  const code = (error as { code?: unknown }).code;

  return typeof code === "string" ? code : null;
};

export const isUniqueViolation = (error: MaybePgError): boolean =>
  codeOf(error) === PG_UNIQUE_VIOLATION;

export const isForeignKeyViolation = (error: MaybePgError): boolean =>
  codeOf(error) === PG_FOREIGN_KEY_VIOLATION;

export const isCheckViolation = (error: MaybePgError): boolean =>
  codeOf(error) === PG_CHECK_VIOLATION;

/*
 * True when the violated constraint is the one named. Lets a handler
 * tell "they already registered" apart from "that code collided",
 * both of which are 23505 on the same table.
 */
export const violatedConstraint = (
  error: MaybePgError,
  name: string
): boolean => {
  if (!isUniqueViolation(error)) return false;

  const haystack = [
    (error as { message?: unknown })?.message,
    (error as { details?: unknown })?.details,
  ]
    .filter((v): v is string => typeof v === "string")
    .join(" ");

  return haystack.includes(name);
};

/*
 * The participant-limit trigger added in migration 004 raises
 * EVENT_FULL when an event has no slots left.
 *
 * This is the authoritative capacity answer, because the trigger
 * takes a row lock on the event before counting — unlike the API's
 * own count, which two concurrent requests can both read as "room
 * available". When this fires, the event really is full.
 */
export const isEventFull = (error: MaybePgError): boolean => {
  if (!error || typeof error !== "object") return false;

  const message = (error as { message?: unknown }).message;

  return typeof message === "string" && message.includes("EVENT_FULL");
};
