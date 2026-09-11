"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  ExternalLink,
  MapPin,
  QrCode,
  Ticket,
  X,
} from "lucide-react";

import {
  loginPathFor,
} from "@/lib/auth";

import StudentNavigation from "@/components/layout/StudentNavigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

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
  status: string;
};

type Registration = {
  id: string;
  registration_code: string;
  status: "registered" | "cancelled" | "attended" | "completed";
  registered_at: string;
  created_at?: string;
  event_id: string;
  qr_code?: string;
  events?: Event | Event[] | null;
};

function getEvent(
  events: Registration["events"]
): Event | null {
  if (!events) return null;

  if (Array.isArray(events)) {
    return events[0] || null;
  }

  return events;
}

function formatDate(date?: string | null) {
  if (!date) return "Date unavailable";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(time?: string | null) {
  if (!time) return null;

  const [hours, minutes] = time.split(":");

  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isUpcoming(event?: Event | null) {
  if (!event?.event_date) return false;

  const eventDate = new Date(`${event.event_date}T23:59:59`);

  return eventDate >= new Date();
}

export default function MyRegistrationsPage() {
  const router = useRouter();

  const [registrations, setRegistrations] = useState<
    Registration[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/registrations/me`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
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

      if (!response.ok) {
        throw new Error(
          "Failed to load your registrations"
        );
      }

      const data = await response.json();

      setRegistrations(
        data.registrations ||
          data.data ||
          []
      );
    } catch (err) {
      console.error(
        "Load registrations error:",
        err
      );

      setError(
        "We couldn't load your registrations. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  const upcomingRegistrations = useMemo(
    () =>
      registrations.filter((registration) => {
        const event = getEvent(registration.events);

        return (
          event &&
          isUpcoming(event) &&
          registration.status !== "cancelled"
        );
      }),
    [registrations]
  );

  const pastRegistrations = useMemo(
    () =>
      registrations.filter((registration) => {
        const event = getEvent(registration.events);

        return (
          !isUpcoming(event) ||
          registration.status === "cancelled"
        );
      }),
    [registrations]
  );

  const attendedCount = useMemo(
    () =>
      registrations.filter(
        (registration) =>
          registration.status === "attended" ||
          registration.status === "completed"
      ).length,
    [registrations]
  );

  return (
    <main className="min-h-screen bg-background">
      <StudentNavigation />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
        <FadeIn>
          <PageHeader
            eyebrow="Student Portal"
            title="My Registrations"
            description="View your registered events, access your registration QR codes, and keep track of your participation."
          />
        </FadeIn>

        {/* Stats */}
        {!loading && !error && (
          <Stagger className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
            <StaggerItem>
              <StatCard
                icon={Ticket}
                label="Total Registrations"
                value={registrations.length}
                tone="brand"
              />
            </StaggerItem>

            <StaggerItem>
              <StatCard
                icon={Clock3}
                label="Upcoming Events"
                value={upcomingRegistrations.length}
                tone="info"
              />
            </StaggerItem>

            <StaggerItem className="col-span-2 md:col-span-1">
              <StatCard
                icon={QrCode}
                label="Attended"
                value={attendedCount}
                tone="success"
              />
            </StaggerItem>
          </Stagger>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-10 space-y-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 sm:flex-row"
              >
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-20 rounded-full" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3.5 w-1/2" />
                </div>
                <Skeleton className="h-32 w-full shrink-0 rounded-2xl sm:w-32" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <Alert tone="destructive" title="Something went wrong" className="mt-10">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={loadRegistrations}
            >
              Try again
            </Button>
          </Alert>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          registrations.length === 0 && (
            <EmptyState
              className="mt-10"
              icon={Ticket}
              title="No registrations yet"
              description="You haven't registered for any events yet. Explore upcoming technical events and register to participate."
              action={
                <Button variant="brand" asChild>
                  <Link href="/events">
                    Explore events
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />
          )}

        {/* Upcoming */}
        {!loading &&
          !error &&
          upcomingRegistrations.length > 0 && (
            <section className="mt-10">
              <div className="mb-5">
                <h2 className="text-lg font-semibold tracking-tight">
                  Upcoming Events
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Keep these QR codes ready for event verification.
                </p>
              </div>

              <div className="space-y-5">
                {upcomingRegistrations.map(
                  (registration) => (
                    <RegistrationCard
                      key={registration.id}
                      registration={registration}
                    />
                  )
                )}
              </div>
            </section>
          )}

        {/* Past */}
        {!loading &&
          !error &&
          pastRegistrations.length > 0 && (
            <section className="mt-12">
              <div className="mb-5">
                <h2 className="text-lg font-semibold tracking-tight">
                  Registration History
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Your previous and completed event registrations.
                </p>
              </div>

              <div className="space-y-3">
                {pastRegistrations.map(
                  (registration) => (
                    <RegistrationCard
                      key={registration.id}
                      registration={registration}
                      compact
                    />
                  )
                )}
              </div>
            </section>
          )}
      </div>
    </main>
  );
}

/* ========================================================
   REGISTRATION CARD
======================================================== */

function RegistrationCard({
  registration,
  compact = false,
}: {
  registration: Registration;
  compact?: boolean;
}) {
  const event = getEvent(registration.events);
  const [qrOpen, setQrOpen] = useState(false);

  if (!event) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Event information is unavailable.
        </p>
      </div>
    );
  }

  const startTime = formatTime(event.start_time);
  const endTime = formatTime(event.end_time);

  const showQr =
    !compact &&
    Boolean(registration.qr_code) &&
    registration.status !== "cancelled";

  return (
    <>
      <article
        className={cn(
          "overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all duration-300 ease-out",
          !compact && "hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
        )}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Content */}
          <div className={cn("min-w-0 flex-1 p-5", !compact && "sm:p-6")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex rounded-full bg-brand-subtle px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-foreground">
                  {event.category}
                </span>

                <h3 className="mt-3 truncate text-lg font-semibold tracking-tight">
                  {event.title}
                </h3>
              </div>

              <StatusBadge status={registration.status} kind="registration" />
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDate(event.event_date)}
              </span>

              {startTime && (
                <span className="flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {startTime}
                  {endTime ? ` – ${endTime}` : ""}
                </span>
              )}

              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {event.venue}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link
                href={`/events/${event.id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:underline"
              >
                View event
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <span>
                Code ·{" "}
                <span className="font-mono text-foreground">
                  {registration.registration_code}
                </span>
              </span>

              <span>
                Registered{" "}
                {new Date(
                  registration.registered_at
                ).toLocaleDateString("en-IN")}
              </span>
            </div>
          </div>

          {/* QR panel — the reason students come here, so it gets real
              estate and is tappable to a full-size view. */}
          {showQr && (
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="flex shrink-0 flex-col items-center justify-center gap-2.5 border-t border-border bg-brand-subtle/40 p-5 transition-colors hover:bg-brand-subtle/70 sm:w-44 sm:border-l sm:border-t-0"
            >
              <div className="rounded-2xl bg-gradient-brand p-[3px] shadow-brand">
                <div className="rounded-[13px] bg-card p-2">
                  <img
                    src={registration.qr_code}
                    alt={`QR code for ${event.title}`}
                    className="h-28 w-28 sm:h-32 sm:w-32"
                  />
                </div>
              </div>

              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                <QrCode className="h-3 w-3" aria-hidden="true" />
                Tap to enlarge
              </span>
            </button>
          )}
        </div>
      </article>

      {showQr && qrOpen && (
        <QrCodeModal
          registration={registration}
          event={event}
          onClose={() => setQrOpen(false)}
        />
      )}
    </>
  );
}

/* ========================================================
   QR CODE MODAL
======================================================== */

function QrCodeModal({
  registration,
  event,
  onClose,
}: {
  registration: Registration;
  event: Event;
  onClose: () => void;
}) {
  if (!registration.qr_code) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-subtle text-primary">
            <QrCode className="h-5 w-5" aria-hidden="true" />
          </div>

          <h2 className="mt-4 text-lg font-semibold tracking-tight">
            Event QR Code
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Show this to the event volunteer for attendance verification.
          </p>

          <div className="mx-auto mt-6 w-fit rounded-2xl bg-gradient-brand p-[3px] shadow-brand-lg">
            <div className="rounded-[13px] bg-card p-4">
              <img
                src={registration.qr_code}
                alt={`QR code for ${event.title}`}
                className="h-64 w-64 max-w-full"
              />
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-muted p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Registration Code
            </p>

            <p className="mt-1 font-mono text-lg font-semibold tracking-tight">
              {registration.registration_code}
            </p>
          </div>

          <Button
            variant="outline"
            block
            className="mt-5"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
