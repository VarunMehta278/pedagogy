/*
 * Shared password policy.
 *
 * The same rules are enforced by the API in
 * server/src/controllers/authController.ts — keep the two
 * in sync, since client-side checks are only a convenience.
 */

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const passwordRules: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) =>
      password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "uppercase",
    label: "One uppercase letter (A–Z)",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "One lowercase letter (a–z)",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "One number (0–9)",
    test: (password) => /[0-9]/.test(password),
  },
];

export function getPasswordRuleState(
  password: string
) {
  return passwordRules.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(password),
  }));
}

export function isPasswordValid(
  password: string
) {
  return passwordRules.every((rule) =>
    rule.test(password)
  );
}

/*
 * Strength is a presentation concern only — every required
 * rule must still pass before an account can be created.
 * A symbol and extra length count as bonuses.
 */
export type PasswordStrength = {
  score: number;
  max: number;
  label: string;
  percent: number;
};

export function getPasswordStrength(
  password: string
): PasswordStrength {
  const max = 6;

  if (!password) {
    return {
      score: 0,
      max,
      label: "Enter a password",
      percent: 0,
    };
  }

  let score = passwordRules.filter((rule) =>
    rule.test(password)
  ).length;

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  if (password.length >= 12) {
    score += 1;
  }

  const label =
    score <= 2
      ? "Weak"
      : score <= 4
      ? "Fair"
      : score === 5
      ? "Strong"
      : "Very strong";

  return {
    score,
    max,
    label,
    percent: Math.round((score / max) * 100),
  };
}
