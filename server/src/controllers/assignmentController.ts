import { Response } from "express";

import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  denyUnlessCanManageEvent,
  findUserWithRole,
  getEvent,
  paramId,
  sendDenial,
} from "../middleware/eventAccess";

/*
 * Faculty assigns judges and volunteers to their own events.
 *
 * Judges and volunteers are handled by the same code with the role
 * swapped, because the two flows are identical apart from which
 * table and column they touch.
 */

type Kind = "judge" | "volunteer";

const config = {
  judge: {
    table: "event_judges",
    column: "judge_id",
    role: "judge",
    label: "Judge",
  },
  volunteer: {
    table: "event_volunteers",
    column: "volunteer_id",
    role: "volunteer",
    label: "Volunteer",
  },
} as const;

const listAssigned = async (
  req: AuthRequest,
  res: Response,
  kind: Kind
) => {
  const { table, column } = config[kind];

  const eventId = paramId(req.params.id);

  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: "Event ID is required",
    });
  }

  const { event, failed } = await getEvent(eventId);

  if (failed) {
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

  const denial = denyUnlessCanManageEvent(req, event);

  if (denial) return sendDenial(res, denial);

  const { data, error } = await supabase
    .from(table)
    .select(
      `
      id,
      assigned_at,
      user:users!${table}_${column}_fkey (
        id,
        name,
        email,
        department,
        profile_image
      )
    `
    )
    .eq("event_id", eventId)
    .order("assigned_at", { ascending: true });

  if (error) {
    console.error(`List ${kind} error:`, error);

    return res.status(500).json({
      success: false,
      message: `Failed to fetch ${kind}s`,
    });
  }

  return res.status(200).json({
    success: true,
    [`${kind}s`]: data || [],
  });
};

const assign = async (
  req: AuthRequest,
  res: Response,
  kind: Kind
) => {
  const { table, column, role, label } = config[kind];

  const eventId = paramId(req.params.id);

  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: "Event ID is required",
    });
  }

  /*
   * Accepts either a single id or an array, so faculty can add
   * several people in one request without the client having to
   * loop.
   */
  const raw =
    req.body?.user_ids ??
    req.body?.user_id ??
    req.body?.[`${kind}_id`];

  const ids: string[] = Array.isArray(raw)
    ? raw.filter(
        (value): value is string =>
          typeof value === "string" && !!value.trim()
      )
    : typeof raw === "string" && raw.trim()
    ? [raw.trim()]
    : [];

  if (ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: `At least one ${kind} must be selected`,
    });
  }

  const { event, failed } = await getEvent(eventId);

  if (failed) {
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

  const denial = denyUnlessCanManageEvent(req, event);

  if (denial) return sendDenial(res, denial);

  /*
   * Every id is confirmed to be a real account holding the right
   * role before anything is written, so posting a student's id
   * cannot smuggle them in as a judge.
   */
  const verified: string[] = [];

  for (const id of Array.from(new Set(ids))) {
    const { user, failed: lookupFailed, wrongRole } =
      await findUserWithRole(id, role);

    if (lookupFailed) {
      return res.status(500).json({
        success: false,
        message: "Failed to verify user",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "One of the selected accounts no longer exists",
      });
    }

    if (wrongRole) {
      return res.status(400).json({
        success: false,
        message: `${user.name} is not a ${kind}. An admin can change their role first.`,
      });
    }

    verified.push(id);
  }

  /*
   * upsert against the (event_id, <role>_id) unique constraint, so
   * assigning someone who is already assigned is a no-op instead of
   * an error.
   */
  const rows = verified.map((id) => ({
    event_id: eventId,
    [column]: id,
    assigned_by: req.user?.userId ?? null,
  }));

  const { data, error } = await supabase
    .from(table)
    .upsert(rows, {
      onConflict: `event_id,${column}`,
      ignoreDuplicates: true,
    })
    .select();

  if (error) {
    console.error(`Assign ${kind} error:`, error);

    return res.status(500).json({
      success: false,
      message: `Failed to assign ${kind}s`,
    });
  }

  return res.status(201).json({
    success: true,
    message: `${label}${verified.length > 1 ? "s" : ""} assigned`,
    assigned: data?.length ?? 0,
  });
};

const unassign = async (
  req: AuthRequest,
  res: Response,
  kind: Kind
) => {
  const { table, column, label } = config[kind];

  const eventId = paramId(req.params.id);
  const userId = paramId(req.params.userId);

  if (!eventId || !userId) {
    return res.status(400).json({
      success: false,
      message: "Event ID and user ID are required",
    });
  }

  const { event, failed } = await getEvent(eventId);

  if (failed) {
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

  const denial = denyUnlessCanManageEvent(req, event);

  if (denial) return sendDenial(res, denial);

  /*
   * A judge who has already scored people is not silently removed —
   * their evaluations would stay behind and keep counting toward the
   * final score, which would be invisible and wrong.
   */
  if (kind === "judge") {
    const { count, error: countError } = await supabase
      .from("judge_evaluations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("judge_id", userId);

    if (countError) {
      console.error("Evaluation count error:", countError);

      return res.status(500).json({
        success: false,
        message: "Failed to check existing evaluations",
      });
    }

    if ((count ?? 0) > 0) {
      return res.status(409).json({
        success: false,
        message: `This judge has already submitted ${count} evaluation${
          count === 1 ? "" : "s"
        }. Remove those first if you really want to unassign them.`,
      });
    }
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("event_id", eventId)
    .eq(column, userId);

  if (error) {
    console.error(`Unassign ${kind} error:`, error);

    return res.status(500).json({
      success: false,
      message: `Failed to remove ${kind}`,
    });
  }

  return res.status(200).json({
    success: true,
    message: `${label} removed`,
  });
};

export const getEventJudges = (req: AuthRequest, res: Response) =>
  listAssigned(req, res, "judge");

export const assignJudges = (req: AuthRequest, res: Response) =>
  assign(req, res, "judge");

export const removeJudge = (req: AuthRequest, res: Response) =>
  unassign(req, res, "judge");

export const getEventVolunteers = (req: AuthRequest, res: Response) =>
  listAssigned(req, res, "volunteer");

export const assignVolunteers = (req: AuthRequest, res: Response) =>
  assign(req, res, "volunteer");

export const removeVolunteer = (req: AuthRequest, res: Response) =>
  unassign(req, res, "volunteer");

/*
 * The pool faculty picks from. Only judges and volunteers are
 * returned, never students, so the assignment UI cannot offer
 * someone who would then be rejected.
 */
export const getAssignableUsers = async (
  req: AuthRequest,
  res: Response
) => {
  const role =
    typeof req.query.role === "string" ? req.query.role : "";

  if (role !== "judge" && role !== "volunteer") {
    return res.status(400).json({
      success: false,
      message: "role must be judge or volunteer",
    });
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, department, profile_image")
    .eq("role", role)
    .order("name", { ascending: true });

  if (error) {
    console.error("Assignable users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }

  return res.status(200).json({
    success: true,
    users: data || [],
  });
};
