import { Response } from "express";

import { supabase } from "../config/supabase";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  denyUnlessCanManageEvent,
  getEvent,
  isJudgeAssigned,
  isVolunteerAssigned,
  paramId,
  sendDenial,
} from "../middleware/eventAccess";
import {
  TEAM_SELECT,
  countTeamMembers,
  findStudentTeam,
  generateUniqueTeamCode,
  isStudentRegistered,
  linkRegistrationToTeam,
  loadTeam,
} from "../services/teamService";
import {
  isTeamEvent,
  normaliseTeamCode,
  teamSizeStatus,
} from "../utils/teams";
import { createNotification, createNotifications } from "../services/notificationService";

/*
 * Teams.
 *
 * Teams sit beside registrations rather than replacing them: every
 * member keeps their own registration row, registration_code, QR and
 * attendance record, and team_id simply groups them. That is what
 * lets individual events carry on completely unchanged.
 */

const fail = (res: Response, status: number, message: string) =>
  res.status(status).json({ success: false, message });

const ok = (
  res: Response,
  status: number,
  message: string,
  data?: unknown
) =>
  res.status(status).json({
    success: true,
    message,
    ...(data === undefined ? {} : { data }),
  });

const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

/* Event must exist, be a team event, and still be open. */
const loadTeamEvent = async (
  res: Response,
  eventId: string,
  requireOpen: boolean
) => {
  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id, title, organizer_id, status, participation_type, min_team_size, max_team_size, registration_deadline, participant_limit"
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("Team event lookup error:", error);
    fail(res, 500, "Failed to load the event");

    return null;
  }

  if (!event) {
    fail(res, 404, "Event not found");

    return null;
  }

  if (!isTeamEvent(event)) {
    fail(res, 400, "This is not a team event");

    return null;
  }

  if (requireOpen) {
    if (event.status !== "published") {
      return (
        fail(res, 400, "This event is not open for registration"),
        null
      );
    }

    if (
      event.registration_deadline &&
      new Date(event.registration_deadline).getTime() < Date.now()
    ) {
      return (
        fail(res, 400, "The registration deadline has passed"),
        null
      );
    }
  }

  return event;
};

/*
 * Who may look at an event's teams: the organiser, an admin, or a
 * judge or volunteer assigned to that event. Students use their own
 * endpoints and only ever see their own team.
 */
const canViewEventTeams = async (
  req: AuthRequest,
  event: { organizer_id: string; id: string }
): Promise<boolean> => {
  if (!req.user) return false;

  const role = req.user.role;

  if (role === "admin") return true;

  if (role === "faculty") {
    return event.organizer_id === req.user.userId;
  }

  if (role === "judge") {
    return (await isJudgeAssigned(event.id, req.user.userId)) === true;
  }

  if (role === "volunteer") {
    return (
      (await isVolunteerAssigned(event.id, req.user.userId)) === true
    );
  }

  return false;
};

/* ================================================================== *
 * Student: create a team
 * ================================================================== */

export const createTeam = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) return fail(res, 401, "Authentication required");

    const eventId = paramId(req.params.eventId);

    if (!eventId) return fail(res, 400, "Event ID is required");

    const name =
      typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!name) return fail(res, 400, "Team name is required");

    if (name.length > 80) {
      return fail(res, 400, "Team name is too long");
    }

    const event = await loadTeamEvent(res, eventId, true);

    if (!event) return;

    /*
     * Registration is the ticket; the team is formed afterwards. So a
     * student must already hold a registration before they can lead a
     * team, which also means the participant limit was already
     * enforced by the existing registration flow.
     */
    const { registered, failed } = await isStudentRegistered(
      eventId,
      req.user.userId
    );

    if (failed) return fail(res, 500, "Failed to check your registration");

    if (!registered) {
      return fail(
        res,
        400,
        "Register for this event first, then create your team"
      );
    }

    const existing = await findStudentTeam(eventId, req.user.userId);

    if (existing.failed) {
      return fail(res, 500, "Failed to check your existing team");
    }

    if (existing.team) {
      return fail(
        res,
        409,
        "You are already in a team for this event"
      );
    }

    const code = await generateUniqueTeamCode();

    if (!code) {
      return fail(res, 500, "Could not allocate a team code");
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        event_id: eventId,
        name,
        team_code: code,
        leader_id: req.user.userId,
      })
      .select("id, name, team_code")
      .single();

    if (teamError || !team) {
      console.error("Team create error:", teamError);

      /*
       * The partial unique index on (event_id, leader_id) is the real
       * guard against leading two teams — two racing requests cannot
       * both insert, and this is where the loser lands.
       */
      return fail(
        res,
        409,
        "You already lead a team for this event"
      );
    }

    const { error: memberError } = await supabase
      .from("team_members")
      .insert({
        team_id: team.id,
        student_id: req.user.userId,
        role: "leader",
      });

    if (memberError) {
      console.error("Team leader member error:", memberError);

      /* Do not leave a team with no members behind. */
      await supabase.from("teams").delete().eq("id", team.id);

      return fail(res, 500, "Failed to create the team");
    }

    await linkRegistrationToTeam(eventId, req.user.userId, team.id);

    await createNotification({
      userId: req.user.userId,
      title: `Team created for ${event.title}`,
      message: `Your team "${team.name}" is ready. Share the code ${team.team_code} so your teammates can join.`,
      type: "registration",
      eventId,
    });

    const loaded = await loadTeam(team.id);

    return ok(res, 201, "Team created", { team: loaded.team });
  } catch (error) {
    console.error("Create team error:", error);

    return fail(res, 500, "Internal server error");
  }
};

/* ================================================================== *
 * Student: join by code
 * ================================================================== */

export const joinTeam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return fail(res, 401, "Authentication required");

    const eventId = paramId(req.params.eventId);

    if (!eventId) return fail(res, 400, "Event ID is required");

    const rawCode =
      typeof req.body?.team_code === "string"
        ? req.body.team_code
        : "";

    if (!rawCode.trim()) {
      return fail(res, 400, "Team code is required");
    }

    const code = normaliseTeamCode(rawCode);

    const event = await loadTeamEvent(res, eventId, true);

    if (!event) return;

    const { registered, failed } = await isStudentRegistered(
      eventId,
      req.user.userId
    );

    if (failed) return fail(res, 500, "Failed to check your registration");

    if (!registered) {
      return fail(
        res,
        400,
        "Register for this event first, then join a team"
      );
    }

    const existing = await findStudentTeam(eventId, req.user.userId);

    if (existing.failed) {
      return fail(res, 500, "Failed to check your existing team");
    }

    if (existing.team) {
      return fail(
        res,
        409,
        "You are already in a team for this event"
      );
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name, event_id, status, leader_id")
      .eq("team_code", code)
      .maybeSingle();

    if (teamError) {
      console.error("Team code lookup error:", teamError);

      return fail(res, 500, "Failed to find that team");
    }

    /*
     * A wrong code and a code from another event give the same answer,
     * so the endpoint cannot be used to discover which codes exist.
     */
    if (!team || team.event_id !== eventId || team.status !== "active") {
      return fail(res, 404, "No active team found with that code for this event");
    }

    const memberCount = await countTeamMembers(team.id);

    if (memberCount === null) {
      return fail(res, 500, "Failed to check the team size");
    }

    const size = teamSizeStatus(memberCount, event);

    if (size.full) {
      return fail(
        res,
        409,
        `"${team.name}" is already full (${event.max_team_size} members)`
      );
    }

    const { error: insertError } = await supabase
      .from("team_members")
      .insert({
        team_id: team.id,
        student_id: req.user.userId,
        role: "member",
      });

    if (insertError) {
      console.error("Team join error:", insertError);

      return fail(res, 409, "You are already a member of that team");
    }

    await linkRegistrationToTeam(eventId, req.user.userId, team.id);

    /* The leader hears about it; the joiner already knows. */
    await createNotification({
      userId: team.leader_id,
      title: `Someone joined ${team.name}`,
      message: `A new member joined your team for ${event.title}.`,
      type: "registration",
      eventId,
    });

    const loaded = await loadTeam(team.id);

    return ok(res, 200, `You joined ${team.name}`, {
      team: loaded.team,
    });
  } catch (error) {
    console.error("Join team error:", error);

    return fail(res, 500, "Internal server error");
  }
};

/* ================================================================== *
 * Student: my team for an event, and all my teams
 * ================================================================== */

export const getMyTeamForEvent = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) return fail(res, 401, "Authentication required");

    const eventId = paramId(req.params.eventId);

    if (!eventId) return fail(res, 400, "Event ID is required");

    const { team, failed } = await findStudentTeam(
      eventId,
      req.user.userId
    );

    if (failed) return fail(res, 500, "Failed to load your team");

    return ok(res, 200, team ? "Team found" : "No team yet", {
      team,
    });
  } catch (error) {
    console.error("My team error:", error);

    return fail(res, 500, "Internal server error");
  }
};

export const getMyTeams = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return fail(res, 401, "Authentication required");

    const { data, error } = await supabase
      .from("team_members")
      .select(
        `
        id,
        role,
        joined_at,
        team:teams!team_members_team_id_fkey (
          id, name, team_code, status, event_id, leader_id,
          event:events!teams_event_id_fkey (
            id, title, event_date, venue, status,
            participation_type, min_team_size, max_team_size
          )
        )
      `
      )
      .eq("student_id", req.user.userId)
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("My teams error:", error);

      return fail(res, 500, "Failed to load your teams");
    }

    const teams = (data || [])
      .map((row) => {
        const team = one<any>(row.team);

        if (!team || team.status !== "active") return null;

        return {
          ...team,
          my_role: row.role,
          joined_at: row.joined_at,
          event: one<any>(team.event),
        };
      })
      .filter(Boolean);

    return ok(res, 200, "Teams loaded", { teams });
  } catch (error) {
    console.error("My teams error:", error);

    return fail(res, 500, "Internal server error");
  }
};

/* ================================================================== *
 * Faculty / admin / judge / volunteer: read an event's teams
 * ================================================================== */

export const getEventTeams = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) return fail(res, 401, "Authentication required");

    const eventId = paramId(req.params.eventId);

    if (!eventId) return fail(res, 400, "Event ID is required");

    const { event, failed } = await getEvent(eventId);

    if (failed) return fail(res, 500, "Failed to load the event");
    if (!event) return fail(res, 404, "Event not found");

    if (!(await canViewEventTeams(req, event))) {
      /* 404 rather than 403, so the route cannot enumerate events. */
      return fail(res, 404, "Event not found");
    }

    const { data: config } = await supabase
      .from("events")
      .select("participation_type, min_team_size, max_team_size")
      .eq("id", eventId)
      .maybeSingle();

    const { data: teams, error } = await supabase
      .from("teams")
      .select(TEAM_SELECT)
      .eq("event_id", eventId)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Event teams error:", error);

      return fail(res, 500, "Failed to load teams");
    }

    /*
     * Attendance is per member, never per team, so it is counted from
     * the individual registrations. This is what lets faculty see
     * "3 of 4 checked in" rather than a single team-level flag.
     */
    const teamIds = (teams || []).map((t: any) => t.id);

    let attendanceByTeam = new Map<string, number>();
    let registeredByTeam = new Map<string, number>();

    if (teamIds.length > 0) {
      const { data: regs } = await supabase
        .from("registrations")
        .select("id, team_id, status")
        .in("team_id", teamIds)
        .neq("status", "cancelled");

      const regIds = (regs || []).map((r: any) => r.id);

      for (const r of regs || []) {
        registeredByTeam.set(
          r.team_id,
          (registeredByTeam.get(r.team_id) || 0) + 1
        );
      }

      if (regIds.length > 0) {
        const { data: att } = await supabase
          .from("attendance")
          .select("registration_id")
          .in("registration_id", regIds);

        const attended = new Set(
          (att || []).map((a: any) => a.registration_id)
        );

        for (const r of regs || []) {
          if (attended.has(r.id)) {
            attendanceByTeam.set(
              r.team_id,
              (attendanceByTeam.get(r.team_id) || 0) + 1
            );
          }
        }
      }
    }

    /* How many judges have scored each team. */
    const { data: evals } = await supabase
      .from("judge_evaluations")
      .select("team_id")
      .eq("event_id", eventId)
      .not("team_id", "is", null);

    const evalCount = new Map<string, number>();

    for (const e of evals || []) {
      evalCount.set(e.team_id, (evalCount.get(e.team_id) || 0) + 1);
    }

    const { count: judgeCount } = await supabase
      .from("event_judges")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);

    const sizeConfig = {
      min_team_size: config?.min_team_size ?? 1,
      max_team_size: config?.max_team_size ?? 1,
    };

    const enriched = (teams || []).map((team: any) => {
      const members = team.members || [];
      const size = teamSizeStatus(members.length, sizeConfig);

      return {
        ...team,
        member_count: members.length,
        registered_count: registeredByTeam.get(team.id) || 0,
        attended_count: attendanceByTeam.get(team.id) || 0,
        judges_submitted: evalCount.get(team.id) || 0,
        judges_total: judgeCount ?? 0,
        size_complete: size.complete,
        size_warning: size.message,
      };
    });

    /*
     * Students who registered but never joined a team.
     *
     * Not a failure state — registration is the ticket and the team
     * comes afterwards — but faculty has to be able to see them,
     * because these are the people to chase before the deadline.
     * Without this list they are invisible: they hold a place and a
     * QR code while appearing in no team at all.
     */
    const { data: unassignedRows, error: unassignedError } =
      await supabase
        .from("registrations")
        .select(
          `
          id,
          registration_code,
          registered_at,
          student:users!registrations_student_id_fkey (
            id, name, email, department, year, profile_image
          )
        `
        )
        .eq("event_id", eventId)
        .is("team_id", null)
        .neq("status", "cancelled")
        .order("registered_at", { ascending: true });

    if (unassignedError) {
      /*
       * Logged but not fatal — the teams themselves loaded, and
       * losing the chase-list should not blank the whole tab.
       */
      console.error("Unassigned lookup error:", unassignedError);
    }

    return ok(res, 200, "Teams loaded", {
      participation_type: config?.participation_type ?? "individual",
      min_team_size: sizeConfig.min_team_size,
      max_team_size: sizeConfig.max_team_size,
      teams: enriched,
      unassigned: unassignedRows || [],
    });
  } catch (error) {
    console.error("Event teams error:", error);

    return fail(res, 500, "Internal server error");
  }
};

export const getTeamById = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) return fail(res, 401, "Authentication required");

    const teamId = paramId(req.params.teamId);

    if (!teamId) return fail(res, 400, "Team ID is required");

    const { team, failed } = await loadTeam(teamId);

    if (failed) return fail(res, 500, "Failed to load the team");
    if (!team) return fail(res, 404, "Team not found");

    const t: any = team;

    /* A member may always see their own team. */
    const isMember = (t.members || []).some(
      (m: any) => m.student_id === req.user!.userId
    );

    if (!isMember) {
      const { event } = await getEvent(t.event_id);

      if (!event || !(await canViewEventTeams(req, event))) {
        return fail(res, 404, "Team not found");
      }
    }

    return ok(res, 200, "Team loaded", { team });
  } catch (error) {
    console.error("Get team error:", error);

    return fail(res, 500, "Internal server error");
  }
};

/* ================================================================== *
 * Team management — leader controls and leaving
 * ================================================================== */

/*
 * Loads a team and establishes what the caller is allowed to do with
 * it. Every mutating handler below starts here, so the rules live in
 * one place rather than being restated four times.
 */
const loadForMutation = async (
  req: AuthRequest,
  res: Response
) => {
  const eventId = paramId(req.params.eventId);
  const teamId = paramId(req.params.teamId);

  if (!eventId || !teamId) {
    fail(res, 400, "Event ID and team ID are required");

    return null;
  }

  const { team, failed } = await loadTeam(teamId);

  if (failed) {
    fail(res, 500, "Failed to load the team");

    return null;
  }

  const t: any = team;

  if (!t || t.event_id !== eventId || t.status !== "active") {
    fail(res, 404, "Team not found for this event");

    return null;
  }

  const event = await loadTeamEvent(res, eventId, false);

  if (!event) return null;

  const userId = req.user!.userId;
  const role = req.user!.role;

  const isLeader = t.leader_id === userId;
  const isMember = (t.members || []).some(
    (m: any) => m.student_id === userId
  );

  const canManageEvent =
    role === "admin" ||
    (role === "faculty" && event.organizer_id === userId);

  return { team: t, event, isLeader, isMember, canManageEvent };
};

/* Leader (or the organiser) renames the team. */
export const updateTeam = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) return fail(res, 401, "Authentication required");

    const ctx = await loadForMutation(req, res);

    if (!ctx) return;

    if (!ctx.isLeader && !ctx.canManageEvent) {
      return fail(res, 403, "Only the team leader can change the team");
    }

    const name =
      typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!name) return fail(res, 400, "Team name is required");
    if (name.length > 80) return fail(res, 400, "Team name is too long");

    const { error } = await supabase
      .from("teams")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", ctx.team.id);

    if (error) {
      console.error("Team rename error:", error);

      return fail(res, 500, "Failed to rename the team");
    }

    const loaded = await loadTeam(ctx.team.id);

    return ok(res, 200, "Team renamed", { team: loaded.team });
  } catch (error) {
    console.error("Update team error:", error);

    return fail(res, 500, "Internal server error");
  }
};

/*
 * Transfer leadership to another member.
 *
 * Both rows are updated: teams.leader_id and the two team_members
 * roles, so the two never disagree about who leads.
 */
export const transferLeadership = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) return fail(res, 401, "Authentication required");

    const ctx = await loadForMutation(req, res);

    if (!ctx) return;

    if (!ctx.isLeader && !ctx.canManageEvent) {
      return fail(
        res,
        403,
        "Only the team leader can hand over leadership"
      );
    }

    const newLeaderId =
      typeof req.body?.student_id === "string"
        ? req.body.student_id.trim()
        : "";

    if (!newLeaderId) return fail(res, 400, "student_id is required");

    if (newLeaderId === ctx.team.leader_id) {
      return fail(res, 400, "That student already leads this team");
    }

    const target = (ctx.team.members || []).find(
      (m: any) => m.student_id === newLeaderId
    );

    if (!target) {
      return fail(
        res,
        400,
        "That student is not a member of this team"
      );
    }

    const { error: teamError } = await supabase
      .from("teams")
      .update({
        leader_id: newLeaderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.team.id);

    if (teamError) {
      console.error("Leadership transfer error:", teamError);

      return fail(res, 500, "Failed to transfer leadership");
    }

    await supabase
      .from("team_members")
      .update({ role: "member" })
      .eq("team_id", ctx.team.id)
      .eq("student_id", ctx.team.leader_id);

    await supabase
      .from("team_members")
      .update({ role: "leader" })
      .eq("team_id", ctx.team.id)
      .eq("student_id", newLeaderId);

    await createNotification({
      userId: newLeaderId,
      title: `You now lead ${ctx.team.name}`,
      message: `Leadership of ${ctx.team.name} for ${ctx.event.title} was transferred to you.`,
      type: "general",
      eventId: ctx.event.id,
    });

    const loaded = await loadTeam(ctx.team.id);

    return ok(res, 200, "Leadership transferred", {
      team: loaded.team,
    });
  } catch (error) {
    console.error("Transfer leadership error:", error);

    return fail(res, 500, "Internal server error");
  }
};

/*
 * Remove a member, or leave the team.
 *
 * A member may remove only themselves. A leader may remove anyone but
 * themselves — leaving requires handing over leadership first, so a
 * team is never left without one.
 */
export const removeTeamMember = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) return fail(res, 401, "Authentication required");

    const ctx = await loadForMutation(req, res);

    if (!ctx) return;

    const studentId = paramId(req.params.studentId);

    if (!studentId) return fail(res, 400, "Student ID is required");

    const userId = req.user.userId;
    const removingSelf = studentId === userId;

    if (!removingSelf && !ctx.isLeader && !ctx.canManageEvent) {
      return fail(
        res,
        403,
        "Only the team leader can remove another member"
      );
    }

    if (removingSelf && !ctx.isMember) {
      return fail(res, 400, "You are not a member of this team");
    }

    const isTargetLeader = studentId === ctx.team.leader_id;

    if (isTargetLeader && !ctx.canManageEvent) {
      return fail(
        res,
        409,
        "Transfer leadership to another member before leaving the team"
      );
    }

    const target = (ctx.team.members || []).find(
      (m: any) => m.student_id === studentId
    );

    if (!target) {
      return fail(res, 404, "That student is not in this team");
    }

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", ctx.team.id)
      .eq("student_id", studentId);

    if (error) {
      console.error("Remove member error:", error);

      return fail(res, 500, "Failed to remove the member");
    }

    /*
     * Their registration survives — they stay registered for the
     * event, just without a team, and keep their QR. That matches the
     * register-first model and means nobody silently loses their place.
     */
    await linkRegistrationToTeam(ctx.event.id, studentId, null);

    if (!removingSelf) {
      await createNotification({
        userId: studentId,
        title: `Removed from ${ctx.team.name}`,
        message: `You were removed from ${ctx.team.name} for ${ctx.event.title}. You are still registered for the event and can join another team.`,
        type: "general",
        eventId: ctx.event.id,
      });
    }

    /* A team with nobody left is cancelled rather than orphaned. */
    const remaining = await countTeamMembers(ctx.team.id);

    if (remaining === 0) {
      await supabase
        .from("teams")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ctx.team.id);

      return ok(res, 200, "You left the team, and it is now empty", {
        team: null,
      });
    }

    const loaded = await loadTeam(ctx.team.id);

    return ok(
      res,
      200,
      removingSelf ? "You left the team" : "Member removed",
      { team: loaded.team }
    );
  } catch (error) {
    console.error("Remove member error:", error);

    return fail(res, 500, "Internal server error");
  }
};

/*
 * Leader adds an already-registered student directly, without them
 * having to type the code.
 */
export const addTeamMember = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) return fail(res, 401, "Authentication required");

    const ctx = await loadForMutation(req, res);

    if (!ctx) return;

    if (!ctx.isLeader && !ctx.canManageEvent) {
      return fail(res, 403, "Only the team leader can add members");
    }

    const studentId =
      typeof req.body?.student_id === "string"
        ? req.body.student_id.trim()
        : "";

    if (!studentId) return fail(res, 400, "student_id is required");

    const { registered, failed } = await isStudentRegistered(
      ctx.event.id,
      studentId
    );

    if (failed) return fail(res, 500, "Failed to check registration");

    if (!registered) {
      return fail(
        res,
        400,
        "That student has not registered for this event yet"
      );
    }

    const existing = await findStudentTeam(ctx.event.id, studentId);

    if (existing.failed) {
      return fail(res, 500, "Failed to check their existing team");
    }

    if (existing.team) {
      return fail(
        res,
        409,
        "That student is already in a team for this event"
      );
    }

    const memberCount = await countTeamMembers(ctx.team.id);

    if (memberCount === null) {
      return fail(res, 500, "Failed to check the team size");
    }

    if (teamSizeStatus(memberCount, ctx.event).full) {
      return fail(
        res,
        409,
        `The team is already full (${ctx.event.max_team_size} members)`
      );
    }

    const { error } = await supabase
      .from("team_members")
      .insert({
        team_id: ctx.team.id,
        student_id: studentId,
        role: "member",
      });

    if (error) {
      console.error("Add member error:", error);

      return fail(res, 409, "That student is already in this team");
    }

    await linkRegistrationToTeam(
      ctx.event.id,
      studentId,
      ctx.team.id
    );

    await createNotification({
      userId: studentId,
      title: `Added to ${ctx.team.name}`,
      message: `You were added to ${ctx.team.name} for ${ctx.event.title}.`,
      type: "registration",
      eventId: ctx.event.id,
    });

    const loaded = await loadTeam(ctx.team.id);

    return ok(res, 200, "Member added", { team: loaded.team });
  } catch (error) {
    console.error("Add member error:", error);

    return fail(res, 500, "Internal server error");
  }
};
