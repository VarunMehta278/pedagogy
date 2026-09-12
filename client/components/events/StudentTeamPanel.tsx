"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  Check,
  ClipboardCheck,
  KeyRound,
  LogOut,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { fetchCurrentUser } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
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
  event_id: string;
  name: string;
  team_code: string;
  leader_id: string;
  status: "active" | "cancelled";
  created_at: string;
  updated_at: string;
  members: Member[];
};

/* Supabase returns a joined relation as an object or a one-item array. */
const one = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

const call = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  let payload: any = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return { ok: response.ok, status: response.status, payload };
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

/* ================================================================== */

export default function StudentTeamPanel({
  eventId,
  registered,
  minTeamSize,
  maxTeamSize,
}: {
  eventId: string;
  registered: boolean;
  minTeamSize: number;
  maxTeamSize: number;
}) {
  const [loading, setLoading] = useState(registered);
  const [error, setError] = useState("");
  const [team, setTeam] = useState<Team | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [me, self] = await Promise.all([
      call(`/events/${eventId}/teams/me`),
      fetchCurrentUser(),
    ]);

    setSelfId(self?.id ?? null);

    if (me.ok) {
      setTeam(me.payload?.team ?? me.payload?.data?.team ?? null);
    } else {
      setError(
        me.payload?.message || "Could not load your team."
      );
    }

    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    if (!registered) {
      setLoading(false);

      return;
    }

    load();
  }, [registered, load]);

  // --------------------------------------------------
  // Not registered yet — Register is the only action.
  // --------------------------------------------------

  if (!registered) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-brand-subtle p-3">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">
              This is a team event
            </h3>

            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Register for the event above first. Once you are
              registered, you can create a new team or join one
              with a team code.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  // --------------------------------------------------
  // Failed to load
  // --------------------------------------------------

  if (error && !team) {
    return (
      <Alert
        tone="destructive"
        title="Could not load your team"
        action={
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground">Team</h2>

      <div className="mt-4">
        {team ? (
          <TeamView
            eventId={eventId}
            team={team}
            selfId={selfId}
            minTeamSize={minTeamSize}
            onTeam={setTeam}
          />
        ) : (
          <NoTeamView
            eventId={eventId}
            minTeamSize={minTeamSize}
            maxTeamSize={maxTeamSize}
            onTeam={setTeam}
          />
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Registered, no team yet — create or join                           */
/* ================================================================== */

function NoTeamView({
  eventId,
  minTeamSize,
  maxTeamSize,
  onTeam,
}: {
  eventId: string;
  minTeamSize: number;
  maxTeamSize: number;
  onTeam: (team: Team) => void;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const sizeLabel =
    minTeamSize === maxTeamSize
      ? `${minTeamSize} member${minTeamSize === 1 ? "" : "s"}`
      : `${minTeamSize}–${maxTeamSize} members`;

  const createTeam = async () => {
    if (!name.trim()) {
      toast.error("Give your team a name first");

      return;
    }

    setCreating(true);

    const { ok, payload } = await call(`/events/${eventId}/teams`, {
      method: "POST",
      body: JSON.stringify({ name: name.trim() }),
    });

    setCreating(false);

    if (ok) {
      const created = payload?.team ?? payload?.data?.team;

      toast.success(payload?.message || "Team created");

      if (created) onTeam(created);
    } else {
      toast.error(payload?.message || "Could not create team");
    }
  };

  const joinTeam = async () => {
    if (!code.trim()) {
      toast.error("Enter a team code first");

      return;
    }

    setJoining(true);

    const { ok, payload } = await call(
      `/events/${eventId}/teams/join`,
      {
        method: "POST",
        body: JSON.stringify({ team_code: code.trim() }),
      }
    );

    setJoining(false);

    if (ok) {
      const joined = payload?.team ?? payload?.data?.team;

      toast.success(payload?.message || "Joined team");

      if (joined) onTeam(joined);
    } else {
      toast.error(payload?.message || "Could not join team");
    }
  };

  return (
    <div>
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-subtle px-4 py-2 text-sm font-semibold text-accent-foreground">
        <Users className="h-4 w-4" aria-hidden="true" />
        Team size: {sizeLabel}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Create */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-brand-subtle p-2">
              <UserPlus className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Create a team
            </h3>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Start a new team. You become the leader, and you get a
            code to share with your teammates.
          </p>

          <div className="mt-4">
            <Label htmlFor="team-name">Team name</Label>
            <Input
              id="team-name"
              value={name}
              placeholder="e.g. The Byte Squad"
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
            />
          </div>

          <Button
            className="mt-4"
            block
            loading={creating}
            loadingText="Creating…"
            onClick={createTeam}
          >
            Create team
          </Button>
        </div>

        {/* Join */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-brand-subtle p-2">
              <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Join a team
            </h3>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Already have a code from a teammate? Enter it here to
            join their team.
          </p>

          <div className="mt-4">
            <Label htmlFor="team-code">Team code</Label>
            <Input
              id="team-code"
              value={code}
              placeholder="e.g. PED-A72K"
              className="font-mono uppercase tracking-wider"
              onChange={(event) =>
                setCode(event.target.value.toUpperCase())
              }
              maxLength={20}
            />
          </div>

          <Button
            className="mt-4"
            block
            variant="outline"
            loading={joining}
            loadingText="Joining…"
            onClick={joinTeam}
          >
            Join team
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* In a team                                                           */
/* ================================================================== */

function TeamView({
  eventId,
  team,
  selfId,
  minTeamSize,
  onTeam,
}: {
  eventId: string;
  team: Team;
  selfId: string | null;
  minTeamSize: number;
  onTeam: (team: Team | null) => void;
}) {
  const [copied, setCopied] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(team.name);
  const [renaming, setRenaming] = useState(false);

  const [transferringId, setTransferringId] = useState<string | null>(
    null
  );
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const isLeader = !!selfId && team.leader_id === selfId;
  const memberCount = team.members.length;
  const belowMin = memberCount < minTeamSize;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(team.team_code);
      setCopied(true);
      toast.success("Code copied");

      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy the code");
    }
  };

  const saveName = async () => {
    if (!nameDraft.trim()) {
      toast.error("Team name can't be empty");

      return;
    }

    setRenaming(true);

    const { ok, payload } = await call(
      `/events/${eventId}/teams/${team.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: nameDraft.trim() }),
      }
    );

    setRenaming(false);

    if (ok) {
      const updated = payload?.team ?? payload?.data?.team;

      toast.success(payload?.message || "Team renamed");
      setEditingName(false);

      if (updated) onTeam(updated);
    } else {
      toast.error(payload?.message || "Could not rename team");
    }
  };

  const transferTo = async (member: Member) => {
    const person = one(member.student);
    const name = person?.name || "this member";

    if (!confirm(`Make ${name} the team leader? You will no longer be the leader.`)) {
      return;
    }

    setTransferringId(member.student_id);

    const { ok, payload } = await call(
      `/events/${eventId}/teams/${team.id}/leader`,
      {
        method: "POST",
        body: JSON.stringify({ student_id: member.student_id }),
      }
    );

    setTransferringId(null);

    if (ok) {
      const updated = payload?.team ?? payload?.data?.team;

      toast.success(payload?.message || "Leadership transferred");

      if (updated) onTeam(updated);
    } else {
      toast.error(payload?.message || "Could not transfer leadership");
    }
  };

  const removeMember = async (member: Member) => {
    const person = one(member.student);
    const name = person?.name || "this member";

    if (!confirm(`Remove ${name} from the team?`)) {
      return;
    }

    setRemovingId(member.student_id);

    const { ok, payload } = await call(
      `/events/${eventId}/teams/${team.id}/members/${member.student_id}`,
      { method: "DELETE" }
    );

    setRemovingId(null);

    if (ok) {
      const updated = payload?.team ?? payload?.data?.team;

      toast.success(payload?.message || "Member removed");
      onTeam(updated ?? null);
    } else {
      toast.error(payload?.message || "Could not remove member");
    }
  };

  const leaveTeam = async () => {
    if (!selfId) return;

    if (!confirm(`Leave ${team.name}?`)) {
      return;
    }

    setLeaving(true);

    const { ok, payload } = await call(
      `/events/${eventId}/teams/${team.id}/members/${selfId}`,
      { method: "DELETE" }
    );

    setLeaving(false);

    if (ok) {
      const updated = payload?.team ?? payload?.data?.team;

      toast.success(payload?.message || "You left the team");
      onTeam(updated ?? null);
    } else {
      /*
       * The leader gets a 409 here with a message about
       * transferring leadership first — the server's wording,
       * not ours.
       */
      toast.error(payload?.message || "Could not leave the team");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      {/* Name */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {editingName ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              maxLength={80}
              autoFocus
              className="max-w-xs"
            />

            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Save team name"
              loading={renaming}
              onClick={saveName}
            >
              <Check aria-hidden="true" />
            </Button>

            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Cancel rename"
              disabled={renaming}
              onClick={() => {
                setNameDraft(team.name);
                setEditingName(false);
              }}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">
              {team.name}
            </h3>

            {isLeader && (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Rename team"
                onClick={() => setEditingName(true)}
              >
                <Pencil aria-hidden="true" />
              </Button>
            )}
          </div>
        )}

        <span
          className={cn(
            "tabular shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
            belowMin
              ? "bg-warning/12 text-warning"
              : "bg-success/12 text-success"
          )}
        >
          {memberCount} of {minTeamSize} members
        </span>
      </div>

      {belowMin && (
        <p className="mt-2 text-xs text-warning">
          This team needs at least {minTeamSize} member
          {minTeamSize === 1 ? "" : "s"} to compete.
        </p>
      )}

      {/* Code */}
      <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Team code
        </p>

        <div className="mt-2 flex items-center justify-center gap-3">
          <p className="font-mono text-3xl font-bold tracking-[0.2em] text-foreground sm:text-4xl">
            {team.team_code}
          </p>

          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Copy team code"
            onClick={copyCode}
          >
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <ClipboardCheck aria-hidden="true" />
            )}
          </Button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Share this code with teammates so they can join.
        </p>
      </div>

      {/* Members */}
      <div className="mt-6">
        <h4 className="mb-3 text-sm font-semibold text-foreground">
          Members
        </h4>

        {team.members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members"
            description="This team has no members yet."
          />
        ) : (
          <ul className="space-y-2">
            {team.members.map((member) => {
              const person = one(member.student);
              const name = person?.name ?? "Deleted account";
              const email = person?.email ?? "";
              const isSelf = member.student_id === selfId;

              return (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-sm font-semibold text-accent-foreground">
                      {initials(name)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {name}
                        {isSelf && (
                          <span className="text-muted-foreground">
                            {" "}
                            (You)
                          </span>
                        )}
                      </p>

                      {email && (
                        <p className="truncate text-xs text-muted-foreground">
                          {email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {member.role === "leader" && (
                      <Badge variant="default" size="sm">
                        <Award aria-hidden="true" />
                        Leader
                      </Badge>
                    )}

                    {isLeader && member.role !== "leader" && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={transferringId === member.student_id}
                          onClick={() => transferTo(member)}
                        >
                          Make leader
                        </Button>

                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Remove ${name}`}
                          loading={removingId === member.student_id}
                          onClick={() => removeMember(member)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Leave */}
      {selfId && (
        <div className="mt-6 border-t border-border pt-5">
          <Button
            variant="outline"
            size="sm"
            loading={leaving}
            loadingText="Leaving…"
            onClick={leaveTeam}
          >
            <LogOut aria-hidden="true" />
            Leave team
          </Button>
        </div>
      )}
    </div>
  );
}
