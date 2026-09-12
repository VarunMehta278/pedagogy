"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  UserCheck,
  Gavel,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/page-header";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

/* ------------------------------------------------------------------ */

type Student = {
  id: string;
  name: string;
  email: string;
  department?: string | null;
  year?: number | null;
  profile_image?: string | null;
};

type Member = {
  id: string;
  student_id: string;
  role: "leader" | "member";
  joined_at: string;
  student: Student | Student[] | null;
};

type Team = {
  id: string;
  name: string;
  team_code: string;
  leader_id: string;
  status: "active" | "cancelled";
  members: Member[];
  member_count: number;
  registered_count: number;
  attended_count: number;
  judges_submitted: number;
  judges_total: number;
  size_complete: boolean;
  size_warning: string | null;
};

/*
 * A student who registered but has not joined a team. They hold a
 * place and a QR code, so they are real participants — they just
 * belong to no team yet.
 */
type Unassigned = {
  id: string;
  registration_code: string;
  registered_at?: string | null;
  student: Student | Student[] | null;
};

type TeamsResponse = {
  participation_type: "individual" | "team";
  min_team_size: number;
  max_team_size: number;
  teams: Team[];
  unassigned?: Unassigned[];
};

/* Supabase returns a joined relation as an object or a one-item array. */
const one = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

/* ================================================================== */

export default function FacultyTeamsPanel({ eventId }: { eventId: string }) {
  const [data, setData] = useState<TeamsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/events/${eventId}/teams`,
        { credentials: "include" }
      );

      let payload: any = null;

      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message || "Could not load teams."
        );
      }

      setData(payload.data as TeamsResponse);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach the server. Check that the API is running."
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  /*
   * Every hook above must run on every render, so the search
   * filter and the derived counts are computed unconditionally —
   * the early returns for loading / error / individual events
   * come after, purely in the render output.
   */
  const teams = useMemo(() => data?.teams ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return teams;

    return teams.filter((team) => {
      if (team.name.toLowerCase().includes(q)) return true;
      if (team.team_code.toLowerCase().includes(q)) return true;

      return team.members.some((member) => {
        const student = one(member.student);
        return !!student?.name?.toLowerCase().includes(q);
      });
    });
  }, [teams, query]);

  const totalMembers = useMemo(
    () => teams.reduce((sum, team) => sum + team.member_count, 0),
    [teams]
  );

  const incompleteCount = useMemo(
    () => teams.filter((team) => !team.size_complete).length,
    [teams]
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-6 w-40" />
          <SkeletonRows rows={3} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-5 sm:p-6">
          <SectionHeading
            title="Teams"
            description="Teams registered for this event."
          />
          <Alert tone="destructive">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.participation_type !== "team") {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <SectionHeading
          title="Teams"
          description={`Team size ${data.min_team_size}–${data.max_team_size}. Students register individually, then create or join a team.`}
        />

        {/* Summary row */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryTile
            icon={Users}
            label="Teams"
            value={teams.length}
          />
          <SummaryTile
            icon={Award}
            label="Total members"
            value={totalMembers}
          />
          <SummaryTile
            icon={AlertTriangle}
            label="Incomplete teams"
            value={incompleteCount}
            tone={incompleteCount > 0 ? "warning" : "success"}
          />
        </div>

        {/* Search */}
        {teams.length > 0 && (
          <div className="relative mt-6">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by team name, code or member..."
              className="pl-10"
              aria-label="Search teams"
            />
          </div>
        )}

        {/* Teams list */}
        {teams.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No teams yet"
            description="Students who register for this event can create or join a team once they're registered."
            className="mt-6"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No teams match your search"
            description="Try a different team name, code or member."
            className="mt-6"
          />
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {filtered.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}

        {/* Registered but teamless */}
        <UnassignedList rows={data.unassigned || []} />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Registered, no team
 *
 * These students hold a place and a QR code but belong to no team.
 * They are the ones to chase before the deadline, and without this
 * list they appear nowhere on the page at all.
 * ------------------------------------------------------------------ */

function UnassignedList({ rows }: { rows: Unassigned[] }) {
  if (rows.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-success/25 bg-success/8 px-4 py-3">
        <p className="text-sm font-medium text-foreground">
          Everyone who registered is in a team.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">
          Registered, no team yet
        </h3>

        <Badge variant="warning" size="sm">
          {rows.length} to chase
        </Badge>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        These students registered and hold a place, but have not
        created or joined a team. They keep their registration and QR
        code either way.
      </p>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {rows.map((row) => {
          const student = one(row.student);
          const name = student?.name?.trim() || "Deleted account";

          return (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {name}
                </p>

                <p className="truncate text-xs text-muted-foreground">
                  {student?.email || "—"}
                  {student?.department
                    ? ` · ${student.department}`
                    : ""}
                </p>
              </div>

              <span className="tabular shrink-0 font-mono text-xs text-muted-foreground">
                {row.registration_code}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ================================================================== */

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone = "brand",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: "brand" | "warning" | "success";
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-subtle text-primary",
    warning: "bg-warning/15 text-warning",
    success: "bg-success/12 text-success",
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          tones[tone]
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="tabular text-lg font-semibold leading-tight text-foreground">
          {value}
        </p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {team.name}
          </p>
          <p className="font-mono mt-0.5 text-xs text-muted-foreground">
            {team.team_code}
          </p>
        </div>

        {!team.size_complete && team.size_warning && (
          <Badge
            variant="warning"
            size="sm"
            className="shrink-0"
            title={team.size_warning}
          >
            <AlertTriangle aria-hidden="true" />
            Undersized
          </Badge>
        )}
      </div>

      {!team.size_complete && team.size_warning && (
        <p className="mt-2 text-xs text-warning">{team.size_warning}</p>
      )}

      {/* Members */}
      <ul className="mt-4 space-y-1.5">
        {team.members.map((member) => {
          const student = one(member.student);

          return (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2"
            >
              <div className="min-w-0 flex items-center gap-2">
                {member.role === "leader" && (
                  <UserCheck
                    className="h-3.5 w-3.5 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                )}
                <span className="truncate text-sm text-foreground">
                  {student?.name ?? "Deleted account"}
                </span>
              </div>

              {member.role === "leader" && (
                <Badge variant="outline" size="sm" className="shrink-0">
                  Leader
                </Badge>
              )}
            </li>
          );
        })}
      </ul>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
        <Stat
          icon={CheckCircle2}
          label="Attendance"
          value={`${team.attended_count} / ${team.registered_count}`}
        />
        <Stat
          icon={Gavel}
          label="Evaluated"
          value={`${team.judges_submitted} / ${team.judges_total}`}
        />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="tabular text-xs font-medium text-foreground">
          {value}
        </p>
        <p className="text-[0.6875rem] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
