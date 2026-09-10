"use client";

import AdminNavigation from "@/components/layout/AdminNavigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  LogOut,
  MapPin,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";

import {
  loginPathFor,
} from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

type DashboardData = {
  stats: {
    users: {
      total: number;
      students: number;
      faculty: number;
      admins: number;
    };
    events: {
      total: number;
      published: number;
      ongoing: number;
      completed: number;
    };
    registrations: {
      total: number;
      attended: number;
    };
    certificates: {
      total: number;
      winners: number;
      participation: number;
    };
  };

  recentEvents: RecentEvent[];

  recentRegistrations: RecentRegistration[];
};

type RecentEvent = {
  id: string;
  title: string;
  category: string;
  event_date: string;
  venue: string;
  status: string;
  participant_limit?: number | null;
};

type RecentRegistration = {
  id: string;
  registration_code: string;
  status: string;
  registered_at: string;

  events?:
    | {
        id: string;
        title: string;
        event_date: string;
      }
    | {
        id: string;
        title: string;
        event_date: string;
      }[]
    | null;

  users?:
    | {
        id: string;
        name: string;
        email: string;
        department?: string | null;
        year?: number | null;
      }
    | {
        id: string;
        name: string;
        email: string;
        department?: string | null;
        year?: number | null;
      }[]
    | null;
};

function getRelation<T>(
  relation: T | T[] | null | undefined
): T | null {
  if (!relation) return null;

  return Array.isArray(relation)
    ? relation[0] || null
    : relation;
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/admin/dashboard`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      if (response.status === 401) {
        router.replace(
          loginPathFor(
            window.location.pathname
          )
        );
        return;
      }

      if (response.status === 403) {
        setError(
          "You do not have administrator access."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          "Failed to load admin dashboard"
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.message ||
            "Failed to load admin dashboard"
        );
      }

      setData(result);
    } catch (error) {
      console.error(
        "Admin dashboard error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong while loading the dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-neutral-50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white ring-1 ring-neutral-200">
            <Activity className="h-5 w-5 text-neutral-500" />
          </div>

          <h1 className="mt-5 text-xl font-semibold">
            Dashboard unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {error ||
              "We couldn't load the admin dashboard."}
          </p>

          <button
            onClick={loadDashboard}
            className="mt-6 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const attendanceRate =
    data.stats.registrations.total > 0
      ? Math.round(
          (data.stats.registrations.attended /
            data.stats.registrations.total) *
            100
        )
      : 0;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              href="/admin/dashboard"
              className="text-xl font-bold tracking-tight"
            >
              Pedagogy
            </Link>

            <span className="hidden rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600 md:inline-flex">
              Administrator
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">
                Admin
              </p>

              <p className="text-xs text-neutral-400">
                Platform Management
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
              <UserRound className="h-4 w-4" />
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-black disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}

              <span className="hidden sm:inline">
                Logout
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-[1500px] px-6 py-10 lg:px-8">
        <AdminNavigation />
        {/* Hero */}
        <section className="rounded-3xl bg-black px-7 py-8 text-white sm:px-10 sm:py-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                Platform Overview
              </p>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Admin Dashboard
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                Monitor events, users, registrations,
                attendance and certificates across
                the Pedagogy platform.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Activity className="h-4 w-4" />
              Live platform data
            </div>
          </div>
        </section>

        {/* Primary Stats */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            title="Total Users"
            value={data.stats.users.total}
            subtitle={`${data.stats.users.students} students · ${data.stats.users.faculty} faculty`}
            icon={Users}
          />

          <AdminStatCard
            title="Total Events"
            value={data.stats.events.total}
            subtitle={`${data.stats.events.ongoing} ongoing · ${data.stats.events.completed} completed`}
            icon={CalendarDays}
          />

          <AdminStatCard
            title="Registrations"
            value={data.stats.registrations.total}
            subtitle={`${attendanceRate}% attendance rate`}
            icon={CheckCircle2}
          />

          <AdminStatCard
            title="Certificates"
            value={data.stats.certificates.total}
            subtitle={`${data.stats.certificates.winners} winners · ${data.stats.certificates.participation} participation`}
            icon={Award}
          />
        </section>

        {/* Secondary Stats */}
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MiniStat
            label="Published Events"
            value={data.stats.events.published}
          />

          <MiniStat
            label="Ongoing Events"
            value={data.stats.events.ongoing}
          />

          <MiniStat
            label="Completed Events"
            value={data.stats.events.completed}
          />
        </section>

        {/* Content Grid */}
        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          {/* Recent Events */}
          <div className="rounded-3xl border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
              <div>
                <h2 className="font-semibold">
                  Recent Events
                </h2>

                <p className="mt-1 text-xs text-neutral-400">
                  Latest events created on the platform
                </p>
              </div>

              <Link
                href="/admin/events"
                className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 transition hover:text-black"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-neutral-100">
              {data.recentEvents.length === 0 ? (
                <EmptyState text="No events have been created yet." />
              ) : (
                data.recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="px-6 py-5 transition hover:bg-neutral-50"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-neutral-200 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                            {event.category}
                          </span>

                          <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-medium text-neutral-600">
                            {statusLabel(event.status)}
                          </span>
                        </div>

                        <h3 className="mt-2 truncate font-medium">
                          {event.title}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-400">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(
                              event.event_date
                            )}
                          </span>

                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.venue}
                          </span>

                          {event.participant_limit && (
                            <span className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" />
                              {event.participant_limit} seats
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/events/${event.id}`}
                        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black"
                      >
                        View
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Registrations */}
          <div className="rounded-3xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-6 py-5">
              <h2 className="font-semibold">
                Recent Registrations
              </h2>

              <p className="mt-1 text-xs text-neutral-400">
                Latest participant activity
              </p>
            </div>

            <div className="divide-y divide-neutral-100">
              {data.recentRegistrations.length === 0 ? (
                <EmptyState text="No registrations yet." />
              ) : (
                data.recentRegistrations.map(
                  (registration) => {
                    const student =
                      getRelation(
                        registration.users
                      );

                    const event =
                      getRelation(
                        registration.events
                      );

                    return (
                      <div
                        key={registration.id}
                        className="px-6 py-5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                            <GraduationCap className="h-4 w-4 text-neutral-500" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {student?.name ||
                                    "Student"}
                                </p>

                                <p className="mt-0.5 truncate text-xs text-neutral-400">
                                  {student?.email ||
                                    "Email unavailable"}
                                </p>
                              </div>

                              <span className="shrink-0 text-xs text-neutral-400">
                                {formatRelativeTime(
                                  registration.registered_at
                                )}
                              </span>
                            </div>

                            <p className="mt-2 truncate text-xs text-neutral-600">
                              {event?.title ||
                                "Event unavailable"}
                            </p>

                            <div className="mt-2 flex items-center gap-3 text-[10px] text-neutral-400">
                              <span className="font-mono">
                                {
                                  registration.registration_code
                                }
                              </span>

                              <span>
                                {statusLabel(
                                  registration.status
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </div>
        </section>

        {/* Platform Breakdown */}
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <BreakdownCard
            title="User Breakdown"
            icon={Users}
            items={[
              {
                label: "Students",
                value:
                  data.stats.users.students,
                total:
                  data.stats.users.total,
              },
              {
                label: "Faculty",
                value:
                  data.stats.users.faculty,
                total:
                  data.stats.users.total,
              },
              {
                label: "Admins",
                value:
                  data.stats.users.admins,
                total:
                  data.stats.users.total,
              },
            ]}
          />

          <BreakdownCard
            title="Certificate Breakdown"
            icon={Trophy}
            items={[
              {
                label: "Winner Certificates",
                value:
                  data.stats.certificates.winners,
                total:
                  data.stats.certificates.total,
              },
              {
                label: "Participation Certificates",
                value:
                  data.stats.certificates
                    .participation,
                total:
                  data.stats.certificates.total,
              },
            ]}
          />
        </section>

        {/* Quick Actions */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">
            Quick Actions
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/admin/events"
              icon={CalendarDays}
              title="Manage Events"
              description="Review platform events"
            />

            <QuickAction
              href="/admin/users"
              icon={Users}
              title="Manage Users"
              description="View students and faculty"
            />

            <QuickAction
              href="/admin/analytics"
              icon={Activity}
              title="Analytics"
              description="Explore platform insights"
            />

            <QuickAction
              href="/events"
              icon={ArrowRight}
              title="View Events"
              description="Open public event discovery"
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-10 border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-6 py-8 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>
            © {new Date().getFullYear()} Pedagogy
          </p>

          <p>
            Centralized Technical Event Management System
          </p>
        </div>
      </footer>
    </div>
  );
}

function AdminStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight">
            {value.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
          <Icon className="h-5 w-5 text-neutral-600" />
        </div>
      </div>

      <p className="mt-4 text-xs text-neutral-400">
        {subtitle}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4">
      <p className="text-xs text-neutral-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold">
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

function BreakdownCard({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  items: {
    label: string;
    value: number;
    total: number;
  }[];
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100">
          <Icon className="h-4 w-4 text-neutral-600" />
        </div>

        <h2 className="font-semibold">
          {title}
        </h2>
      </div>

      <div className="mt-6 space-y-5">
        {items.map((item) => {
          const percentage =
            item.total > 0
              ? Math.round(
                  (item.value / item.total) *
                    100
                )
              : 0;

          return (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-neutral-600">
                  {item.label}
                </span>

                <span className="font-medium">
                  {item.value}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-black transition-all"
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-300 hover:bg-neutral-50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
          <Icon className="h-4 w-4 text-neutral-600" />
        </div>

        <ArrowRight className="h-4 w-4 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-black" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">
        {title}
      </h3>

      <p className="mt-1 text-xs text-neutral-400">
        {description}
      </p>
    </Link>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex min-h-32 items-center justify-center px-6 text-center text-sm text-neutral-400">
      {text}
    </div>
  );
}