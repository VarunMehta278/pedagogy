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
import {
  aggregateJudgeTotals,
  calculateJudgeTotal,
  rankParticipants,
  round3,
  validateScores,
  type Criterion,
  type CriterionScore,
} from "../utils/scoring";
import { createNotifications } from "../services/notificationService";
import { getOrdinalPosition } from "../utils/ordinals";

const loadCriteria = async (eventId: string) => {
  const { data, error } = await supabase
    .from("evaluation_criteria")
    .select("id, name, max_score, weight, display_order")
    .eq("event_id", eventId)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Criteria load error:", error);

    return null;
  }

  return (data || []).map((row) => ({
    ...row,
    max_score: Number(row.max_score),
    weight: Number(row.weight),
  }));
};

/* ------------------------------------------------------------------
 * Judge: submit or revise an evaluation
 * ------------------------------------------------------------------ */

export const submitEvaluation = async (
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

    const { event, failed } = await getEvent(eventId);

    if (failed || !event) {
      return res.status(failed ? 500 : 404).json({
        success: false,
        message: failed
          ? "Failed to fetch event"
          : "Event not found",
      });
    }

    if (event.results_finalized_at) {
      return res.status(409).json({
        success: false,
        message:
          "Results for this event have been finalised. Evaluations are closed.",
      });
    }

    const registrationId =
      typeof req.body?.registration_id === "string"
        ? req.body.registration_id.trim()
        : "";

    if (!registrationId) {
      return res.status(400).json({
        success: false,
        message: "registration_id is required",
      });
    }

    /*
     * Annotated rather than inferred. Array.isArray() narrows the
     * expression it tests, but the branch below reads a different
     * expression (req.body.scores, not req.body?.scores), so the
     * narrowing does not carry and the value stays `any` — which
     * leaves the .map() callback below with an implicit any and
     * fails the build under noImplicitAny.
     */
    const rawScores: unknown[] | null = Array.isArray(
      req.body?.scores
    )
      ? (req.body.scores as unknown[])
      : null;

    if (!rawScores) {
      return res.status(400).json({
        success: false,
        message: "scores must be an array",
      });
    }

    const scores: CriterionScore[] = rawScores
      .filter(
        (row: unknown): row is Record<string, unknown> =>
          !!row && typeof row === "object"
      )
      .map((row) => ({
        criterion_id: String(row.criterion_id ?? ""),
        score: Number(row.score),
      }));

    /*
     * The registration must belong to THIS event, otherwise a judge
     * could score a participant from an event they are not on by
     * posting that registration's id.
     */
    const { data: registration, error: registrationError } =
      await supabase
        .from("registrations")
        .select("id, event_id, student_id, status")
        .eq("id", registrationId)
        .eq("event_id", eventId)
        .maybeSingle();

    if (registrationError) {
      console.error("Registration lookup error:", registrationError);

      return res.status(500).json({
        success: false,
        message: "Failed to verify the participant",
      });
    }

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "That participant is not registered for this event",
      });
    }

    if (registration.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "That registration was cancelled",
      });
    }

    const criteria = await loadCriteria(eventId);

    if (!criteria) {
      return res.status(500).json({
        success: false,
        message: "Failed to load evaluation criteria",
      });
    }

    const problem = validateScores(
      criteria as Criterion[],
      scores
    );

    if (problem) {
      return res.status(400).json({
        success: false,
        message: problem,
      });
    }

    const { total, maxTotal } = calculateJudgeTotal(
      criteria as Criterion[],
      scores
    );

    const remarks =
      typeof req.body?.remarks === "string" &&
      req.body.remarks.trim()
        ? req.body.remarks.trim()
        : null;

    /*
     * upsert on (event_id, judge_id, registration_id). The unique
     * constraint is what actually prevents a second evaluation of
     * the same participant by the same judge — two requests racing
     * each other cannot both insert. Re-submitting revises the
     * judge's own scores rather than adding a row.
     */
    const { data: evaluation, error: evaluationError } =
      await supabase
        .from("judge_evaluations")
        .upsert(
          {
            event_id: eventId,
            judge_id: req.user.userId,
            registration_id: registrationId,
            student_id: registration.student_id,
            total_score: total,
            max_total: maxTotal,
            remarks,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "event_id,judge_id,registration_id" }
        )
        .select("id")
        .single();

    if (evaluationError || !evaluation) {
      console.error("Evaluation upsert error:", evaluationError);

      return res.status(500).json({
        success: false,
        message: "Failed to save the evaluation",
      });
    }

    const scoreRows = scores.map((row) => ({
      evaluation_id: evaluation.id,
      criterion_id: row.criterion_id,
      score: row.score,
    }));

    const { error: scoresError } = await supabase
      .from("judge_evaluation_scores")
      .upsert(scoreRows, {
        onConflict: "evaluation_id,criterion_id",
      });

    if (scoresError) {
      console.error("Evaluation scores error:", scoresError);

      return res.status(500).json({
        success: false,
        message: "Failed to save the individual scores",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Evaluation submitted",
      evaluation: {
        id: evaluation.id,
        total_score: total,
        max_total: maxTotal,
      },
    });
  } catch (error) {
    console.error("Submit evaluation error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ------------------------------------------------------------------
 * Judge: their own evaluations for one event
 * ------------------------------------------------------------------ */

export const getMyEvaluations = async (
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

    const { data, error } = await supabase
      .from("judge_evaluations")
      .select(
        `
        id,
        registration_id,
        student_id,
        total_score,
        max_total,
        remarks,
        submitted_at,
        updated_at,
        scores:judge_evaluation_scores (
          criterion_id,
          score
        )
      `
      )
      .eq("event_id", eventId)
      .eq("judge_id", req.user.userId);

    if (error) {
      console.error("My evaluations error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch your evaluations",
      });
    }

    return res.status(200).json({
      success: true,
      evaluations: data || [],
    });
  } catch (error) {
    console.error("My evaluations error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ------------------------------------------------------------------
 * Faculty: progress, per-judge scores and the aggregate
 * ------------------------------------------------------------------ */

export const getEvaluationSummary = async (
  req: AuthRequest,
  res: Response
) => {
  try {
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

    const criteria = await loadCriteria(eventId);

    const [judgesResult, participantsResult, evaluationsResult] =
      await Promise.all([
        supabase
          .from("event_judges")
          .select(
            `id, judge:users!event_judges_judge_id_fkey (id, name, email)`
          )
          .eq("event_id", eventId),
        supabase
          .from("registrations")
          .select(
            `
            id,
            student_id,
            status,
            registration_code,
            student:users!registrations_student_id_fkey (
              id, name, email, department, year
            )
          `
          )
          .eq("event_id", eventId)
          .neq("status", "cancelled"),
        supabase
          .from("judge_evaluations")
          .select(
            `
            id,
            judge_id,
            registration_id,
            student_id,
            total_score,
            max_total,
            remarks,
            submitted_at,
            scores:judge_evaluation_scores (criterion_id, score)
          `
          )
          .eq("event_id", eventId),
      ]);

    if (
      judgesResult.error ||
      participantsResult.error ||
      evaluationsResult.error
    ) {
      console.error(
        "Evaluation summary error:",
        judgesResult.error ||
          participantsResult.error ||
          evaluationsResult.error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to build the evaluation summary",
      });
    }

    const judges = judgesResult.data || [];
    const participants = participantsResult.data || [];
    const evaluations = evaluationsResult.data || [];

    const byRegistration = new Map<string, typeof evaluations>();

    for (const evaluation of evaluations) {
      const list =
        byRegistration.get(evaluation.registration_id) || [];

      list.push(evaluation);
      byRegistration.set(evaluation.registration_id, list);
    }

    const rows = participants.map((participant) => {
      const mine = byRegistration.get(participant.id) || [];

      const finalScore = aggregateJudgeTotals(
        mine.map((item) => Number(item.total_score))
      );

      return {
        registration_id: participant.id,
        student_id: participant.student_id,
        registration_code: participant.registration_code,
        student: participant.student,
        evaluations: mine.map((item) => ({
          id: item.id,
          judge_id: item.judge_id,
          total_score: Number(item.total_score),
          max_total: Number(item.max_total),
          remarks: item.remarks,
          submitted_at: item.submitted_at,
          scores: item.scores,
        })),
        judges_submitted: mine.length,
        final_score: finalScore,
      };
    });

    const ranked = rankParticipants(
      rows.map((row) => ({
        registration_id: row.registration_id,
        student_id: row.student_id,
        finalScore: row.final_score,
      }))
    );

    const positionByRegistration = new Map(
      ranked.map((item) => [item.registration_id, item.position])
    );

    /* Per-judge completion, so faculty can chase the slow one. */
    const progress = judges.map((row) => {
      const judge = Array.isArray(row.judge)
        ? row.judge[0]
        : row.judge;

      const submitted = evaluations.filter(
        (item) => item.judge_id === judge?.id
      ).length;

      return {
        judge,
        submitted,
        total: participants.length,
        complete:
          participants.length > 0 &&
          submitted >= participants.length,
      };
    });

    return res.status(200).json({
      success: true,
      criteria: criteria || [],
      judges: judges.map((row) =>
        Array.isArray(row.judge) ? row.judge[0] : row.judge
      ),
      progress,
      participants: rows
        .map((row) => ({
          ...row,
          position:
            positionByRegistration.get(row.registration_id) ?? null,
        }))
        .sort((a, b) => {
          if (a.final_score === null && b.final_score === null) {
            return 0;
          }

          if (a.final_score === null) return 1;
          if (b.final_score === null) return -1;

          return b.final_score - a.final_score;
        }),
      finalized_at: event.results_finalized_at ?? null,
    });
  } catch (error) {
    console.error("Evaluation summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ------------------------------------------------------------------
 * Faculty: finalise
 *
 * Ranks by final score and writes the top placements into the
 * existing event_results table, so certificates, notifications and
 * the student results view keep working exactly as they did.
 * ------------------------------------------------------------------ */

export const finalizeResults = async (
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

    const denial = denyUnlessCanManageEvent(req, event);

    if (denial) return sendDenial(res, denial);

    if (event.results_finalized_at) {
      return res.status(409).json({
        success: false,
        message: "Results have already been finalised",
      });
    }

    const topN = Number(req.body?.top ?? 3);

    if (!Number.isFinite(topN) || topN < 1 || topN > 20) {
      return res.status(400).json({
        success: false,
        message: "top must be between 1 and 20",
      });
    }

    const { data: evaluations, error: evaluationsError } =
      await supabase
        .from("judge_evaluations")
        .select(
          "registration_id, student_id, total_score"
        )
        .eq("event_id", eventId);

    if (evaluationsError) {
      console.error("Finalize load error:", evaluationsError);

      return res.status(500).json({
        success: false,
        message: "Failed to load evaluations",
      });
    }

    if (!evaluations || evaluations.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No judge has submitted an evaluation yet, so there is nothing to finalise",
      });
    }

    const grouped = new Map<
      string,
      { student_id: string; totals: number[] }
    >();

    for (const row of evaluations) {
      const entry: { student_id: string; totals: number[] } =
        grouped.get(row.registration_id) || {
          student_id: row.student_id,
          totals: [],
        };

      entry.totals.push(Number(row.total_score));
      grouped.set(row.registration_id, entry);
    }

    const ranked = rankParticipants(
      Array.from(grouped.entries()).map(
        ([registration_id, entry]) => ({
          registration_id,
          student_id: entry.student_id,
          finalScore: aggregateJudgeTotals(entry.totals),
        })
      )
    ).filter((row) => row.position <= topN);

    if (ranked.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No participant has a score to rank",
      });
    }

    /*
     * Replacing any results previously entered by hand keeps a
     * single source of truth — otherwise a manual 1st place and a
     * judged 1st place would both exist.
     */
    const { error: clearError } = await supabase
      .from("event_results")
      .delete()
      .eq("event_id", eventId);

    if (clearError) {
      console.error("Clear results error:", clearError);

      return res.status(500).json({
        success: false,
        message: "Failed to replace the existing results",
      });
    }

    const { error: insertError } = await supabase
      .from("event_results")
      .insert(
        ranked.map((row) => ({
          event_id: eventId,
          student_id: row.student_id,
          registration_id: row.registration_id,
          position: row.position,
          score: round3(row.finalScore as number),
          remarks: "Final score from judge evaluations",
        }))
      );

    if (insertError) {
      console.error("Insert results error:", insertError);

      return res.status(500).json({
        success: false,
        message: "Failed to write the final results",
      });
    }

    const { error: markError } = await supabase
      .from("events")
      .update({
        results_finalized_at: new Date().toISOString(),
        results_finalized_by: req.user.userId,
      })
      .eq("id", eventId);

    if (markError) {
      console.error("Mark finalized error:", markError);

      return res.status(500).json({
        success: false,
        message: "Results were written but the event could not be locked",
      });
    }

    /*
     * Same notification the manual results flow already sends, so
     * winners hear about it the usual way. Sent as one batch insert
     * rather than a request per winner.
     */
    await createNotifications(
      ranked.map((row) => ({
        userId: row.student_id,
        title: `Results are out for ${event.title}`,
        message: `You placed ${getOrdinalPosition(
          row.position
        )} in ${event.title}.`,
        type: "result" as const,
        eventId,
      }))
    );

    return res.status(200).json({
      success: true,
      message: `Results finalised — ${ranked.length} placement${
        ranked.length === 1 ? "" : "s"
      } recorded`,
      results: ranked,
    });
  } catch (error) {
    console.error("Finalize error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
