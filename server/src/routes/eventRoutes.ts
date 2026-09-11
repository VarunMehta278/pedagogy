import { Router } from "express";

import {
  createEvent,
  getEvents,
  getEventById,
  getMyEvents,
  updateEventStatus,
  getEventParticipants,
  markAttendance,
  getEventResults,
  addEventResult,
  updateEventResult,
  deleteEventResult,
} from "../controllers/eventController";

import {
  authenticate,
  authorize,
  optionalAuthenticate,
} from "../middleware/authMiddleware";

const router = Router();

// Public events
router.get("/", getEvents);

// Faculty/Admin event management
router.get(
  "/manage",
  authenticate,
  authorize("faculty", "admin"),
  getMyEvents
);

// Event participants
router.get(
  "/:id/participants",
  authenticate,
  authorize("faculty", "admin"),
  getEventParticipants
);

// Mark attendance using QR registration code
router.post(
  "/:id/attendance",
  authenticate,
  authorize("faculty", "admin"),
  markAttendance
);
router.get(
  "/:id/results",
  authenticate,
  authorize("faculty", "admin"),
  getEventResults
);

router.post(
  "/:id/results",
  authenticate,
  authorize("faculty", "admin"),
  addEventResult
);

router.put(
  "/:id/results/:resultId",
  authenticate,
  authorize("faculty", "admin"),
  updateEventResult
);

router.delete(
  "/:id/results/:resultId",
  authenticate,
  authorize("faculty", "admin"),
  deleteEventResult
);

/*
 * Public event details.
 *
 * optionalAuthenticate lets the handler recognise the
 * organizer (so they can preview their own draft) while
 * still serving anonymous visitors.
 */
router.get("/:id", optionalAuthenticate, getEventById);

// Create event
router.post(
  "/",
  authenticate,
  authorize("faculty", "admin"),
  createEvent
);

// Change event status
router.put(
  "/:id/status",
  authenticate,
  authorize("faculty", "admin"),
  updateEventStatus
);

export default router;