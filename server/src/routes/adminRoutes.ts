import { Router } from "express";

import { getAdminDashboard } from "../controllers/adminController";
import {
  authenticate,
  authorize,
} from "../middleware/authMiddleware";

const router = Router();

router.get(
  "/dashboard",
  authenticate,
  authorize("admin"),
  getAdminDashboard
);

export default router;