import { Router } from "express";

import {
  getMe,
  updateMe,
  getAdminUsers,
} from "../controllers/userController";

import {
  authenticate,
  authorize,
} from "../middleware/authMiddleware";

const router = Router();

/*
 * Current user's profile
 */
router.get(
  "/me",
  authenticate,
  getMe
);

router.put(
  "/me",
  authenticate,
  updateMe
);

/*
 * Admin user management
 *
 * IMPORTANT:
 * Keep this before any /:id route.
 */
router.get(
  "/admin",
  authenticate,
  authorize("admin"),
  getAdminUsers
);

export default router;