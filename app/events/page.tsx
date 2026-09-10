"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Search,
  Users,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

type EventData = {
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
  status: string;
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

export default function EventsPage() {
  const [events, setEvents] =
    useState<EventData[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/events`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load events"
        );
      }

      setEvents(data.events || []);
    } catch (err) {
      console.error(
        "Load events error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load events"
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const searchText =
        `${event.title} ${event.description || ""} ${event.category} ${event.venue}`
          .toLowerCase();

      const matchesSearch =
        searchText.includes(
          search.toLowerCase()
        );

      const matchesCategory =
        category === "All" ||
        event.category.toLowerCase() ===
          category.toLowerCase();

      return (
        matchesSearch &&
        matchesCategory
      );
    });
  }, [events, search, category]);

  const formatDate = (
    date?: string | null
  ) => {
    if (!date) return "—";

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (
    time?: string | null
  ) => {
    if (!time) return "";

    const [hours, minutes] =
      time.split(":");

    const date = new Date();

    date.setHours(
      Number(hours),
      Number(minutes)
    );

    return date.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-neutral-950">

      {/* Header */}

      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">

        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">

          <Link
            href="/student/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-sm font-bold text-white">
              P
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight">
                Pedagogy
              </p>

              <p className="hidden text-[10px] uppercase tracking-wider text-neutral-400 sm:block">
                Technical Events
              </p>
            </div>
          </Link>

          <Link
            href="/student/dashboard"
            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-600 transition hover:border-black hover:text-black"
          >
            Dashboard
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">

        {/* Hero */}

        <section className="relative overflow-hidden rounded-3xl bg-neutral-950 px-6 py-12 text-white md:px-10 md:py-16">

          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />

          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full border border-white/5" />

          <div className="relative max-w-3xl">

            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
              Pedagogy Events
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
              Discover.
              <br />
              Register.
              <br />
              Compete.
            </h1>

            <p className="mt-6 max-w-xl text-sm leading-6 text-neutral-400 md:text-base">
              Explore technical events,
              hackathons, workshops and
              competitions happening across
              your institution.
            </p>

          </div>

        </section>

        {/* Search */}

        <section className="relative z-10 -mt-7 px-4 md:px-8">

          <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl">

            <div className="relative">

              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search events, hackathons, workshops..."
                className="w-full rounded-xl bg-neutral-50 py-4 pl-12 pr-4 text-sm outline-none transition focus:bg-white focus:ring-1 focus:ring-black"
              />

            </div>

          </div>

        </section>

        {/* Categories */}

        <section className="mt-8">

          <div className="flex gap-2 overflow-x-auto pb-2">

            {categories.map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setCategory(item)
                  }
                  className={`whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-semibold transition ${
                    category === item
                      ? "bg-black text-white"
                      : "border border-neutral-200 bg-white text-neutral-500 hover:border-black hover:text-black"
                  }`}
                >
                  {item}
                </button>
              )
            )}

          </div>

        </section>

        {/* Heading */}

        <section className="mt-10 flex items-end justify-between">

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Upcoming
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Technical Events
            </h2>
          </div>

          {!loading && (
            <p className="text-xs text-neutral-400">
              {filteredEvents.length}{" "}
              {filteredEvents.length === 1
                ? "event"
                : "events"}
            </p>
          )}

        </section>

        {/* Loading */}

        {loading && (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">

            {Array.from({
              length: 6,
            }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
              >

                <div className="h-52 animate-pulse bg-neutral-100" />

                <div className="space-y-3 p-5">

                  <div className="h-3 w-20 animate-pulse rounded bg-neutral-100" />

                  <div className="h-5 w-3/4 animate-pulse rounded bg-neutral-100" />

                  <div className="h-3 w-full animate-pulse rounded bg-neutral-100" />

                  <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-100" />

                </div>

              </div>
            ))}

          </div>
        )}

        {/* Error */}

        {!loading && error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-white p-10 text-center">

            <h3 className="text-lg font-semibold">
              Couldn't load events
            </h3>

            <p className="mt-2 text-sm text-neutral-500">
              {error}
            </p>

            <button
              type="button"
              onClick={loadEvents}
              className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white"
            >
              Try Again
            </button>

          </div>
        )}

        {/* Empty */}

        {!loading &&
          !error &&
          filteredEvents.length ===
            0 && (
            <div className="mt-6 rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
                <Search
                  size={23}
                  className="text-neutral-400"
                />
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                No events found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
                Try a different search term
                or choose another category.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
                className="mt-5 rounded-xl bg-black px-5 py-3 text-xs font-semibold text-white"
              >
                Clear Filters
              </button>

            </div>
          )}

        {/* Event Grid */}

        {!loading &&
          !error &&
          filteredEvents.length > 0 && (
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">

              {filteredEvents.map(
                (event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    formatDate={formatDate}
                    formatTime={formatTime}
                  />
                )
              )}

            </div>
          )}

      </div>

    </main>
  );
}


/* -------------------------------- */
/* Event Card */
/* -------------------------------- */

function EventCard({
  event,
  formatDate,
  formatTime,
}: {
  event: EventData;
  formatDate: (
    date?: string | null
  ) => string;
  formatTime: (
    time?: string | null
  ) => string;
}) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-xl">

      {/* Image */}

      <div className="relative h-52 overflow-hidden bg-neutral-950">

        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">

            <span className="text-8xl font-bold text-white/10">
              P
            </span>

          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black">
          {event.category}
        </span>

        <div className="absolute bottom-4 left-4 right-4">

          <p className="text-xs font-medium text-white/70">
            {formatDate(event.event_date)}
          </p>

          <h3 className="mt-1 line-clamp-2 text-xl font-semibold text-white">
            {event.title}
          </h3>

        </div>

      </div>

      {/* Content */}

      <div className="p-5">

        {event.description && (
          <p className="line-clamp-2 text-xs leading-5 text-neutral-500">
            {event.description}
          </p>
        )}

        <div className="mt-5 space-y-3">

          <EventMeta
            icon={<MapPin size={14} />}
            text={event.venue}
          />

          {event.start_time && (
            <EventMeta
              icon={<Clock3 size={14} />}
              text={`${formatTime(
                event.start_time
              )}${
                event.end_time
                  ? ` – ${formatTime(
                      event.end_time
                    )}`
                  : ""
              }`}
            />
          )}

          <EventMeta
            icon={<Users size={14} />}
            text={
              event.participant_limit
                ? `${event.participant_limit} participant limit`
                : "Open registration"
            }
          />

        </div>

        <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-5">

          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400">
              Registration Deadline
            </p>

            <p className="mt-1 text-xs font-semibold">
              {event.registration_deadline
                ? new Date(
                    event.registration_deadline
                  ).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                    }
                  )
                : "No deadline"}
            </p>
          </div>

          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-neutral-800"
          >
            View Event
            <ArrowRight size={14} />
          </Link>

        </div>

      </div>

    </article>
  );
}


/* -------------------------------- */
/* Event Meta */
/* -------------------------------- */

function EventMeta({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">

      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
        {icon}
      </span>

      <span className="truncate">
        {text}
      </span>

    </div>
  );
}
