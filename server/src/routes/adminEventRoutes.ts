import { Router } from "express";

import {
  getAdminEvents,
  updateAdminEventStatus,
  deleteAdminEvent,
} from "../controllers/adminEventController";

import {
  authenticate,
  authorize,
} from "../middleware/authMiddleware";

const router = Router();

/*
 * GET ALL EVENTS
 */
router.get(
  "/",
  authenticate,
  authorize("admin"),
  getAdminEvents
);

/*
 * UPDATE EVENT STATUS
 */
router.put(
  "/:id/status",
  authenticate,
  authorize("admin"),
  updateAdminEventStatus
);

/*
 * DELETE EVENT
 */
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteAdminEvent
);

export default router;