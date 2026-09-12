/*
 * Session cookie attributes, in one place.
 *
 * Login and logout must agree exactly. res.clearCookie only removes a
 * cookie whose name, path, secure and sameSite match the ones it was
 * set with, so if these two call sites ever drift apart, signing out
 * silently stops working.
 *
 * Cross-site is the production case: the frontend is on Vercel and the
 * API is on Render, which are different sites. A browser only attaches
 * a cookie to a cross-site fetch when that cookie is SameSite=None, and
 * it only accepts SameSite=None together with Secure, which requires
 * HTTPS. Local development is same-site over http://localhost, where
 * SameSite=None without Secure would be rejected outright, so it stays
 * Lax there.
 *
 * NODE_ENV is read on every call rather than once at module load,
 * because this file is reached through the route tree, which Node
 * evaluates before dotenv.config() runs in server.ts.
 */
import type { CookieOptions } from "express";

export const SESSION_MAX_AGE_MS =
  7 * 24 * 60 * 60 * 1000;

export function sessionCookieOptions(): CookieOptions {
  const isProduction =
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
}
