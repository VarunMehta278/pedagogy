import { Response } from "express";

import { supabase } from "../config/supabase";
import { AuthRequest } from "./authMiddleware";

/*
 * Event-scoped authorization.
 *
 * authorize() answers "is this person a judge?". These answer the
 * question that actually matters: "is this person a judge ON THIS
 * EVENT?". Without the second check, any judge could read the
 * participants of, and submit scores for, every event in the system.
 *
 * Each helper returns null when access is allowed, or a ready-made
 * { status, message } to send back when it is not.
 */

export type AccessDenial = {
  status: number;
  message: string;
} | null;

/* Normalises the string | string[] that Express types params as. */
export const paramId = (
  value: string | string[] | undefined
): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw && raw.trim() ? raw.trim() : undefined;
};

export const getEvent = async (eventId: string) => {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, organizer_id, status, event_date, venue, results_finalized_at"
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("Event lookup error:", error);

    return { event: null, failed: true };
  }

  return { event: data, failed: false };
};

/*
 * Faculty may only touch the events they organise. Admins may touch
 * any. Everyone else is refused.
 */
export const denyUnlessCanManageEvent = (
  req: AuthRequest,
  event: { organizer_id: string }
): AccessDenial => {
  if (!req.user) {
    return { status: 401, message: "Authentication required" };
  }

  if (req.user.role === "admin") {
    return null;
  }

  if (
    req.user.role === "faculty" &&
    event.organizer_id === req.user.userId
  ) {
    return null;
  }

  return {
    status: 403,
    message: "You can only manage your own events",
  };
};

export const isJudgeAssigned = async (
  eventId: string,
  judgeId: string
) => {
  const { data, error } = await supabase
    .from("event_judges")
    .select("id")
    .eq("event_id", eventId)
    .eq("judge_id", judgeId)
    .maybeSingle();

  if (error) {
    console.error("Judge assignment lookup error:", error);

    return null;
  }

  return !!data;
};

export const isVolunteerAssigned = async (
  eventId: string,
  volunteerId: string
) => {
  const { data, error } = await supabase
    .from("event_volunteers")
    .select("id")
    .eq("event_id", eventId)
    .eq("volunteer_id", volunteerId)
    .maybeSingle();

  if (error) {
    console.error("Volunteer assignment lookup error:", error);

    return null;
  }

  return !!data;
};

/*
 * A judge who is not assigned gets 404 rather than 403, so the
 * response cannot be used to enumerate which events exist.
 */
export const denyUnlessJudgeAssigned = async (
  req: AuthRequest,
  eventId: string
): Promise<AccessDenial> => {
  if (!req.user) {
    return { status: 401, message: "Authentication required" };
  }

  const assigned = await isJudgeAssigned(
    eventId,
    req.user.userId
  );

  if (assigned === null) {
    return {
      status: 500,
      message: "Failed to verify event assignment",
    };
  }

  if (!assigned) {
    return { status: 404, message: "Event not found" };
  }

  return null;
};

export const denyUnlessVolunteerAssigned = async (
  req: AuthRequest,
  eventId: string
): Promise<AccessDenial> => {
  if (!req.user) {
    return { status: 401, message: "Authentication required" };
  }

  const assigned = await isVolunteerAssigned(
    eventId,
    req.user.userId
  );

  if (assigned === null) {
    return {
      status: 500,
      message: "Failed to verify event assignment",
    };
  }

  if (!assigned) {
    return { status: 404, message: "Event not found" };
  }

  return null;
};

/*
 * Confirms a user exists and currently holds the expected role.
 * Used before assigning, so a student cannot be added as a judge by
 * posting their id.
 */
export const findUserWithRole = async (
  userId: string,
  role: string
) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, department")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("User lookup error:", error);

    return { user: null, failed: true, wrongRole: false };
  }

  if (!data) {
    return { user: null, failed: false, wrongRole: false };
  }

  if (data.role !== role) {
    return { user: data, failed: false, wrongRole: true };
  }

  return { user: data, failed: false, wrongRole: false };
};

export const sendDenial = (
  res: Response,
  denial: NonNullable<AccessDenial>
) =>
  res.status(denial.status).json({
    success: false,
    message: denial.message,
  });
