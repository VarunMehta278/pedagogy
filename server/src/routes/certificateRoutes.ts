import { Router } from "express";

import {
  generateWinnerCertificate,
  generateParticipationCertificate,
  downloadCertificate,
  verifyCertificate,
  getMyCertificates,
} from "../controllers/certificateController";

import {
  authenticate,
  authorize,
} from "../middleware/authMiddleware";

const router = Router();

/*
 * Faculty/Admin
 */

/*
 * Generate winner certificate
 */
router.post(
  "/events/:id/results/:resultId",
  authenticate,
  authorize("faculty", "admin"),
  generateWinnerCertificate
);

/*
 * Generate participation certificate
 */
router.post(
  "/events/:id/students/:studentId",
  authenticate,
  authorize("faculty", "admin"),
  generateParticipationCertificate
);


/*
 * Student
 */
router.get(
  "/me",
  authenticate,
  authorize("student"),
  getMyCertificates
);


/*
 * Public certificate endpoints
 */

/*
 * View/download PDF
 */
router.get(
  "/:certificateCode/pdf",
  downloadCertificate
);

/*
 * Verify certificate
 */
router.get(
  "/:certificateCode",
  verifyCertificate
);

export default router;
