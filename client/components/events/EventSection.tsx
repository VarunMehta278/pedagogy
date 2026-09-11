"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";

import EventCard from "./EventCard";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { RevealOnScroll, Stagger, StaggerItem } from "@/components/motion/reveal";

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
    <section className="bg-muted/30 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <RevealOnScroll className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
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
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            View all events
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </RevealOnScroll>

        {loading && <SkeletonGrid count={3} className="mt-12" />}

        {!loading && error && (
          <Alert tone="destructive" title="Couldn't load events" className="mt-12">
            {error}
          </Alert>
        )}

        {!loading && !error && events.length === 0 && (
          <EmptyState
            icon={CalendarClock}
            title="No upcoming events"
            description="Check back soon for new technical events."
            className="mt-12"
          />
        )}

        {!loading && !error && events.length > 0 && (
          <Stagger onScroll className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.slice(0, 3).map((event) => (
              <StaggerItem key={event.id}>
                <EventCard
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
              </StaggerItem>
            ))}
          </Stagger>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="mt-8 flex justify-center sm:hidden">
            <Link href="/events">
              <Button variant="outline">
                View all events
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
