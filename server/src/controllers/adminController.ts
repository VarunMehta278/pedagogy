import { Response } from "express";

import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/authMiddleware";

export const getAdminDashboard = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    /*
     * ----------------------------------------------------
     * DASHBOARD DATA
     * ----------------------------------------------------
     *
     * These were previously eleven awaits in a row, so the
     * page waited for eleven sequential round trips. They
     * are independent, so they run together instead.
     */

    const countOf = (
      table: string,
      column?: string,
      value?: string
    ) => {
      const query = supabase
        .from(table)
        .select("id", {
          count: "exact",
          head: true,
        });

      if (column && value) {
        return column === "status:not"
          ? query.neq("status", value)
          : query.eq(column, value);
      }

      return query;
    };

    const [
      usersResult,
      studentsResult,
      facultyResult,
      adminsResult,
      eventsResult,
      publishedResult,
      ongoingResult,
      completedResult,
      registrationsResult,
      attendedResult,
      certificatesResult,
      winnerCertificatesResult,
      participationCertificatesResult,
      recentEventsResult,
      recentRegistrationsResult,
    ] = await Promise.all([
      countOf("users"),
      countOf("users", "role", "student"),
      countOf("users", "role", "faculty"),
      countOf("users", "role", "admin"),

      countOf("events"),
      countOf("events", "status", "published"),
      countOf("events", "status", "ongoing"),
      countOf("events", "status", "completed"),

      countOf("registrations", "status:not", "cancelled"),
      countOf("registrations", "status", "attended"),

      countOf("certificates"),
      countOf(
        "certificates",
        "certificate_type",
        "winner"
      ),
      countOf(
        "certificates",
        "certificate_type",
        "participation"
      ),

      supabase
        .from("events")
        .select(`
          id,
          title,
          category,
          event_date,
          venue,
          status,
          participant_limit
        `)
        .order("created_at", {
          ascending: false,
        })
        .limit(6),

      supabase
        .from("registrations")
        .select(`
          id,
          registration_code,
          status,
          registered_at,
          events (
            id,
            title,
            event_date
          ),
          users (
            id,
            name,
            email,
            department,
            year
          )
        `)
        .neq("status", "cancelled")
        .order("registered_at", {
          ascending: false,
        })
        .limit(8),
    ]);

    const labelledResults: Array<[string, { error: unknown }]> = [
      ["user statistics", usersResult],
      ["student statistics", studentsResult],
      ["faculty statistics", facultyResult],
      ["admin statistics", adminsResult],
      ["event statistics", eventsResult],
      ["published event statistics", publishedResult],
      ["ongoing event statistics", ongoingResult],
      ["completed event statistics", completedResult],
      ["registration statistics", registrationsResult],
      ["attendance statistics", attendedResult],
      ["certificate statistics", certificatesResult],
      [
        "winner certificate statistics",
        winnerCertificatesResult,
      ],
      [
        "participation certificate statistics",
        participationCertificatesResult,
      ],
      ["recent events", recentEventsResult],
      ["recent registrations", recentRegistrationsResult],
    ];

    for (const [label, result] of labelledResults) {
      if (result.error) {
        console.error(
          `Admin dashboard ${label} error:`,
          result.error
        );

        throw new Error(
          `Failed to fetch ${label}`
        );
      }
    }

    const totalUsers = usersResult.count;
    const totalStudents = studentsResult.count;
    const totalFaculty = facultyResult.count;
    const totalAdmins = adminsResult.count;

    const totalEvents = eventsResult.count;
    const publishedEvents = publishedResult.count;
    const ongoingEvents = ongoingResult.count;
    const completedEvents = completedResult.count;

    const totalRegistrations =
      registrationsResult.count;
    const attendedRegistrations =
      attendedResult.count;

    const totalCertificates =
      certificatesResult.count;
    const winnerCertificates =
      winnerCertificatesResult.count;
    const participationCertificates =
      participationCertificatesResult.count;

    const recentEvents = recentEventsResult.data;
    const recentRegistrations =
      recentRegistrationsResult.data;


    /*
     * ----------------------------------------------------
     * RESPONSE
     * ----------------------------------------------------
     */

    return res.json({
      success: true,

      stats: {
        users: {
          total: totalUsers || 0,
          students: totalStudents || 0,
          faculty: totalFaculty || 0,
          admins: totalAdmins || 0,
        },

        events: {
          total: totalEvents || 0,
          published: publishedEvents || 0,
          ongoing: ongoingEvents || 0,
          completed: completedEvents || 0,
        },

        registrations: {
          total: totalRegistrations || 0,
          attended: attendedRegistrations || 0,
        },

        certificates: {
          total: totalCertificates || 0,
          winners: winnerCertificates || 0,
          participation:
            participationCertificates || 0,
        },
      },

      recentEvents: recentEvents || [],

      recentRegistrations:
        recentRegistrations || [],
    });
  } catch (error) {
    console.error(
      "Admin dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load admin dashboard",
    });
  }
};