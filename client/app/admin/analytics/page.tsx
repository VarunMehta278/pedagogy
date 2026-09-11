"use client";

import AdminNavigation from "@/components/layout/AdminNavigation";
import {
  Activity,
  Award,
  CalendarDays,
  CheckCircle2,
  PieChart,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { loginPathFor } from "@/lib/auth";

import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/motion/reveal";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

/* The indigo → violet → magenta → blue → cyan ramp, theme-aware. */
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type Overview = {
  total_users: number;
  students: number;
  faculty: number;
  admins: number;

  total_events: number;
  published_events: number;
  ongoing_events: number;
  completed_events: number;

  total_registrations: number;
  total_attendance: number;
  attendance_rate: number;

  average_registrations_per_event: number;

  total_certificates: number;
  winner_certificates: number;
  participation_certificates: number;
};

type Department = {
  department: string;
  count: number;
};

type Category = {
  category: string;
  count: number;
};

type EventStatus = {
  status: string;
  count: number;
};

type Trend = {
  date: string;
  count: number;
};

type MonthlyTrend = {
  month: string;
  count: number;
};

type PopularEvent = {
  id: string;
  title: string;
  category: string;
  event_date: string;
  status: string;
  participant_limit: number | null;
  registrations: number;
  attendance: number;
  fill_rate: number | null;
};

type Analytics = {
  overview: Overview;
  department_distribution: Department[];
  category_distribution: Category[];
  event_status_distribution: EventStatus[];
  registration_trend: Trend[];
  monthly_registration_trend: MonthlyTrend[];
  popular_events: PopularEvent[];
  event_performance: PopularEvent[];
};

export default function AdminAnalyticsPage() {
  const router = useRouter();

  const [analytics, setAnalytics] =
    useState<Analytics | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/admin/analytics`,
        {
          credentials: "include",
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
        router.replace("/dashboard");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load analytics"
        );
      }

      setAnalytics(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load analytics"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const topDepartments = useMemo(() => {
    return (
      analytics?.department_distribution
        .slice(0, 8) || []
    );
  }, [analytics]);

  /* ------------------------------------------------
      Loading
  ------------------------------------------------ */

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <AdminNavigation />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-4 h-9 w-72" />
          <SkeletonText lines={2} className="mt-4 max-w-xl" />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border bg-card p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-16" />
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-6 h-[260px] w-full rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------
      Error
  ------------------------------------------------ */

  if (error || !analytics) {
    return (
      <main className="min-h-screen bg-background">
        <AdminNavigation />

        <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
          <EmptyState
            icon={Activity}
            title="Analytics unavailable"
            description={error || "Unable to generate analytics."}
            tone="destructive"
            action={
              <Button variant="brand" onClick={loadAnalytics}>
                Try again
              </Button>
            }
          />
        </div>
      </main>
    );
  }

  const { overview } = analytics;

  return (
    <main className="min-h-screen bg-background">
      <AdminNavigation />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
        {/* TITLE */}

        <FadeIn>
          <PageHeader
            eyebrow="Administration / Analytics"
            title="Analytics Overview"
            description="A real-time overview of users, events, registrations, attendance and certificates across Pedagogy."
          />
        </FadeIn>

        {/* PRIMARY KPIs */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total Users"
            value={overview.total_users}
            hint={`${overview.students} students · ${overview.faculty} faculty`}
            tone="brand"
          />

          <StatCard
            icon={CalendarDays}
            label="Total Events"
            value={overview.total_events}
            hint={`${overview.ongoing_events} ongoing · ${overview.completed_events} completed`}
            tone="violet"
          />

          <StatCard
            icon={Activity}
            label="Registrations"
            value={overview.total_registrations}
            hint={`${overview.average_registrations_per_event} average per event`}
            tone="info"
          />

          <StatCard
            icon={CheckCircle2}
            label="Attendance Rate"
            value={`${overview.attendance_rate}%`}
            hint={`${overview.total_attendance} attendees`}
            tone="success"
          />
        </div>

        {/* SECONDARY KPIs */}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniMetric icon={Award} label="Certificates" value={overview.total_certificates} />
          <MiniMetric icon={Trophy} label="Winner Certificates" value={overview.winner_certificates} />
          <MiniMetric icon={Users} label="Student Users" value={overview.students} />
          <MiniMetric icon={TrendingUp} label="Published Events" value={overview.published_events} />
        </div>

        {/* REGISTRATION TREND */}

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Registration Trend</h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Daily registrations over the latest available period
              </p>
            </div>

            <TrendingUp className="h-[19px] w-[19px] text-muted-foreground" aria-hidden="true" />
          </div>

          <div className="h-[300px] w-full">
            {analytics.registration_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analytics.registration_trend}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />

                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickFormatter={formatShortDate}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                  />

                  <Tooltip content={<ChartTooltip labelFormatter={formatDate} />} />

                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Registrations"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No registration data available yet." />
            )}
          </div>
        </section>

        {/* CHART GRID */}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* CATEGORIES */}

          <ChartCard
            title="Events by Category"
            description="Distribution of institutional events"
          >
            <div className="h-[300px]">
              {analytics.category_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.category_distribution}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />

                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={{ stroke: "var(--border)" }}
                    />

                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={{ stroke: "var(--border)" }}
                    />

                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)" }} />

                    <Bar dataKey="count" name="Events" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No event categories available." />
              )}
            </div>
          </ChartCard>

          {/* STATUS */}

          <ChartCard
            title="Event Status"
            description="Current event lifecycle distribution"
          >
            <div className="h-[300px]">
              {analytics.event_status_distribution.some((item) => item.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={analytics.event_status_distribution}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={55}
                      paddingAngle={2}
                    >
                      {analytics.event_status_distribution.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          stroke="var(--card)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>

                    <Tooltip content={<ChartTooltip />} />

                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No event status data available." />
              )}
            </div>
          </ChartCard>
        </div>

        {/* DEPARTMENTS */}

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Student Distribution by Department
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Departments with registered student accounts
            </p>
          </div>

          {topDepartments.length === 0 ? (
            <EmptyChart message="No department data available." />
          ) : (
            <div className="space-y-4">
              {topDepartments.map((department) => {
                const percentage =
                  overview.students > 0
                    ? Math.round(
                        (department.count / overview.students) * 100
                      )
                    : 0;

                return (
                  <div key={department.department}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {department.department}
                      </span>

                      <span className="tabular text-muted-foreground">
                        {department.count} ({percentage}%)
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
          )}
        </section>

        {/* POPULAR EVENTS */}

        <section className="mt-6 rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">Most Popular Events</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Ranked by registration volume
            </p>
          </div>

          {analytics.popular_events.length === 0 ? (
            <div className="p-10">
              <EmptyChart message="No event registration data available." />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {analytics.popular_events.map((event, index) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-4 p-5 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-sm font-semibold text-primary">
                      {index + 1}
                    </div>

                    <div>
                      <h3 className="font-medium text-foreground">{event.title}</h3>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{event.category}</span>
                        <span aria-hidden="true">•</span>
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-5 text-right">
                    <div>
                      <p className="tabular text-lg font-semibold text-foreground">
                        {event.registrations}
                      </p>

                      <p className="text-[11px] text-muted-foreground">Registrations</p>
                    </div>

                    <div>
                      <p className="tabular text-lg font-semibold text-foreground">
                        {event.attendance}
                      </p>

                      <p className="text-[11px] text-muted-foreground">Attendance</p>
                    </div>

                    <div>
                      <p className="tabular text-lg font-semibold text-foreground">
                        {event.fill_rate !== null ? `${event.fill_rate}%` : "—"}
                      </p>

                      <p className="text-[11px] text-muted-foreground">Capacity</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* MONTHLY TREND */}

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Monthly Registration Overview
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Registration volume by month
            </p>
          </div>

          <div className="h-[280px]">
            {analytics.monthly_registration_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.monthly_registration_trend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />

                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                  />

                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)" }} />

                  <Bar dataKey="count" name="Registrations" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No monthly registration data available." />
            )}
          </div>
        </section>

        {/* FOOTER */}

        <footer className="mt-10 border-t border-border py-6 text-center text-xs text-muted-foreground">
          Pedagogy · Institutional Event Management System
        </footer>
      </div>
    </main>
  );
}

/* -------------------------------- */
/* COMPONENTS */
/* -------------------------------- */

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-primary">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </div>

      <div>
        <p className="text-xs text-muted-foreground">{label}</p>

        <p className="tabular mt-1 text-xl font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <SectionHeading title={title} description={description} className="mb-5" />
      {children}
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState icon={PieChart} title="No data yet" description={message} />
    </div>
  );
}

type ChartTooltipEntry = {
  value?: number | string;
  name?: string;
  color?: string;
};

/*
 * A single tooltip, restyled with tokens, shared by every chart on
 * this page. The default recharts tooltip is white-on-white in dark
 * mode, so every chart routes through this instead.
 */
function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string | number;
  labelFormatter?: (label: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-popover px-3.5 py-2.5 text-popover-foreground shadow-lg">
      {label !== undefined && (
        <p className="text-xs font-medium text-muted-foreground">
          {labelFormatter ? labelFormatter(String(label)) : label}
        </p>
      )}

      <div className="mt-1 space-y-1">
        {payload.map((entry, index) => (
          <p key={index} className="tabular flex items-center gap-2 text-sm font-semibold">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            {entry.value}
            {entry.name && payload.length > 1 ? (
              <span className="font-normal text-muted-foreground">{entry.name}</span>
            ) : null}
          </p>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- */
/* HELPERS */
/* -------------------------------- */

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}
