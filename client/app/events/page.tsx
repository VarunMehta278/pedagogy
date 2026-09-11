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

import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { Stagger, StaggerItem, FadeIn } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

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

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
  };

  const hasFilters = Boolean(search) || category !== "All";

  return (
    <main className="min-h-screen bg-background">

      {/* Header */}

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">

          <Link
            href="/student/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold text-white shadow-brand">
              P
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">
                Pedagogy
              </p>

              <p className="hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:block">
                Technical Events
              </p>
            </div>
          </Link>

          <Link
            href="/student/dashboard"
            className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            Dashboard
          </Link>

        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">

        {/* Hero */}

        <FadeIn>
          <section className="relative overflow-hidden rounded-3xl bg-gradient-brand px-6 py-12 text-white md:px-10 md:py-16">

            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full border border-white/10" />

            <div className="relative max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
                Pedagogy Events
              </p>

              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">
                Discover.
                <br />
                Register.
                <br />
                Compete.
              </h1>

              <p className="mt-6 max-w-xl text-sm leading-6 text-white/80 md:text-base">
                Explore technical events, hackathons, workshops and
                competitions happening across your institution.
              </p>
            </div>

          </section>
        </FadeIn>

        {/* Search */}

        <section className="relative z-10 -mt-7 px-4 md:px-8">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-xl">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />

              <Input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search events, hackathons, workshops…"
                aria-label="Search events"
                className="h-13 rounded-xl border-transparent bg-muted pl-12 text-sm focus:border-primary focus:bg-card"
              />
            </div>
          </div>
        </section>

        {/* Categories */}

        <section className="mt-8">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={cn(
                  "whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-semibold transition-all duration-200",
                  category === item
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {/* Heading */}

        <section className="mt-10 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Upcoming
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              Technical Events
            </h2>
          </div>

          {!loading && !error && (
            <p className="text-xs tabular text-muted-foreground">
              {filteredEvents.length}{" "}
              {filteredEvents.length === 1 ? "event" : "events"}
            </p>
          )}
        </section>

        {/* Loading */}

        {loading && (
          <SkeletonGrid count={6} className="mt-6" />
        )}

        {/* Error */}

        {!loading && error && (
          <Alert
            tone="destructive"
            title="Couldn't load events"
            className="mt-6"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={loadEvents}
              >
                Try again
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Empty */}

        {!loading &&
          !error &&
          filteredEvents.length === 0 && (
            <EmptyState
              icon={Search}
              title="No events found"
              description={
                hasFilters
                  ? "Try a different search term or choose another category."
                  : "There are no events published yet. Check back soon."
              }
              className="mt-6"
              action={
                hasFilters ? (
                  <Button onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          )}

        {/* Event Grid */}

        {!loading &&
          !error &&
          filteredEvents.length > 0 && (
            <Stagger className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <StaggerItem key={event.id}>
                  <EventCard
                    event={event}
                    formatDate={formatDate}
                    formatTime={formatTime}
                  />
                </StaggerItem>
              ))}
            </Stagger>
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
    <article className="group h-full overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">

      {/* Image */}

      <div className="relative h-52 overflow-hidden bg-muted">

        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-brand">
            <span className="text-8xl font-bold text-white/15">
              P
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        <span className="absolute left-4 top-4 rounded-full bg-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground shadow-sm">
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
          <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
            {event.description}
          </p>
        )}

        <div className="mt-5 space-y-3">

          <EventMeta
            icon={<MapPin size={14} aria-hidden="true" />}
            text={event.venue}
          />

          {event.start_time && (
            <EventMeta
              icon={<Clock3 size={14} aria-hidden="true" />}
              text={`${formatTime(event.start_time)}${
                event.end_time
                  ? ` – ${formatTime(event.end_time)}`
                  : ""
              }`}
            />
          )}

          <EventMeta
            icon={<Users size={14} aria-hidden="true" />}
            text={
              event.participant_limit
                ? `${event.participant_limit} participant limit`
                : "Open registration"
            }
          />

        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-5">

          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Registration Deadline
            </p>

            <p className="mt-1 text-xs font-semibold text-foreground">
              {event.registration_deadline
                ? new Date(
                    event.registration_deadline
                  ).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })
                : "No deadline"}
            </p>
          </div>

          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-px hover:shadow-brand"
          >
            View Event
            <ArrowRight size={14} aria-hidden="true" />
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
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground">
        {icon}
      </span>

      <span className="truncate">{text}</span>
    </div>
  );
}
