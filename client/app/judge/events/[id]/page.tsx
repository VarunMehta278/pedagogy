"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MapPin,
  Save,
  Search,
  Users,
} from "lucide-react";

import { fetchCurrentUser, guardRole, loginPathFor, type AuthUser } from "@/lib/auth";
import JudgeNavigation from "@/components/layout/JudgeNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Input, Textarea, Label, FieldError } from "@/components/ui/input";
import { FadeIn } from "@/components/motion/reveal";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

type JudgeEvent = {
  id: string;
  title: string;
  category: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue: string;
  status: string;
  image_url?: string | null;
  results_finalized_at?: string | null;
};

type Criterion = {
  id: string;
  name: string;
  description?: string | null;
  max_score: number;
  weight: number;
  display_order?: number;
};

type Student = {
  id: string;
  name: string;
  email?: string | null;
  department?: string | null;
  year?: number | null;
  profile_image?: string | null;
};

/*
 * `participants[].id` IS the registration_id — the API contract is
 * explicit about this, since it is easy to mistake for a separate
 * participant id and post the wrong value back.
 */
type Participant = {
  id: string;
  registration_code: string;
  status: string;
  student?: Student | Student[] | null;
};

type EvaluationScore = {
  criterion_id: string;
  score: number;
};

type Evaluation = {
  id: string;
  registration_id: string;
  total_score: number;
  max_total: number;
  remarks?: string | null;
  submitted_at?: string | null;
  updated_at?: string | null;
  scores: EvaluationScore[];
};

/*
 * Supabase returns a joined relation either as an object or as a
 * single-item array depending on the query shape, so it is always
 * normalised before use.
 */
function getRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) return null;

  return Array.isArray(relation) ? relation[0] || null : relation;
}

function formatDate(date?: string | null) {
  if (!date) return "Date TBA";

  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function formatTime(time?: string | null) {
  if (!time) return null;

  const [hours, minutes] = time.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTimeRange(event: JudgeEvent) {
  const start = formatTime(event.start_time);
  const end = formatTime(event.end_time);

  if (start && end) return `${start} – ${end}`;

  return start || "Time TBA";
}

function initials(name?: string | null) {
  if (!name) return "?";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function JudgeEventPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();

  const eventId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "";

  const [user, setUser] = useState<AuthUser | null>(null);

  const [event, setEvent] = useState<JudgeEvent | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [onlyUnscored, setOnlyUnscored] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [scoreValues, setScoreValues] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadEvent = async () => {
    if (!eventId) {
      setError("Event ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/judge/events/${encodeURIComponent(eventId)}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      if (response.status === 401 || response.status === 403) {
        router.replace(loginPathFor(window.location.pathname));
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data?.message || "Unable to load this event.");
      }

      setEvent(data.event || null);
      setCriteria(data.criteria || []);
      setParticipants(data.participants || []);
      setEvaluations(data.evaluations || []);
    } catch (err) {
      console.error("Judge event load error:", err);

      setError(
        err instanceof Error ? err.message : "Unable to load this event."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const currentUser = await fetchCurrentUser();

      if (cancelled) return;

      const redirect = guardRole(currentUser, ["judge"], pathname);

      if (redirect) {
        router.replace(redirect);
        return;
      }

      setUser(currentUser);
      await loadEvent();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const finalized = Boolean(event?.results_finalized_at);

  const evaluationByRegId = useMemo(() => {
    return new Map(evaluations.map((item) => [item.registration_id, item]));
  }, [evaluations]);

  const scoredCount = evaluations.length;

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matches = (participant: Participant) => {
      if (!query) return true;

      const student = getRelation(participant.student);

      return (
        (student?.name || "").toLowerCase().includes(query) ||
        (student?.email || "").toLowerCase().includes(query) ||
        participant.registration_code.toLowerCase().includes(query)
      );
    };

    const unscored: Participant[] = [];
    const scored: Participant[] = [];

    participants.filter(matches).forEach((participant) => {
      if (evaluationByRegId.has(participant.id)) {
        scored.push(participant);
      } else {
        unscored.push(participant);
      }
    });

    return { unscored, scored };
  }, [participants, search, evaluationByRegId]);

  const selectedParticipant = useMemo(
    () => participants.find((p) => p.id === selectedId) || null,
    [participants, selectedId]
  );

  const selectedStudent = getRelation(selectedParticipant?.student);
  const selectedEvaluation = selectedId
    ? evaluationByRegId.get(selectedId)
    : undefined;
  const hasEvaluation = Boolean(selectedEvaluation);

  const selectParticipant = (participant: Participant) => {
    setSelectedId(participant.id);
    setFormError("");

    const existing = evaluationByRegId.get(participant.id);
    const initialScores: Record<string, string> = {};

    criteria.forEach((criterion) => {
      const found = existing?.scores.find(
        (score) => score.criterion_id === criterion.id
      );

      initialScores[criterion.id] =
        found !== undefined ? String(found.score) : "";
    });

    setScoreValues(initialScores);
    setRemarks(existing?.remarks || "");
  };

  const handleScoreChange = (criterionId: string, value: string) => {
    setScoreValues((current) => ({ ...current, [criterionId]: value }));

    if (formError) setFormError("");
  };

  /*
   * Same formula the server uses: Σ(score × weight) / Σ(weight),
   * kept in sync here so a judge's live number never disagrees with
   * what gets saved.
   */
  const totalWeight = useMemo(
    () => criteria.reduce((sum, c) => sum + c.weight, 0),
    [criteria]
  );

  const maxTotal = useMemo(() => {
    if (totalWeight <= 0) return 0;

    return (
      criteria.reduce((sum, c) => sum + c.max_score * c.weight, 0) /
      totalWeight
    );
  }, [criteria, totalWeight]);

  const liveTotal = useMemo(() => {
    if (totalWeight <= 0) return 0;

    const weightedSum = criteria.reduce((sum, c) => {
      const raw = scoreValues[c.id];
      const num = raw === undefined || raw === "" ? 0 : Number(raw);

      return sum + (Number.isNaN(num) ? 0 : num) * c.weight;
    }, 0);

    return weightedSum / totalWeight;
  }, [criteria, scoreValues, totalWeight]);

  const canSubmit = useMemo(() => {
    if (!selectedParticipant || criteria.length === 0) return false;

    return criteria.every((c) => {
      const raw = scoreValues[c.id];

      if (raw === undefined || raw === "") return false;

      const num = Number(raw);

      return !Number.isNaN(num) && num >= 0 && num <= c.max_score;
    });
  }, [criteria, scoreValues, selectedParticipant]);

  const submitEvaluation = async () => {
    if (!event || !selectedParticipant || finalized) return;

    const invalidCriterion = criteria.find((c) => {
      const raw = scoreValues[c.id];

      if (raw === undefined || raw === "") return true;

      const num = Number(raw);

      return Number.isNaN(num) || num < 0 || num > c.max_score;
    });

    if (invalidCriterion) {
      setFormError(
        `Enter a valid score for "${invalidCriterion.name}" between 0 and ${invalidCriterion.max_score}.`
      );
      return;
    }

    setFormError("");
    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/judge/events/${encodeURIComponent(eventId)}/evaluations`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            registration_id: selectedParticipant.id,
            scores: criteria.map((c) => ({
              criterion_id: c.id,
              score: Number(scoreValues[c.id]),
            })),
            remarks: remarks.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 409) {
        toast.error(
          data?.message ||
            "Results have already been finalized for this event."
        );
        return;
      }

      if (!response.ok || !data.success) {
        toast.error(data?.message || "Failed to save the evaluation.");
        return;
      }

      const savedEvaluation: Evaluation = {
        id: data.evaluation?.id ?? selectedEvaluation?.id ?? selectedParticipant.id,
        registration_id: selectedParticipant.id,
        total_score: data.evaluation?.total_score ?? liveTotal,
        max_total: data.evaluation?.max_total ?? maxTotal,
        remarks: remarks.trim() || null,
        scores: criteria.map((c) => ({
          criterion_id: c.id,
          score: Number(scoreValues[c.id]),
        })),
      };

      setEvaluations((current) => [
        ...current.filter(
          (item) => item.registration_id !== selectedParticipant.id
        ),
        savedEvaluation,
      ]);

      toast.success(
        hasEvaluation ? "Evaluation updated" : "Evaluation submitted",
        `${selectedStudent?.name || "Participant"} · ${savedEvaluation.total_score.toFixed(
          1
        )} / ${savedEvaluation.max_total.toFixed(1)}`
      );
    } catch (err) {
      console.error("Submit evaluation error:", err);
      toast.error("Failed to save the evaluation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <JudgeNavigation />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="space-y-8">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-40 rounded-3xl" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-24 rounded-2xl" />
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-16 rounded-xl" />
                ))}
              </div>
              <SkeletonText lines={8} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <JudgeNavigation />

        <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <EmptyState
            icon={CalendarDays}
            title="Unable to open this event"
            description={
              error || "This event could not be found in your assignments."
            }
            tone="destructive"
            action={
              <>
                <Link href="/judge/dashboard">
                  <Button variant="outline">
                    <ArrowLeft size={16} aria-hidden="true" />
                    Back to dashboard
                  </Button>
                </Link>

                <Button onClick={loadEvent}>Try again</Button>
              </>
            }
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <JudgeNavigation />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* BACK */}

        <Link
          href="/judge/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to dashboard
        </Link>

        {/* ERROR BANNER */}

        {error && (
          <Alert tone="destructive" className="mt-5">
            {error}
          </Alert>
        )}

        {/* HEADER */}

        <FadeIn>
          <section className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="rounded-full bg-brand-subtle px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-foreground">
                  {event.category}
                </span>

                <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                  {event.title}
                </h1>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {formatDate(event.event_date)}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                    {getTimeRange(event)}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {event.venue}
                  </span>
                </div>
              </div>

              <StatusBadge status={event.status} />
            </div>
          </section>
        </FadeIn>

        {/* FINALIZED NOTICE */}

        {finalized && (
          <Alert tone="info" className="mt-6" title="Results are final">
            Judging has been finalized for this event. Every evaluation below
            is read-only and can no longer be changed.
          </Alert>
        )}

        {/* STATS */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Participants"
            value={participants.length}
            tone="brand"
          />

          <StatCard
            icon={CheckCircle2}
            label="Scored by you"
            value={scoredCount}
            tone="success"
          />

          <StatCard
            icon={ClipboardCheck}
            label="Left to score"
            value={Math.max(participants.length - scoredCount, 0)}
            tone={
              participants.length - scoredCount > 0 ? "warning" : "success"
            }
          />

          <StatCard
            icon={Award}
            label="Criteria configured"
            value={criteria.length}
            tone="violet"
          />
        </div>

        {/* NO CRITERIA */}

        {criteria.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={ClipboardCheck}
            title="No scoring criteria yet"
            description="Faculty hasn't configured scoring criteria for this event yet. Come back once criteria are set up — there's nothing to score until then."
          />
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* PARTICIPANT LIST */}

            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                      Participants
                    </h2>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {participants.length} registered · {scoredCount} scored
                      by you
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={onlyUnscored ? "brand" : "outline"}
                    onClick={() => setOnlyUnscored((current) => !current)}
                  >
                    <ClipboardCheck size={14} aria-hidden="true" />
                    Not yet scored only
                  </Button>
                </div>

                <div className="relative mt-4">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email or registration code"
                    className="pl-10"
                    aria-label="Search participants"
                  />
                </div>

                {participants.length === 0 ? (
                  <EmptyState
                    className="mt-6"
                    icon={Users}
                    title="No participants yet"
                    description="No one has registered for this event yet."
                  />
                ) : filteredSections.unscored.length === 0 &&
                  filteredSections.scored.length === 0 ? (
                  <EmptyState
                    className="mt-6"
                    icon={Search}
                    title="No matches"
                    description="Try a different name, email or registration code."
                  />
                ) : (
                  <div className="mt-5 space-y-6">
                    {filteredSections.unscored.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-warning">
                          Not yet scored · {filteredSections.unscored.length}
                        </p>

                        <div className="space-y-2">
                          {filteredSections.unscored.map((participant) => (
                            <ParticipantRow
                              key={participant.id}
                              participant={participant}
                              student={getRelation(participant.student)}
                              evaluation={undefined}
                              selected={participant.id === selectedId}
                              onSelect={() => selectParticipant(participant)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {!onlyUnscored && filteredSections.scored.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-success">
                          Scored · {filteredSections.scored.length}
                        </p>

                        <div className="space-y-2">
                          {filteredSections.scored.map((participant) => (
                            <ParticipantRow
                              key={participant.id}
                              participant={participant}
                              student={getRelation(participant.student)}
                              evaluation={evaluationByRegId.get(participant.id)}
                              selected={participant.id === selectedId}
                              onSelect={() => selectParticipant(participant)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SCORING PANEL */}

            <Card className="h-fit lg:sticky lg:top-24">
              <CardContent className="p-5 sm:p-6">
                {!selectedParticipant ? (
                  <EmptyState
                    icon={ClipboardCheck}
                    title="Select a participant"
                    description="Pick someone from the list to enter or review their score."
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
                          Scoring
                        </p>

                        <h2 className="mt-1 truncate text-lg font-semibold tracking-tight">
                          {selectedStudent?.name || "Unknown participant"}
                        </h2>

                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {selectedParticipant.registration_code}
                        </p>
                      </div>

                      {hasEvaluation && (
                        <Badge variant="success" className="shrink-0">
                          Already scored
                        </Badge>
                      )}
                    </div>

                    <div className="mt-5 space-y-5">
                      {criteria.map((criterion) => {
                        const raw = scoreValues[criterion.id] ?? "";
                        const num = raw === "" ? null : Number(raw);
                        const invalid =
                          raw !== "" &&
                          (num === null ||
                            Number.isNaN(num) ||
                            num < 0 ||
                            num > criterion.max_score);

                        return (
                          <div key={criterion.id}>
                            <Label htmlFor={`score-${criterion.id}`}>
                              {criterion.name}{" "}
                              <span className="font-normal text-muted-foreground">
                                · out of {criterion.max_score}
                              </span>
                            </Label>

                            {criterion.description && (
                              <p className="-mt-1 mb-2 text-xs text-muted-foreground">
                                {criterion.description}
                              </p>
                            )}

                            <Input
                              id={`score-${criterion.id}`}
                              type="number"
                              min={0}
                              max={criterion.max_score}
                              step="0.5"
                              inputMode="decimal"
                              value={raw}
                              disabled={finalized}
                              aria-invalid={invalid || undefined}
                              onChange={(e) =>
                                handleScoreChange(criterion.id, e.target.value)
                              }
                              placeholder={`0 – ${criterion.max_score}`}
                            />

                            {invalid && (
                              <FieldError>
                                Enter a score between 0 and{" "}
                                {criterion.max_score}.
                              </FieldError>
                            )}
                          </div>
                        );
                      })}

                      <div>
                        <Label htmlFor="judge-remarks">Remarks</Label>

                        <Textarea
                          id="judge-remarks"
                          value={remarks}
                          disabled={finalized}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Optional notes for this participant"
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* LIVE TOTAL */}

                    <div className="mt-6 rounded-2xl bg-muted p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Weighted total
                        </span>

                        <span className="tabular text-2xl font-bold tracking-tight text-foreground">
                          {liveTotal.toFixed(2)}{" "}
                          <span className="text-sm font-medium text-muted-foreground">
                            / {maxTotal.toFixed(2)}
                          </span>
                        </span>
                      </div>

                      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-background">
                        <div
                          className="h-full rounded-full bg-gradient-brand transition-all duration-300"
                          style={{
                            width: `${
                              maxTotal > 0
                                ? Math.min((liveTotal / maxTotal) * 100, 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <FieldError>{formError}</FieldError>

                    {!finalized && (
                      <Button
                        type="button"
                        className="mt-4"
                        block
                        loading={submitting}
                        loadingText="Saving…"
                        disabled={!canSubmit}
                        onClick={submitEvaluation}
                      >
                        <Save size={16} aria-hidden="true" />
                        {hasEvaluation ? "Update evaluation" : "Submit evaluation"}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

/* -------------------------------- */
/* PARTICIPANT ROW                  */
/* -------------------------------- */

function ParticipantRow({
  participant,
  student,
  evaluation,
  selected,
  onSelect,
}: {
  participant: Participant;
  student: Student | null;
  evaluation?: Evaluation;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors duration-200",
        selected
          ? "border-primary/50 bg-brand-subtle/60"
          : "border-border bg-card hover:border-primary/30 hover:bg-accent/40"
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
        {initials(student?.name)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {student?.name || "Unknown participant"}
        </p>

        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
          {participant.registration_code}
        </p>
      </div>

      {evaluation ? (
        <span className="tabular shrink-0 rounded-full bg-success/12 px-2.5 py-1 text-xs font-semibold text-success">
          {evaluation.total_score.toFixed(1)}/{evaluation.max_total.toFixed(1)}
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
          Pending
        </span>
      )}
    </button>
  );
}
