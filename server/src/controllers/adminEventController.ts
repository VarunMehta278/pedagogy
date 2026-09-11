import { Response } from "express";

import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/authMiddleware";

/*
 * GET ALL EVENTS FOR ADMIN
 * GET /api/admin/events
 */
export const getAdminEvents = async (
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

    const {
      data: events,
      error,
    } = await supabase
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
        organizer:users!events_organizer_id_fkey(
          id,
          name,
          email,
          department
        )
      `)
      .order("event_date", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Get admin events error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch events",
      });
    }

    const eventList = events || [];

    /*
     * Get registration counts for every event.
     */
    const eventIds = eventList.map(
      (event) => event.id
    );

    let registrationCounts: Record<
      string,
      number
    > = {};

    if (eventIds.length > 0) {
      const {
        data: registrations,
        error: registrationError,
      } = await supabase
        .from("registrations")
        .select("event_id")
        .in("event_id", eventIds)
        .neq("status", "cancelled");

      if (registrationError) {
        console.error(
          "Registration count error:",
          registrationError
        );
      } else {
        registrationCounts =
          (registrations || []).reduce(
            (
              counts: Record<string, number>,
              registration
            ) => {
              counts[registration.event_id] =
                (counts[registration.event_id] ||
                  0) + 1;

              return counts;
            },
            {}
          );
      }
    }

    const formattedEvents = eventList.map(
      (event) => ({
        ...event,

        registration_count:
          registrationCounts[event.id] || 0,
      })
    );

    return res.json({
      success: true,
      events: formattedEvents,

      stats: {
        total: formattedEvents.length,

        draft: formattedEvents.filter(
          (event) =>
            event.status === "draft"
        ).length,

        published: formattedEvents.filter(
          (event) =>
            event.status === "published"
        ).length,

        ongoing: formattedEvents.filter(
          (event) =>
            event.status === "ongoing"
        ).length,

        completed: formattedEvents.filter(
          (event) =>
            event.status === "completed"
        ).length,

        cancelled: formattedEvents.filter(
          (event) =>
            event.status === "cancelled"
        ).length,
      },
    });
  } catch (error) {
    console.error(
      "Admin events error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
};


/*
 * UPDATE EVENT STATUS
 * PUT /api/admin/events/:id/status
 */
export const updateAdminEventStatus = async (
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

    const eventId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const { status } = req.body;

    const allowedStatuses = [
      "draft",
      "published",
      "ongoing",
      "completed",
      "cancelled",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid event status",
      });
    }

    const {
      data: existingEvent,
      error: existingError,
    } = await supabase
      .from("events")
      .select("id, title, status")
      .eq("id", eventId)
      .single();

    if (
      existingError ||
      !existingEvent
    ) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const {
      data: event,
      error,
    } = await supabase
      .from("events")
      .update({
        status,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", eventId)
      .select(`
        id,
        title,
        category,
        event_date,
        venue,
        status,
        organizer_id
      `)
      .single();

    if (error || !event) {
      console.error(
        "Update admin event status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update event status",
      });
    }

    return res.json({
      success: true,
      message:
        `Event status changed to ${status}`,
      event,
    });
  } catch (error) {
    console.error(
      "Admin status update error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update event status",
    });
  }
};


/*
 * DELETE EVENT
 * DELETE /api/admin/events/:id
 */
export const deleteAdminEvent = async (
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

    const eventId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const {
      data: event,
      error: eventError,
    } = await supabase
      .from("events")
      .select("id, title")
      .eq("id", eventId)
      .single();

    if (
      eventError ||
      !event
    ) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    /*
     * The events table uses ON DELETE CASCADE
     * for registrations, attendance and results.
     * Certificates also cascade from events.
     */
    const {
      error: deleteError,
    } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (deleteError) {
      console.error(
        "Delete admin event error:",
        deleteError
      );

      return res.status(500).json({
        success: false,
        message: "Failed to delete event",
      });
    }

    return res.json({
      success: true,
      message:
        `Event "${event.title}" deleted successfully`,
    });
  } catch (error) {
    console.error(
      "Admin delete event error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete event",
    });
  }
};