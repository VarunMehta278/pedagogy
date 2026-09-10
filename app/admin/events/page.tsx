"use client";

import AdminNavigation from "@/components/layout/AdminNavigation";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Eye,
  Loader2,
  LogOut,
  MapPin,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { loginPathFor } from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

type EventStatus =
  | "draft"
  | "published"
  | "ongoing"
  | "completed"
  | "cancelled";

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
  image_url?: string | null;
  status: EventStatus;
  organizer_id: string;
  registration_count: number;

  organizer?: {
    id: string;
    name: string;
    email: string;
    department?: string | null;
  } | null;
};

type Stats = {
  total: number;
  draft: number;
  published: number;
  ongoing: number;
  completed: number;
  cancelled: number;
};

const statusOptions = [
  "all",
  "draft",
  "published",
  "ongoing",
  "completed",
  "cancelled",
] as const;

const categoryOptions = [
  "all",
  "Hackathon",
  "Workshop",
  "Competition",
  "Seminar",
  "Conference",
  "Technical",
];

export default function AdminEventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>(
    []
  );

  const [stats, setStats] = useState<Stats>({
    total: 0,
    draft: 0,
    published: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
  });

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [categoryFilter, setCategoryFilter] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/admin/events`,
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
            "Failed to load events"
        );
      }

      setEvents(data.events || []);
      setStats(
        data.stats || {
          total: 0,
          draft: 0,
          published: 0,
          ongoing: 0,
          completed: 0,
          cancelled: 0,
        }
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load events"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !query ||
        event.title
          .toLowerCase()
          .includes(query) ||
        event.category
          .toLowerCase()
          .includes(query) ||
        event.venue
          .toLowerCase()
          .includes(query) ||
        event.organizer?.name
          ?.toLowerCase()
          .includes(query) ||
        event.organizer?.email
          ?.toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        event.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        event.category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [
    events,
    search,
    statusFilter,
    categoryFilter,
  ]);

  const updateStatus = async (
    eventId: string,
    status: EventStatus
  ) => {
    try {
      setUpdatingId(eventId);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/admin/events/${encodeURIComponent(
          eventId
        )}/status`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update event"
        );
      }

      setSuccess(
        "Event status updated successfully."
      );

      await loadEvents();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update event"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteEvent = async (
    event: Event
  ) => {
    const confirmed = window.confirm(
      `Delete "${event.title}"?\n\nThis will permanently remove the event and its related registrations, attendance, results and certificates.`
    );

    if (!confirmed) return;

    try {
      setUpdatingId(event.id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/admin/events/${encodeURIComponent(
          event.id
        )}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete event"
        );
      }

      setSuccess(
        "Event deleted successfully."
      );

      await loadEvents();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete event"
      );
    } finally {
      setUpdatingId(null);
    }
  };

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

  return (
    <main className="min-h-screen bg-[#fafafa] text-neutral-950">
        <AdminNavigation />
      {/* HEADER */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={21}
                strokeWidth={2}
              />

              <span className="text-lg font-semibold tracking-tight">
                Pedagogy
              </span>

              <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                Admin
              </span>
            </div>

            <p className="mt-1 text-sm text-neutral-500">
              Event management
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/dashboard"
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
            >
              Dashboard
            </Link>

            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* PAGE HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Events
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Manage every event across the
            institution.
          </p>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
            {success}
          </div>
        )}

        {/* STATS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard
            label="Total"
            value={stats.total}
          />

          <StatCard
            label="Draft"
            value={stats.draft}
          />

          <StatCard
            label="Published"
            value={stats.published}
          />

          <StatCard
            label="Ongoing"
            value={stats.ongoing}
          />

          <StatCard
            label="Completed"
            value={stats.completed}
          />

          <StatCard
            label="Cancelled"
            value={stats.cancelled}
          />
        </div>

        {/* FILTERS */}
        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            {/* SEARCH */}
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search events, venue or organizer..."
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm outline-none transition focus:border-neutral-400 focus:bg-white"
              />
            </div>

            {/* STATUS */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
                className="h-11 min-w-[160px] appearance-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 pr-10 text-sm outline-none"
              >
                {statusOptions.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {capitalize(status)}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
            </div>

            {/* CATEGORY */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(
                    e.target.value
                  )
                }
                className="h-11 min-w-[170px] appearance-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 pr-10 text-sm outline-none"
              >
                {categoryOptions.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {capitalize(category)}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
            </div>
          </div>
        </section>

        {/* RESULTS COUNT */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Showing{" "}
            <span className="font-medium text-neutral-900">
              {filteredEvents.length}
            </span>{" "}
            events
          </p>
        </div>

        {/* EVENTS */}
        {loading ? (
          <div className="flex min-h-[350px] items-center justify-center">
            <div className="text-center">
              <Loader2
                size={28}
                className="mx-auto animate-spin text-neutral-500"
              />

              <p className="mt-3 text-sm text-neutral-500">
                Loading events...
              </p>
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
            <CalendarDays
              size={32}
              className="mx-auto text-neutral-400"
            />

            <h2 className="mt-4 text-base font-semibold">
              No events found
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Try changing your search or
              filters.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    <th className="px-5 py-4">
                      Event
                    </th>

                    <th className="px-5 py-4">
                      Organizer
                    </th>

                    <th className="px-5 py-4">
                      Date
                    </th>

                    <th className="px-5 py-4">
                      Participants
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {filteredEvents.map(
                    (event) => (
                      <tr
                        key={event.id}
                        className="transition hover:bg-neutral-50"
                      >
                        <td className="px-5 py-5">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                              <CalendarDays
                                size={18}
                                className="text-neutral-600"
                              />
                            </div>

                            <div>
                              <p className="font-medium">
                                {event.title}
                              </p>

                              <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                                <span>
                                  {
                                    event.category
                                  }
                                </span>

                                <span>
                                  •
                                </span>

                                <span>
                                  {
                                    event.venue
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <p className="text-sm font-medium">
                            {event.organizer
                              ?.name ||
                              "Unknown"}
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            {event.organizer
                              ?.email || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <p className="text-sm">
                            {formatDate(
                              event.event_date
                            )}
                          </p>

                          {event.start_time && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                              <Clock3
                                size={12}
                              />
                              {formatTime(
                                event.start_time
                              )}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Users
                              size={15}
                              className="text-neutral-400"
                            />

                            <span className="font-medium">
                              {
                                event.registration_count
                              }
                            </span>

                            <span className="text-neutral-400">
                              /
                              {event.participant_limit ||
                                "∞"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <StatusBadge
                            status={
                              event.status
                            }
                          />
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/events/${event.id}`}
                              target="_blank"
                              className="rounded-lg border border-neutral-200 p-2 transition hover:bg-neutral-100"
                              title="View event"
                            >
                              <Eye
                                size={16}
                              />
                            </Link>

                            <StatusSelect
                              status={
                                event.status
                              }
                              disabled={
                                updatingId ===
                                event.id
                              }
                              onChange={(
                                status
                              ) =>
                                updateStatus(
                                  event.id,
                                  status
                                )
                              }
                            />

                            <button
                              onClick={() =>
                                deleteEvent(
                                  event
                                )
                              }
                              disabled={
                                updatingId ===
                                event.id
                              }
                              className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Delete event"
                            >
                              {updatingId ===
                              event.id ? (
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={16}
                                />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="divide-y divide-neutral-200 lg:hidden">
              {filteredEvents.map(
                (event) => (
                  <div
                    key={event.id}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                          <CalendarDays
                            size={18}
                          />
                        </div>

                        <div>
                          <h2 className="font-semibold">
                            {event.title}
                          </h2>

                          <p className="mt-1 text-xs text-neutral-500">
                            {event.category}
                          </p>
                        </div>
                      </div>

                      <StatusBadge
                        status={
                          event.status
                        }
                      />
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <InfoItem
                        icon={
                          <CalendarDays
                            size={15}
                          />
                        }
                        label="Date"
                        value={formatDate(
                          event.event_date
                        )}
                      />

                      <InfoItem
                        icon={
                          <MapPin
                            size={15}
                          />
                        }
                        label="Venue"
                        value={
                          event.venue
                        }
                      />

                      <InfoItem
                        icon={
                          <Users
                            size={15}
                          />
                        }
                        label="Participants"
                        value={`${event.registration_count} / ${
                          event.participant_limit ||
                          "∞"
                        }`}
                      />

                      <InfoItem
                        icon={
                          <ShieldCheck
                            size={15}
                          />
                        }
                        label="Organizer"
                        value={
                          event.organizer
                            ?.name ||
                          "Unknown"
                        }
                      />
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href={`/events/${event.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium hover:bg-neutral-50"
                      >
                        <Eye size={15} />
                        View
                      </Link>

                      <StatusSelect
                        status={
                          event.status
                        }
                        disabled={
                          updatingId ===
                          event.id
                        }
                        onChange={(
                          status
                        ) =>
                          updateStatus(
                            event.id,
                            status
                          )
                        }
                      />

                      <button
                        onClick={() =>
                          deleteEvent(event)
                        }
                        disabled={
                          updatingId ===
                          event.id
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2
                          size={15}
                        />
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ----------------------------- */
/* COMPONENTS */
/* ----------------------------- */

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: EventStatus;
}) {
  const styles: Record<
    EventStatus,
    string
  > = {
    draft:
      "bg-neutral-100 text-neutral-700",
    published:
      "bg-black text-white",
    ongoing:
      "bg-neutral-900 text-white",
    completed:
      "bg-neutral-200 text-neutral-800",
    cancelled:
      "bg-neutral-100 text-neutral-400 line-through",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function StatusSelect({
  status,
  disabled,
  onChange,
}: {
  status: EventStatus;
  disabled: boolean;
  onChange: (
    status: EventStatus
  ) => void;
}) {
  return (
    <div className="relative">
      <select
        value={status}
        disabled={disabled}
        onChange={(e) =>
          onChange(
            e.target.value as EventStatus
          )
        }
        className="h-9 appearance-none rounded-lg border border-neutral-200 bg-white px-3 pr-8 text-xs font-medium outline-none transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="draft">
          Draft
        </option>

        <option value="published">
          Published
        </option>

        <option value="ongoing">
          Ongoing
        </option>

        <option value="completed">
          Completed
        </option>

        <option value="cancelled">
          Cancelled
        </option>
      </select>

      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400"
      />
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-neutral-500">
        {icon}
        {label}
      </div>

      <p className="mt-1 text-sm font-medium">
        {value}
      </p>
    </div>
  );
}

/* ----------------------------- */
/* HELPERS */
/* ----------------------------- */

function capitalize(
  value: string
) {
  if (value === "all") return "All";

  return value
    .charAt(0)
    .toUpperCase() +
    value.slice(1);
}

function formatDate(
  date: string
) {
  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(
  time: string
) {
  const [hours, minutes] =
    time.split(":");

  const date = new Date();

  date.setHours(
    Number(hours),
    Number(minutes),
    0,
    0
  );

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
}