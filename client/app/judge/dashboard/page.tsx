"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  MapPin,
  Users,
} from "lucide-react";

import { fetchCurrentUser, guardRole, type AuthUser } from "@/lib/auth";
import JudgeNavigation from "@/components/layout/JudgeNavigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/reveal";
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
  organizer?: unknown;
  participant_count: number;
  evaluated_count: number;
};

/*
 * `organizer` isn't fully specified by the contract, so this reads
 * a name out of whatever shape shows up without assuming more than
 * that.
 */
function organizerName(organizer: unknown): string | null {
  if (!organizer) return null;

  if (typeof organizer === "string") return organizer;

  if (
    typeof organizer === "object" &&
    organizer !== null &&
    "name" in organizer &&
    typeof (organizer as { name?: unknown }).name === "string"
  ) {
    return (organizer as { name: string }).name;
  }

  return null;
}

function formatDate(date?: string | null) {
  if (!date) return "Date TBA";

  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function formatTime(time?: string | null) {
  if (!time) return null;

  const [hours, minutes] = time.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

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

export default function JudgeDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<JudgeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      await loadEvents();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/judge/events`, {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data?.message || "Unable to load your assigned events.");
        return;
      }

      setEvents(data.events || []);
    } catch (err) {
      console.error("Judge dashboard load error:", err);
      setError("Unable to load your assigned events.");
    } finally {
      setLoading(false);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "there";

  /*
   * Summary numbers for the top strip. "Left to score" is the
   * headline metric on this page, so it gets its own tile rather
   * than being buried inside each card.
   */
  const summary = useMemo(() => {
    const totalRemaining = events.reduce(
      (sum, event) =>
        sum + Math.max(event.participant_count - event.evaluated_count, 0),
      0
    );

    const fullyScored = events.filter(
      (event) =>
        event.participant_count > 0 &&
        event.evaluated_count >= event.participant_count
    ).length;

    return {
      assigned: events.length,
      remaining: totalRemaining,
      fullyScored,
    };
  }, [events]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <JudgeNavigation />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
          <div className="rounded-3xl border border-border bg-card p-8 md:p-10">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-4 h-9 w-64" />
            <SkeletonText lines={2} className="mt-4 max-w-xl" />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border bg-card p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-14" />
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-border bg-card p-5">
                <SkeletonText lines={4} />
                <Skeleton className="mt-4 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      <JudgeNavigation />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
        {/* Welcome */}

        <FadeIn>
          <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 md:p-10">
            <div className="bg-aurora pointer-events-none absolute inset-0" aria-hidden="true" />

            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                Judge Dashboard
              </p>

              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                Welcome, {firstName}.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Score the participants across the events you&apos;ve been
                assigned to judge. Open an event to see who still needs a
                score.
              </p>
            </div>
          </section>
        </FadeIn>

        {/* ERROR */}

        {error && (
          <Alert
            tone="destructive"
            className="mt-6"
            action={
              <Button size="sm" variant="outline" onClick={loadEvents}>
                Try again
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* SUMMARY */}

        {events.length > 0 && (
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-3">
            <StaggerItem>
              <StatCard
                icon={CalendarDays}
                label="Assigned events"
                value={summary.assigned}
                tone="brand"
              />
            </StaggerItem>

            <StaggerItem>
              <StatCard
                icon={ClipboardCheck}
                label="Participants left to score"
                value={summary.remaining}
                tone={summary.remaining > 0 ? "warning" : "success"}
                hint={
                  summary.remaining > 0
                    ? "Across all your events"
                    : "You're fully caught up"
                }
              />
            </StaggerItem>

            <StaggerItem>
              <StatCard
                icon={Award}
                label="Fully scored events"
                value={summary.fullyScored}
                tone="success"
              />
            </StaggerItem>
          </Stagger>
        )}

        {/* EVENTS */}

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Your assignments
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Events to judge
            </h2>
          </div>

          {events.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No events assigned yet"
              description="Faculty assigns judges to specific events. Once you're added as a judge for an event, it will show up here with its participants ready to score."
            />
          ) : (
            <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const remaining = Math.max(
                  event.participant_count - event.evaluated_count,
                  0
                );

                const progress =
                  event.participant_count > 0
                    ? Math.min(
                        Math.round(
                          (event.evaluated_count / event.participant_count) *
                            100
                        ),
                        100
                      )
                    : 0;

                const isDone =
                  event.participant_count > 0 && remaining === 0;

                const organizer = organizerName(event.organizer);

                return (
                  <StaggerItem key={event.id}>
                    <Link
                      href={`/judge/events/${event.id}`}
                      className="group block h-full rounded-3xl border border-border bg-card p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-full bg-brand-subtle px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-foreground">
                          {event.category}
                        </span>

                        <StatusBadge status={event.status} />
                      </div>

                      <h3 className="mt-3 text-lg font-semibold tracking-tight">
                        {event.title}
                      </h3>

                      {organizer && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Organised by {organizer}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatDate(event.event_date)}
                        </span>

                        <span className="flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          {getTimeRange(event)}
                        </span>

                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {event.venue}
                        </span>
                      </div>

                      {event.results_finalized_at && (
                        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-info/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-info">
                          <Award className="h-3 w-3" aria-hidden="true" />
                          Results finalized
                        </span>
                      )}

                      {/* PROGRESS */}

                      <div className="mt-5 rounded-2xl bg-muted p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Users className="h-3.5 w-3.5" aria-hidden="true" />
                            Evaluation progress
                          </span>

                          <span className="tabular text-xs font-semibold text-foreground">
                            {event.evaluated_count} / {event.participant_count}
                          </span>
                        </div>

                        <div
                          className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-background"
                          role="progressbar"
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              isDone ? "bg-success" : "bg-gradient-brand"
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <p
                          className={cn(
                            "mt-3 text-sm font-semibold",
                            isDone ? "text-success" : "text-warning"
                          )}
                        >
                          {event.participant_count === 0
                            ? "No participants yet"
                            : isDone
                            ? "All participants scored"
                            : `${remaining} left to score`}
                        </p>
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </section>
      </div>
    </main>
  );
}
