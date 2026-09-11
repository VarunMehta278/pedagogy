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
  GraduationCap,
  MapPin,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

import {
  loginPathFor,
} from "@/lib/auth";

import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge, LiveDot } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/reveal";

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

  /* ------------------------------------------------
      Loading
  ------------------------------------------------ */

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <AdminNavigation />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
          <div className="rounded-3xl border border-border bg-card p-8 md:p-10">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-4 h-9 w-72" />
            <SkeletonText lines={2} className="mt-4 max-w-xl" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-16" />
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="rounded-3xl border border-border bg-card p-6"
              >
                <SkeletonText lines={5} />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------
      Error
  ------------------------------------------------ */

  if (error || !data) {
    return (
      <main className="min-h-screen bg-background">
        <AdminNavigation />

        <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
          <EmptyState
            icon={Activity}
            title="Dashboard unavailable"
            description={
              error ||
              "We couldn't load the admin dashboard."
            }
            tone="destructive"
            action={
              <Button variant="brand" onClick={loadDashboard}>
                Try again
              </Button>
            }
          />
        </div>
      </main>
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
    <main className="min-h-screen bg-background">
      {/* ------------------------------------------------
          Navigation
      ------------------------------------------------ */}

      <AdminNavigation />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
        {/* Hero */}

        <FadeIn>
          <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 md:p-10">
            <div className="bg-aurora pointer-events-none absolute inset-0" aria-hidden="true" />

            <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                  Platform Overview
                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Admin Dashboard
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Monitor events, users, registrations,
                  attendance and certificates across
                  the Pedagogy platform.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
                <LiveDot />
                Live platform data
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ------------------------------------------------
            Primary Stats
        ------------------------------------------------ */}

        <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StaggerItem>
            <Link href="/admin/users" className="block">
              <StatCard
                icon={Users}
                label="Total Users"
                value={data.stats.users.total}
                hint={`${data.stats.users.students} students · ${data.stats.users.faculty} faculty`}
                tone="brand"
              />
            </Link>
          </StaggerItem>

          <StaggerItem>
            <Link href="/admin/events" className="block">
              <StatCard
                icon={CalendarDays}
                label="Total Events"
                value={data.stats.events.total}
                hint={`${data.stats.events.ongoing} ongoing · ${data.stats.events.completed} completed`}
                tone="violet"
              />
            </Link>
          </StaggerItem>

          <StaggerItem>
            <StatCard
              icon={CheckCircle2}
              label="Registrations"
              value={data.stats.registrations.total}
              hint={`${attendanceRate}% attendance rate`}
              tone="info"
            />
          </StaggerItem>

          <StaggerItem>
            <StatCard
              icon={Award}
              label="Certificates"
              value={data.stats.certificates.total}
              hint={`${data.stats.certificates.winners} winners · ${data.stats.certificates.participation} participation`}
              tone="warning"
            />
          </StaggerItem>
        </Stagger>

        {/* ------------------------------------------------
            Secondary Stats
        ------------------------------------------------ */}

        <div className="mt-4 grid gap-4 md:grid-cols-3">
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
        </div>

        {/* ------------------------------------------------
            Content Grid
        ------------------------------------------------ */}

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          {/* Recent Events */}

          <section className="rounded-3xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Recent Events
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  Latest events created on the platform
                </p>
              </div>

              <Link
                href="/admin/events"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition hover:underline"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            {data.recentEvents.length === 0 ? (
              <div className="px-6 py-4">
                <EmptyState
                  icon={CalendarDays}
                  title="No events yet"
                  description="Events created by faculty will show up here."
                />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="px-6 py-5 transition-colors hover:bg-accent/40"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                            {event.category}
                          </span>

                          <StatusBadge status={event.status} kind="event" size="sm" />
                        </div>

                        <h3 className="mt-2 truncate font-medium text-foreground">
                          {event.title}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatDate(event.event_date)}
                          </span>

                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                            {event.venue}
                          </span>

                          {event.participant_limit && (
                            <span className="flex items-center gap-1.5 tabular">
                              <Users className="h-3.5 w-3.5" aria-hidden="true" />
                              {event.participant_limit} seats
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/events/${event.id}`}
                        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                      >
                        View
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Registrations */}

          <section className="rounded-3xl border border-border bg-card">
            <div className="border-b border-border px-6 py-5">
              <h2 className="text-lg font-semibold tracking-tight">
                Recent Registrations
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Latest participant activity
              </p>
            </div>

            {data.recentRegistrations.length === 0 ? (
              <div className="px-6 py-4">
                <EmptyState
                  icon={GraduationCap}
                  title="No registrations yet"
                  description="Student sign-ups will appear here as they happen."
                />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.recentRegistrations.map(
                  (registration) => {
                    const student =
                      getRelation(registration.users);

                    const event =
                      getRelation(registration.events);

                    return (
                      <div
                        key={registration.id}
                        className="px-6 py-5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {student?.name || "Student"}
                                </p>

                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {student?.email || "Email unavailable"}
                                </p>
                              </div>

                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatRelativeTime(registration.registered_at)}
                              </span>
                            </div>

                            <p className="mt-2 truncate text-xs text-foreground/80">
                              {event?.title || "Event unavailable"}
                            </p>

                            <div className="mt-2 flex items-center gap-3">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {registration.registration_code}
                              </span>

                              <StatusBadge
                                status={registration.status}
                                kind="registration"
                                size="sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </div>

        {/* ------------------------------------------------
            Platform Breakdown
        ------------------------------------------------ */}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <BreakdownCard
            title="User Breakdown"
            icon={Users}
            items={[
              {
                label: "Students",
                value: data.stats.users.students,
                total: data.stats.users.total,
              },
              {
                label: "Faculty",
                value: data.stats.users.faculty,
                total: data.stats.users.total,
              },
              {
                label: "Admins",
                value: data.stats.users.admins,
                total: data.stats.users.total,
              },
            ]}
          />

          <BreakdownCard
            title="Certificate Breakdown"
            icon={Trophy}
            items={[
              {
                label: "Winner Certificates",
                value: data.stats.certificates.winners,
                total: data.stats.certificates.total,
              },
              {
                label: "Participation Certificates",
                value: data.stats.certificates.participation,
                total: data.stats.certificates.total,
              },
            ]}
          />
        </div>

        {/* ------------------------------------------------
            Quick Actions
        ------------------------------------------------ */}

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">
            Quick Actions
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* ------------------------------------------------
            Footer
        ------------------------------------------------ */}

        <footer className="mt-16 border-t border-border py-8">
          <div className="flex flex-col justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} Pedagogy</p>

            <div className="flex items-center gap-5">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Centralized Technical Event Management System
              </span>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="transition hover:text-foreground disabled:opacity-50"
              >
                {loggingOut ? "Logging out…" : "Logout"}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* ========================================================
   MINI STAT
======================================================== */

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4">
      <p className="text-xs text-muted-foreground">{label}</p>

      <p className="tabular mt-1 text-xl font-semibold text-foreground">
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

/* ========================================================
   BREAKDOWN CARD
======================================================== */

function BreakdownCard({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: {
    label: string;
    value: number;
    total: number;
  }[];
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-subtle text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>

        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>

      <div className="mt-6 space-y-5">
        {items.map((item) => {
          const percentage =
            item.total > 0
              ? Math.round((item.value / item.total) * 100)
              : 0;

          return (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>

                <span className="tabular font-medium text-foreground">
                  {item.value}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-brand transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========================================================
   QUICK ACTION
======================================================== */

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>

        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>

      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}
