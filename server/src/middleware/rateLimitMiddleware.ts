import { Request, Response, NextFunction } from "express";

/*
 * Minimal in-memory rate limiter.
 *
 * The login and registration endpoints had no throttle at
 * all, so a password could be attacked as fast as the
 * server would answer.
 *
 * This deliberately has no dependencies. It is per-process
 * and resets on restart, which is fine for a single API
 * instance; if this is ever run behind more than one
 * process, move the counter to Redis or Supabase so the
 * limit is shared.
 */

type Hit = {
  count: number;
  expiresAt: number;
};

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message?: string;
};

const buckets = new Map<string, Hit>();

/*
 * Expired entries are swept periodically so the map does
 * not grow without bound. unref() keeps the timer from
 * holding the process open.
 */
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

const sweep = setInterval(() => {
  const now = Date.now();

  for (const [key, hit] of buckets) {
    if (hit.expiresAt <= now) {
      buckets.delete(key);
    }
  }
}, SWEEP_INTERVAL_MS);

if (typeof sweep.unref === "function") {
  sweep.unref();
}

export const rateLimit = ({
  windowMs,
  max,
  message = "Too many attempts. Please try again later.",
}: RateLimitOptions) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    /*
     * Keyed by IP plus route, so a burst against login
     * does not also lock the caller out of registration.
     */
    const ip =
      req.ip ||
      req.socket?.remoteAddress ||
      "unknown";

    const key = `${ip}:${req.path}`;

    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.expiresAt <= now) {
      buckets.set(key, {
        count: 1,
        expiresAt: now + windowMs,
      });

      return next();
    }

    existing.count += 1;

    if (existing.count > max) {
      const retryAfterSeconds = Math.ceil(
        (existing.expiresAt - now) / 1000
      );

      res.setHeader(
        "Retry-After",
        String(retryAfterSeconds)
      );

      return res.status(429).json({
        success: false,
        message,
      });
    }

    return next();
  };
};
