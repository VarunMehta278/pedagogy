import { Router } from "express";

import {
  registerForEvent,
  getMyRegistrations,
} from "../controllers/registrationController";

import {
  authenticate,
  authorize,
} from "../middleware/authMiddleware";

const router = Router();

/*
 * Get student's registrations
 *
 * IMPORTANT:
 * Keep /me BEFORE /:eventId
 */
router.get(
  "/me",
  authenticate,
  authorize("student"),
  getMyRegistrations
);

/*
 * Preferred registration endpoint
 *
 * POST /api/registrations/:eventId
 */
router.post(
  "/:eventId",
  authenticate,
  authorize("student"),
  registerForEvent
);

/*
 * Backward-compatible registration endpoint
 *
 * POST /api/registrations
 */
router.post(
  "/",
  authenticate,
  authorize("student"),
  registerForEvent
);

export default router;