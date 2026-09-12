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
  assignJudges,
  assignVolunteers,
  getEventJudges,
  getEventVolunteers,
  removeJudge,
  removeVolunteer,
} from "../controllers/assignmentController";

import {
  getEvaluationCriteria,
  setEvaluationCriteria,
} from "../controllers/criteriaController";

import {
  finalizeResults,
  getEvaluationSummary,
} from "../controllers/evaluationController";

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
 * ------------------------------------------------------------------
 * Judging and volunteering — faculty and admin only.
 *
 * These sit above the public "/:id" route for the same reason
 * "/manage" does: Express matches in order, and "/:id" would
 * otherwise swallow "/:id/judges".
 * ------------------------------------------------------------------
 */

router.get(
  "/:id/judges",
  authenticate,
  authorize("faculty", "admin"),
  getEventJudges
);

router.post(
  "/:id/judges",
  authenticate,
  authorize("faculty", "admin"),
  assignJudges
);

router.delete(
  "/:id/judges/:userId",
  authenticate,
  authorize("faculty", "admin"),
  removeJudge
);

router.get(
  "/:id/volunteers",
  authenticate,
  authorize("faculty", "admin"),
  getEventVolunteers
);

router.post(
  "/:id/volunteers",
  authenticate,
  authorize("faculty", "admin"),
  assignVolunteers
);

router.delete(
  "/:id/volunteers/:userId",
  authenticate,
  authorize("faculty", "admin"),
  removeVolunteer
);

/*
 * Criteria are readable by an assigned judge too — the controller
 * decides, because a judge has to know what they are scoring
 * against.
 */
router.get(
  "/:id/criteria",
  authenticate,
  authorize("faculty", "admin", "judge"),
  getEvaluationCriteria
);

router.put(
  "/:id/criteria",
  authenticate,
  authorize("faculty", "admin"),
  setEvaluationCriteria
);

router.get(
  "/:id/evaluations",
  authenticate,
  authorize("faculty", "admin"),
  getEvaluationSummary
);

router.post(
  "/:id/finalize",
  authenticate,
  authorize("faculty", "admin"),
  finalizeResults
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