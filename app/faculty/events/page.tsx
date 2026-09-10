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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import FacultyNavigation from "@/components/layout/FacultyNavigation";

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
};

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

function getStatusStyle(status: EventStatus) {
  switch (status) {
    case "published":
      return "bg-white text-black border-white/70";

    case "ongoing":
      return "bg-black text-white border-white";

    case "completed":
      return "bg-neutral-200 text-neutral-700 border-neutral-200";

    case "cancelled":
      return "bg-white/20 text-white border-white/30";

    case "draft":
    default:
      return "bg-white/90 text-neutral-700 border-white/70";
  }
}

function getCategoryStyle(category: string) {
  switch (category.toLowerCase()) {
    case "hackathon":
      return "bg-black text-white";

    case "competition":
      return "bg-neutral-900 text-white";

    case "workshop":
      return "bg-neutral-100 text-neutral-900";

    case "seminar":
      return "bg-neutral-100 text-neutral-700";

    default:
      return "bg-white text-neutral-800";
  }
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

  return (
    <div className="min-h-screen bg-[#fafafa] text-black">
      <FacultyNavigation />

      {/* HEADER */}

      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600">
                <CalendarDays size={14} />
                Faculty Event Management
              </div>

              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Your Events
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-neutral-500">
                Create, organize, monitor and manage
                your technical events from one place.
              </p>
            </div>

            <Link
              href="/faculty/events/create"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              <Plus size={17} />
              Create Event
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}

      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-neutral-200 lg:grid-cols-5 lg:px-8">
          <Stat
            label="Total Events"
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

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* SEARCH + FILTERS */}

        <div className="mb-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search your events..."
                className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black"
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
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition ${
                      active
                        ? "border-black bg-black text-white"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-black"
                    }`}
                  >
                    {item === "All"
                      ? "All Status"
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
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition ${
                    active
                      ? "border-black bg-black text-white"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-black"
                  }`}
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
              <p className="text-sm font-medium text-black">
                {filteredEvents.length}{" "}
                {filteredEvents.length === 1
                  ? "event"
                  : "events"}
              </p>

              <p className="mt-1 text-xs text-neutral-400">
                Showing events matching your filters
              </p>
            </div>

            {(search ||
              category !== "All" ||
              status !== "All") && (
              <button
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                  setStatus("All");
                }}
                className="text-xs font-medium text-neutral-500 underline underline-offset-4 hover:text-black"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(
              (item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
                >
                  <div className="h-56 animate-pulse bg-neutral-100" />

                  <div className="space-y-4 p-5">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-neutral-100" />

                    <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />

                    <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-100" />

                    <div className="h-10 w-full animate-pulse rounded bg-neutral-100" />
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
              <CalendarDays size={20} />
            </div>

            <h2 className="mt-4 text-lg font-semibold">
              Unable to load events
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
              {error}
            </p>

            <button
              onClick={loadEvents}
              className="mt-6 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Try Again
            </button>
          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          filteredEvents.length === 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
                <CalendarDays
                  size={22}
                  className="text-neutral-500"
                />
              </div>

              <h2 className="mt-5 text-xl font-semibold tracking-tight">
                No events found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
                {events.length === 0
                  ? "You haven't created any events yet. Create your first technical event to get started."
                  : "Try changing your search or filters to find another event."}
              </p>

              {events.length === 0 ? (
                <Link
                  href="/faculty/events/create"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  <CalendarPlus size={16} />
                  Create Your First Event
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setSearch("");
                    setCategory("All");
                    setStatus("All");
                  }}
                  className="mt-6 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

        {/* EVENT GRID */}

        {!loading &&
          !error &&
          filteredEvents.length > 0 && (
            <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((event) => (
                <FacultyEventCard
                  key={event.id}
                  event={event}
                />
              ))}
            </div>
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
      className={`px-5 py-6 lg:px-6 ${
        hideBorderMobile
          ? "border-t border-neutral-200 lg:border-t-0"
          : ""
      }`}
    >
      <p className="text-2xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-neutral-500">
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
    <article className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-xl">
      {/* IMAGE */}

      <div className="relative h-60 overflow-hidden bg-neutral-100">
        <img
          src={getImage(event)}
          alt={event.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
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
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm ${getCategoryStyle(
              event.category
            )}`}
          >
            {event.category}
          </span>
        </div>

        {/* STATUS */}

        <div className="absolute right-4 top-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-sm ${getStatusStyle(
              event.status
            )}`}
          >
            {event.status === "ongoing" && (
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            )}

            {getStatusLabel(event.status)}
          </span>
        </div>

        {/* DATE */}

        <div className="absolute bottom-4 left-4 text-white">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">
            Event Date
          </p>

          <p className="mt-1 text-lg font-semibold">
            {formatDate(event.event_date)}
          </p>
        </div>
      </div>

      {/* CONTENT */}

      <div className="p-5">
        <h2 className="line-clamp-2 min-h-[3.5rem] text-xl font-semibold tracking-tight">
          {event.title}
        </h2>

        <p className="mt-2 line-clamp-2 min-h-[3rem] text-sm leading-6 text-neutral-500">
          {event.description ||
            "Technical event organized through Pedagogy."}
        </p>

        {/* DETAILS */}

        <div className="mt-5 space-y-3 border-t border-neutral-100 pt-5">
          <DetailRow
            icon={<MapPin size={15} />}
            text={event.venue}
          />

          <DetailRow
            icon={<Clock3 size={15} />}
            text={getTimeRange(event)}
          />

          <DetailRow
            icon={<Users size={15} />}
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
              <span className="text-[11px] font-medium text-neutral-400">
                Registration capacity
              </span>

              <span className="text-[11px] font-semibold text-neutral-600">
                {percentage}%
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-black transition-all"
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* DEADLINE */}

        {event.registration_deadline && (
          <div className="mt-5 flex items-center justify-between rounded-xl bg-neutral-50 px-3.5 py-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                Registration deadline
              </p>

              <p className="mt-0.5 text-xs font-medium text-neutral-700">
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
              className="text-neutral-400"
            />
          </div>
        )}

        {/* ACTIONS */}

        <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
          <Link
            href={`/faculty/events/${event.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Manage Event
            <ChevronRight size={16} />
          </Link>

          <Link
            href={`/faculty/events/${event.id}/scanner`}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-200 px-4 py-3 text-neutral-700 transition hover:border-black hover:bg-neutral-50 hover:text-black"
            title="Scan QR attendance"
          >
            <QrCode size={18} />
          </Link>
        </div>

        {/* QUICK STATUS */}

        {event.status === "completed" && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-neutral-400">
            <CheckCircle2 size={14} />
            Event completed
          </div>
        )}
      </div>
    </article>
  );
}

function DetailRow({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-neutral-600">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
        {icon}
      </span>

      <span className="truncate">
        {text}
      </span>
    </div>
  );
}
