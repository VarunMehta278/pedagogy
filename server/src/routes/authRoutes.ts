import { Router } from "express";

import {
  register,
  login,
  logout,
} from "../controllers/authController";

import { rateLimit } from "../middleware/rateLimitMiddleware";

const router = Router();

/*
 * Credential endpoints are throttled per IP. Without
 * this, a password can be guessed as fast as the server
 * will answer.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message:
    "Too many login attempts. Please try again in a few minutes.",
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message:
    "Too many accounts created from this network. Please try again later.",
});

router.post(
  "/register",
  registerLimiter,
  register
);

router.post("/login", loginLimiter, login);

router.post("/logout", logout);

export default router;
