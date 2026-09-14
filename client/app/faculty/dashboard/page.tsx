"use client";

import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LogOut,
  MapPin,
  Plus,
  QrCode,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import FacultyNavigation from "@/components/layout/FacultyNavigation";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/reveal";

import {
  clearSession,
  dashboardPathForRole,
  loginPathFor,
} from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

type EventStatus =
  | "draft"
  | "published"
  | "ongoing"
  | "completed"
  | "cancelled";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
  year?: number | null;
};

type Event = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue: string;
  registration_deadline?: string | null;
  participant_limit?: number | null;
  status: EventStatus;

  organizer_id?: string;

  created_at?: string | null;
  updated_at?: string | null;

  registration_count?: number;
  registrations_count?: number;

  /* Set by the API; false when another member of faculty owns it. */
  can_manage?: boolean;
};

function formatDate(date?: string | null) {
  if (!date) return "Date TBA";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(time?: string | null) {
  if (!time) return null;

  const [hours, minutes] = time
    .split(":")
    .map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return time;
  }

  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTime(event: Event) {
  const start = formatTime(event.start_time);
  const end = formatTime(event.end_time);

  if (start && end) {
    return `${start} – ${end}`;
  }

  return start || "Time TBA";
}

function getRegistrations(event: Event) {
  return (
    event.registration_count ??
    event.registrations_count ??
    0
  );
}

export default function FacultyDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(
    null
  );

  const [events, setEvents] = useState<Event[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        userResponse,
        eventsResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/users/me`, {
          credentials: "include",
          cache: "no-store",
        }),

        fetch(`${API_URL}/events/manage`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      if (
        userResponse.status === 401 ||
        eventsResponse.status === 401
      ) {
        router.replace(
          loginPathFor(
            window.location.pathname
          )
        );
        return;
      }

      const userData =
        await userResponse.json();

      const eventData =
        await eventsResponse.json();

      if (!userResponse.ok) {
        throw new Error(
          userData?.message ||
            "Unable to load profile"
        );
      }

      if (!eventsResponse.ok) {
        throw new Error(
          eventData?.message ||
            "Unable to load events"
        );
      }

      if (
        userData.user?.role !== "faculty" &&
        userData.user?.role !== "admin"
      ) {
        router.replace(
          dashboardPathForRole(
            userData.user?.role
          )
        );
        return;
      }

      setUser(userData.user);
      /*
       * /events/manage now returns every event so faculty
       * can see each other's work, but this dashboard is
       * about *your* events — its stat tiles and lists
       * would quietly start counting the whole college
       * otherwise. The full list lives on /faculty/events.
       */
      setEvents(
        (eventData.events || []).filter(
          (event: Event) => event.can_manage !== false
        )
      );
    } catch (err) {
      console.error(
        "Faculty dashboard error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const total = events.length;

    const published = events.filter(
      (event) =>
        event.status === "published"
    ).length;

    const ongoing = events.filter(
      (event) =>
        event.status === "ongoing"
    ).length;

    const completed = events.filter(
      (event) =>
        event.status === "completed"
    ).length;

    const registrations =
      events.reduce(
        (total, event) =>
          total + getRegistrations(event),
        0
      );

    return {
      total,
      published,
      ongoing,
      completed,
      registrations,
    };
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    return [...events]
      .filter(
        (event) =>
          event.event_date >= today &&
          event.status !== "cancelled"
      )
      .sort(
        (a, b) =>
          new Date(
            `${a.event_date}T00:00:00`
          ).getTime() -
          new Date(
            `${b.event_date}T00:00:00`
          ).getTime()
      )
      .slice(0, 4);
  }, [events]);

  const recentEvents = useMemo(() => {
    return [...events]
      .sort(
        (a, b) =>
          new Date(
            b.created_at || b.event_date
          ).getTime() -
          new Date(
            a.created_at || a.event_date
          ).getTime()
      )
      .slice(0, 5);
  }, [events]);

  const handleLogout = async () => {
    try {
      await fetch(
        `${API_URL}/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    } finally {
      /* Drop the shared session so /login does not forward back in. */
      clearSession();
      router.replace("/login");
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <FacultyNavigation />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="space-y-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-9 w-72" />
                <SkeletonText lines={2} className="max-w-xl" />
              </div>
              <Skeleton className="h-12 w-40 rounded-xl" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-32 rounded-2xl" />
              ))}
            </div>

            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <FacultyNavigation />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* ERROR */}

        {error && (
          <Alert
            tone="destructive"
            title="Something went wrong"
            className="mb-8"
            action={
              <Button size="sm" variant="outline" onClick={loadDashboard}>
                Try again
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* HERO */}

        <FadeIn>
          <section className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                Faculty Workspace
              </p>

              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Welcome back
                {user?.name
                  ? `, ${user.name.split(" ")[0]}`
                  : ""}
                .
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Manage your technical events,
                participants, attendance and
                results from one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/faculty/events/create">
                <Button variant="brand" size="lg">
                  <Plus size={17} aria-hidden="true" />
                  Create event
                </Button>
              </Link>

              <Link href="/faculty/events">
                <Button variant="outline" size="lg">
                  View all events
                  <ArrowRight size={16} aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </section>
        </FadeIn>

        {/* STATS */}

        <Stagger className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <StatCard
              label="Total events"
              value={stats.total}
              icon={CalendarDays}
              tone="brand"
            />
          </StaggerItem>

          <StaggerItem>
            <StatCard
              label="Published events"
              value={stats.published}
              icon={CheckCircle2}
              tone="success"
            />
          </StaggerItem>

          <StaggerItem>
            <StatCard
              label="Total registrations"
              value={stats.registrations}
              icon={Users}
              tone="violet"
            />
          </StaggerItem>

          <StaggerItem>
            <StatCard
              label="Ongoing events"
              value={stats.ongoing}
              icon={Clock3}
              tone="info"
            />
          </StaggerItem>
        </Stagger>

        {/* UPCOMING EVENTS */}

        <section id="events" className="mb-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                Schedule
              </p>

              <h2 className="mt-1 text-lg font-semibold tracking-tight">
                Upcoming events
              </h2>
            </div>

            <Link
              href="/faculty/events"
              className="hidden items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              View all
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming events"
              description="Create your first technical event and start managing registrations, attendance and results."
              action={
                <Link href="/faculty/events/create">
                  <Button variant="brand">
                    <Plus size={16} aria-hidden="true" />
                    Create event
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {upcomingEvents.map(
                (event) => (
                  <UpcomingEvent
                    key={event.id}
                    event={event}
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* LOWER GRID */}

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          {/* RECENT EVENTS */}

          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  Activity
                </p>

                <h2 className="mt-1 font-semibold tracking-tight">
                  Recent events
                </h2>
              </div>

              <Link
                href="/faculty/events"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                All events
                <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {recentEvents.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No events yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentEvents.map(
                  (event) => (
                    <RecentEventRow
                      key={event.id}
                      event={event}
                    />
                  )
                )}
              </div>
            )}
          </div>

          {/* QUICK ACTIONS */}

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Shortcuts
            </p>

            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              Quick actions
            </h2>

            <div className="mt-5 space-y-2">
              <QuickAction
                href="/faculty/events/create"
                icon={CalendarPlus}
                title="Create event"
                description="Start a new technical event"
              />

              <QuickAction
                href="/faculty/events"
                icon={CalendarDays}
                title="Manage events"
                description="View and manage your events"
              />

              {upcomingEvents[0] && (
                <QuickAction
                  href={`/faculty/events/${upcomingEvents[0].id}/scanner`}
                  icon={QrCode}
                  title="Scan attendance"
                  description="Open the QR scanner"
                />
              )}
            </div>

            <div className="mt-5 border-t border-border pt-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Completed events
                </span>

                <span className="tabular font-semibold text-foreground">
                  {stats.completed}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Active events
                </span>

                <span className="tabular font-semibold text-foreground">
                  {stats.published +
                    stats.ongoing}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()}{" "}
            Pedagogy
          </p>

          <button
            onClick={handleLogout}
            className="inline-flex w-fit items-center gap-2 transition-colors hover:text-foreground"
          >
            <LogOut size={14} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </footer>
    </div>
  );
}

/* ---------------------------------- */
/* UPCOMING EVENT */
/* ---------------------------------- */

function UpcomingEvent({
  event,
}: {
  event: Event;
}) {
  const registrations =
    getRegistrations(event);

  return (
    <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
      <div className="flex gap-4">
        {/* DATE */}

        <div className="hidden h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand sm:flex">
          <span className="text-[10px] uppercase tracking-wider text-white/70">
            {new Date(
              `${event.event_date}T00:00:00`
            ).toLocaleDateString("en-IN", {
              month: "short",
            })}
          </span>

          <span className="text-xl font-semibold">
            {new Date(
              `${event.event_date}T00:00:00`
            ).getDate()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {event.category}
            </span>

            <StatusBadge status={event.status} size="sm" />
          </div>

          <h3 className="mt-3 line-clamp-1 text-base font-semibold tracking-tight">
            {event.title}
          </h3>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} aria-hidden="true" />
              {formatDate(
                event.event_date
              )}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={13} aria-hidden="true" />
              {getTime(event)}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} aria-hidden="true" />
              {event.venue}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users size={13} aria-hidden="true" />
              <span className="tabular">{registrations}</span> registered
            </span>

            <Link
              href={`/faculty/events/${event.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              Manage
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- */
/* RECENT EVENT */
/* ---------------------------------- */

function RecentEventRow({
  event,
}: {
  event: Event;
}) {
  return (
    <Link
      href={`/faculty/events/${event.id}`}
      className="flex items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-accent/50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <CalendarDays size={17} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {event.title}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {formatDate(
            event.event_date
          )}{" "}
          · {event.category}
        </p>
      </div>

      <span className="hidden sm:inline-flex">
        <StatusBadge status={event.status} size="sm" />
      </span>

      <ChevronRight
        size={16}
        className="shrink-0 text-muted-foreground/50"
        aria-hidden="true"
      />
    </Link>
  );
}

/* ---------------------------------- */
/* QUICK ACTION */
/* ---------------------------------- */

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition-colors duration-200 hover:border-border hover:bg-accent/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon size={17} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {title}
        </p>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {description}
        </p>
      </div>

      <ChevronRight
        size={15}
        className="text-muted-foreground/50 transition-colors duration-200 group-hover:text-primary"
        aria-hidden="true"
      />
    </Link>
  );
}
