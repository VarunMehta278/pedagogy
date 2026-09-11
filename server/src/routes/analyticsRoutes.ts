import { Router } from "express";

import {
  getAdminAnalytics,
} from "../controllers/analyticsController";

import {
  authenticate,
  authorize,
} from "../middleware/authMiddleware";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("admin"),
  getAdminAnalytics
);

export default router;