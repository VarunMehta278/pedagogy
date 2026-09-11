import { Response } from "express";

import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/authMiddleware";

/*
 * GET ADMIN ANALYTICS
 * GET /api/admin/analytics
 */
export const getAdminAnalytics = async (
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
     * Fetch the core datasets.
     *
     * These used to be plain .select() calls. PostgREST
     * caps a request at 1000 rows, so past that every
     * figure below — totals, rates, distributions — was
     * silently computed from the first 1000 rows only
     * and quietly understated. Each dataset is now paged
     * through to the end.
     */
    const PAGE_SIZE = 1000;

    const fetchAll = async (
      table: string,
      columns: string,
      refine?: (query: any) => any
    ) => {
      const rows: any[] = [];

      for (let page = 0; ; page += 1) {
        const from = page * PAGE_SIZE;

        let query = supabase
          .from(table)
          .select(columns)
          .range(from, from + PAGE_SIZE - 1);

        if (refine) {
          query = refine(query);
        }

        const { data, error } = await query;

        if (error) {
          return { data: rows, error };
        }

        const batch = data || [];

        rows.push(...batch);

        if (batch.length < PAGE_SIZE) {
          return { data: rows, error: null };
        }

        /*
         * Defensive stop: without it a table that keeps
         * returning full pages would loop indefinitely.
         */
        if (page > 200) {
          return { data: rows, error: null };
        }
      }
    };

    const [
      usersResult,
      eventsResult,
      registrationsResult,
      attendanceResult,
      certificatesResult,
    ] = await Promise.all([
      fetchAll(
        "users",
        "id, name, email, role, department, year, created_at"
      ),

      fetchAll(
        "events",
        "id, title, category, event_date, status, participant_limit, organizer_id"
      ),

      fetchAll(
        "registrations",
        "id, event_id, student_id, status, registered_at",
        (query) => query.neq("status", "cancelled")
      ),

      fetchAll(
        "attendance",
        "id, event_id, student_id, attended_at"
      ),

      fetchAll(
        "certificates",
        "id, event_id, student_id, certificate_type, issued_at"
      ),
    ]);

    /*
     * A failed query used to be logged and then treated
     * as an empty result, so the dashboard reported a
     * confident zero instead of an error — the worst
     * outcome for numbers someone makes decisions from.
     * Any core query failing is now surfaced.
     */
    const failedQueries: Array<[string, unknown]> = [
      ["users", usersResult.error],
      ["events", eventsResult.error],
      ["registrations", registrationsResult.error],
      ["attendance", attendanceResult.error],
      ["certificates", certificatesResult.error],
    ].filter(
      ([, error]) => Boolean(error)
    ) as Array<[string, unknown]>;

    if (failedQueries.length > 0) {
      failedQueries.forEach(([name, error]) => {
        console.error(
          `Analytics ${name} error:`,
          error
        );
      });

      return res.status(500).json({
        success: false,
        message:
          "Failed to generate analytics",
      });
    }

    const users = usersResult.data || [];
    const events = eventsResult.data || [];
    const registrations =
      registrationsResult.data || [];
    const attendance =
      attendanceResult.data || [];
    const certificates =
      certificatesResult.data || [];

    /*
     * ------------------------------------------------
     * USER ANALYTICS
     * ------------------------------------------------
     */

    const totalUsers = users.length;

    const students = users.filter(
      (user) => user.role === "student"
    ).length;

    const faculty = users.filter(
      (user) => user.role === "faculty"
    ).length;

    const admins = users.filter(
      (user) => user.role === "admin"
    ).length;

    /*
     * Department participation.
     */
    const departmentMap: Record<
      string,
      number
    > = {};

    users
      .filter(
        (user) =>
          user.role === "student" &&
          user.department
      )
      .forEach((user) => {
        const department =
          user.department || "Unknown";

        departmentMap[department] =
          (departmentMap[department] || 0) +
          1;
      });

    const departmentDistribution =
      Object.entries(departmentMap)
        .map(
          ([department, count]) => ({
            department,
            count,
          })
        )
        .sort(
          (a, b) =>
            b.count - a.count
        );

    /*
     * ------------------------------------------------
     * EVENT ANALYTICS
     * ------------------------------------------------
     */

    const totalEvents = events.length;

    const publishedEvents =
      events.filter(
        (event) =>
          event.status === "published"
      ).length;

    const ongoingEvents =
      events.filter(
        (event) =>
          event.status === "ongoing"
      ).length;

    const completedEvents =
      events.filter(
        (event) =>
          event.status === "completed"
      ).length;

    const draftEvents =
      events.filter(
        (event) =>
          event.status === "draft"
      ).length;

    const cancelledEvents =
      events.filter(
        (event) =>
          event.status === "cancelled"
      ).length;

    /*
     * Event categories.
     */
    const categoryMap: Record<
      string,
      number
    > = {};

    events.forEach((event) => {
      categoryMap[event.category] =
        (categoryMap[event.category] || 0) +
        1;
    });

    const categoryDistribution =
      Object.entries(categoryMap)
        .map(
          ([category, count]) => ({
            category,
            count,
          })
        )
        .sort(
          (a, b) =>
            b.count - a.count
        );

    /*
     * ------------------------------------------------
     * REGISTRATION ANALYTICS
     * ------------------------------------------------
     */

    const totalRegistrations =
      registrations.length;

    const attendedRegistrations =
      registrations.filter(
        (registration) =>
          registration.status ===
          "attended"
      ).length;

    /*
     * Attendance table is the source of truth
     * for actual attendance.
     */
    const uniqueAttendanceStudents =
      new Set(
        attendance.map(
          (record) =>
            `${record.event_id}:${record.student_id}`
        )
      );

    const totalAttendance =
      uniqueAttendanceStudents.size;

    const attendanceRate =
      totalRegistrations > 0
        ? Number(
            (
              (totalAttendance /
                totalRegistrations) *
              100
            ).toFixed(1)
          )
        : 0;

    /*
     * Average registrations per event.
     */
    const averageRegistrationsPerEvent =
      totalEvents > 0
        ? Number(
            (
              totalRegistrations /
              totalEvents
            ).toFixed(1)
          )
        : 0;

    /*
     * ------------------------------------------------
     * EVENT PERFORMANCE
     * ------------------------------------------------
     */

    const registrationCountMap: Record<
      string,
      number
    > = {};

    registrations.forEach(
      (registration) => {
        registrationCountMap[
          registration.event_id
        ] =
          (registrationCountMap[
            registration.event_id
          ] || 0) + 1;
      }
    );

    const attendanceCountMap: Record<
      string,
      number
    > = {};

    attendance.forEach((record) => {
      attendanceCountMap[
        record.event_id
      ] =
        (attendanceCountMap[
          record.event_id
        ] || 0) + 1;
    });

    const eventPerformance = events
      .map((event) => {
        const registrationCount =
          registrationCountMap[
            event.id
          ] || 0;

        const attendanceCount =
          attendanceCountMap[
            event.id
          ] || 0;

        const capacity =
          event.participant_limit || null;

        const fillRate =
          capacity && capacity > 0
            ? Number(
                (
                  (registrationCount /
                    capacity) *
                  100
                ).toFixed(1)
              )
            : null;

        return {
          id: event.id,
          title: event.title,
          category: event.category,
          event_date:
            event.event_date,
          status: event.status,
          participant_limit:
            capacity,
          registrations:
            registrationCount,
          attendance:
            attendanceCount,
          fill_rate: fillRate,
        };
      })
      .sort(
        (a, b) =>
          b.registrations -
          a.registrations
      );

    /*
     * Top 5 most popular events.
     */
    const popularEvents =
      eventPerformance.slice(0, 5);

    /*
     * ------------------------------------------------
     * REGISTRATION TREND
     * ------------------------------------------------
     */

    const registrationTrendMap: Record<
      string,
      number
    > = {};

    registrations.forEach(
      (registration) => {
        const date =
          registration.registered_at
            ? new Date(
                registration.registered_at
              )
                .toISOString()
                .slice(0, 10)
            : null;

        if (!date) return;

        registrationTrendMap[date] =
          (registrationTrendMap[date] ||
            0) + 1;
      }
    );

    const registrationTrend =
      Object.entries(
        registrationTrendMap
      )
        .map(
          ([date, count]) => ({
            date,
            count,
          })
        )
        .sort(
          (a, b) =>
            a.date.localeCompare(
              b.date
            )
        )
        .slice(-30);

    /*
     * ------------------------------------------------
     * MONTHLY REGISTRATION TREND
     * ------------------------------------------------
     */

    const monthlyMap: Record<
      string,
      number
    > = {};

    registrations.forEach(
      (registration) => {
        if (!registration.registered_at) {
          return;
        }

        const date = new Date(
          registration.registered_at
        );

        const key = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        monthlyMap[key] =
          (monthlyMap[key] || 0) + 1;
      }
    );

    const monthlyRegistrationTrend =
      Object.entries(monthlyMap)
        .map(
          ([month, count]) => ({
            month,
            count,
          })
        )
        .sort(
          (a, b) =>
            a.month.localeCompare(
              b.month
            )
        )
        .slice(-12);

    /*
     * ------------------------------------------------
     * CERTIFICATE ANALYTICS
     * ------------------------------------------------
     */

    const totalCertificates =
      certificates.length;

    const winnerCertificates =
      certificates.filter(
        (certificate) =>
          certificate.certificate_type ===
          "winner"
      ).length;

    const participationCertificates =
      certificates.filter(
        (certificate) =>
          certificate.certificate_type ===
          "participation"
      ).length;

    /*
     * ------------------------------------------------
     * EVENT STATUS DISTRIBUTION
     * ------------------------------------------------
     */

    const eventStatusDistribution = [
      {
        status: "Draft",
        count: draftEvents,
      },
      {
        status: "Published",
        count: publishedEvents,
      },
      {
        status: "Ongoing",
        count: ongoingEvents,
      },
      {
        status: "Completed",
        count: completedEvents,
      },
      {
        status: "Cancelled",
        count: cancelledEvents,
      },
    ];

    /*
     * ------------------------------------------------
     * RETURN ANALYTICS
     * ------------------------------------------------
     */

    return res.json({
      success: true,

      overview: {
        total_users: totalUsers,
        students,
        faculty,
        admins,

        total_events: totalEvents,
        published_events:
          publishedEvents,
        ongoing_events:
          ongoingEvents,
        completed_events:
          completedEvents,

        total_registrations:
          totalRegistrations,

        total_attendance:
          totalAttendance,

        attendance_rate:
          attendanceRate,

        average_registrations_per_event:
          averageRegistrationsPerEvent,

        total_certificates:
          totalCertificates,

        winner_certificates:
          winnerCertificates,

        participation_certificates:
          participationCertificates,
      },

      department_distribution:
        departmentDistribution,

      category_distribution:
        categoryDistribution,

      event_status_distribution:
        eventStatusDistribution,

      registration_trend:
        registrationTrend,

      monthly_registration_trend:
        monthlyRegistrationTrend,

      popular_events:
        popularEvents,

      event_performance:
        eventPerformance,
    });
  } catch (error) {
    console.error(
      "Admin analytics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate analytics",
    });
  }
};