import { Router } from "express";

import {
  getMyVolunteerEvents,
  getVolunteerParticipants,
} from "../controllers/volunteerController";
import { markAttendance } from "../controllers/eventController";
import {
  authenticate,
  authorize,
} from "../middleware/authMiddleware";

/*
 * Volunteer-only surface: assigned events, participant lookup and
 * QR check-in.
 *
 * Check-in reuses the same markAttendance handler faculty use, so
 * there is one implementation of attendance rather than two that
 * can drift apart. That handler checks the volunteer's assignment
 * before writing anything.
 */
const router = Router();

router.use(authenticate, authorize("volunteer"));

router.get("/events", getMyVolunteerEvents);

router.get("/events/:id/participants", getVolunteerParticipants);

router.post("/events/:id/attendance", markAttendance);

export default router;
