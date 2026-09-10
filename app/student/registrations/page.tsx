"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  LogOut,
  MapPin,
  QrCode,
  Ticket,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  loginPathFor,
} from "@/lib/auth";

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

function statusConfig(status: Registration["status"]) {
  switch (status) {
    case "registered":
      return {
        label: "Registered",
        icon: CheckCircle2,
        className:
          "bg-neutral-100 text-neutral-800 border-neutral-200",
      };

    case "attended":
      return {
        label: "Attended",
        icon: CheckCircle2,
        className:
          "bg-neutral-900 text-white border-neutral-900",
      };

    case "completed":
      return {
        label: "Completed",
        icon: CheckCircle2,
        className:
          "bg-neutral-900 text-white border-neutral-900",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        icon: XCircle,
        className:
          "bg-neutral-100 text-neutral-500 border-neutral-200",
      };

    default:
      return {
        label: status,
        icon: Ticket,
        className:
          "bg-neutral-100 text-neutral-700 border-neutral-200",
      };
  }
}

export default function MyRegistrationsPage() {
  const router = useRouter();

  const [registrations, setRegistrations] = useState<
    Registration[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
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

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-950">
      {/* Navigation */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              href="/student/dashboard"
              className="text-xl font-bold tracking-tight"
            >
              Pedagogy
            </Link>

            <nav className="hidden items-center gap-6 md:flex">
              <Link
                href="/student/dashboard"
                className="text-sm text-neutral-500 transition hover:text-black"
              >
                Dashboard
              </Link>

              <Link
                href="/events"
                className="text-sm text-neutral-500 transition hover:text-black"
              >
                Discover Events
              </Link>

              <Link
                href="/student/registrations"
                className="text-sm font-medium text-black"
              >
                My Registrations
              </Link>

              <Link
                href="/student/certificates"
                className="text-sm text-neutral-500 transition hover:text-black"
              >
                Certificates
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/student/profile"
              aria-label="Profile"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 transition hover:bg-neutral-100"
            >
              <UserRound className="h-4 w-4" />
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-black disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}

              <span className="hidden sm:inline">
                Logout
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8">
          <Link
            href="/student/dashboard"
            className="mb-5 inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-neutral-400">
              Student Portal
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              My Registrations
            </h1>

            <p className="mt-2 max-w-2xl text-neutral-500">
              View your registered events, access your
              registration QR codes, and keep track of
              your participation.
            </p>
          </div>
        </div>

        {/* Stats */}
        {!loading && !error && (
          <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-sm text-neutral-500">
                Total Registrations
              </p>

              <p className="mt-2 text-3xl font-bold">
                {registrations.length}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-sm text-neutral-500">
                Upcoming Events
              </p>

              <p className="mt-2 text-3xl font-bold">
                {upcomingRegistrations.length}
              </p>
            </div>

            <div className="col-span-2 rounded-2xl border border-neutral-200 bg-white p-5 md:col-span-1">
              <p className="text-sm text-neutral-500">
                Attended
              </p>

              <p className="mt-2 text-3xl font-bold">
                {
                  registrations.filter(
                    (registration) =>
                      registration.status ===
                        "attended" ||
                      registration.status ===
                        "completed"
                  ).length
                }
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex min-h-[350px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading your registrations...
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center">
            <h2 className="text-lg font-semibold">
              Something went wrong
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              {error}
            </p>

            <button
              onClick={loadRegistrations}
              className="mt-5 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          registrations.length === 0 && (
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
                <Ticket className="h-6 w-6 text-neutral-500" />
              </div>

              <h2 className="mt-5 text-xl font-semibold">
                No registrations yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
                You haven't registered for any events
                yet. Explore upcoming technical events
                and register to participate.
              </p>

              <Link
                href="/events"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Explore Events
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          )}

        {/* Upcoming */}
        {!loading &&
          !error &&
          upcomingRegistrations.length > 0 && (
            <section>
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Upcoming Events
                  </h2>

                  <p className="mt-1 text-sm text-neutral-500">
                    Keep these QR codes ready for event
                    verification.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
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
                <h2 className="text-xl font-semibold">
                  Registration History
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Your previous and completed event
                  registrations.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
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
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>
            © {new Date().getFullYear()} Pedagogy
          </p>

          <p>
            Technical Event Management System
          </p>
        </div>
      </footer>
    </div>
  );
}

function RegistrationCard({
  registration,
  compact = false,
}: {
  registration: Registration;
  compact?: boolean;
}) {
  const event = getEvent(registration.events);

  if (!event) {
    return (
      <div className="rounded-2xl border border-neutral-200 p-6">
        <p className="text-sm text-neutral-500">
          Event information is unavailable.
        </p>
      </div>
    );
  }

  const status = statusConfig(registration.status);
  const StatusIcon = status.icon;

  const startTime = formatTime(event.start_time);
  const endTime = formatTime(event.end_time);

  return (
    <article className="overflow-hidden rounded-3xl border border-neutral-200 bg-white transition hover:border-neutral-300">
      <div className="flex flex-col md:flex-row">
        {/* Event Image */}
        {event.image_url ? (
          <div className="h-52 w-full shrink-0 overflow-hidden bg-neutral-100 md:h-auto md:w-48">
            <img
              src={event.image_url}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-32 w-full shrink-0 items-center justify-center bg-neutral-100 md:h-auto md:w-48">
            <CalendarDays className="h-8 w-8 text-neutral-400" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="inline-flex rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600">
                {event.category}
              </span>

              <h3 className="mt-3 text-xl font-semibold tracking-tight">
                {event.title}
              </h3>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {status.label}
            </span>
          </div>

          <div className="mt-5 grid gap-3 text-sm text-neutral-500 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span>
                {formatDate(event.event_date)}
              </span>
            </div>

            {startTime && (
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 shrink-0" />

                <span>
                  {startTime}
                  {endTime ? ` – ${endTime}` : ""}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 sm:col-span-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{event.venue}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/events/${event.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium transition hover:bg-neutral-50"
            >
              View Event
              <ExternalLink className="h-4 w-4" />
            </Link>

            {!compact &&
              registration.qr_code &&
              registration.status !==
                "cancelled" && (
                <QrCodeModal
                  registration={registration}
                  event={event}
                />
              )}
          </div>

          <div className="mt-5 border-t border-neutral-100 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
              <span>
                Registration ID:{" "}
                <span className="font-mono text-neutral-600">
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
        </div>
      </div>
    </article>
  );
}

function QrCodeModal({
  registration,
  event,
}: {
  registration: Registration;
  event: Event;
}) {
  const [open, setOpen] = useState(false);

  if (!registration.qr_code) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        <QrCode className="h-4 w-4" />
        Show QR Code
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100">
                <QrCode className="h-5 w-5" />
              </div>

              <h2 className="mt-4 text-xl font-semibold">
                Event QR Code
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Show this QR code to the event volunteer
                for attendance verification.
              </p>

              <div className="mx-auto mt-6 w-fit rounded-2xl border border-neutral-200 bg-white p-4">
                <img
                  src={registration.qr_code}
                  alt={`QR code for ${event.title}`}
                  className="h-64 w-64"
                />
              </div>

              <div className="mt-5 rounded-xl bg-neutral-50 p-4">
                <p className="text-xs uppercase tracking-wider text-neutral-400">
                  Registration Code
                </p>

                <p className="mt-1 font-mono text-lg font-semibold">
                  {registration.registration_code}
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="mt-5 w-full rounded-lg border border-neutral-200 px-4 py-3 text-sm font-medium transition hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}