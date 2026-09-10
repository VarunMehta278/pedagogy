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
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import FacultyNavigation from "@/components/layout/FacultyNavigation";

import {
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

function statusClasses(status: EventStatus) {
  switch (status) {
    case "published":
      return "bg-neutral-100 text-neutral-700";

    case "ongoing":
      return "bg-black text-white";

    case "completed":
      return "bg-neutral-100 text-neutral-400";

    case "cancelled":
      return "bg-neutral-100 text-neutral-400";

    case "draft":
    default:
      return "bg-white text-neutral-500 border border-neutral-200";
  }
}

function statusLabel(status: EventStatus) {
  return (
    status.charAt(0).toUpperCase() +
    status.slice(1)
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
      setEvents(eventData.events || []);
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
      router.replace("/login");
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <FacultyNavigation />

        <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 w-64 rounded bg-neutral-200" />

            <div className="h-20 w-full rounded-2xl bg-neutral-200" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="h-28 rounded-2xl bg-neutral-200"
                  />
                )
              )}
            </div>

            <div className="h-80 rounded-2xl bg-neutral-200" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-black">
      <FacultyNavigation />

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* ERROR */}

        {error && (
          <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm font-medium">
              Something went wrong
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              {error}
            </p>

            <button
              onClick={loadDashboard}
              className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Try Again
            </button>
          </div>
        )}

        {/* HERO */}

        <section className="mb-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-sm font-medium text-neutral-400">
                Faculty Workspace
              </p>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome back
                {user?.name
                  ? `, ${user.name.split(" ")[0]}`
                  : ""}
                .
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500">
                Manage your technical events,
                participants, attendance and
                results from one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/faculty/events/create"
                className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                <Plus size={17} />
                Create Event
              </Link>

              <Link
                href="/faculty/events"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-black"
              >
                View All Events
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* STATS */}

        <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Events"
            value={stats.total}
            icon={<CalendarDays size={18} />}
          />

          <StatCard
            label="Published Events"
            value={stats.published}
            icon={
              <CheckCircle2 size={18} />
            }
          />

          <StatCard
            label="Total Registrations"
            value={stats.registrations}
            icon={<Users size={18} />}
          />

          <StatCard
            label="Ongoing Events"
            value={stats.ongoing}
            icon={<Clock3 size={18} />}
          />
        </section>

        {/* UPCOMING EVENTS */}

        <section
          id="events"
          className="mb-10"
        >
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                Schedule
              </p>

              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                Upcoming Events
              </h2>
            </div>

            <Link
              href="/faculty/events"
              className="hidden items-center gap-1 text-sm font-medium text-neutral-500 hover:text-black sm:inline-flex"
            >
              View all
              <ChevronRight size={16} />
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <EmptyEvents />
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

          <div className="rounded-2xl border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Activity
                </p>

                <h2 className="mt-1 font-semibold tracking-tight">
                  Recent Events
                </h2>
              </div>

              <Link
                href="/faculty/events"
                className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-black"
              >
                All events
                <ChevronRight size={14} />
              </Link>
            </div>

            {recentEvents.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-neutral-500">
                  No events yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
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

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Shortcuts
            </p>

            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              Quick Actions
            </h2>

            <div className="mt-5 space-y-2">
              <QuickAction
                href="/faculty/events/create"
                icon={
                  <CalendarPlus
                    size={17}
                  />
                }
                title="Create Event"
                description="Start a new technical event"
              />

              <QuickAction
                href="/faculty/events"
                icon={
                  <CalendarDays
                    size={17}
                  />
                }
                title="Manage Events"
                description="View and manage your events"
              />

              {upcomingEvents[0] && (
                <QuickAction
                  href={`/faculty/events/${upcomingEvents[0].id}/scanner`}
                  icon={
                    <QrCode size={17} />
                  }
                  title="Scan Attendance"
                  description="Open the QR scanner"
                />
              )}
            </div>

            <div className="mt-5 border-t border-neutral-100 pt-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">
                  Completed events
                </span>

                <span className="font-semibold text-neutral-700">
                  {stats.completed}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-neutral-400">
                  Active events
                </span>

                <span className="font-semibold text-neutral-700">
                  {stats.published +
                    stats.ongoing}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>
            © {new Date().getFullYear()}{" "}
            Pedagogy
          </p>

          <button
            onClick={handleLogout}
            className="inline-flex w-fit items-center gap-2 text-neutral-500 hover:text-black"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </footer>
    </div>
  );
}

/* ---------------------------------- */
/* STAT CARD */
/* ---------------------------------- */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
          {icon}
        </div>

        <span className="text-xs text-neutral-400">
          Live
        </span>
      </div>

      <p className="mt-5 text-2xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-neutral-500">
        {label}
      </p>
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
    <div className="group rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-300 hover:shadow-md">
      <div className="flex gap-4">
        {/* DATE */}

        <div className="hidden h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-black text-white sm:flex">
          <span className="text-[10px] uppercase tracking-wider text-white/60">
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
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
              {event.category}
            </span>

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClasses(
                event.status
              )}`}
            >
              {statusLabel(
                event.status
              )}
            </span>
          </div>

          <h3 className="mt-3 line-clamp-1 text-base font-semibold tracking-tight">
            {event.title}
          </h3>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} />
              {formatDate(
                event.event_date
              )}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={13} />
              {getTime(event)}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} />
              {event.venue}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
              <Users size={13} />
              {registrations} registered
            </span>

            <Link
              href={`/faculty/events/${event.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-black"
            >
              Manage
              <ChevronRight size={14} />
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
      className="flex items-center gap-4 px-5 py-4 transition hover:bg-neutral-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
        <CalendarDays size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {event.title}
        </p>

        <p className="mt-1 text-xs text-neutral-400">
          {formatDate(
            event.event_date
          )}{" "}
          · {event.category}
        </p>
      </div>

      <span
        className={`hidden rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline-flex ${statusClasses(
          event.status
        )}`}
      >
        {statusLabel(event.status)}
      </span>

      <ChevronRight
        size={16}
        className="shrink-0 text-neutral-300"
      />
    </Link>
  );
}

/* ---------------------------------- */
/* QUICK ACTION */
/* ---------------------------------- */

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-neutral-200 hover:bg-neutral-50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 transition group-hover:bg-black group-hover:text-white">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {title}
        </p>

        <p className="mt-0.5 truncate text-xs text-neutral-400">
          {description}
        </p>
      </div>

      <ChevronRight
        size={15}
        className="text-neutral-300 transition group-hover:text-black"
      />
    </Link>
  );
}

/* ---------------------------------- */
/* EMPTY EVENTS */
/* ---------------------------------- */

function EmptyEvents() {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
        <CalendarDays
          size={20}
          className="text-neutral-500"
        />
      </div>

      <h3 className="mt-4 text-base font-semibold">
        No upcoming events
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
        Create your first technical event
        and start managing registrations,
        attendance and results.
      </p>

      <Link
        href="/faculty/events/create"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        <Plus size={16} />
        Create Event
      </Link>
    </div>
  );
}