/*
 * Canonical department list.
 *
 * Kept in one place so registration and every profile
 * form offer exactly the same options, which keeps the
 * values consistent for admin filtering and analytics.
 */

export const DEPARTMENTS = [
  "Computer Engineering",
  "Computer Science & Engineering",
  "Information Technology",
  "Artificial Intelligence & Data Science",
  "Electronics & Communication Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Applied Sciences & Humanities",
  "Master of Computer Applications",
  "Master of Business Administration",
];

/*
 * A profile saved before this list existed may hold a
 * value that is not in it. That value is prepended so
 * opening and saving a profile never silently rewrites
 * someone's department.
 */
export function departmentOptions(
  current?: string | null
) {
  const trimmed = current?.trim();

  if (trimmed && !DEPARTMENTS.includes(trimmed)) {
    return [trimmed, ...DEPARTMENTS];
  }

  return DEPARTMENTS;
}
