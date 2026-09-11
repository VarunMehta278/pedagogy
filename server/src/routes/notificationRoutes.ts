import { Router } from "express";

import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createEventAnnouncement,
} from "../controllers/notificationController";

import {
  authenticate,
  authorize,
} from "../middleware/authMiddleware";

const router = Router();

router.get(
  "/me",
  authenticate,
  getMyNotifications
);

/*
 * Send an announcement to every student registered
 * for an event.
 */
router.post(
  "/events/:eventId/announce",
  authenticate,
  authorize("faculty", "admin"),
  createEventAnnouncement
);

router.put(
  "/:id/read",
  authenticate,
  markNotificationAsRead
);

router.put(
  "/read-all",
  authenticate,
  markAllNotificationsAsRead
);

export default router;
