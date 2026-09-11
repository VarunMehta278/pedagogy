import { supabase } from "../config/supabase";

type CreateNotificationData = {
  userId: string;
  title: string;
  message: string;
  type?:
    | "general"
    | "registration"
    | "event_reminder"
    | "announcement"
    | "attendance"
    | "result"
    | "certificate";
  eventId?: string;
};

export const createNotification = async (
  data: CreateNotificationData
) => {
  try {
    const { data: notification, error } =
      await supabase
        .from("notifications")
        .insert({
          user_id: data.userId,
          title: data.title,
          message: data.message,
          type: data.type || "general",
          event_id: data.eventId || null,
        })
        .select()
        .single();

    if (error) {
      console.error(
        "Create notification error:",
        error
      );

      return null;
    }

    return notification;
  } catch (error) {
    console.error(
      "Notification service error:",
      error
    );

    return null;
  }
};


export const createNotifications = async (
  notifications: CreateNotificationData[]
) => {
  if (!notifications.length) {
    return [];
  }

  try {
    const rows = notifications.map(
      (notification) => ({
        user_id: notification.userId,
        title: notification.title,
        message: notification.message,
        type:
          notification.type || "general",
        event_id:
          notification.eventId || null,
      })
    );

    const { data, error } =
      await supabase
        .from("notifications")
        .insert(rows)
        .select();

    if (error) {
      console.error(
        "Create notifications error:",
        error
      );

      return [];
    }

    return data || [];
  } catch (error) {
    console.error(
      "Notification batch error:",
      error
    );

    return [];
  }
};
