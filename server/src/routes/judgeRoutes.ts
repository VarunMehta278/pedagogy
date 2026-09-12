import { Router } from "express";

import {
  getJudgeEventDetail,
  getMyJudgeEvents,
} from "../controllers/judgeController";
import {
  getMyEvaluations,
  submitEvaluation,
} from "../controllers/evaluationController";
import {
  authenticate,
  authorize,
} from "../middleware/authMiddleware";

/*
 * Judge-only surface.
 *
 * Every route is authenticate + authorize("judge"). Beyond the role
 * check, each handler also confirms the judge is assigned to the
 * event in question — the role alone grants nothing.
 */
const router = Router();

router.use(authenticate, authorize("judge"));

router.get("/events", getMyJudgeEvents);

router.get("/events/:id", getJudgeEventDetail);

router.get("/events/:id/evaluations", getMyEvaluations);

router.post("/events/:id/evaluations", submitEvaluation);

export default router;
