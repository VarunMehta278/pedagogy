"use client";

import AdminNavigation from "@/components/layout/AdminNavigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileEdit,
  MapPin,
  Search,
  ShieldCheck,
  Trash2,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { loginPathFor } from "@/lib/auth";
import { toast } from "@/lib/toast";

import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/motion/reveal";

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

/*
 * GET /admin/events does not select the team columns, so they are
 * fetched separately (GET /events/:id, which does) and kept in a
 * side map rather than reshaping Event — the admin listing itself
 * stays exactly what it always was.
 */
type ParticipationInfo = {
  participation_type: "individual" | "team";
  min_team_size: number;
  max_team_size: number;
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

/*
 * The public event page only serves published events, so
 * linking there for a draft/completed/cancelled event
 * gives the admin "Event not found". Anything not
 * published opens in the management view instead, which
 * admins are authorised for.
 */
function eventViewHref(event: Event) {
  return event.status === "published"
    ? `/events/${event.id}`
    : `/faculty/events/${event.id}`;
}

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

  const [participationById, setParticipationById] = useState<
    Record<string, ParticipationInfo>
  >({});

  /*
   * Enriches the list with each event's participation type, one
   * request per event (the only endpoint that carries it besides
   * the admin listing, which omits it). Best-effort and
   * non-blocking: a failed lookup just leaves that event showing
   * as Individual, it never blocks or errors the page.
   */
  const loadParticipation = async (list: Event[]) => {
    const results = await Promise.allSettled(
      list.map(async (event) => {
        const response = await fetch(
          `${API_URL}/events/${encodeURIComponent(event.id)}`,
          { credentials: "include" }
        );

        if (!response.ok) return null;

        const data = await response.json();
        const found = data?.event;

        if (!found) return null;

        return [
          event.id,
          {
            participation_type:
              found.participation_type === "team"
                ? "team"
                : "individual",
            min_team_size: found.min_team_size ?? 1,
            max_team_size: found.max_team_size ?? 1,
          } as ParticipationInfo,
        ] as const;
      })
    );

    setParticipationById((previous) => {
      const next = { ...previous };

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          next[result.value[0]] = result.value[1];
        }
      }

      return next;
    });
  };

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

      const list: Event[] = data.events || [];

      setEvents(list);
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

      /* Fire-and-forget: never blocks the main list from rendering. */
      loadParticipation(list);
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

      toast.success(
        "Event status updated successfully."
      );

      await loadEvents();
    } catch (err) {
      console.error(err);

      toast.error(
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

      toast.success(
        "Event deleted successfully."
      );

      await loadEvents();
    } catch (err) {
      console.error(err);

      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete event"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <AdminNavigation />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
        {/* PAGE HEADER */}

        <FadeIn>
          <PageHeader
            eyebrow="Administration"
            title="Events"
            description="Manage every event across the institution — statuses, capacity and organizers, all in one table."
          />
        </FadeIn>

        {/* ERROR */}

        {error && (
          <Alert tone="destructive" title="Unable to load events" className="mt-6">
            {error}
          </Alert>
        )}

        {/* STATS */}

        <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total" value={stats.total} icon={CalendarDays} tone="brand" />
          <StatCard label="Draft" value={stats.draft} icon={FileEdit} tone="violet" />
          <StatCard label="Published" value={stats.published} icon={CheckCircle2} tone="success" />
          <StatCard label="Ongoing" value={stats.ongoing} icon={Clock3} tone="warning" />
          <StatCard label="Completed" value={stats.completed} icon={Trophy} tone="info" />
          <StatCard label="Cancelled" value={stats.cancelled} icon={XCircle} tone="destructive" />
        </div>

        {/* FILTERS */}

        <section className="mt-8 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            {/* SEARCH */}

            <div className="relative flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />

              <Input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search events, venue or organizer..."
                className="pl-10"
                aria-label="Search events"
              />
            </div>

            {/* STATUS */}

            <Select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="lg:w-48"
              aria-label="Filter by status"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {capitalize(status)}
                </option>
              ))}
            </Select>

            {/* CATEGORY */}

            <Select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value)
              }
              className="lg:w-48"
              aria-label="Filter by category"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {capitalize(category)}
                </option>
              ))}
            </Select>
          </div>
        </section>

        {/* RESULTS COUNT */}

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="tabular font-medium text-foreground">
              {filteredEvents.length}
            </span>{" "}
            events
          </p>
        </div>

        {/* EVENTS */}

        {loading ? (
          <div className="mt-5">
            <SkeletonRows rows={6} />
          </div>
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No events found"
            description="Try changing your search or filters."
            className="mt-5"
          />
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
            {/* DESKTOP TABLE */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead className="sticky top-16 z-10 border-b border-border bg-muted/95 backdrop-blur">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-4">Event</th>
                    <th className="px-5 py-4">Organizer</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Participants</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {filteredEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="transition-colors hover:bg-accent/40"
                    >
                      <td className="px-5 py-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-primary">
                            <CalendarDays size={18} aria-hidden="true" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {event.title}
                            </p>

                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{event.category}</span>
                              <span aria-hidden="true">•</span>
                              <span className="truncate">{event.venue}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <p className="truncate text-sm font-medium text-foreground">
                          {event.organizer?.name || "Unknown"}
                        </p>

                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {event.organizer?.email || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="tabular text-sm text-foreground">
                          {formatDate(event.event_date)}
                        </p>

                        {event.start_time && (
                          <p className="tabular mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock3 size={12} aria-hidden="true" />
                            {formatTime(event.start_time)}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <div className="tabular flex items-center gap-1.5 text-sm">
                          <Users size={15} className="text-muted-foreground" aria-hidden="true" />

                          <span className="font-medium text-foreground">
                            {event.registration_count}
                          </span>

                          <span className="text-muted-foreground">
                            /{event.participant_limit || "∞"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <ParticipationBadge
                          info={participationById[event.id]}
                        />
                      </td>

                      <td className="px-5 py-5">
                        <StatusBadge status={event.status} kind="event" />
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={eventViewHref(event)}
                            target="_blank"
                            aria-label={`View ${event.title}`}
                            className={buttonVariants({ variant: "outline", size: "icon-sm" })}
                          >
                            <Eye size={14} aria-hidden="true" />
                          </Link>

                          <StatusSelect
                            status={event.status}
                            disabled={updatingId === event.id}
                            onChange={(status) =>
                              updateStatus(event.id, status)
                            }
                          />

                          <Button
                            variant="destructive"
                            size="icon-sm"
                            loading={updatingId === event.id}
                            onClick={() => deleteEvent(event)}
                            aria-label={`Delete ${event.title}`}
                          >
                            {updatingId !== event.id && (
                              <Trash2 size={14} aria-hidden="true" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}

            <div className="divide-y divide-border lg:hidden">
              {filteredEvents.map((event) => (
                <div key={event.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-primary">
                        <CalendarDays size={18} aria-hidden="true" />
                      </div>

                      <div>
                        <h2 className="font-semibold text-foreground">
                          {event.title}
                        </h2>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {event.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={event.status} kind="event" />
                      <ParticipationBadge
                        info={participationById[event.id]}
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <InfoItem
                      icon={<CalendarDays size={15} aria-hidden="true" />}
                      label="Date"
                      value={formatDate(event.event_date)}
                    />

                    <InfoItem
                      icon={<MapPin size={15} aria-hidden="true" />}
                      label="Venue"
                      value={event.venue}
                    />

                    <InfoItem
                      icon={<Users size={15} aria-hidden="true" />}
                      label="Participants"
                      value={`${event.registration_count} / ${
                        event.participant_limit || "∞"
                      }`}
                    />

                    <InfoItem
                      icon={<ShieldCheck size={15} aria-hidden="true" />}
                      label="Organizer"
                      value={event.organizer?.name || "Unknown"}
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Link
                      href={eventViewHref(event)}
                      target="_blank"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Eye size={15} aria-hidden="true" />
                      View
                    </Link>

                    <StatusSelect
                      status={event.status}
                      disabled={updatingId === event.id}
                      onChange={(status) =>
                        updateStatus(event.id, status)
                      }
                    />

                    <Button
                      variant="destructive"
                      size="sm"
                      loading={updatingId === event.id}
                      loadingText="Deleting…"
                      onClick={() => deleteEvent(event)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
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
    <Select
      value={status}
      disabled={disabled}
      onChange={(e) =>
        onChange(e.target.value as EventStatus)
      }
      className="h-9 w-auto min-w-0 py-0 pr-8 text-xs font-medium"
      aria-label="Change event status"
    >
      <option value="draft">Draft</option>
      <option value="published">Published</option>
      <option value="ongoing">Ongoing</option>
      <option value="completed">Completed</option>
      <option value="cancelled">Cancelled</option>
    </Select>
  );
}

function ParticipationBadge({
  info,
}: {
  info?: ParticipationInfo;
}) {
  if (!info) {
    return <Skeleton className="h-5 w-20 rounded-full" />;
  }

  if (info.participation_type !== "team") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[0.6875rem] font-medium text-muted-foreground">
        <Users size={11} aria-hidden="true" />
        Individual
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-subtle px-2.5 py-1 text-[0.6875rem] font-medium text-accent-foreground">
      <Users size={11} aria-hidden="true" />
      Team · {info.min_team_size}–{info.max_team_size}
    </span>
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
    <div className="rounded-xl bg-muted p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>

      <p className="mt-1 text-sm font-medium text-foreground">
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
