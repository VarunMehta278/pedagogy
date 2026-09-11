/*
 * Password policy.
 *
 * The registration form shows these same rules as a live
 * checklist in client/lib/password.ts — keep the two in
 * sync. The check here is the one that actually counts,
 * since the client can be bypassed.
 *
 * This lives apart from the controller so it can be tested
 * without pulling in the database client.
 */

export const PASSWORD_MIN_LENGTH = 8;

export const getPasswordProblem = (
  password: string
): string | null => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  return null;
};
