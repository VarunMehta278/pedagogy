import { Response } from "express";
import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  createNotification,
  createNotifications,
} from "../services/notificationService";

export const getMyNotifications = async (
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
      .from("notifications")
      .select(`
        id,
        title,
        message,
        type,
        event_id,
        is_read,
        created_at,
        events (
          id,
          title,
          event_date
        )
      `)
      .eq("user_id", req.user.userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Get notifications error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch notifications",
      });
    }

    const unreadCount =
      data?.filter(
        (notification) =>
          !notification.is_read
      ).length || 0;

    return res.json({
      success: true,
      notifications: data || [],
      unreadCount,
    });
  } catch (error) {
    console.error(
      "Notification controller error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};


export const markNotificationAsRead = async (
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

    const { data, error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", req.user.userId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.json({
      success: true,
      notification: data,
    });
  } catch (error) {
    console.error(
      "Mark notification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update notification",
    });
  }
};


export const markAllNotificationsAsRead = async (
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

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", req.user.userId)
      .eq("is_read", false);

    if (error) {
      console.error(
        "Mark all notifications error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update notifications",
      });
    }

    return res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error(
      "Mark all notification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update notifications",
    });
  }
};
export const createEventAnnouncement = async (
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

    const { eventId } = req.params;
    const { title, message } = req.body;

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    const resolvedEventId = Array.isArray(eventId)
      ? eventId[0]
      : eventId;

    // Get event
    const {
      data: event,
      error: eventError,
    } = await supabase
      .from("events")
      .select("id, title, organizer_id")
      .eq("id", resolvedEventId)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Faculty can only announce for their own event
    if (
      req.user.role === "faculty" &&
      event.organizer_id !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to announce for this event",
      });
    }

    // Get registered students
    const {
      data: registrations,
      error: registrationError,
    } = await supabase
      .from("registrations")
      .select("student_id")
      .eq("event_id", resolvedEventId)
      .neq("status", "cancelled");

    if (registrationError) {
      console.error(
        "Announcement registration lookup error:",
        registrationError
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to find event participants",
      });
    }

    if (!registrations || registrations.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "There are no registered students for this event",
      });
    }

    // Remove duplicate student IDs
    const studentIds: string[] = [
      ...new Set<string>(
        registrations.map(
          (registration) =>
            String(registration.student_id)
        )
      ),
    ];

    // Create notification for every registered student
    const notifications = studentIds.map(
      (studentId) => ({
        userId: studentId,
        title: title.trim(),
        message: message.trim(),
        type: "announcement" as const,
        eventId: resolvedEventId,
      })
    );

    const createdNotifications =
      await createNotifications(notifications);

    return res.status(201).json({
      success: true,
      message: `Announcement sent to ${createdNotifications.length} student${
        createdNotifications.length === 1
          ? ""
          : "s"
      }`,
      count: createdNotifications.length,
    });
  } catch (error) {
    console.error(
      "Create announcement error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to send announcement",
    });
  }
};
