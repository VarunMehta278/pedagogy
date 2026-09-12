"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  ScanLine,
  UserCheck,
  Users,
} from "lucide-react";

import { fetchCurrentUser, guardRole, type AuthUser } from "@/lib/auth";

import VolunteerNavigation from "@/components/layout/VolunteerNavigation";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

type EventStatus =
  | "draft"
  | "published"
  | "ongoing"
  | "completed"
  | "cancelled";

type VolunteerEvent = {
  id: string;
  title: string;
  category: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue: string;
  status: EventStatus;
  image_url?: string | null;
  registered_count?: number;
  attended_count?: number;
};

function formatDate(date?: string | null) {
  if (!date) return "Date TBA";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(time?: string | null) {
  if (!time) return null;

  const [hours, minutes] = time.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTimeRange(event: VolunteerEvent) {
  const start = formatTime(event.start_time);
  const end = formatTime(event.end_time);

  if (start && end) {
    return `${start} – ${end}`;
  }

  return start || "Time TBA";
}

export default function VolunteerDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<VolunteerEvent[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const currentUser = await fetchCurrentUser();
      const redirectPath = guardRole(currentUser, ["volunteer"], pathname);

      if (redirectPath) {
        router.replace(redirectPath);
        return;
      }

      setUser(currentUser);

      const response = await fetch(`${API_URL}/volunteer/events`, {
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message || "Unable to load your assigned events"
        );
      }

      setEvents(data.events || []);
    } catch (err) {
      console.error("Volunteer dashboard error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your assigned events"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const totalRegistered = events.reduce(
      (sum, event) => sum + (event.registered_count ?? 0),
      0
    );

    const totalAttended = events.reduce(
      (sum, event) => sum + (event.attended_count ?? 0),
      0
    );

    return {
      assigned: events.length,
      totalRegistered,
      totalAttended,
    };
  }, [events]);

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) =>
        new Date(`${a.event_date}T00:00:00`).getTime() -
        new Date(`${b.event_date}T00:00:00`).getTime()
    );
  }, [events]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <VolunteerNavigation />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="space-y-8">
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-9 w-72" />
              <SkeletonText lines={2} className="max-w-xl" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-28 rounded-2xl" />
              ))}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-56 rounded-2xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <VolunteerNavigation />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* ERROR */}

        {error && (
          <Alert
            tone="destructive"
            title="Something went wrong"
            className="mb-8"
            action={
              <Button size="sm" variant="outline" onClick={loadDashboard}>
                Try again
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* HERO */}

        <FadeIn>
          <section className="mb-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Volunteer Workspace
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome back
              {user.name ? `, ${user.name.split(" ")[0]}` : ""}.
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Here are the events you&apos;ve been assigned to. Open an
              event to scan registration QR codes or look up a
              participant at the door.
            </p>
          </section>
        </FadeIn>

        {/* STATS */}

        <Stagger className="mb-10 grid gap-4 sm:grid-cols-3">
          <StaggerItem>
            <StatCard
              label="Assigned events"
              value={stats.assigned}
              icon={CalendarDays}
              tone="brand"
            />
          </StaggerItem>

          <StaggerItem>
            <StatCard
              label="Total registered"
              value={stats.totalRegistered}
              icon={Users}
              tone="info"
            />
          </StaggerItem>

          <StaggerItem>
            <StatCard
              label="Total checked in"
              value={stats.totalAttended}
              icon={UserCheck}
              tone="success"
            />
          </StaggerItem>
        </Stagger>

        {/* EVENTS */}

        <section>
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Schedule
            </p>

            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              Your assigned events
            </h2>
          </div>

          {sortedEvents.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No events assigned"
              description="You haven't been assigned to any events yet. Check back once an organizer adds you to an event."
            />
          ) : (
            <Stagger className="grid gap-5 md:grid-cols-2">
              {sortedEvents.map((event) => (
                <StaggerItem key={event.id}>
                  <VolunteerEventCard event={event} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>
      </main>
    </div>
  );
}

/* ---------------------------------- */
/* EVENT CARD */
/* ---------------------------------- */

function VolunteerEventCard({ event }: { event: VolunteerEvent }) {
  const registered = event.registered_count ?? 0;
  const attended = event.attended_count ?? 0;

  const percentage =
    registered > 0
      ? Math.min(Math.round((attended / registered) * 100), 100)
      : 0;

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {event.category}
        </span>

        <StatusBadge status={event.status} size="sm" />
      </div>

      <h3 className="mt-3 line-clamp-2 text-base font-semibold tracking-tight">
        {event.title}
      </h3>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={13} aria-hidden="true" />
          {formatDate(event.event_date)}
        </span>

        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={13} aria-hidden="true" />
          {getTimeRange(event)}
        </span>

        <span className="inline-flex items-center gap-1.5">
          <MapPin size={13} aria-hidden="true" />
          {event.venue}
        </span>
      </div>

      {/* CHECK-IN PROGRESS */}

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <UserCheck size={13} aria-hidden="true" />
            Checked in
          </span>

          <span className="tabular text-[11px] font-semibold text-foreground">
            {attended} / {registered}
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full bg-success transition-all duration-300"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <Link href={`/volunteer/events/${event.id}`} className="mt-5">
        <Button variant="default" block>
          <ScanLine size={16} aria-hidden="true" />
          Open check-in
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </Link>
    </div>
  );
}
