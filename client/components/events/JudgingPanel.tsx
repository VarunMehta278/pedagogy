"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  ChevronDown,
  ChevronRight,
  Gavel,
  Lock,
  Plus,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

/* ------------------------------------------------------------------ */

type Person = {
  id: string;
  name: string;
  email: string;
  department?: string | null;
};

type Assignment = {
  id: string;
  assigned_at: string;
  user: Person | Person[] | null;
};

type Criterion = {
  id?: string;
  name: string;
  description?: string | null;
  max_score: number | string;
  weight: number | string;
};

type Evaluation = {
  judge_id: string;
  total_score: number;
  max_total: number;
  remarks?: string | null;
  scores?: { criterion_id: string; score: number }[];
};

type ParticipantRow = {
  registration_id: string;
  registration_code: string;
  student: Person | Person[] | null;
  evaluations: Evaluation[];
  judges_submitted: number;
  final_score: number | null;
  position: number | null;
};

/* Team events replace `participants` with `teams` in the evaluations
 * summary. A member's `student` can be null (deleted account). */
type TeamMember = {
  id: string;
  student_id: string;
  role: string;
  student: Person | Person[] | null;
};

type TeamRow = {
  team_id: string;
  team_name: string;
  team_code: string;
  members: TeamMember[];
  member_count: number;
  attended_count: number;
  evaluations: Evaluation[];
  judges_submitted: number;
  final_score: number | null;
  position: number | null;
  size_complete: boolean;
  size_warning?: string | boolean | null;
};

type Summary = {
  participation_type?: "individual" | "team";
  criteria: (Criterion & { id: string })[];
  judges: Person[];
  progress: {
    judge: Person | null;
    submitted: number;
    total: number;
    complete: boolean;
  }[];
  participants?: ParticipantRow[];
  teams?: TeamRow[];
  finalized_at: string | null;
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

/* ================================================================== */

export default function JudgingPanel({
  eventId,
}: {
  eventId: string;
}) {
  const [tab, setTab] = useState<
    "people" | "criteria" | "scores"
  >("people");

  const [judges, setJudges] = useState<Assignment[]>([]);
  const [volunteers, setVolunteers] = useState<Assignment[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const finalized = !!summary?.finalized_at;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [j, v, c, s] = await Promise.all([
        call(`/events/${eventId}/judges`),
        call(`/events/${eventId}/volunteers`),
        call(`/events/${eventId}/criteria`),
        call(`/events/${eventId}/evaluations`),
      ]);

      if (j.ok) setJudges(j.payload?.judges || []);
      if (v.ok) setVolunteers(v.payload?.volunteers || []);
      if (c.ok) setCriteria(c.payload?.criteria || []);
      if (s.ok) setSummary(s.payload as Summary);

      if (!j.ok && !v.ok && !c.ok && !s.ok) {
        setError(
          j.payload?.message ||
            "Could not load judging information."
        );
      }
    } catch {
      setError(
        "Could not reach the server. Check that the API is running."
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <SectionHeading
          title="Judging"
          description="Assign judges and volunteers, set the criteria, and finalise the results."
        />

        {error && (
          <Alert tone="destructive" className="mb-5">
            {error}
          </Alert>
        )}

        {finalized && (
          <Alert tone="info" title="Results are final" className="mb-5">
            Finalised on{" "}
            {new Date(summary!.finalized_at as string).toLocaleString(
              "en-IN"
            )}
            . Judges can no longer submit or change scores.
          </Alert>
        )}

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              ["people", "Judges & volunteers", Users],
              ["criteria", "Criteria", Gavel],
              ["scores", "Scores & results", Trophy],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                tab === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {tab === "people" && (
          <div className="space-y-8">
            <AssignmentSection
              kind="judge"
              eventId={eventId}
              assignments={judges}
              onChanged={load}
            />
            <AssignmentSection
              kind="volunteer"
              eventId={eventId}
              assignments={volunteers}
              onChanged={load}
            />
          </div>
        )}

        {tab === "criteria" && (
          <CriteriaEditor
            eventId={eventId}
            initial={criteria}
            locked={finalized}
            onSaved={load}
          />
        )}

        {tab === "scores" && (
          <ScoresPanel
            eventId={eventId}
            summary={summary}
            onChanged={load}
          />
        )}
      </CardContent>
    </Card>
  );
}

/* ================================================================== */
/* Judges / volunteers                                                 */
/* ================================================================== */

function AssignmentSection({
  kind,
  eventId,
  assignments,
  onChanged,
}: {
  kind: "judge" | "volunteer";
  eventId: string;
  assignments: Assignment[];
  onChanged: () => void;
}) {
  const [pool, setPool] = useState<Person[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const label = kind === "judge" ? "Judges" : "Volunteers";
  const path = kind === "judge" ? "judges" : "volunteers";

  const assignedIds = useMemo(
    () =>
      assignments
        .map((a) => one(a.user)?.id)
        .filter((id): id is string => !!id),
    [assignments]
  );

  const openPicker = async () => {
    setOpen(true);
    setPicked([]);

    const { ok, payload } = await call(
      `/users/assignable?role=${kind}`
    );

    if (ok) {
      setPool(payload?.users || []);
    } else {
      toast.error(
        payload?.message || `Could not load ${kind}s`
      );
    }
  };

  const save = async () => {
    if (picked.length === 0) return;

    setSaving(true);

    const { ok, payload } = await call(
      `/events/${eventId}/${path}`,
      {
        method: "POST",
        body: JSON.stringify({ user_ids: picked }),
      }
    );

    setSaving(false);

    if (ok) {
      toast.success(payload?.message || `${label} assigned`);
      setOpen(false);
      setPicked([]);
      onChanged();
    } else {
      toast.error(payload?.message || "Could not assign");
    }
  };

  const remove = async (userId: string, name: string) => {
    if (
      !confirm(
        `Remove ${name} from this event?`
      )
    ) {
      return;
    }

    setRemoving(userId);

    const { ok, payload } = await call(
      `/events/${eventId}/${path}/${userId}`,
      { method: "DELETE" }
    );

    setRemoving(null);

    if (ok) {
      toast.success(payload?.message || "Removed");
      onChanged();
    } else {
      /*
       * A judge with submitted evaluations comes back 409 with a
       * specific explanation. Showing the server's message rather
       * than a generic failure is the difference between the
       * faculty member understanding why and filing a bug.
       */
      toast.error(payload?.message || "Could not remove");
    }
  };

  const available = pool.filter(
    (person) => !assignedIds.includes(person.id)
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {assignments.length} assigned
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={openPicker}
        >
          <UserPlus aria-hidden="true" />
          Add {kind}s
        </Button>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          icon={kind === "judge" ? Gavel : Users}
          title={`No ${kind}s yet`}
          description={
            kind === "judge"
              ? "Judges you assign here can score participants against your criteria."
              : "Volunteers you assign here can check participants in with the QR scanner."
          }
        />
      ) : (
        <ul className="space-y-2">
          {assignments.map((assignment) => {
            const person = one(assignment.user);

            if (!person) return null;

            return (
              <li
                key={assignment.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {person.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {person.email}
                    {person.department
                      ? ` · ${person.department}`
                      : ""}
                  </p>
                </div>

                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${person.name}`}
                  loading={removing === person.id}
                  onClick={() => remove(person.id, person.name)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">
              Pick {kind}s to add
            </p>

            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>

          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No {kind} accounts are available. An admin creates
              them by changing a user&apos;s role on the Users page.
            </p>
          ) : (
            <>
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {available.map((person) => (
                  <li key={person.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-accent">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--primary)]"
                        checked={picked.includes(person.id)}
                        onChange={(event) =>
                          setPicked((prev) =>
                            event.target.checked
                              ? [...prev, person.id]
                              : prev.filter(
                                  (id) => id !== person.id
                                )
                          )
                        }
                      />

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {person.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {person.email}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-3"
                size="sm"
                loading={saving}
                disabled={picked.length === 0}
                onClick={save}
              >
                Add {picked.length > 0 ? picked.length : ""}{" "}
                {kind}
                {picked.length === 1 ? "" : "s"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Criteria                                                            */
/* ================================================================== */

function CriteriaEditor({
  eventId,
  initial,
  locked,
  onSaved,
}: {
  eventId: string;
  initial: Criterion[];
  locked: boolean;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<Criterion[]>(
    initial.length > 0
      ? initial
      : [{ name: "", description: "", max_score: 10, weight: 1 }]
  );
  const [saving, setSaving] = useState(false);

  const update = (
    index: number,
    patch: Partial<Criterion>
  ) =>
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, ...patch } : row
      )
    );

  const save = async () => {
    setSaving(true);

    const { ok, payload } = await call(
      `/events/${eventId}/criteria`,
      {
        method: "PUT",
        body: JSON.stringify({
          criteria: rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description || null,
            max_score: Number(row.max_score),
            weight: Number(row.weight),
          })),
        }),
      }
    );

    setSaving(false);

    if (ok) {
      toast.success("Criteria saved");
      setRows(payload?.criteria || rows);
      onSaved();
    } else {
      toast.error(payload?.message || "Could not save criteria");
    }
  };

  const totalWeight = rows.reduce(
    (sum, row) => sum + (Number(row.weight) || 0),
    0
  );

  return (
    <div>
      <Alert tone="info" className="mb-5">
        Judges score each criterion from 0 to its maximum. Weight
        decides how much it counts: a criterion with weight 3
        counts three times as much as one with weight 1. The
        judge&apos;s total is the weighted average, so it stays on
        the same scale as the criteria themselves.
      </Alert>

      {locked && (
        <Alert tone="warning" className="mb-5">
          Results are finalised, so criteria can no longer be
          changed.
        </Alert>
      )}

      <div className="space-y-4">
        {rows.map((row, index) => (
          <div
            key={row.id ?? `new-${index}`}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="mt-2 text-xs font-semibold text-muted-foreground">
                {index + 1}
              </span>

              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor={`c-name-${index}`} required>
                    Name
                  </Label>
                  <Input
                    id={`c-name-${index}`}
                    value={row.name}
                    disabled={locked}
                    placeholder="e.g. Innovation"
                    onChange={(event) =>
                      update(index, {
                        name: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor={`c-desc-${index}`}>
                    Description
                  </Label>
                  <Input
                    id={`c-desc-${index}`}
                    value={row.description ?? ""}
                    disabled={locked}
                    placeholder="What should a judge look for?"
                    onChange={(event) =>
                      update(index, {
                        description: event.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor={`c-max-${index}`} required>
                    Maximum score
                  </Label>
                  <Input
                    id={`c-max-${index}`}
                    type="number"
                    min={1}
                    step="1"
                    value={row.max_score}
                    disabled={locked}
                    onChange={(event) =>
                      update(index, {
                        max_score: event.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor={`c-weight-${index}`} required>
                    Weight
                  </Label>
                  <Input
                    id={`c-weight-${index}`}
                    type="number"
                    min={1}
                    step="1"
                    value={row.weight}
                    disabled={locked}
                    onChange={(event) =>
                      update(index, {
                        weight: event.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {!locked && rows.length > 1 && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove criterion ${index + 1}`}
                  onClick={() =>
                    setRows((prev) =>
                      prev.filter((_, i) => i !== index)
                    )
                  }
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!locked && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setRows((prev) => [
                ...prev,
                {
                  name: "",
                  description: "",
                  max_score: 10,
                  weight: 1,
                },
              ])
            }
          >
            <Plus aria-hidden="true" />
            Add criterion
          </Button>

          <Button
            size="sm"
            loading={saving}
            disabled={rows.some((row) => !row.name.trim())}
            onClick={save}
          >
            Save criteria
          </Button>

          <span className="tabular text-xs text-muted-foreground">
            {rows.length} criteri{rows.length === 1 ? "on" : "a"} ·
            total weight {totalWeight}
          </span>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Scores, leaderboard and finalise                                    */
/* ================================================================== */

function ScoresPanel({
  eventId,
  summary,
  onChanged,
}: {
  eventId: string;
  summary: Summary | null;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [topN, setTopN] = useState("3");
  const [finalizing, setFinalizing] = useState(false);

  if (!summary) {
    return (
      <EmptyState
        icon={Trophy}
        title="Nothing to show yet"
        description="Scores appear once judges start submitting evaluations."
      />
    );
  }

  const { criteria, progress, finalized_at } = summary;
  const isTeamEvent = summary.participation_type === "team";
  const participants = summary.participants || [];
  const teams = summary.teams || [];

  const criterionName = (id: string) =>
    criteria.find((c) => c.id === id)?.name ?? "Criterion";

  const finalize = async () => {
    setFinalizing(true);

    const { ok, payload } = await call(
      `/events/${eventId}/finalize`,
      {
        method: "POST",
        body: JSON.stringify({ top: Number(topN) }),
      }
    );

    setFinalizing(false);

    if (ok) {
      toast.success(payload?.message || "Results finalised");
      setConfirming(false);
      onChanged();
    } else {
      toast.error(payload?.message || "Could not finalise");
    }
  };

  return (
    <div className="space-y-8">
      {/* Judge progress */}
      <div>
        <h3 className="mb-3 text-base font-semibold">
          Judge progress
        </h3>

        {progress.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title="No judges assigned"
            description="Assign judges on the Judges & volunteers tab before scoring can begin."
          />
        ) : (
          <ul className="space-y-2">
            {progress.map((row) => {
              const judge = one(row.judge);

              const percent =
                row.total > 0
                  ? Math.round(
                      (row.submitted / row.total) * 100
                    )
                  : 0;

              return (
                <li
                  key={judge?.id ?? Math.random()}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="truncate text-sm font-medium">
                      {judge?.name ?? "Unknown judge"}
                    </p>

                    <span className="tabular shrink-0 text-xs text-muted-foreground">
                      {row.submitted} / {row.total}
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        row.complete
                          ? "bg-success"
                          : "bg-primary"
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Leaderboard */}
      <div>
        <h3 className="mb-3 text-base font-semibold">
          Leaderboard
        </h3>

        {isTeamEvent ? (
          teams.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No teams"
              description="No teams have been formed for this event yet."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Team</th>
                    <th className="px-4 py-3 font-medium">Members</th>
                    <th className="px-4 py-3 font-medium">Judges</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Final score
                    </th>
                    <th className="w-10 px-4 py-3" />
                  </tr>
                </thead>

                <tbody>
                  {teams.map((row) => {
                    const isOpen = expanded === row.team_id;

                    return (
                      <tr
                        key={row.team_id}
                        className="border-t border-border align-top transition-colors hover:bg-accent/40"
                      >
                        <td className="tabular px-4 py-3 font-semibold">
                          {row.position ? (
                            row.position <= 3 ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Award
                                  className={cn(
                                    "h-4 w-4",
                                    row.position === 1 && "text-warning",
                                    row.position === 2 &&
                                      "text-muted-foreground",
                                    row.position === 3 && "text-violet"
                                  )}
                                  aria-hidden="true"
                                />
                                {row.position}
                              </span>
                            ) : (
                              row.position
                            )
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{row.team_name}</p>

                            {row.size_complete === false && (
                              <Badge variant="warning" size="sm">
                                {typeof row.size_warning === "string" &&
                                row.size_warning
                                  ? row.size_warning
                                  : "Size warning"}
                              </Badge>
                            )}
                          </div>
                          <p className="font-mono text-xs text-muted-foreground">
                            {row.team_code}
                          </p>

                          {isOpen && (
                            <div className="mt-3 space-y-3">
                              {row.evaluations.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  No judge has scored this team yet.
                                </p>
                              ) : (
                                row.evaluations.map((evaluation) => {
                                  const judge = summary.judges.find(
                                    (j) => j.id === evaluation.judge_id
                                  );

                                  return (
                                    <div
                                      key={evaluation.judge_id}
                                      className="rounded-lg border border-border bg-muted/30 p-3"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold">
                                          {judge?.name ?? "Judge"}
                                        </p>
                                        <span className="tabular text-xs font-semibold">
                                          {evaluation.total_score} /{" "}
                                          {evaluation.max_total}
                                        </span>
                                      </div>

                                      <ul className="mt-2 space-y-1">
                                        {(evaluation.scores || []).map(
                                          (score) => (
                                            <li
                                              key={score.criterion_id}
                                              className="flex justify-between gap-3 text-xs text-muted-foreground"
                                            >
                                              <span>
                                                {criterionName(
                                                  score.criterion_id
                                                )}
                                              </span>
                                              <span className="tabular">
                                                {score.score}
                                              </span>
                                            </li>
                                          )
                                        )}
                                      </ul>

                                      {evaluation.remarks && (
                                        <p className="mt-2 text-xs italic text-muted-foreground">
                                          “{evaluation.remarks}”
                                        </p>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </td>

                        <td className="tabular px-4 py-3 text-muted-foreground">
                          {row.member_count}
                        </td>

                        <td className="tabular px-4 py-3 text-muted-foreground">
                          {row.judges_submitted}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {row.final_score === null ? (
                            <Badge variant="muted" size="sm">
                              Not yet scored
                            </Badge>
                          ) : (
                            <span className="tabular font-semibold">
                              {row.final_score}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={
                              isOpen ? "Hide breakdown" : "Show breakdown"
                            }
                            onClick={() =>
                              setExpanded(isOpen ? null : row.team_id)
                            }
                          >
                            {isOpen ? (
                              <ChevronDown aria-hidden="true" />
                            ) : (
                              <ChevronRight aria-hidden="true" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : participants.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No participants"
            description="Nobody has registered for this event yet."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">
                    Participant
                  </th>
                  <th className="px-4 py-3 font-medium">
                    Judges
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Final score
                  </th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {participants.map((row) => {
                  const student = one(row.student);
                  const isOpen =
                    expanded === row.registration_id;

                  return (
                    <tr
                      key={row.registration_id}
                      className="border-t border-border align-top transition-colors hover:bg-accent/40"
                    >
                      <td className="tabular px-4 py-3 font-semibold">
                        {row.position ? (
                          row.position <= 3 ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Award
                                className={cn(
                                  "h-4 w-4",
                                  row.position === 1 &&
                                    "text-warning",
                                  row.position === 2 &&
                                    "text-muted-foreground",
                                  row.position === 3 &&
                                    "text-violet"
                                )}
                                aria-hidden="true"
                              />
                              {row.position}
                            </span>
                          ) : (
                            row.position
                          )
                        ) : (
                          <span className="text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {student?.name ?? "Unknown"}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {row.registration_code}
                        </p>

                        {isOpen && (
                          <div className="mt-3 space-y-3">
                            {row.evaluations.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                No judge has scored this
                                participant yet.
                              </p>
                            ) : (
                              row.evaluations.map(
                                (evaluation) => {
                                  const judge =
                                    summary.judges.find(
                                      (j) =>
                                        j.id ===
                                        evaluation.judge_id
                                    );

                                  return (
                                    <div
                                      key={
                                        evaluation.judge_id
                                      }
                                      className="rounded-lg border border-border bg-muted/30 p-3"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold">
                                          {judge?.name ??
                                            "Judge"}
                                        </p>
                                        <span className="tabular text-xs font-semibold">
                                          {
                                            evaluation.total_score
                                          }{" "}
                                          /{" "}
                                          {
                                            evaluation.max_total
                                          }
                                        </span>
                                      </div>

                                      <ul className="mt-2 space-y-1">
                                        {(
                                          evaluation.scores ||
                                          []
                                        ).map((score) => (
                                          <li
                                            key={
                                              score.criterion_id
                                            }
                                            className="flex justify-between gap-3 text-xs text-muted-foreground"
                                          >
                                            <span>
                                              {criterionName(
                                                score.criterion_id
                                              )}
                                            </span>
                                            <span className="tabular">
                                              {score.score}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>

                                      {evaluation.remarks && (
                                        <p className="mt-2 text-xs italic text-muted-foreground">
                                          “{evaluation.remarks}”
                                        </p>
                                      )}
                                    </div>
                                  );
                                }
                              )
                            )}
                          </div>
                        )}
                      </td>

                      <td className="tabular px-4 py-3 text-muted-foreground">
                        {row.judges_submitted}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {row.final_score === null ? (
                          <Badge variant="muted" size="sm">
                            Not yet scored
                          </Badge>
                        ) : (
                          <span className="tabular font-semibold">
                            {row.final_score}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={
                            isOpen
                              ? "Hide breakdown"
                              : "Show breakdown"
                          }
                          onClick={() =>
                            setExpanded(
                              isOpen
                                ? null
                                : row.registration_id
                            )
                          }
                        >
                          {isOpen ? (
                            <ChevronDown aria-hidden="true" />
                          ) : (
                            <ChevronRight aria-hidden="true" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Finalise */}
      {!finalized_at && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-5">
          <div className="flex items-start gap-3">
            <Lock
              className="mt-0.5 h-5 w-5 shrink-0 text-warning"
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Finalise results
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                This ranks {isTeamEvent ? "teams" : "participants"} by
                final score, writes the winners into the event results,
                notifies them, and locks judging. It replaces any
                results you entered by hand, and it cannot be undone.
              </p>

              {!confirming ? (
                <Button
                  className="mt-4"
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirming(true)}
                >
                  Finalise results
                </Button>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="max-w-[12rem]">
                    <Label htmlFor="top-n">
                      How many placements?
                    </Label>
                    <Select
                      id="top-n"
                      value={topN}
                      onChange={(event) =>
                        setTopN(event.target.value)
                      }
                    >
                      {[1, 2, 3, 5, 10].map((n) => (
                        <option key={n} value={String(n)}>
                          Top {n}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="destructive"
                      size="sm"
                      loading={finalizing}
                      onClick={finalize}
                    >
                      Yes, finalise and lock
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirming(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
