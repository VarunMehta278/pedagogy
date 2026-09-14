import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/authMiddleware";
import { isVolunteerAssigned } from "../middleware/eventAccess";
import { isUniqueViolation } from "../utils/dbErrors";
import { validateTeamConfig } from "../utils/teams";
import { createNotification } from "../services/notificationService";
import { getOrdinalPosition } from "../utils/ordinals";
export const createEvent = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const {
      title,
      description,
      category,
      event_date,
      start_time,
      end_time,
      venue,
      registration_deadline,
      participant_limit,
      participation_type,
      min_team_size,
      max_team_size,
      rules,
      image_url,
    } = req.body;

    // Validate required fields
    if (!title || !category || !event_date || !venue) {
      return res.status(400).json({
        success: false,
        message: "Title, category, event date and venue are required",
      });
    }

    /*
     * A deadline after the event, or a non-positive
     * capacity, are contradictions the UI should not be
     * able to send — but the API is what has to hold the
     * line, since it is reachable directly.
     */
    if (
      registration_deadline &&
      new Date(registration_deadline) >
        new Date(`${event_date}T23:59:59`)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Registration deadline cannot be after the event date",
      });
    }

    if (
      participant_limit !== undefined &&
      participant_limit !== null &&
      participant_limit !== "" &&
      (!Number.isInteger(Number(participant_limit)) ||
        Number(participant_limit) < 1)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Participant limit must be a positive whole number",
      });
    }

    if (
      start_time &&
      end_time &&
      start_time >= end_time
    ) {
      return res.status(400).json({
        success: false,
        message:
          "End time must be later than start time",
      });
    }

    // Make sure the user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    /*
     * Team settings. Omitting them keeps the event individual, which
     * is exactly how every event behaved before teams existed — so an
     * older client that does not send these fields is unaffected.
     */
    const resolvedParticipation =
      participation_type === "team" ? "team" : "individual";

    const resolvedMin =
      resolvedParticipation === "team"
        ? Number(min_team_size ?? 1)
        : 1;

    const resolvedMax =
      resolvedParticipation === "team"
        ? Number(max_team_size ?? resolvedMin)
        : 1;

    const teamProblem = validateTeamConfig(
      resolvedParticipation,
      resolvedMin,
      resolvedMax
    );

    if (teamProblem) {
      return res.status(400).json({
        success: false,
        message: teamProblem,
      });
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        title: title.trim(),
        description: description || null,
        category: category.trim(),
        event_date,
        start_time: start_time || null,
        end_time: end_time || null,
        venue: venue.trim(),
        registration_deadline: registration_deadline || null,
        participant_limit: participant_limit || null,
        rules: rules || null,
        image_url: image_url || null,
        status: "draft",
        organizer_id: req.user.userId,
        participation_type: resolvedParticipation,
        min_team_size: resolvedMin,
        max_team_size: resolvedMax,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Create event error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create event",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.error("Create event error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const getEvents = async (
  req: Request,
  res: Response
) => {
  try {
    const { data: events, error } = await supabase
      .from("events")
      .select(`
        id,
        title,
        description,
        category,
        event_date,
        start_time,
        end_time,
        venue,
        registration_deadline,
        participant_limit,
        rules,
        image_url,
        status,
        participation_type,
        min_team_size,
        max_team_size,
        organizer_id,
        created_at,
        organizer:users!events_organizer_id_fkey (
          id,
          name,
          department
        )
      `)
      /*
       * An event that has started is still a real event:
       * it belongs in the public list so people can find
       * it on the day, and so links to it keep working.
       * Only published and ongoing are advertised here —
       * drafts are private and finished events would just
       * bury the upcoming ones.
       */
      .in("status", ["published", "ongoing"])
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Get events error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch events",
      });
    }

    return res.status(200).json({
      success: true,
      events,
    });
  } catch (error) {
    console.error("Get events error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const getEventById = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const eventId = Array.isArray(id) ? id[0] : id;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required",
      });
    }

    /*
     * This used to filter on status = "published", which
     * meant the page 404'd the moment an event moved on
     * to "ongoing", "completed" or "cancelled" — so the
     * link died exactly when the event was happening, and
     * students who had registered lost the page holding
     * their QR code. The status is fetched instead and
     * judged below.
     */
    const { data: event, error } = await supabase
      .from("events")
      .select(`
        id,
        title,
        description,
        category,
        event_date,
        start_time,
        end_time,
        venue,
        registration_deadline,
        participant_limit,
        rules,
        image_url,
        status,
        participation_type,
        min_team_size,
        max_team_size,
        organizer_id,
        created_at,
        organizer:users!events_organizer_id_fkey (
          id,
          name,
          department
        )
      `)
      .eq("id", eventId)
      .maybeSingle();

    if (error) {
      console.error("Get event error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch event",
      });
    }

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    /*
     * A draft is visible to the person writing it, to
     * admins, and to other faculty — colleagues need to
     * see what is being planned. Students and anonymous
     * visitors get the same 404 as a nonexistent event, so
     * the response still cannot be used to discover which
     * drafts exist.
     */
    if (event.status === "draft") {
      const viewer = req.user;

      const isOrganizer =
        !!viewer &&
        viewer.userId === event.organizer_id;

      let isColleague = false;

      if (viewer && !isOrganizer) {
        /*
         * The role inside the token can be up to a week
         * stale, so it is confirmed against the database
         * before it unlocks anything.
         */
        const { data: account } = await supabase
          .from("users")
          .select("role")
          .eq("id", viewer.userId)
          .maybeSingle();

        isColleague =
          account?.role === "admin" ||
          account?.role === "faculty";
      }

      if (!isOrganizer && !isColleague) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }
    }

    return res.status(200).json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("Get event error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const getMyEvents = async (
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

    let query = supabase
      .from("events")
      .select(`
        id,
        title,
        description,
        category,
        event_date,
        start_time,
        end_time,
        venue,
        registration_deadline,
        participant_limit,
        rules,
        image_url,
        status,
        organizer_id,
        created_at,
        updated_at,
        organizer:users!events_organizer_id_fkey (
          id,
          name,
          department
        )
      `)
      .order("event_date", { ascending: true });

    /*
     * Faculty see every event here, not only their own. A
     * draft being written in another department still has
     * to be visible, or two people book the same hall on
     * the same evening and nobody finds out until the day.
     *
     * Seeing is not managing. can_manage marks which rows
     * this person may actually change, and it is only an
     * affordance for the UI — every mutating route checks
     * organizer_id again on the server, so a client that
     * ignores the flag still gets a 403.
     */
    const { data, error } = await query;

    if (error) {
      console.error("Get managed events error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch managed events",
      });
    }

    const viewerId = req.user.userId;
    const viewerIsAdmin = req.user.role === "admin";

    const events = (data || []).map(
      (event: { organizer_id: string | null }) => ({
        ...event,
        can_manage:
          viewerIsAdmin ||
          event.organizer_id === viewerId,
      })
    );

    return res.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error("Managed events error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};
export const updateEventStatus = async (
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

    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "draft",
      "published",
      "ongoing",
      "completed",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event status",
      });
    }

    const { data: existingEvent, error: findError } = await supabase
      .from("events")
      .select("id, organizer_id")
      .eq("id", id)
      .single();

    if (findError || !existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Faculty can only modify their own events.
    if (
      req.user.role === "faculty" &&
      existingEvent.organizer_id !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only manage your own events",
      });
    }

    const { data, error } = await supabase
      .from("events")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.error("Update event status error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update event status",
      });
    }

    return res.json({
      success: true,
      message: `Event marked as ${status}`,
      event: data,
    });
  } catch (error) {
    console.error("Event status error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};
export const getEventParticipants = async (
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

    const eventId = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

    // Check event ownership
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, organizer_id, participant_limit")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (
      req.user.role === "faculty" &&
      event.organizer_id !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only manage your own events",
      });
    }

    const { data: registrations, error } = await supabase
      .from("registrations")
      .select(`
        id,
        registration_code,
        status,
        registered_at,
        student:users!registrations_student_id_fkey (
          id,
          name,
          email,
          department,
          year,
          profile_image
        )
      `)
      .eq("event_id", eventId)
      .order("registered_at", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Get event participants error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch participants",
      });
    }

    const registrationIds = (registrations || []).map(
      (registration) => registration.id
    );

    let attendance: any[] = [];

    if (registrationIds.length > 0) {
      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("attendance")
          .select(
            "id, registration_id, attended_at, marked_by"
          )
          .in("registration_id", registrationIds);

      if (attendanceError) {
        console.error(
          "Get attendance error:",
          attendanceError
        );

        return res.status(500).json({
          success: false,
          message: "Failed to fetch attendance",
        });
      }

      attendance = attendanceData || [];
    }

    const participants = (registrations || []).map(
      (registration) => {
        const attendanceRecord = attendance.find(
          (item) =>
            item.registration_id === registration.id
        );

        return {
          ...registration,
          attendance: attendanceRecord || null,
          attended: Boolean(attendanceRecord),
        };
      }
    );

    return res.json({
      success: true,
      event,
      participants,
      stats: {
        registered: participants.length,
        attended: participants.filter(
          (participant) => participant.attended
        ).length,
        absent: participants.filter(
          (participant) => !participant.attended
        ).length,
        capacity: event.participant_limit,
      },
    });
  } catch (error) {
    console.error(
      "Event participants error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};
export const markAttendance = async (
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

    const eventId = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

    const {
      registration_code,
    } = req.body;

    if (!registration_code) {
      return res.status(400).json({
        success: false,
        message: "Registration code is required",
      });
    }

    // Verify event and faculty ownership
    const { data: event, error: eventError } =
      await supabase
        .from("events")
        .select("id, title, organizer_id")
        .eq("id", eventId)
        .single();

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (
      req.user.role === "faculty" &&
      event.organizer_id !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only manage your own events",
      });
    }

    /*
     * Volunteers check people in too, but only for the events they
     * have actually been put on. Faculty and admin keep exactly the
     * behaviour they had before this check existed.
     */
    if (req.user.role === "volunteer") {
      const assigned = await isVolunteerAssigned(
        eventId as string,
        req.user.userId
      );

      if (assigned === null) {
        return res.status(500).json({
          success: false,
          message: "Failed to verify event assignment",
        });
      }

      if (!assigned) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }
    }

    // Find registration using QR registration code
    const { data: registration, error: registrationError } =
      await supabase
        .from("registrations")
        .select(`
          id,
          registration_code,
          status,
          event_id,
          student_id,
          student:users!registrations_student_id_fkey (
            id,
            name,
            email,
            department,
            year,
            profile_image
          )
        `)
        .eq(
          "registration_code",
          registration_code.trim()
        )
        .eq("event_id", eventId)
        .single();

    if (
      registrationError ||
      !registration
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Invalid registration QR for this event",
      });
    }

    // Check if attendance already exists
    const { data: existingAttendance } =
      await supabase
        .from("attendance")
        .select(
          "id, attended_at"
        )
        .eq(
          "registration_id",
          registration.id
        )
        .maybeSingle();

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        already_attended: true,
        message:
          "Attendance has already been marked",
        attendance: existingAttendance,
        participant: registration.student,
      });
    }

    // Create attendance record
    const { data: attendance, error: attendanceError } =
      await supabase
        .from("attendance")
        .insert({
          registration_id: registration.id,
          event_id: eventId,
          student_id: registration.student_id,
          marked_by: req.user.userId,
        })
        .select()
        .single();

    /*
     * Two volunteers can scan the same QR at the same moment and both
     * pass the "already marked?" check above. The unique index on
     * attendance(registration_id) is what actually stops the second
     * write, and the loser is reported as an ordinary duplicate scan
     * so the desk sees "already checked in" rather than an error.
     */
    if (isUniqueViolation(attendanceError)) {
      const { data: existing } = await supabase
        .from("attendance")
        .select("id, attended_at")
        .eq("registration_id", registration.id)
        .maybeSingle();

      return res.status(409).json({
        success: false,
        already_attended: true,
        message: "Attendance has already been marked",
        attendance: existing,
        participant: registration.student,
      });
    }

    if (attendanceError || !attendance) {
      console.error(
        "Mark attendance error:",
        attendanceError
      );

      return res.status(500).json({
        success: false,
        message: "Failed to mark attendance",
      });
    }

    // Update registration status
    await supabase
      .from("registrations")
      .update({
        status: "attended",
        updated_at: new Date().toISOString(),
      })
      .eq("id", registration.id);

    return res.json({
      success: true,
      message: "Attendance marked successfully",
      attendance,
      participant: registration.student,
      registration_code:
        registration.registration_code,
    });
  } catch (error) {
    console.error(
      "Mark attendance exception:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};
export const getEventResults = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, organizer_id, status")
      .eq("id", id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Faculty can only access their own events
    if (
      req.user.role === "faculty" &&
      event.organizer_id !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this event",
      });
    }

    const { data: results, error } = await supabase
      .from("event_results")
      .select(`
        id,
        event_id,
        student_id,
        registration_id,
        position,
        score,
        remarks,
        announced_at,
        created_at,
        updated_at,
        student:users!event_results_student_id_fkey (
          id,
          name,
          email,
          department,
          year,
          profile_image
        )
      `)
      .eq("event_id", id)
      .order("position", { ascending: true });

    if (error) {
      console.error("Get event results error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch event results",
      });
    }

    return res.json({
      success: true,
      event,
      results: results || [],
    });
  } catch (error) {
    console.error("Event results error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};


export const addEventResult = async (
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

    const eventId = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

    const {
      studentId,
      position,
      score,
      remarks,
    } = req.body;

    if (!studentId || !position) {
      return res.status(400).json({
        success: false,
        message:
          "Student ID and position are required",
      });
    }

    if (
      !Number.isInteger(Number(position)) ||
      Number(position) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Position must be a positive integer",
      });
    }

    /*
     * Check event
     */
    const {
      data: event,
      error: eventError,
    } = await supabase
      .from("events")
      .select("id, title, organizer_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    /*
     * Faculty can only manage their own events
     */
    if (
      req.user.role === "faculty" &&
      event.organizer_id !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to manage this event",
      });
    }

    /*
     * Check student
     */
    const {
      data: student,
      error: studentError,
    } = await supabase
      .from("users")
      .select(
        "id, name, email, role"
      )
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (student.role !== "student") {
      return res.status(400).json({
        success: false,
        message:
          "Selected user is not a student",
      });
    }

    /*
     * Check registration
     */
    const {
      data: registration,
      error: registrationError,
    } = await supabase
      .from("registrations")
      .select(
        "id, registration_code, status"
      )
      .eq("event_id", eventId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (registrationError) {
      console.error(
        "Registration lookup error:",
        registrationError
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to verify student registration",
      });
    }

    if (!registration) {
      return res.status(400).json({
        success: false,
        message:
          "This student is not registered for the event",
      });
    }

    /*
     * Check duplicate position
     */
    const {
      data: existingPosition,
    } = await supabase
      .from("event_results")
      .select("id")
      .eq("event_id", eventId)
      .eq("position", Number(position))
      .maybeSingle();

    if (existingPosition) {
      return res.status(409).json({
        success: false,
        message:
          "This position has already been assigned",
      });
    }

    /*
     * Check duplicate student result
     */
    const {
      data: existingStudentResult,
    } = await supabase
      .from("event_results")
      .select("id")
      .eq("event_id", eventId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (existingStudentResult) {
      return res.status(409).json({
        success: false,
        message:
          "This student already has a result for this event",
      });
    }

    /*
     * Create result
     */
    const {
      data: result,
      error: resultError,
    } = await supabase
      .from("event_results")
      .insert({
        event_id: eventId,
        student_id: studentId,
        registration_id: registration.id,
        position: Number(position),
        score:
          score === "" ||
          score === undefined ||
          score === null
            ? null
            : Number(score),
        remarks:
          remarks?.trim() || null,
      })
      .select(`
        id,
        event_id,
        student_id,
        registration_id,
        position,
        score,
        remarks,
        announced_at,
        created_at,
        updated_at,
        student:users!event_results_student_id_fkey(
          id,
          name,
          email,
          department,
          year
        )
      `)
      .single();

    if (resultError || !result) {
      console.error(
        "Create result error:",
        resultError
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to create event result",
      });
    }

    /*
     * 🔔 Create notification for student
     *
     * IMPORTANT:
     * notification service expects eventId
     * and converts it to event_id internally.
     */
    await createNotification({
      userId: studentId,
      title: "Result Announced",
      message:
        Number(position) === 1
          ? `Congratulations! You secured 1st place in ${event.title}.`
          : `Your result for ${event.title} is now available. You secured ${getOrdinalPosition(
              Number(position)
            )}.`,
      type: "result",
      eventId: eventId,
    });

    return res.status(201).json({
      success: true,
      message:
        "Event result added successfully",
      result,
    });
  } catch (error) {
    console.error(
      "Add event result error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while adding the result",
    });
  }
};


export const updateEventResult = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id, resultId } = req.params;

    const {
      position,
      score,
      remarks,
    } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Get event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, organizer_id")
      .eq("id", id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (
      req.user.role === "faculty" &&
      event.organizer_id !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to manage this event",
      });
    }

    if (!position || Number(position) < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid position is required",
      });
    }

    // Check result exists
    const { data: existingResult, error: resultError } =
      await supabase
        .from("event_results")
        .select("id, event_id")
        .eq("id", resultId)
        .eq("event_id", id)
        .single();

    if (resultError || !existingResult) {
      return res.status(404).json({
        success: false,
        message: "Result not found",
      });
    }

    // Check position conflict
    const { data: positionConflict } = await supabase
      .from("event_results")
      .select("id")
      .eq("event_id", id)
      .eq("position", Number(position))
      .neq("id", resultId)
      .maybeSingle();

    if (positionConflict) {
      return res.status(409).json({
        success: false,
        message: `Position ${position} is already assigned`,
      });
    }

    const { data: result, error } = await supabase
      .from("event_results")
      .update({
        position: Number(position),
        score:
          score === null ||
          score === undefined ||
          score === ""
            ? null
            : Number(score),
        remarks: remarks?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resultId)
      .eq("event_id", id)
      .select(`
        id,
        event_id,
        student_id,
        registration_id,
        position,
        score,
        remarks,
        announced_at,
        created_at,
        updated_at,
        student:users!event_results_student_id_fkey (
          id,
          name,
          email,
          department,
          year,
          profile_image
        )
      `)
      .maybeSingle();

    if (error) {
      console.error("Update result error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update result",
      });
    }

    /*
     * The update is scoped by both id and event_id, so matching no
     * row means the result does not exist or belongs to a different
     * event. That is the caller's mistake, not a server fault —
     * .single() used to turn it into a 500 and log it as an error.
     */
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found for this event",
      });
    }

    /*
     * Adding a result notifies the student, so correcting
     * one has to as well — otherwise a changed position
     * never reaches the person it belongs to.
     */
    const { data: eventDetails } = await supabase
      .from("events")
      .select("title")
      .eq("id", id)
      .single();

    /*
     * req.params values are typed string | string[], so
     * the id is narrowed the same way the other handlers
     * in this file do it.
     */
    const notifiedEventId = Array.isArray(id)
      ? id[0]
      : id;

    await createNotification({
      userId: result.student_id,
      title: "Result Updated",
      message: `Your result for ${
        eventDetails?.title || "the event"
      } has been updated. You are now placed ${getOrdinalPosition(
        Number(position)
      )}.`,
      type: "result",
      eventId: notifiedEventId,
    });

    return res.json({
      success: true,
      message: "Result updated successfully",
      result,
    });
  } catch (error) {
    console.error("Update result error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};


export const deleteEventResult = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id, resultId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, organizer_id")
      .eq("id", id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (
      req.user.role === "faculty" &&
      event.organizer_id !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to manage this event",
      });
    }

    const { data: existingResult } = await supabase
      .from("event_results")
      .select("id")
      .eq("id", resultId)
      .eq("event_id", id)
      .maybeSingle();

    if (!existingResult) {
      return res.status(404).json({
        success: false,
        message: "Result not found",
      });
    }

    const { error } = await supabase
      .from("event_results")
      .delete()
      .eq("id", resultId)
      .eq("event_id", id);

    if (error) {
      console.error("Delete result error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete result",
      });
    }

    return res.json({
      success: true,
      message: "Result deleted successfully",
    });
  } catch (error) {
    console.error("Delete result error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};