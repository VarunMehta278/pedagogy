"use client";

import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  QrCode,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import FacultyNavigation from "@/components/layout/FacultyNavigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

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
  rules?: string | null;
  image_url?: string | null;
  status: EventStatus;
  organizer_id?: string;
  created_at?: string;
  updated_at?: string;

  registration_count?: number;
  registrations_count?: number;

  /*
   * Set by the API. false means this event belongs to
   * another member of faculty: visible, but not theirs to
   * change.
   */
  can_manage?: boolean;

  organizer?:
    | { id?: string; name?: string }
    | { id?: string; name?: string }[]
    | null;
};

/*
 * Supabase returns a joined relation as an object or as a
 * single-item array depending on the query shape.
 */
function organizerName(event: Event) {
  const organizer = Array.isArray(event.organizer)
    ? event.organizer[0]
    : event.organizer;

  return organizer?.name || null;
}

const categories = [
  "All",
  "Hackathon",
  "Workshop",
  "Competition",
  "Seminar",
  "Conference",
  "Technical",
];

const statuses = [
  "All",
  "draft",
  "published",
  "ongoing",
  "completed",
  "cancelled",
];

const fallbackImages: Record<string, string> = {
  Hackathon:
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1400&q=85",

  Workshop:
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=85",

  Competition:
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85",

  Seminar:
    "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=85",

  Conference:
    "https://images.unsplash.com/photo-1507908708918-778587c9e563?auto=format&fit=crop&w=1400&q=85",

  Technical:
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=85",
};

function formatDate(date?: string | null) {
  if (!date) return "Date TBA";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      weekday: "short",
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

function getTimeRange(event: Event) {
  const start = formatTime(event.start_time);
  const end = formatTime(event.end_time);

  if (start && end) {
    return `${start} – ${end}`;
  }

  return start || "Time TBA";
}

function getImage(event: Event) {
  return (
    event.image_url ||
    fallbackImages[event.category] ||
    fallbackImages.Technical
  );
}

function getRegistrationCount(event: Event) {
  return (
    event.registration_count ??
    event.registrations_count ??
    0
  );
}

function getStatusLabel(status: EventStatus) {
  return (
    status.charAt(0).toUpperCase() +
    status.slice(1)
  );
}

export default function FacultyEventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/events/manage`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        router.replace(
          loginPathFor(
            window.location.pathname
          )
        );
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to load events"
        );
      }

      setEvents(data.events || []);
    } catch (err) {
      console.error("Faculty events error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load events"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !query ||
        event.title.toLowerCase().includes(query) ||
        event.category.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query);

      const matchesCategory =
        category === "All" ||
        event.category.toLowerCase() ===
          category.toLowerCase();

      const matchesStatus =
        status === "All" ||
        event.status === status;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    });
  }, [events, search, category, status]);

  const stats = useMemo(() => {
    const total = events.length;

    const published = events.filter(
      (event) => event.status === "published"
    ).length;

    const ongoing = events.filter(
      (event) => event.status === "ongoing"
    ).length;

    const completed = events.filter(
      (event) => event.status === "completed"
    ).length;

    const registrations = events.reduce(
      (sum, event) =>
        sum + getRegistrationCount(event),
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

  const hasActiveFilters =
    Boolean(search) ||
    category !== "All" ||
    status !== "All";

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
    setStatus("All");
  };

  return (
    <div className="min-h-screen bg-background">
      <FacultyNavigation />

      {/* HEADER */}

      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <CalendarDays size={14} aria-hidden="true" />
                Faculty Event Management
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Your events
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Create, organize, monitor and manage
                your technical events from one place.
              </p>
            </div>

            <Link href="/faculty/events/create" className="w-fit">
              <Button variant="brand" size="lg">
                <Plus size={17} aria-hidden="true" />
                Create event
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}

      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border lg:grid-cols-5 lg:px-8">
          <Stat
            label="Total events"
            value={stats.total}
          />

          <Stat
            label="Published"
            value={stats.published}
          />

          <Stat
            label="Ongoing"
            value={stats.ongoing}
          />

          <Stat
            label="Completed"
            value={stats.completed}
          />

          <Stat
            label="Registrations"
            value={stats.registrations}
            hideBorderMobile
          />
        </div>
      </section>

      {/* MAIN */}

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* SEARCH + FILTERS */}

        <div className="mb-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search your events..."
                aria-label="Search your events"
                className="h-11 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/70 hover:border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/12"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {statuses.map((item) => {
                const active =
                  status === item;

                return (
                  <button
                    key={item}
                    onClick={() =>
                      setStatus(item)
                    }
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-colors duration-200",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {item === "All"
                      ? "All status"
                      : getStatusLabel(
                          item as EventStatus
                        )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => {
              const active =
                category === item;

              return (
                <button
                  key={item}
                  onClick={() =>
                    setCategory(item)
                  }
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-colors duration-200",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* RESULT HEADER */}

        {!loading && !error && (
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="tabular text-sm font-medium text-foreground">
                {filteredEvents.length}{" "}
                {filteredEvents.length === 1
                  ? "event"
                  : "events"}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Showing events matching your filters
              </p>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* LOADING */}

        {loading && <SkeletonGrid count={6} className="md:grid-cols-2 xl:grid-cols-3" />}

        {/* ERROR */}

        {!loading && error && (
          <Alert
            tone="destructive"
            title="Unable to load events"
            action={
              <Button size="sm" variant="outline" onClick={loadEvents}>
                Try again
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          filteredEvents.length === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="No events found"
              description={
                events.length === 0
                  ? "You haven't created any events yet. Create your first technical event to get started."
                  : "Try changing your search or filters to find another event."
              }
              action={
                events.length === 0 ? (
                  <Link href="/faculty/events/create">
                    <Button variant="brand">
                      <CalendarPlus size={16} aria-hidden="true" />
                      Create your first event
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )
              }
            />
          )}

        {/* EVENT GRID */}

        {!loading &&
          !error &&
          filteredEvents.length > 0 && (
            <Stagger className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((event) => (
                <StaggerItem key={event.id}>
                  <FacultyEventCard event={event} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hideBorderMobile = false,
}: {
  label: string;
  value: number;
  hideBorderMobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-5 py-6 lg:px-6",
        hideBorderMobile &&
          "border-t border-border lg:border-t-0"
      )}
    >
      <p className="tabular text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function FacultyEventCard({
  event,
}: {
  event: Event;
}) {
  const registrations =
    getRegistrationCount(event);

  const limit = event.participant_limit;

  const percentage =
    limit && limit > 0
      ? Math.min(
          Math.round(
            (registrations / limit) * 100
          ),
          100
        )
      : null;

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
      {/* IMAGE */}

      <div className="relative h-60 overflow-hidden bg-muted">
        <img
          src={getImage(event)}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => {
            const target =
              e.currentTarget;

            target.onerror = null;
            target.src =
              fallbackImages.Technical;
          }}
        />

        {/* OVERLAY */}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* CATEGORY */}

        <div className="absolute left-4 top-4">
          <span className="inline-flex rounded-full bg-card/95 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
            {event.category}
          </span>
        </div>

        {/* STATUS */}

        <div className="absolute right-4 top-4 rounded-full bg-card/95 p-0.5 shadow-sm backdrop-blur-sm">
          <StatusBadge status={event.status} size="sm" />
        </div>

        {/* DATE */}

        <div className="absolute bottom-4 left-4 text-white">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">
            Event date
          </p>

          <p className="mt-1 text-lg font-semibold">
            {formatDate(event.event_date)}
          </p>
        </div>
      </div>

      {/* CONTENT */}

      <div className="p-5">
        <h2 className="line-clamp-2 min-h-[3.5rem] text-xl font-semibold tracking-tight text-foreground">
          {event.title}
        </h2>

        <p className="mt-2 line-clamp-2 min-h-[3rem] text-sm leading-relaxed text-muted-foreground">
          {event.description ||
            "Technical event organized through Pedagogy."}
        </p>

        {/* DETAILS */}

        <div className="mt-5 space-y-3 border-t border-border pt-5">
          <DetailRow
            icon={MapPin}
            text={event.venue}
          />

          <DetailRow
            icon={Clock3}
            text={getTimeRange(event)}
          />

          <DetailRow
            icon={Users}
            text={
              limit
                ? `${registrations} / ${limit} participants`
                : `${registrations} participants`
            }
          />
        </div>

        {/* CAPACITY */}

        {percentage !== null && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Registration capacity
              </span>

              <span className="tabular text-[11px] font-semibold text-foreground">
                {percentage}%
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  percentage >= 100
                    ? "bg-destructive"
                    : percentage >= 80
                    ? "bg-warning"
                    : "bg-primary"
                )}
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* DEADLINE */}

        {event.registration_deadline && (
          <div className="mt-5 flex items-center justify-between rounded-xl bg-muted px-3.5 py-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Registration deadline
              </p>

              <p className="mt-0.5 text-xs font-medium text-foreground">
                {new Date(
                  event.registration_deadline
                ).toLocaleDateString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }
                )}
              </p>
            </div>

            <CalendarDays
              size={16}
              className="text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        )}

        {/* ACTIONS */}

        {event.can_manage === false ? (
          /*
           * A colleague's event. Shown so faculty can see
           * what is being planned — including drafts — but
           * it opens the read-only page. The management
           * routes would answer 403 regardless.
           */
          <div className="mt-5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {organizerName(event)
                ? `${organizerName(event)} · view only`
                : "View only"}
            </p>

            <Link href={`/events/${event.id}`}>
              <Button variant="outline" block>
                View event
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
            <Link href={`/faculty/events/${event.id}`}>
              <Button variant="default" block>
                Manage event
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </Link>

            <Link
              href={`/faculty/events/${event.id}/scanner`}
              title="Scan QR attendance"
              aria-label="Scan QR attendance"
            >
              <Button variant="outline" size="icon" className="h-full w-11">
                <QrCode size={18} aria-hidden="true" />
              </Button>
            </Link>
          </div>
        )}

        {/* QUICK STATUS */}

        {event.status === "completed" && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CheckCircle2 size={14} aria-hidden="true" />
            Event completed
          </div>
        )}
      </div>
    </article>
  );
}

function DetailRow({
  icon: Icon,
  text,
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-foreground">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon size={15} aria-hidden="true" />
      </span>

      <span className="truncate">
        {text}
      </span>
    </div>
  );
}
