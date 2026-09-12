import { Response } from "express";

import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  denyUnlessVolunteerAssigned,
  paramId,
  sendDenial,
} from "../middleware/eventAccess";

/*
 * Everything a volunteer can see.
 *
 * Like the judge endpoints, every read starts from the assignment
 * table, so an unassigned event is invisible rather than forbidden.
 *
 * A volunteer can look participants up and check them in. They
 * cannot see or touch results, certificates or event settings —
 * those endpoints never accept the volunteer role.
 */

export const getMyVolunteerEvents = async (
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

    const { data, error } = await supabase
      .from("event_volunteers")
      .select(
        `
        id,
        assigned_at,
        event:events!event_volunteers_event_id_fkey (
          id,
          title,
          description,
          category,
          event_date,
          start_time,
          end_time,
          venue,
          status,
          image_url,
          organizer:users!events_organizer_id_fkey (
            id, name, department
          )
        )
      `
      )
      .eq("volunteer_id", req.user.userId)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("Volunteer events error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch your assigned events",
      });
    }

    const events = (data || [])
      .map((row) =>
        Array.isArray(row.event) ? row.event[0] : row.event
      )
      .filter(Boolean);

    const withCounts = await Promise.all(
      events.map(async (event: any) => {
        const [{ count: registered }, { count: attended }] =
          await Promise.all([
            supabase
              .from("registrations")
              .select("id", { count: "exact", head: true })
              .eq("event_id", event.id)
              .neq("status", "cancelled"),
            supabase
              .from("attendance")
              .select("id, registrations!inner(event_id)", {
                count: "exact",
                head: true,
              })
              .eq("registrations.event_id", event.id),
          ]);

        return {
          ...event,
          registered_count: registered ?? 0,
          attended_count: attended ?? 0,
        };
      })
    );

    return res.status(200).json({
      success: true,
      events: withCounts,
    });
  } catch (error) {
    console.error("Volunteer events error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/*
 * Participant lookup for the check-in desk.
 *
 * ?q= filters by name, email or registration code, so a volunteer
 * can find someone whose QR will not scan.
 */
export const getVolunteerParticipants = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const eventId = paramId(req.params.id);

    if (!eventId || !req.user) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required",
      });
    }

    const denial = await denyUnlessVolunteerAssigned(req, eventId);

    if (denial) return sendDenial(res, denial);

    const { data: registrations, error } = await supabase
      .from("registrations")
      .select(
        `
        id,
        registration_code,
        status,
        registered_at,
        student:users!registrations_student_id_fkey (
          id, name, email, department, year, profile_image
        )
      `
      )
      .eq("event_id", eventId)
      .order("registered_at", { ascending: true });

    if (error) {
      console.error("Volunteer participants error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch participants",
      });
    }

    /*
     * Attendance lives in its own table rather than as a column on
     * registrations, so it is joined the same way the faculty
     * participants endpoint already does it.
     */
    const registrationIds = (registrations || []).map(
      (row) => row.id
    );

    let attendance: {
      registration_id: string;
      attended_at: string | null;
    }[] = [];

    if (registrationIds.length > 0) {
      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("attendance")
          .select("registration_id, attended_at")
          .in("registration_id", registrationIds);

      if (attendanceError) {
        console.error("Volunteer attendance error:", attendanceError);

        return res.status(500).json({
          success: false,
          message: "Failed to fetch attendance",
        });
      }

      attendance = attendanceData || [];
    }

    const data = (registrations || []).map((row) => {
      const record = attendance.find(
        (item) => item.registration_id === row.id
      );

      return {
        ...row,
        attended: Boolean(record),
        attended_at: record?.attended_at ?? null,
      };
    });

    const query =
      typeof req.query.q === "string"
        ? req.query.q.trim().toLowerCase()
        : "";

    const rows = data || [];

    const filtered = query
      ? rows.filter((row) => {
          const student = Array.isArray(row.student)
            ? row.student[0]
            : row.student;

          return (
            row.registration_code
              ?.toLowerCase()
              .includes(query) ||
            student?.name?.toLowerCase().includes(query) ||
            student?.email?.toLowerCase().includes(query)
          );
        })
      : rows;

    const active = rows.filter(
      (row) => row.status !== "cancelled"
    );

    return res.status(200).json({
      success: true,
      participants: filtered,
      stats: {
        registered: active.length,
        attended: active.filter((row) => row.attended).length,
        cancelled: rows.length - active.length,
      },
    });
  } catch (error) {
    console.error("Volunteer participants error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
