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

/* ------------------------------------------------------------------
 * Session
 *
 * Three states, not two. Collapsing "signed out" and "could not
 * reach the API" into a single null is what caused the redirect
 * loop: a guarded page treated an unreachable API as a dead session
 * and bounced to /login, the login page's own check happened to
 * succeed, and it bounced straight back. Neither page was wrong on
 * its own; they simply asked the same question twice and got two
 * different answers.
 *
 * So the answer is now fetched once and shared. Concurrent callers
 * join the same request instead of racing, and the result is held
 * briefly so that a page and the components inside it cannot
 * disagree about whether anyone is signed in.
 * ------------------------------------------------------------------ */

export type SessionResult =
  | { state: "authenticated"; user: AuthUser }
  | { state: "anonymous" }
  | { state: "unreachable" };

const SESSION_TTL_MS = 15_000;

let cachedSession:
  | { at: number; result: SessionResult }
  | null = null;

let inFlight: Promise<SessionResult> | null = null;

async function requestSession(): Promise<SessionResult> {
  try {
    const response = await fetch(
      `${API_URL}/users/me`,
      {
        credentials: "include",
        cache: "no-store",
      }
    );

    /*
     * Only the server saying "you are not signed in"
     * counts as being signed out. A 500 or a 502 from a
     * cold instance means the question went unanswered.
     */
    if (
      response.status === 401 ||
      response.status === 403
    ) {
      return { state: "anonymous" };
    }

    if (!response.ok) {
      return { state: "unreachable" };
    }

    const data = await response.json();
    const user = data.user || data.data || null;

    return user
      ? { state: "authenticated", user }
      : { state: "anonymous" };
  } catch (error) {
    /*
     * A dropped connection or an API that is not running
     * yet. Warn rather than error: console.error makes
     * Next's dev overlay throw a red box over the page.
     */
    console.warn(
      "Session lookup failed:",
      error
    );

    return { state: "unreachable" };
  }
}

export async function getSession(options?: {
  force?: boolean;
}): Promise<SessionResult> {
  const force = options?.force === true;

  if (!force) {
    if (
      cachedSession &&
      Date.now() - cachedSession.at < SESSION_TTL_MS
    ) {
      return cachedSession.result;
    }

    if (inFlight) {
      return inFlight;
    }
  }

  const request = requestSession();

  if (!force) {
    inFlight = request;
  }

  try {
    const result = await request;

    /*
     * A failed reach is not an answer, so it is never
     * cached — the next call tries again.
     */
    if (result.state !== "unreachable") {
      cachedSession = { at: Date.now(), result };
    }

    return result;
  } finally {
    if (inFlight === request) {
      inFlight = null;
    }
  }
}

/*
 * The login response already carries the user, so seeding the cache
 * with it means the dashboard does not have to ask again. That
 * removes both the extra round trip and the window in which the two
 * pages could disagree.
 */
export function primeSession(user: AuthUser) {
  cachedSession = {
    at: Date.now(),
    result: { state: "authenticated", user },
  };

  inFlight = null;

  clearAuthBounce();
}

export function clearSession() {
  cachedSession = null;
  inFlight = null;
}

/*
 * Returns the signed-in user, or null when the session
 * is missing, expired, or could not be checked.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();

  return session.state === "authenticated"
    ? session.user
    : null;
}

/* ------------------------------------------------------------------
 * Loop breaker
 *
 * Even with one shared answer, a bad deploy or a half-working cookie
 * could still set two pages bouncing. This caps it: after a couple
 * of hops in quick succession the login page stops forwarding and
 * shows the form, so the worst case is an extra click rather than a
 * tab that never settles.
 * ------------------------------------------------------------------ */

const BOUNCE_KEY = "pedagogy:auth-bounce";
const BOUNCE_WINDOW_MS = 10_000;
const BOUNCE_LIMIT = 2;

export function canForwardSignedInVisitor(): boolean {
  try {
    const now = Date.now();
    const raw = sessionStorage.getItem(BOUNCE_KEY);

    const previous = raw
      ? (JSON.parse(raw) as { at: number; count: number })
      : null;

    const recent =
      previous &&
      now - previous.at < BOUNCE_WINDOW_MS;

    const count = recent ? previous.count + 1 : 1;

    sessionStorage.setItem(
      BOUNCE_KEY,
      JSON.stringify({ at: now, count })
    );

    return count <= BOUNCE_LIMIT;
  } catch {
    /* Private mode, or storage disabled. Do not block the user. */
    return true;
  }
}

export function clearAuthBounce() {
  try {
    sessionStorage.removeItem(BOUNCE_KEY);
  } catch {
    /* Nothing to clear. */
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
