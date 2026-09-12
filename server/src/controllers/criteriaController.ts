import { Response } from "express";

import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  denyUnlessCanManageEvent,
  denyUnlessJudgeAssigned,
  getEvent,
  paramId,
  sendDenial,
} from "../middleware/eventAccess";

/*
 * Evaluation criteria, defined per event by the organising faculty.
 *
 * Reading is allowed for anyone who can manage the event and for a
 * judge assigned to it — a judge has to know what they are scoring
 * against. Writing is faculty and admin only.
 */

const loadEventForWrite = async (
  req: AuthRequest,
  res: Response
) => {
  const eventId = paramId(req.params.id);

  if (!eventId) {
    res.status(400).json({
      success: false,
      message: "Event ID is required",
    });

    return null;
  }

  const { event, failed } = await getEvent(eventId);

  if (failed) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch event",
    });

    return null;
  }

  if (!event) {
    res.status(404).json({
      success: false,
      message: "Event not found",
    });

    return null;
  }

  const denial = denyUnlessCanManageEvent(req, event);

  if (denial) {
    sendDenial(res, denial);

    return null;
  }

  return { eventId, event };
};

export const getEvaluationCriteria = async (
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

    if (req.user.role === "judge") {
      const denial = await denyUnlessJudgeAssigned(req, eventId);

      if (denial) return sendDenial(res, denial);
    } else {
      const denial = denyUnlessCanManageEvent(req, event);

      if (denial) return sendDenial(res, denial);
    }

    const { data, error } = await supabase
      .from("evaluation_criteria")
      .select(
        "id, name, description, max_score, weight, display_order"
      )
      .eq("event_id", eventId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Get criteria error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch evaluation criteria",
      });
    }

    return res.status(200).json({
      success: true,
      criteria: data || [],
    });
  } catch (error) {
    console.error("Get criteria error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/*
 * Replaces the whole criteria set in one call.
 *
 * A criterion that already has scores against it is never deleted —
 * removing it would orphan part of an evaluation and silently change
 * everyone's total. Those are reported back instead.
 */
export const setEvaluationCriteria = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const loaded = await loadEventForWrite(req, res);

    if (!loaded) return;

    const { eventId, event } = loaded;

    if (event.results_finalized_at) {
      return res.status(409).json({
        success: false,
        message:
          "Results are finalised. Criteria can no longer be changed.",
      });
    }

    const incoming = Array.isArray(req.body?.criteria)
      ? req.body.criteria
      : null;

    if (!incoming) {
      return res.status(400).json({
        success: false,
        message: "criteria must be an array",
      });
    }

    if (incoming.length > 25) {
      return res.status(400).json({
        success: false,
        message: "An event can have at most 25 criteria",
      });
    }

    type Incoming = {
      id?: string;
      name?: string;
      description?: string | null;
      max_score?: number | string;
      weight?: number | string;
    };

    const cleaned: {
      id?: string;
      name: string;
      description: string | null;
      max_score: number;
      weight: number;
      display_order: number;
    }[] = [];

    for (let index = 0; index < incoming.length; index += 1) {
      const item = incoming[index] as Incoming;

      const name =
        typeof item.name === "string" ? item.name.trim() : "";

      if (!name) {
        return res.status(400).json({
          success: false,
          message: `Criterion ${index + 1} needs a name`,
        });
      }

      const maxScore = Number(item.max_score);
      const weight = Number(item.weight);

      if (!Number.isFinite(maxScore) || maxScore <= 0) {
        return res.status(400).json({
          success: false,
          message: `"${name}" needs a maximum score greater than 0`,
        });
      }

      if (!Number.isFinite(weight) || weight <= 0) {
        return res.status(400).json({
          success: false,
          message: `"${name}" needs a weight greater than 0`,
        });
      }

      cleaned.push({
        id:
          typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : undefined,
        name,
        description:
          typeof item.description === "string" &&
          item.description.trim()
            ? item.description.trim()
            : null,
        max_score: maxScore,
        weight,
        display_order: index,
      });
    }

    const { data: existing, error: existingError } = await supabase
      .from("evaluation_criteria")
      .select("id")
      .eq("event_id", eventId);

    if (existingError) {
      console.error("Existing criteria error:", existingError);

      return res.status(500).json({
        success: false,
        message: "Failed to read existing criteria",
      });
    }

    const existingIds = (existing || []).map((row) => row.id);
    const keptIds = cleaned
      .map((row) => row.id)
      .filter((id): id is string => !!id);

    const removedIds = existingIds.filter(
      (id) => !keptIds.includes(id)
    );

    if (removedIds.length > 0) {
      const { data: scored, error: scoredError } = await supabase
        .from("judge_evaluation_scores")
        .select("criterion_id")
        .in("criterion_id", removedIds)
        .limit(1);

      if (scoredError) {
        console.error("Criterion usage error:", scoredError);

        return res.status(500).json({
          success: false,
          message: "Failed to check whether criteria are in use",
        });
      }

      if (scored && scored.length > 0) {
        return res.status(409).json({
          success: false,
          message:
            "A criterion you removed has already been scored by a judge. Clear those evaluations first.",
        });
      }

      const { error: deleteError } = await supabase
        .from("evaluation_criteria")
        .delete()
        .in("id", removedIds);

      if (deleteError) {
        console.error("Delete criteria error:", deleteError);

        return res.status(500).json({
          success: false,
          message: "Failed to remove criteria",
        });
      }
    }

    for (const row of cleaned) {
      if (row.id) {
        const { error } = await supabase
          .from("evaluation_criteria")
          .update({
            name: row.name,
            description: row.description,
            max_score: row.max_score,
            weight: row.weight,
            display_order: row.display_order,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id)
          .eq("event_id", eventId);

        if (error) {
          console.error("Update criterion error:", error);

          return res.status(500).json({
            success: false,
            message: "Failed to update criteria",
          });
        }
      } else {
        const { error } = await supabase
          .from("evaluation_criteria")
          .insert({
            event_id: eventId,
            name: row.name,
            description: row.description,
            max_score: row.max_score,
            weight: row.weight,
            display_order: row.display_order,
          });

        if (error) {
          console.error("Insert criterion error:", error);

          return res.status(500).json({
            success: false,
            message: "Failed to add criteria",
          });
        }
      }
    }

    const { data: saved } = await supabase
      .from("evaluation_criteria")
      .select(
        "id, name, description, max_score, weight, display_order"
      )
      .eq("event_id", eventId)
      .order("display_order", { ascending: true });

    return res.status(200).json({
      success: true,
      message: "Evaluation criteria saved",
      criteria: saved || [],
    });
  } catch (error) {
    console.error("Set criteria error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
