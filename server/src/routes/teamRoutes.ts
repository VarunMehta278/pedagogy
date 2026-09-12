import { Router } from "express";

import {
  addTeamMember,
  createTeam,
  getEventTeams,
  getMyTeamForEvent,
  getMyTeams,
  getTeamById,
  joinTeam,
  removeTeamMember,
  transferLeadership,
  updateTeam,
} from "../controllers/teamController";
import {
  authenticate,
  authorize,
} from "../middleware/authMiddleware";

/*
 * Team routes, mounted at /api.
 *
 * Every route authenticates. Role checks are the coarse filter; each
 * handler then confirms the caller's relationship to the specific
 * team or event, because "is a student" must never be enough to touch
 * somebody else's team.
 */
const router = Router();

/* ---- the caller's own teams ---- */

router.get("/teams/me", authenticate, getMyTeams);

router.get("/teams/:teamId", authenticate, getTeamById);

/* ---- teams within an event ---- */

/*
 * Readable by the organiser, an admin, or a judge or volunteer
 * assigned to the event. The handler decides; a student hits
 * /events/:eventId/teams/me instead.
 */
router.get(
  "/events/:eventId/teams",
  authenticate,
  authorize("faculty", "admin", "judge", "volunteer"),
  getEventTeams
);

router.get(
  "/events/:eventId/teams/me",
  authenticate,
  authorize("student"),
  getMyTeamForEvent
);

router.post(
  "/events/:eventId/teams",
  authenticate,
  authorize("student"),
  createTeam
);

router.post(
  "/events/:eventId/teams/join",
  authenticate,
  authorize("student"),
  joinTeam
);

/* ---- one team ---- */

router.patch(
  "/events/:eventId/teams/:teamId",
  authenticate,
  authorize("student", "faculty", "admin"),
  updateTeam
);

router.post(
  "/events/:eventId/teams/:teamId/leader",
  authenticate,
  authorize("student", "faculty", "admin"),
  transferLeadership
);

router.post(
  "/events/:eventId/teams/:teamId/members",
  authenticate,
  authorize("student", "faculty", "admin"),
  addTeamMember
);

router.delete(
  "/events/:eventId/teams/:teamId/members/:studentId",
  authenticate,
  authorize("student", "faculty", "admin"),
  removeTeamMember
);

export default router;
