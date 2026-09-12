"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
} from "lucide-react";

import { loginPathFor } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/motion/reveal";
import StudentTeamPanel from "@/components/events/StudentTeamPanel";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

interface Event {
  id: string;
  title: string;
  description: string | null;
  category: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string;
  registration_deadline: string | null;
  participant_limit: number | null;
  rules: string | null;
  image_url: string | null;
  status: string;
  participation_type: "individual" | "team";
  min_team_size: number;
  max_team_size: number;
  organizer?: {
    id: string;
    name: string;
    department: string | null;
  };
}

interface Registration {
  id: string;
  registration_code: string;
  status: string;
  registered_at: string;
  qr_code?: string;
}

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  /*
   * Kept apart from `error`: an event that does not exist
   * is an ordinary outcome with its own screen, not a
   * failure to report.
   */
  const [notFound, setNotFound] = useState(false);

  const [registering, setRegistering] = useState(false);
  const [registration, setRegistration] =
    useState<Registration | null>(null);

  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load event + existing registration
  // --------------------------------------------------

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        setError("");
        setNotFound(false);

        /*
         * Credentials are sent so the organizer of an
         * unpublished event can preview it. Anonymous
         * visitors are unaffected.
         */
        const eventResponse = await fetch(
          `${API_URL}/events/${eventId}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        /*
         * A missing event is not an exception. Throwing
         * here put a red overlay over the page in
         * development for what is really just an empty
         * state.
         */
        if (eventResponse.status === 404) {
          setNotFound(true);

          return;
        }

        let eventData: {
          event?: Event;
          message?: string;
        } | null = null;

        try {
          eventData = await eventResponse.json();
        } catch {
          throw new Error(
            "The server sent a response this page could not read."
          );
        }

        if (!eventResponse.ok) {
          throw new Error(
            eventData?.message || "Failed to load event"
          );
        }

        if (!eventData?.event) {
          setNotFound(true);

          return;
        }

        setEvent(eventData.event);

        // Check whether the logged-in student already registered.
        // If the user isn't logged in, this simply won't block
        // the public event page.
        try {
          const registrationResponse = await fetch(
            `${API_URL}/registrations/me`,
            {
              credentials: "include",
            }
          );

          if (registrationResponse.ok) {
            const registrationData =
              await registrationResponse.json();

            const existingRegistration =
              registrationData.registrations?.find(
                (item: Registration & { event: Event }) =>
                  item.event?.id === eventId
              );

            if (existingRegistration) {
              setRegistration(existingRegistration);
            }
          }
        } catch {
          // User may simply not be logged in.
          // Event details should still remain accessible.
        }
      } catch (error) {
        /*
         * fetch rejects with a TypeError when it cannot
         * reach the host at all, which is a different
         * problem from the API answering with an error,
         * and worth saying plainly.
         */
        const message =
          error instanceof TypeError
            ? "Could not reach the server. Check that the API is running on " +
              API_URL.replace(/\/api$/, "") +
              "."
            : error instanceof Error
            ? error.message
            : "Unable to load event";

        console.warn("Event page load failed:", error);

        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadPage();
    }
  }, [eventId]);

  // --------------------------------------------------
  // Register for event
  // --------------------------------------------------

  const handleRegister = async () => {
    try {
      setRegistering(true);
      setError("");

      const response = await fetch(
        `${API_URL}/registrations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            event_id: eventId,
          }),
        }
      );

      /*
       * A signed-out visitor is sent to login and
       * returned to this event afterwards, rather than
       * being shown an "authentication required" error
       * with no way forward.
       */
      if (response.status === 401) {
        router.push(
          loginPathFor(`/events/${eventId}`)
        );

        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed"
        );
      }

      setRegistration(data.registration);
    } catch (error) {
      console.error("Registration error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Registration failed"
      );
    } finally {
      setRegistering(false);
    }
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <header className="border-b border-border bg-background">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <span className="text-xl font-bold text-foreground">Pedagogy</span>
            <span className="text-sm font-medium text-muted-foreground">All Events</span>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-6 py-10">
          <Skeleton className="mb-8 h-4 w-32" />

          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <Skeleton className="h-64 w-full rounded-none md:h-80" />

            <div className="space-y-6 p-6 md:p-10">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-9 w-2/3" />
              <SkeletonText lines={2} />

              <div className="grid gap-4 pt-4 md:grid-cols-2">
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
              </div>

              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // Event does not exist
  // --------------------------------------------------

  if (notFound) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
          <div className="w-full max-w-md">
            <EmptyState
              icon={CalendarDays}
              title="Event not found"
              description="This event may have been removed, or it is not published yet. Unpublished events are only visible to the person who created them."
              action={
                <Link href="/events">
                  <Button variant="brand">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Browse all events
                  </Button>
                </Link>
              }
            />
          </div>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // Event error
  // --------------------------------------------------

  if (error && !event) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-foreground">
              Unable to load event
            </h1>

            <Alert tone="destructive" className="mt-4 text-left">
              {error}
            </Alert>

            <Link href="/events">
              <Button variant="brand" className="mt-6">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to Events
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!event) {
    return null;
  }

  // --------------------------------------------------
  // Formatting
  // --------------------------------------------------

  const formattedDate = new Date(
    event.event_date
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedStartTime = event.start_time
    ? event.start_time.slice(0, 5)
    : null;

  const formattedEndTime = event.end_time
    ? event.end_time.slice(0, 5)
    : null;

  /*
   * Registration is only open on a published event whose
   * deadline has not passed — the same rule the API
   * enforces. Showing an enabled button for an event that
   * cannot accept anyone just moves the rejection to
   * after the click.
   */
  const deadlinePassed = event.registration_deadline
    ? new Date(event.registration_deadline).getTime() <
      Date.now()
    : false;

  const registrationOpen =
    event.status === "published" && !deadlinePassed;

  const statusNotice =
    event.status === "draft"
      ? "This event is still a draft. Only you can see this page."
      : event.status === "ongoing"
      ? "This event is happening now. Registration has closed."
      : event.status === "completed"
      ? "This event has finished."
      : event.status === "cancelled"
      ? "This event was cancelled."
      : null;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-background">

      {/* Navbar */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-foreground"
          >
            Pedagogy
          </Link>

          <Link
            href="/events"
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            All Events
          </Link>

        </div>
      </header>

      {/* Main */}
      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* Back */}
        <Link
          href="/events"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Events
        </Link>

        {/* Event */}
        <FadeIn>
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">

            {/* Image */}
            {event.image_url && (
              <div className="h-64 w-full overflow-hidden bg-muted md:h-80">
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="p-6 md:p-10">

              {/* Status notice */}
              {statusNotice && (
                <Alert tone="warning" className="mb-6">
                  {statusNotice}
                </Alert>
              )}

              {/* Category + status */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-full bg-brand-subtle px-3 py-1 text-sm font-medium text-accent-foreground">
                  {event.category}
                </div>

                <StatusBadge status={event.status} />
              </div>

              {/* Title */}
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {event.title}
              </h1>

              {/* Description */}
              {event.description && (
                <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                  {event.description}
                </p>
              )}

              {/* Information */}
              <div className="mt-8 grid gap-4 md:grid-cols-2">

                <InfoTile
                  icon={<CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />}
                  label="Date"
                  value={formattedDate}
                />

                <InfoTile
                  icon={<Clock className="h-5 w-5 text-primary" aria-hidden="true" />}
                  label="Time"
                  value={
                    formattedStartTime
                      ? `${formattedStartTime}${
                          formattedEndTime ? ` - ${formattedEndTime}` : ""
                        }`
                      : "Time to be announced"
                  }
                />

                <InfoTile
                  icon={<MapPin className="h-5 w-5 text-primary" aria-hidden="true" />}
                  label="Venue"
                  value={event.venue}
                />

                <InfoTile
                  icon={<Users className="h-5 w-5 text-primary" aria-hidden="true" />}
                  label="Participant Limit"
                  value={
                    event.participant_limit
                      ? `${event.participant_limit} participants`
                      : "No limit"
                  }
                />

              </div>

              {/* Rules */}
              {event.rules && (
                <section className="mt-10">
                  <h2 className="text-xl font-bold text-foreground">
                    Rules &amp; Guidelines
                  </h2>

                  <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-5">
                    <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                      {event.rules}
                    </p>
                  </div>
                </section>
              )}

              {/* Organizer */}
              {event.organizer && (
                <section className="mt-8">
                  <h2 className="text-xl font-bold text-foreground">
                    Organized By
                  </h2>

                  <div className="mt-4 rounded-2xl border border-border p-5">
                    <p className="font-semibold text-foreground">
                      {event.organizer.name}
                    </p>

                    {event.organizer.department && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {event.organizer.department}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Registration */}
              <section className="mt-10 border-t border-border pt-8">

                {error && (
                  <Alert tone="destructive" className="mb-5">
                    {error}
                  </Alert>
                )}

                {registration ? (
                  <div className="rounded-2xl border border-border bg-brand-subtle p-6 md:p-8">

                    <div className="text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
                        <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                      </div>

                      <h2 className="mt-4 text-2xl font-bold text-foreground">
                        Registration Successful
                      </h2>

                      <p className="mt-2 text-sm text-muted-foreground">
                        You are registered for{" "}
                        <span className="font-medium text-foreground">
                          {event.title}
                        </span>
                        .
                      </p>
                    </div>

                    {/* Registration ID */}
                    <div className="mx-auto mt-6 max-w-md rounded-xl border border-border bg-card p-5 text-center">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Registration ID
                      </p>

                      <p className="mt-2 font-mono text-2xl font-bold tracking-wider text-foreground">
                        {registration.registration_code}
                      </p>
                    </div>

                    {/* QR */}
                    {registration.qr_code && (
                      <div className="mt-8 flex flex-col items-center">
                        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                          <img
                            src={registration.qr_code}
                            alt="Event registration QR code"
                            className="h-56 w-56"
                          />
                        </div>

                        <p className="mt-4 max-w-md text-center text-sm text-muted-foreground">
                          Show this QR code at the event entrance
                          for attendance verification.
                        </p>
                      </div>
                    )}

                    {/* Dashboard */}
                    <div className="mt-8 flex justify-center">
                      <Link href="/dashboard">
                        <Button variant="brand">Go to Dashboard</Button>
                      </Link>
                    </div>

                  </div>
                ) : registrationOpen ? (
                  <div>
                    {event.registration_deadline && (
                      <p className="mb-4 text-center text-sm text-muted-foreground">
                        Registration closes on{" "}
                        <span className="font-medium text-foreground">
                          {new Date(
                            event.registration_deadline
                          ).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </p>
                    )}

                    <Button
                      onClick={handleRegister}
                      loading={registering}
                      loadingText="Registering…"
                      variant="brand"
                      size="lg"
                      block
                    >
                      Register Now
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/40 p-5 text-center">
                    <p className="text-sm font-medium text-foreground">
                      Registration is closed
                    </p>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {deadlinePassed && event.status === "published"
                        ? "The registration deadline for this event has passed."
                        : statusNotice ||
                          "This event is not accepting registrations."}
                    </p>

                    <Link
                      href="/events"
                      className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      Find another event
                    </Link>
                  </div>
                )}

              </section>

              {/* Team */}
              {event.participation_type === "team" && (
                <section className="mt-10 border-t border-border pt-8">
                  <StudentTeamPanel
                    eventId={eventId}
                    registered={!!registration}
                    minTeamSize={event.min_team_size}
                    maxTeamSize={event.max_team_size}
                  />
                </section>
              )}

            </div>
          </div>
        </FadeIn>
      </div>
    </main>
  );
}

/* -------------------------------- */
/* Info tile */
/* -------------------------------- */

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-brand-subtle p-3">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-medium text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
