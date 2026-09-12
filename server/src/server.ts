import express, {
  NextFunction,
  Request,
  Response,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { supabase } from "./config/supabase";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import eventRoutes from "./routes/eventRoutes";
import registrationRoutes from "./routes/registrationRoutes";
import certificateRoutes from "./routes/certificateRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import adminRoutes from "./routes/adminRoutes";
import adminEventRoutes from "./routes/adminEventRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import judgeRoutes from "./routes/judgeRoutes";
import volunteerRoutes from "./routes/volunteerRoutes";
import teamRoutes from "./routes/teamRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // such as server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      /*
       * Rejecting with an Error made this throw, and with
       * no error handler mounted Express answered with a
       * 500 HTML page containing a full stack trace and
       * absolute file paths. Signalling "not allowed"
       * instead simply omits the CORS headers, which is
       * what actually blocks the browser.
       */
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use(
  "/api/certificates",
  certificateRoutes
);
app.use(
  "/api/notifications",
  notificationRoutes
);
app.use("/api/admin", adminRoutes);
app.use(
  "/api/admin/events",
  adminEventRoutes
);
app.use(
  "/api/admin/analytics",
  analyticsRoutes
);
app.use("/api/judge", judgeRoutes);
app.use("/api/volunteer", volunteerRoutes);

/*
 * Team routes are mounted at /api rather than under a prefix because
 * they span two shapes: /api/teams/... and /api/events/:id/teams/...
 * Mounted AFTER eventRoutes so the existing /api/events routes keep
 * first claim on their paths.
 */
app.use("/api", teamRoutes);


// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Pedagogy API is running 🚀",
  });
});
app.get("/api/test-db", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Supabase error:", error);

      return res.status(500).json({
        success: false,
        message: "Database connection failed",
      });
    }

    res.json({
      success: true,
      message: "Supabase database connected successfully 🚀",
      data,
    });
  } catch (error) {
    console.error("Database error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});
/*
 * Unknown API routes answer in JSON, so a typo in a path
 * gives the client a parseable error instead of an HTML
 * page it cannot read.
 */
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/*
 * Catch-all error handler.
 *
 * Without one, anything thrown or passed to next(err)
 * reached Express's default handler, which replies with
 * an HTML page containing the stack trace and absolute
 * file paths. The details are logged server-side and the
 * client gets a plain JSON message.
 */
app.use(
  (
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(
      `Unhandled error on ${req.method} ${req.originalUrl}:`,
      error
    );

    if (res.headersSent) {
      return;
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Pedagogy API running on http://localhost:${PORT}`);
});