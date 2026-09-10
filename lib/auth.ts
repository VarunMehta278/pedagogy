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
  | "admin";

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
    console.error(
      "Session lookup failed:",
      error
    );

    return null;
  }
}
