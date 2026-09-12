import { Response } from "express";

import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  denyUnlessJudgeAssigned,
  paramId,
  sendDenial,
} from "../middleware/eventAccess";
import { isTeamEvent } from "../utils/teams";

/*
 * Everything a judge can see.
 *
 * A judge never queries events directly — every read starts from
 * event_judges, so an event they are not assigned to simply does
 * not exist as far as these endpoints are concerned.
 */

export const getMyJudgeEvents = async (
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
      .from("event_judges")
      .select(
        `
        id,
        assigned_at,
        event:events!event_judges_event_id_fkey (
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
          participation_type,
          min_team_size,
          max_team_size,
          results_finalized_at,
          organizer:users!events_organizer_id_fkey (
            id, name, department
          )
        )
      `
      )
      .eq("judge_id", req.user.userId)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("Judge events error:", error);

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

    /*
     * Counts let the dashboard show "12 of 30 evaluated" without
     * the client fetching every participant for every card.
     */
    const withProgress = await Promise.all(
      events.map(async (event: any) => {
        /*
         * On a team event the judge scores teams, so the progress
         * counter has to count teams — otherwise "2 of 30" would be
         * measured against a roster the judge never scores one by one.
         */
        const teamEvent = isTeamEvent(event);

        const subjects = teamEvent
          ? supabase
              .from("teams")
              .select("id", { count: "exact", head: true })
              .eq("event_id", event.id)
              .eq("status", "active")
          : supabase
              .from("registrations")
              .select("id", { count: "exact", head: true })
              .eq("event_id", event.id)
              .neq("status", "cancelled");

        const [{ count: participants }, { count: evaluated }] =
          await Promise.all([
            subjects,
            supabase
              .from("judge_evaluations")
              .select("id", { count: "exact", head: true })
              .eq("event_id", event.id)
              .eq("judge_id", req.user!.userId),
          ]);

        return {
          ...event,
          participant_count: participants ?? 0,
          evaluated_count: evaluated ?? 0,
        };
      })
    );

    return res.status(200).json({
      success: true,
      events: withProgress,
    });
  } catch (error) {
    console.error("Judge events error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/*
 * One event, with everything the judge needs to score it: the
 * criteria, the participants, and whatever this judge has already
 * submitted.
 */
export const getJudgeEventDetail = async (
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

    const denial = await denyUnlessJudgeAssigned(req, eventId);

    if (denial) return sendDenial(res, denial);

    const [
      eventResult,
      criteriaResult,
      participantsResult,
      mineResult,
    ] = await Promise.all([
      supabase
        .from("events")
        .select(
          `
          id, title, description, category, event_date,
          start_time, end_time, venue, status, rules,
          participation_type, min_team_size, max_team_size,
          results_finalized_at,
          organizer:users!events_organizer_id_fkey (id, name, department)
        `
        )
        .eq("id", eventId)
        .maybeSingle(),
      supabase
        .from("evaluation_criteria")
        .select(
          "id, name, description, max_score, weight, display_order"
        )
        .eq("event_id", eventId)
        .order("display_order", { ascending: true }),
      supabase
        .from("registrations")
        .select(
          `
          id,
          registration_code,
          status,
          student:users!registrations_student_id_fkey (
            id, name, email, department, year, profile_image
          )
        `
        )
        .eq("event_id", eventId)
        .neq("status", "cancelled")
        .order("registered_at", { ascending: true }),
      supabase
        .from("judge_evaluations")
        .select(
          `
          id, registration_id, team_id, total_score, max_total, remarks,
          submitted_at, updated_at,
          scores:judge_evaluation_scores (criterion_id, score)
        `
        )
        .eq("event_id", eventId)
        .eq("judge_id", req.user.userId),
    ]);

    if (eventResult.error || !eventResult.data) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (
      criteriaResult.error ||
      participantsResult.error ||
      mineResult.error
    ) {
      console.error(
        "Judge event detail error:",
        criteriaResult.error ||
          participantsResult.error ||
          mineResult.error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load the event",
      });
    }

    /*
     * A team event is judged team by team, so the judge is handed
     * teams rather than a roster. Individual events return exactly
     * what they always did.
     */
    if (isTeamEvent(eventResult.data)) {
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select(
          `
          id, name, team_code, leader_id, created_at,
          members:team_members (
            id, student_id, role,
            student:users!team_members_student_id_fkey (
              id, name, email, department, year
            )
          )
        `
        )
        .eq("event_id", eventId)
        .eq("status", "active")
        .order("created_at", { ascending: true });

      if (teamsError) {
        console.error("Judge teams error:", teamsError);

        return res.status(500).json({
          success: false,
          message: "Failed to load the teams",
        });
      }

      return res.status(200).json({
        success: true,
        participation_type: "team",
        event: eventResult.data,
        criteria: criteriaResult.data || [],
        teams: (teams || []).map((team: any) => ({
          ...team,
          member_count: (team.members || []).length,
        })),
        evaluations: mineResult.data || [],
      });
    }

    return res.status(200).json({
      success: true,
      participation_type: "individual",
      event: eventResult.data,
      criteria: criteriaResult.data || [],
      participants: participantsResult.data || [],
      evaluations: mineResult.data || [],
    });
  } catch (error) {
    console.error("Judge event detail error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
