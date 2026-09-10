"use client";

import AdminNavigation from "@/components/layout/AdminNavigation";
import {
  Activity,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  LogOut,
  PieChart,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

import Link from "next/link";
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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

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

  const logout = async () => {
    try {
      await fetch(
        `${API_URL}/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );
    } finally {
      router.replace("/login");
    }
  };

  const topDepartments = useMemo(() => {
    return (
      analytics?.department_distribution
        .slice(0, 8) || []
    );
  }, [analytics]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <AdminNavigation />
        <div className="text-center">
          <Loader2
            size={30}
            className="mx-auto animate-spin text-neutral-500"
          />

          <p className="mt-3 text-sm text-neutral-500">
            Generating analytics...
          </p>
        </div>
      </main>
    );
  }

  if (error || !analytics) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-6">
        <div className="max-w-md text-center">
          <Activity
            size={34}
            className="mx-auto text-neutral-400"
          />

          <h1 className="mt-4 text-xl font-semibold">
            Analytics unavailable
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            {error ||
              "Unable to generate analytics."}
          </p>

          <button
            onClick={loadAnalytics}
            className="mt-5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const { overview } = analytics;

  return (
    <main className="min-h-screen bg-[#fafafa] text-neutral-950">
      {/* HEADER */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 size={21} />

              <span className="text-lg font-semibold tracking-tight">
                Pedagogy
              </span>

              <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                Admin
              </span>
            </div>

            <p className="mt-1 text-sm text-neutral-500">
              Institutional analytics
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              <ChevronLeft size={16} />
              Dashboard
            </Link>

            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* TITLE */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span>Admin</span>
            <span>/</span>
            <span>Analytics</span>
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Analytics Overview
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-neutral-500">
            A real-time overview of users,
            events, registrations,
            attendance and certificates
            across Pedagogy.
          </p>
        </div>

        {/* PRIMARY KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<Users size={19} />}
            label="Total Users"
            value={overview.total_users}
            detail={`${overview.students} students · ${overview.faculty} faculty`}
          />

          <MetricCard
            icon={<CalendarDays size={19} />}
            label="Total Events"
            value={overview.total_events}
            detail={`${overview.ongoing_events} ongoing · ${overview.completed_events} completed`}
          />

          <MetricCard
            icon={<Activity size={19} />}
            label="Registrations"
            value={
              overview.total_registrations
            }
            detail={`${overview.average_registrations_per_event} average per event`}
          />

          <MetricCard
            icon={<CheckCircle2 size={19} />}
            label="Attendance Rate"
            value={`${overview.attendance_rate}%`}
            detail={`${overview.total_attendance} attendees`}
          />
        </div>

        {/* SECONDARY KPIs */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniMetric
            icon={<Award size={18} />}
            label="Certificates"
            value={
              overview.total_certificates
            }
          />

          <MiniMetric
            icon={<Trophy size={18} />}
            label="Winner Certificates"
            value={
              overview.winner_certificates
            }
          />

          <MiniMetric
            icon={<Users size={18} />}
            label="Student Users"
            value={overview.students}
          />

          <MiniMetric
            icon={<TrendingUp size={18} />}
            label="Published Events"
            value={
              overview.published_events
            }
          />
        </div>

        {/* REGISTRATION TREND */}
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                Registration Trend
              </h2>

              <p className="mt-1 text-xs text-neutral-500">
                Daily registrations over the
                latest available period
              </p>
            </div>

            <TrendingUp
              size={19}
              className="text-neutral-400"
            />
          </div>

          <div className="h-[300px] w-full">
            {analytics.registration_trend
              .length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    analytics.registration_trend
                  }
                  margin={{
                    top: 5,
                    right: 10,
                    left: -20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e5e5"
                  />

                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 11,
                    }}
                    tickFormatter={formatShortDate}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    labelFormatter={(label) =>
                      formatDate(
                        String(label)
                      )
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#171717"
                    strokeWidth={2}
                    dot={false}
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
              {analytics.category_distribution
                .length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={
                      analytics.category_distribution
                    }
                    margin={{
                      top: 10,
                      right: 10,
                      left: -20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e5e5"
                    />

                    <XAxis
                      dataKey="category"
                      tick={{
                        fontSize: 11,
                      }}
                    />

                    <YAxis
                      allowDecimals={false}
                      tick={{
                        fontSize: 11,
                      }}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="count"
                      fill="#171717"
                      radius={[
                        4,
                        4,
                        0,
                        0,
                      ]}
                    />
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
              {analytics.event_status_distribution.some(
                (item) =>
                  item.count > 0
              ) ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <RechartsPieChart>
                    <Pie
                      data={
                        analytics.event_status_distribution
                      }
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={55}
                      paddingAngle={2}
                    >
                      {analytics.event_status_distribution.map(
                        (_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              index % 2 ===
                              0
                                ? "#171717"
                                : "#a3a3a3"
                            }
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip />

                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No event status data available." />
              )}
            </div>
          </ChartCard>
        </div>

        {/* DEPARTMENTS */}
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-6">
            <h2 className="font-semibold">
              Student Distribution by Department
            </h2>

            <p className="mt-1 text-xs text-neutral-500">
              Departments with registered
              student accounts
            </p>
          </div>

          {topDepartments.length === 0 ? (
            <EmptyChart message="No department data available." />
          ) : (
            <div className="space-y-4">
              {topDepartments.map(
                (department) => {
                  const percentage =
                    overview.students >
                    0
                      ? Math.round(
                          (department.count /
                            overview.students) *
                            100
                        )
                      : 0;

                  return (
                    <div
                      key={
                        department.department
                      }
                    >
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {
                            department.department
                          }
                        </span>

                        <span className="text-neutral-500">
                          {
                            department.count
                          }{" "}
                          ({percentage}%)
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
                }
              )}
            </div>
          )}
        </section>

        {/* POPULAR EVENTS */}
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 p-5">
            <h2 className="font-semibold">
              Most Popular Events
            </h2>

            <p className="mt-1 text-xs text-neutral-500">
              Ranked by registration volume
            </p>
          </div>

          {analytics.popular_events
            .length === 0 ? (
            <div className="p-10">
              <EmptyChart message="No event registration data available." />
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {analytics.popular_events.map(
                (event, index) => (
                  <div
                    key={event.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold">
                        {index + 1}
                      </div>

                      <div>
                        <h3 className="font-medium">
                          {event.title}
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                          <span>
                            {event.category}
                          </span>

                          <span>•</span>

                          <span>
                            {formatDate(
                              event.event_date
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-5 text-right">
                      <div>
                        <p className="text-lg font-semibold">
                          {
                            event.registrations
                          }
                        </p>

                        <p className="text-[11px] text-neutral-500">
                          Registrations
                        </p>
                      </div>

                      <div>
                        <p className="text-lg font-semibold">
                          {event.attendance}
                        </p>

                        <p className="text-[11px] text-neutral-500">
                          Attendance
                        </p>
                      </div>

                      <div>
                        <p className="text-lg font-semibold">
                          {event.fill_rate !==
                          null
                            ? `${event.fill_rate}%`
                            : "—"}
                        </p>

                        <p className="text-[11px] text-neutral-500">
                          Capacity
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* MONTHLY TREND */}
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-6">
            <h2 className="font-semibold">
              Monthly Registration Overview
            </h2>

            <p className="mt-1 text-xs text-neutral-500">
              Registration volume by month
            </p>
          </div>

          <div className="h-[280px]">
            {analytics
              .monthly_registration_trend
              .length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={
                    analytics.monthly_registration_trend
                  }
                  margin={{
                    top: 10,
                    right: 10,
                    left: -20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e5e5"
                  />

                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="count"
                    fill="#171717"
                    radius={[
                      4,
                      4,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No monthly registration data available." />
            )}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-10 border-t border-neutral-200 py-6 text-center text-xs text-neutral-500">
          Pedagogy · Institutional Event
          Management System
        </footer>
      </div>
    </main>
  );
}

/* -------------------------------- */
/* COMPONENTS */
/* -------------------------------- */

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100">
          {icon}
        </div>
      </div>

      <p className="mt-5 text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-3xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-neutral-500">
        {detail}
      </p>
    </div>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
        {icon}
      </div>

      <div>
        <p className="text-xs text-neutral-500">
          {label}
        </p>

        <p className="mt-1 text-xl font-semibold">
          {value}
        </p>
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
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-5">
        <h2 className="font-semibold">
          {title}
        </h2>

        <p className="mt-1 text-xs text-neutral-500">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}

function EmptyChart({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex h-full items-center justify-center text-center">
      <div>
        <PieChart
          size={28}
          className="mx-auto text-neutral-300"
        />

        <p className="mt-3 text-sm text-neutral-500">
          {message}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------- */
/* HELPERS */
/* -------------------------------- */

function formatDate(
  value: string
) {
  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(
  value: string
) {
  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}