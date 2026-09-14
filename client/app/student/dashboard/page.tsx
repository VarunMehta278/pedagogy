"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Award,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  QrCode,
  Trophy,
  UserRound,
} from "lucide-react";

import {
  clearAuthBounce,
  clearSession,
  dashboardPathForRole,
  getSession,
  loginPathFor,
} from "@/lib/auth";

import StudentNavigation from "@/components/layout/StudentNavigation";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
  year?: number | null;
};

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
  status: string;
  registered_at?: string;
  event_id: string;
  qr_code?: string | null;
  events?: Event | Event[] | null;
};

/*
 * Supabase returns a joined relation either as an
 * object or as a single-item array depending on the
 * query shape, so it is always normalised before use.
 */
function getEvent(
  events: Registration["events"]
): Event | null {
  if (!events) return null;

  return Array.isArray(events)
    ? events[0] || null
    : events;
}

type Certificate = {
  id: string;
  certificate_code: string;
  certificate_type: "winner" | "participation";
  title: string;
  issued_at: string;
  event?: {
    id: string;
    title: string;
    event_date: string;
    venue: string;
  } | null;
  result?: {
    position?: number | null;
    score?: number | null;
  } | null;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export default function StudentDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [registrations, setRegistrations] =
    useState<Registration[]>([]);
  const [certificates, setCertificates] =
    useState<Certificate[]>([]);
  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        session,
        registrationsResponse,
        certificatesResponse,
        notificationsResponse,
      ] = await Promise.all([
        /*
         * Shared with every other page and component, so
         * this usually resolves from cache with no request
         * at all — and can never disagree with the answer
         * the login page saw a moment ago.
         */
        getSession(),

        fetch(`${API_URL}/registrations/me`, {
          credentials: "include",
          cache: "no-store",
        }),

        fetch(`${API_URL}/certificates/me`, {
          credentials: "include",
          cache: "no-store",
        }),

        fetch(`${API_URL}/notifications/me`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      /*
       * An API that did not answer is not the same thing
       * as a visitor who is signed out. Redirecting to
       * /login on a 502 from a cold instance is what sent
       * this page and the login page bouncing off each
       * other, so it says so and offers a retry instead.
       */
      if (session.state === "unreachable") {
        setError(
          "Could not reach the server. Check your connection and try again."
        );
        return;
      }

      if (session.state === "anonymous") {
        router.replace(
          loginPathFor(
            window.location.pathname
          )
        );
        return;
      }

      const currentUser = session.user;

      /*
       * Faculty and admins are sent to their own
       * dashboard rather than always to the faculty one.
       */
      if (currentUser.role !== "student") {
        router.replace(
          dashboardPathForRole(currentUser.role)
        );
        return;
      }

      /*
       * We landed somewhere real, so forget any earlier
       * bouncing and let the next visit forward normally.
       */
      clearAuthBounce();

      setUser(currentUser);

      /*
       * Registrations
       */
      if (registrationsResponse.ok) {
        const registrationData =
          await registrationsResponse.json();

        setRegistrations(
          registrationData.registrations ||
            registrationData.data ||
            []
        );
      }

      /*
       * Certificates
       */
      if (certificatesResponse.ok) {
        const certificateData =
          await certificatesResponse.json();

        setCertificates(
          certificateData.certificates ||
            certificateData.data ||
            []
        );
      }

      /*
       * Notifications
       */
      if (notificationsResponse.ok) {
        const notificationData =
          await notificationsResponse.json();

        setNotifications(
          notificationData.notifications ||
            notificationData.data ||
            []
        );
      }
    } catch (error) {
      console.error(
        "Dashboard loading error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      /* Drop the shared session so /login does not forward back in. */
      clearSession();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    } finally {
      setLoggingOut(false);
    }
  };

  /*
   * Upcoming registered events
   */
  const upcomingRegistrations = useMemo(() => {
    const today = new Date();

    return registrations
      .filter((registration) => {
        const event = getEvent(
          registration.events
        );

        return (
          registration.status !== "cancelled" &&
          Boolean(event?.event_date) &&
          new Date(
            `${event?.event_date}T23:59:59`
          ) >= today
        );
      })
      .sort((a, b) => {
        const dateA =
          getEvent(a.events)?.event_date || "";
        const dateB =
          getEvent(b.events)?.event_date || "";

        return dateA.localeCompare(dateB);
      })
      .slice(0, 3);
  }, [registrations]);

  /*
   * Recent notifications
   */
  const recentNotifications =
    notifications.slice(0, 4);

  /*
   * Unread notification count
   */
  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const firstName = user?.name?.split(" ")[0] || "there";

  if (error) {
    return (
      <main className="min-h-screen bg-background">
        <StudentNavigation />

        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="text-xl font-semibold">
            Could not load your dashboard
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {error}
          </p>

          <Button
            className="mt-6"
            onClick={() => loadDashboard()}
          >
            Try again
          </Button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <StudentNavigation />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
          <div className="rounded-3xl border border-border bg-card p-8 md:p-10">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-4 h-9 w-64" />
            <SkeletonText lines={2} className="mt-4 max-w-xl" />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-14" />
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <Skeleton className="h-5 w-40" />
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-3xl border border-border bg-card p-5"
                >
                  <SkeletonText lines={3} />
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <SkeletonText lines={4} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      {/* ------------------------------------------------
          Navigation
      ------------------------------------------------ */}

      <StudentNavigation />

      {/* ------------------------------------------------
          Dashboard
      ------------------------------------------------ */}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
        {/* Welcome */}

        <FadeIn>
          <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 md:p-10">
            <div className="bg-aurora pointer-events-none absolute inset-0" aria-hidden="true" />

            <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                  Student Dashboard
                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Welcome, {firstName}.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Discover technical events, manage your
                  registrations, track your participation,
                  and access your certificates — all from
                  one place.
                </p>
              </div>

              <Button variant="brand" size="lg" asChild className="shrink-0">
                <Link href="/events">
                  Discover Events
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </section>
        </FadeIn>

        {/* ------------------------------------------------
            Stats
        ------------------------------------------------ */}

        <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <Link href="/student/registrations" className="block">
              <StatCard
                icon={CalendarDays}
                label="Registrations"
                value={registrations.length}
                tone="brand"
              />
            </Link>
          </StaggerItem>

          <StaggerItem>
            <Link href="/student/registrations" className="block">
              <StatCard
                icon={Clock3}
                label="Upcoming Events"
                value={upcomingRegistrations.length}
                tone="info"
              />
            </Link>
          </StaggerItem>

          <StaggerItem>
            <Link href="/student/certificates" className="block">
              <StatCard
                icon={Award}
                label="Certificates"
                value={certificates.length}
                tone="violet"
              />
            </Link>
          </StaggerItem>

          <StaggerItem>
            <Link href="/student/notifications" className="block">
              <StatCard
                icon={Bell}
                label="Unread Alerts"
                value={unreadCount}
                tone="warning"
              />
            </Link>
          </StaggerItem>
        </Stagger>

        {/* ------------------------------------------------
            Main Content
        ------------------------------------------------ */}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Upcoming Events */}

          <section>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                  Your Schedule
                </p>

                <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                  Upcoming Events
                </h2>
              </div>

              <Link
                href="/student/registrations"
                className="hidden items-center gap-1 text-sm font-medium text-primary transition hover:underline sm:flex"
              >
                View all
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            {upcomingRegistrations.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming events"
                description="You haven't registered for any upcoming events yet. Explore what's happening and grab your spot."
                action={
                  <Button variant="brand" asChild>
                    <Link href="/events">
                      Browse events
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {upcomingRegistrations.map(
                  (registration) => {
                    const event = getEvent(
                      registration.events
                    );

                    if (!event) {
                      return null;
                    }

                    return (
                      <Link
                        key={registration.id}
                        href={`/events/${event.id}`}
                        className="group block rounded-3xl border border-border bg-card p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                      >
                        <div className="flex gap-5">
                          {/* Event Image */}

                          <div className="hidden h-28 w-36 shrink-0 overflow-hidden rounded-2xl bg-muted sm:block">
                            {event.image_url ? (
                              <img
                                src={event.image_url}
                                alt={event.title}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Trophy className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                              </div>
                            )}
                          </div>

                          {/* Event Details */}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <span className="rounded-full bg-brand-subtle px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-foreground">
                                {event.category}
                              </span>

                              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
                            </div>

                            <h3 className="mt-3 truncate text-lg font-semibold">
                              {event.title}
                            </h3>

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                                {formatDate(
                                  event.event_date
                                )}
                              </span>

                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                                {event.venue}
                              </span>
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-success">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Registered ·{" "}
                              <span className="font-mono">
                                {registration.registration_code}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  }
                )}
              </div>
            )}
          </section>

          {/* Right Column */}

          <div className="space-y-8">
            {/* Profile Card */}

            <section className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-lg font-semibold text-white shadow-brand">
                  {getInitials(user.name)}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate font-semibold">
                    {user.name}
                  </h2>

                  <p className="truncate text-sm text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted p-4">
                  <p className="text-xs text-muted-foreground">
                    Department
                  </p>

                  <p className="mt-1 truncate text-sm font-medium">
                    {user.department ||
                      "Not specified"}
                  </p>
                </div>

                <div className="rounded-2xl bg-muted p-4">
                  <p className="text-xs text-muted-foreground">
                    Year
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {user.year
                      ? `Year ${user.year}`
                      : "Not specified"}
                  </p>
                </div>
              </div>

              <Button variant="outline" block className="mt-4" asChild>
                <Link href="/student/profile">
                  View Profile
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </section>

            {/* Recent Activity */}

            <section className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                    Updates
                  </p>

                  <h2 className="mt-1 text-lg font-semibold tracking-tight">
                    Recent Activity
                  </h2>
                </div>

                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {recentNotifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="mx-auto h-7 w-7 text-muted-foreground/60" aria-hidden="true" />

                  <p className="mt-3 text-sm text-muted-foreground">
                    No notifications yet.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-1">
                  {recentNotifications.map(
                    (notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={
                          notification
                        }
                      />
                    )
                  )}
                </div>
              )}

              <Link
                href="/student/notifications"
                className="mt-5 flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View all notifications
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>
          </div>
        </div>

        {/* ------------------------------------------------
            Quick Actions
        ------------------------------------------------ */}

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Quick Access
            </p>

            <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Everything in one place
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/events"
              icon={Trophy}
              title="Discover Events"
              description="Find hackathons, workshops and competitions."
            />

            <QuickAction
              href="/student/registrations"
              icon={QrCode}
              title="My Registrations"
              description="Access your registration codes and QR codes."
            />

            <QuickAction
              href="/student/certificates"
              icon={Award}
              title="My Certificates"
              description="View and verify your earned certificates."
            />

            <QuickAction
              href="/student/profile"
              icon={UserRound}
              title="My Profile"
              description="Manage your student information."
            />
          </div>
        </section>

        {/* ------------------------------------------------
            Footer
        ------------------------------------------------ */}

        <footer className="mt-16 border-t border-border py-8">
          <div className="flex flex-col justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <p>
              © {new Date().getFullYear()} Pedagogy
            </p>

            <div className="flex gap-5">
              <Link
                href="/events"
                className="transition hover:text-foreground"
              >
                Events
              </Link>

              <Link
                href="/student/certificates"
                className="transition hover:text-foreground"
              >
                Certificates
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="transition hover:text-foreground disabled:opacity-50"
              >
                {loggingOut ? "Logging out…" : "Logout"}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* ========================================================
   QUICK ACTION
======================================================== */

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-subtle text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <h3 className="font-semibold">
          {title}
        </h3>

        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
      </div>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}

/* ========================================================
   NOTIFICATION ITEM
======================================================== */

function NotificationItem({
  notification,
}: {
  notification: Notification;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 transition-colors hover:bg-accent/60",
        !notification.is_read && "bg-brand-subtle/50"
      )}
    >
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {notification.type ===
          "result" ? (
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
          ) : notification.type ===
            "certificate" ? (
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
          ) : notification.type ===
            "registration" ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm",
                !notification.is_read
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground"
              )}
            >
              {notification.title}
            </p>

            {!notification.is_read && (
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            )}
          </div>

          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {notification.message}
          </p>

          <p className="mt-2 text-[10px] text-muted-foreground/80">
            {formatRelativeTime(
              notification.created_at
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ========================================================
   HELPERS
======================================================== */

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(date?: string | null) {
  if (!date) {
    return "Date unavailable";
  }

  try {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function formatRelativeTime(
  dateString: string
) {
  try {
    const date = new Date(dateString);
    const now = new Date();

    const difference =
      now.getTime() -
      date.getTime();

    const minutes = Math.floor(
      difference / 60000
    );

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(
      minutes / 60
    );

    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(
      hours / 24
    );

    if (days < 7) {
      return `${days}d ago`;
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
      }
    );
  } catch {
    return "";
  }
}
