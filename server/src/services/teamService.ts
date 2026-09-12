import { supabase } from "../config/supabase";

/*
 * Team data access.
 *
 * The rules that need no database live in utils/teams.ts so they can
 * be unit tested without constructing a Supabase client; they are
 * re-exported here so callers have a single import.
 */
import { buildTeamCode } from "../utils/teams";

export {
  buildTeamCode,
  normaliseTeamCode,
  validateTeamConfig,
  isTeamEvent,
  teamSizeStatus,
} from "../utils/teams";

/* ------------------------------------------------------------------ *
 * Database helpers
 * ------------------------------------------------------------------ */

/*
 * Generates a code and confirms it is free. Collisions are vanishingly
 * rare with 32^5 combinations, but the unique index would reject one,
 * so it is checked rather than hoped for.
 */
export const generateUniqueTeamCode = async (): Promise<
  string | null
> => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = buildTeamCode();

    const { data, error } = await supabase
      .from("teams")
      .select("id")
      .eq("team_code", candidate)
      .maybeSingle();

    if (error) {
      console.error("Team code lookup error:", error);

      return null;
    }

    if (!data) {
      return candidate;
    }
  }

  return null;
};

export const TEAM_SELECT = `
  id,
  event_id,
  name,
  team_code,
  leader_id,
  status,
  created_at,
  updated_at,
  members:team_members (
    id,
    student_id,
    role,
    joined_at,
    student:users!team_members_student_id_fkey (
      id, name, email, department, year, profile_image
    )
  )
`;

export const loadTeam = async (teamId: string) => {
  const { data, error } = await supabase
    .from("teams")
    .select(TEAM_SELECT)
    .eq("id", teamId)
    .maybeSingle();

  if (error) {
    console.error("Team load error:", error);

    return { team: null, failed: true };
  }

  return { team: data, failed: false };
};

/*
 * The team a student belongs to for one event, if any. Used both to
 * show them their team and to stop them joining a second one.
 */
export const findStudentTeam = async (
  eventId: string,
  studentId: string
) => {
  const { data, error } = await supabase
    .from("team_members")
    .select(
      `id, role, team:teams!team_members_team_id_fkey (${TEAM_SELECT})`
    )
    .eq("student_id", studentId);

  if (error) {
    console.error("Student team lookup error:", error);

    return { team: null, failed: true };
  }

  for (const row of data || []) {
    const team: any = Array.isArray(row.team) ? row.team[0] : row.team;

    if (
      team &&
      team.event_id === eventId &&
      team.status === "active"
    ) {
      return { team, failed: false };
    }
  }

  return { team: null, failed: false };
};

export const countTeamMembers = async (teamId: string) => {
  const { count, error } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);

  if (error) {
    console.error("Team member count error:", error);

    return null;
  }

  return count ?? 0;
};

/*
 * Points a member's existing registration at the team, or clears it.
 *
 * This is the join between the two worlds: the registration row, its
 * registration_code and its QR are untouched, so attendance keeps
 * working exactly as it does for individual events.
 */
export const linkRegistrationToTeam = async (
  eventId: string,
  studentId: string,
  teamId: string | null
) => {
  const { error } = await supabase
    .from("registrations")
    .update({
      team_id: teamId,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId)
    .eq("student_id", studentId);

  if (error) {
    console.error("Registration team link error:", error);

    return false;
  }

  return true;
};

export const isStudentRegistered = async (
  eventId: string,
  studentId: string
) => {
  const { data, error } = await supabase
    .from("registrations")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    console.error("Registration lookup error:", error);

    return { registered: false, failed: true };
  }

  return {
    registered: !!data && data.status !== "cancelled",
    failed: false,
  };
};
