import { Router } from "express";

import {
  getMe,
  updateMe,
  getAdminUsers,
  updateUserRole,
} from "../controllers/userController";

import { getAssignableUsers } from "../controllers/assignmentController";

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

/*
 * The pool faculty picks judges and volunteers from.
 *
 * Also before "/:id", and it only ever returns accounts that
 * already hold the requested role.
 */
router.get(
  "/assignable",
  authenticate,
  authorize("faculty", "admin"),
  getAssignableUsers
);

/*
 * Admin promotes or demotes a user. This is the only way an
 * account becomes a judge or a volunteer.
 */
router.put(
  "/:id/role",
  authenticate,
  authorize("admin"),
  updateUserRole
);

export default router;