/*
 * Shared team types.
 *
 * Kept separate from the controllers so the client-facing shapes and
 * the validation rules have one definition rather than being restated
 * in each handler.
 */

export type ParticipationType = "individual" | "team";

export type TeamStatus = "active" | "cancelled";

export type TeamMemberRole = "leader" | "member";

export type EventTeamConfig = {
  participation_type: ParticipationType;
  min_team_size: number;
  max_team_size: number;
};

export type TeamMember = {
  id: string;
  student_id: string;
  role: TeamMemberRole;
  joined_at: string;
  student?: {
    id: string;
    name: string;
    email: string;
    department?: string | null;
    year?: number | null;
    profile_image?: string | null;
  } | null;
};

export type Team = {
  id: string;
  event_id: string;
  name: string;
  team_code: string;
  leader_id: string;
  status: TeamStatus;
  created_at: string;
  updated_at: string;
  members?: TeamMember[];
};
