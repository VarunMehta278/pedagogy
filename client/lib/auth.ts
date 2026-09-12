/*
 * Shared auth + navigation helpers.
 *
 * Every page that guards itself should send people to the
 * same places, so the rules live here rather than being
 * re-decided in each page.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

export type UserRole =
  | "student"
  | "faculty"
  | "admin"
  | "judge"
  | "volunteer";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
  year?: number | null;
  profile_image?: string | null;
};

/*
 * Where each role belongs after signing in.
 */
export function dashboardPathForRole(
  role?: string | null
) {
  switch (role) {
    case "student":
      return "/student/dashboard";

    case "faculty":
      return "/faculty/dashboard";

    case "admin":
      return "/admin/dashboard";

    case "judge":
      return "/judge/dashboard";

    case "volunteer":
      return "/volunteer/dashboard";

    default:
      /*
       * /dashboard resolves the role server-side and
       * forwards, so it is the safe fallback.
       */
      return "/dashboard";
  }
}

/*
 * Only same-origin, absolute paths are accepted, so a
 * crafted ?redirect= cannot bounce someone off-site
 * after they sign in.
 */
export function safeRedirect(
  value?: string | null,
  fallback = ""
) {
  if (!value) return fallback;

  if (
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return fallback;
  }

  return value;
}

/*
 * Send an unauthenticated visitor to the login page,
 * remembering where they were headed.
 */
export function loginPathFor(
  pathname?: string | null
) {
  const target = safeRedirect(pathname);

  if (!target || target === "/login") {
    return "/login";
  }

  return `/login?redirect=${encodeURIComponent(
    target
  )}`;
}

/*
 * Read a query parameter without useSearchParams, which
 * would force every consuming page behind a Suspense
 * boundary at build time.
 */
export function readQueryParam(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(
    window.location.search
  ).get(key);
}

/*
 * Returns the signed-in user, or null when the session
 * is missing or expired.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch(
      `${API_URL}/users/me`,
      {
        credentials: "include",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return data.user || null;
  } catch (error) {
    /*
     * A signed-out visitor, a server that is not running
     * yet, or a dropped connection all land here. The
     * caller already treats null as "not signed in", so
     * this is a warning rather than an error — logging it
     * with console.error made Next's dev overlay throw a
     * red box over the page for an entirely normal case.
     */
    console.warn(
      "Session lookup failed:",
      error
    );

    return null;
  }
}

/*
 * Human-readable role names, used wherever a role is shown to a
 * person rather than compared in code.
 */
export const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  faculty: "Faculty",
  admin: "Admin",
  judge: "Judge",
  volunteer: "Volunteer",
};

export function roleLabel(role?: string | null) {
  if (!role) return "Unknown";

  return ROLE_LABELS[role] ?? role;
}

/*
 * Guards a role-specific page.
 *
 * Returns the path to send the visitor to, or null when they belong
 * here. Sending someone to their own dashboard rather than to the
 * login page matters: a logged-in volunteer who opens a judge URL
 * has not lost their session, so bouncing them to /login would be
 * both wrong and confusing.
 */
export function guardRole(
  user: AuthUser | null,
  allowed: UserRole[],
  pathname?: string | null
) {
  if (!user) {
    return loginPathFor(pathname);
  }

  if (!allowed.includes(user.role as UserRole)) {
    return dashboardPathForRole(user.role);
  }

  return null;
}
