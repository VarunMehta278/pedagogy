import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { supabase } from "../config/supabase";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded !== "object" ||
      !decoded ||
      !("userId" in decoded) ||
      !("role" in decoded)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    req.user = {
      userId: String(decoded.userId),
      role: String(decoded.role),
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};
/*
 * Same token check as authenticate(), but a missing or
 * invalid cookie is not an error.
 *
 * Public pages sometimes need to know who is looking
 * without requiring anyone to be signed in — the event
 * details page shows an unpublished event to the person
 * who created it and 404s for everybody else. Rejecting
 * anonymous visitors there would make the page private,
 * which is the opposite of what it is for.
 */
export const optionalAuthenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.token;

  if (!token) {
    return next();
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error(
      "JWT_SECRET is missing from .env — treating the visitor as signed out"
    );

    return next();
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded === "object" &&
      decoded &&
      "userId" in decoded &&
      "role" in decoded
    ) {
      req.user = {
        userId: String(decoded.userId),
        role: String(decoded.role),
      };
    }
  } catch {
    /*
     * An expired or tampered cookie just means "not
     * signed in" here. Handlers behind this middleware
     * must already cope with req.user being undefined.
     */
  }

  next();
};

/*
 * Role checks read from the database rather than trusting
 * the role baked into the token.
 *
 * Tokens live for 7 days, so a token issued while someone
 * was faculty or admin kept those powers for the rest of
 * that week even after they were demoted. Only privileged
 * routes call authorize(), so this costs one extra lookup
 * on low-traffic endpoints and nothing on the rest.
 */
export const authorize = (...allowedRoles: string[]) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("id, role")
        .eq("id", req.user.userId)
        .maybeSingle();

      if (error) {
        console.error(
          "Authorization role lookup error:",
          error
        );

        return res.status(500).json({
          success: false,
          message: "Failed to verify permissions",
        });
      }

      /*
       * The account was removed after the token was
       * issued, so the token no longer refers to anyone.
       */
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired authentication token",
        });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to access this resource",
        });
      }

      /*
       * Downstream handlers compare against req.user.role,
       * so it is refreshed to the authoritative value.
       */
      req.user.role = user.role;

      next();
    } catch (error) {
      console.error("Authorization error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to verify permissions",
      });
    }
  };
};