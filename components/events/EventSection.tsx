"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EventCard from "./EventCard";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

interface Event {
  id: string;
  title: string;
  category: string;
  event_date: string;
  venue: string;
  participant_limit: number | null;
  image_url: string | null;
}

export default function EventsSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(
          `${API_URL}/events`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch events");
        }

        setEvents(data.events || []);
      } catch (error) {
        console.error("Failed to fetch events:", error);
        setError("Unable to load events right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Upcoming events
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Discover what&apos;s happening
            </h2>

            <p className="mt-4 max-w-xl text-muted-foreground">
              Explore technical events, competitions, workshops, and
              hackathons happening on your campus.
            </p>
          </div>

          <Link
            href="/events"
            className="text-sm font-semibold text-primary hover:underline"
          >
            View all events →
          </Link>
        </div>

        {loading && (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-2xl border bg-muted"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-12 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="mt-12 rounded-2xl border bg-card p-10 text-center">
            <h3 className="text-lg font-semibold">
              No upcoming events
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Check back soon for new technical events.
            </p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.slice(0, 3).map((event) => (
              <EventCard
                key={event.id}
                id={event.id}
                title={event.title}
                category={event.category}
                date={new Date(event.event_date).toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }
                )}
                venue={event.venue}
                participants={event.participant_limit ?? 0}
                image={
                  event.image_url ||
                  "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=900&q=80"
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}