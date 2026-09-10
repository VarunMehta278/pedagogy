"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileBadge,
  Loader2,
  LogOut,
  MapPin,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";

import {
  dashboardPathForRole,
  loginPathFor,
} from "@/lib/auth";

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

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const [
        userResponse,
        registrationsResponse,
        certificatesResponse,
        notificationsResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/users/me`, {
          credentials: "include",
        }),

        fetch(`${API_URL}/registrations/me`, {
          credentials: "include",
        }),

        fetch(`${API_URL}/certificates/me`, {
          credentials: "include",
        }),

        fetch(`${API_URL}/notifications/me`, {
          credentials: "include",
        }),
      ]);

      /*
       * User
       */
      if (!userResponse.ok) {
        router.replace(
          loginPathFor(
            window.location.pathname
          )
        );
        return;
      }

      const userData = await userResponse.json();

      const currentUser =
        userData.user ||
        userData.data ||
        userData;

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

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-black">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />

            <p className="text-sm text-neutral-500">
              Loading your dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-white text-black">
      {/* ------------------------------------------------
          Navigation
      ------------------------------------------------ */}

      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/student/dashboard"
            className="text-xl font-bold tracking-tight"
          >
            pedagogy
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <Link
              href="/events"
              className="text-sm text-neutral-500 transition hover:text-black"
            >
              Discover Events
            </Link>

            <Link
              href="/student/registrations"
              className="text-sm text-neutral-500 transition hover:text-black"
            >
              My Registrations
            </Link>

            <Link
              href="/student/certificates"
              className="text-sm text-neutral-500 transition hover:text-black"
            >
              Certificates
            </Link>

            <Link
              href="/student/notifications"
              className="relative text-sm text-neutral-500 transition hover:text-black"
            >
              Notifications

              {unreadCount > 0 && (
                <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[9px] font-semibold text-white">
                  {unreadCount > 9
                    ? "9+"
                    : unreadCount}
                </span>
              )}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/student/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 transition hover:bg-neutral-50"
            >
              <UserRound className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="hidden items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium transition hover:bg-neutral-50 sm:flex"
            >
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}

              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------
          Dashboard
      ------------------------------------------------ */}

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Welcome */}

        <section className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-8 md:p-10">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.15em] text-neutral-500">
                Student Dashboard
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
                Welcome,{" "}
                {user.name.split(" ")[0]}.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-500">
                Discover technical events, manage your
                registrations, track your participation,
                and access your certificates — all from
                one place.
              </p>
            </div>

            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Discover Events
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ------------------------------------------------
            Stats
        ------------------------------------------------ */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={
              <CalendarDays className="h-5 w-5" />
            }
            label="Registrations"
            value={registrations.length}
            href="/student/registrations"
          />

          <StatCard
            icon={
              <Clock3 className="h-5 w-5" />
            }
            label="Upcoming Events"
            value={upcomingRegistrations.length}
            href="/student/registrations"
          />

          <StatCard
            icon={
              <FileBadge className="h-5 w-5" />
            }
            label="Certificates"
            value={certificates.length}
            href="/student/certificates"
          />

          <StatCard
            icon={
              <Bell className="h-5 w-5" />
            }
            label="Unread Alerts"
            value={unreadCount}
            href="/student/notifications"
          />
        </section>

        {/* ------------------------------------------------
            Main Content
        ------------------------------------------------ */}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Upcoming Events */}

          <section>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-500">
                  Your Schedule
                </p>

                <h2 className="mt-1 text-2xl font-semibold">
                  Upcoming Events
                </h2>
              </div>

              <Link
                href="/student/registrations"
                className="hidden items-center gap-1 text-sm font-medium transition hover:underline sm:flex"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {upcomingRegistrations.length ===
            0 ? (
              <div className="rounded-3xl border border-dashed border-neutral-300 p-10 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-neutral-400" />

                <h3 className="mt-4 font-semibold">
                  No upcoming events
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
                  You haven&apos;t registered for any
                  upcoming events yet.
                </p>

                <Link
                  href="/events"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
                >
                  Explore Events
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
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
                        className="group block rounded-3xl border border-neutral-200 p-5 transition hover:border-neutral-400 hover:shadow-sm"
                      >
                        <div className="flex gap-5">
                          {/* Event Image */}

                          <div className="hidden h-28 w-36 shrink-0 overflow-hidden rounded-2xl bg-neutral-100 sm:block">
                            {event.image_url ? (
                              <img
                                src={event.image_url}
                                alt={event.title}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Trophy className="h-7 w-7 text-neutral-400" />
                              </div>
                            )}
                          </div>

                          {/* Event Details */}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <span className="rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
                                {event.category}
                              </span>

                              <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400 transition group-hover:translate-x-1 group-hover:text-black" />
                            </div>

                            <h3 className="mt-3 truncate text-lg font-semibold">
                              {event.title}
                            </h3>

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-neutral-500">
                              <span className="flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {formatDate(
                                  event.event_date
                                )}
                              </span>

                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                {event.venue}
                              </span>
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-xs font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Registered ·{" "}
                              {
                                registration.registration_code
                              }
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

            <section className="rounded-3xl border border-neutral-200 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-lg font-semibold text-white">
                  {getInitials(user.name)}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate font-semibold">
                    {user.name}
                  </h2>

                  <p className="truncate text-sm text-neutral-500">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs text-neutral-500">
                    Department
                  </p>

                  <p className="mt-1 truncate text-sm font-medium">
                    {user.department ||
                      "Not specified"}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs text-neutral-500">
                    Year
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {user.year
                      ? `Year ${user.year}`
                      : "Not specified"}
                  </p>
                </div>
              </div>

              <Link
                href="/student/profile"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium transition hover:bg-neutral-50"
              >
                View Profile
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>

            {/* Notifications */}

            <section className="rounded-3xl border border-neutral-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-500">
                    Updates
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    Notifications
                  </h2>
                </div>

                {unreadCount > 0 && (
                  <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-semibold text-white">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {recentNotifications.length ===
              0 ? (
                <div className="py-8 text-center">
                  <Bell className="mx-auto h-7 w-7 text-neutral-300" />

                  <p className="mt-3 text-sm text-neutral-500">
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
                className="mt-5 flex items-center justify-center gap-1 text-sm font-medium hover:underline"
              >
                View all notifications
                <ChevronRight className="h-4 w-4" />
              </Link>
            </section>
          </div>
        </div>

        {/* ------------------------------------------------
            Quick Actions
        ------------------------------------------------ */}

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-500">
              Quick Access
            </p>

            <h2 className="mt-1 text-2xl font-semibold">
              Everything in one place
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/events"
              icon={
                <Trophy className="h-5 w-5" />
              }
              title="Discover Events"
              description="Find hackathons, workshops and competitions."
            />

            <QuickAction
              href="/student/registrations"
              icon={
                <QrCodeIcon className="h-5 w-5" />
              }
              title="My Registrations"
              description="Access your registration codes and QR codes."
            />

            <QuickAction
              href="/student/certificates"
              icon={
                <FileBadge className="h-5 w-5" />
              }
              title="My Certificates"
              description="View and verify your earned certificates."
            />

            <QuickAction
              href="/student/profile"
              icon={
                <UserRound className="h-5 w-5" />
              }
              title="My Profile"
              description="Manage your student information."
            />
          </div>
        </section>

        {/* ------------------------------------------------
            Footer
        ------------------------------------------------ */}

        <footer className="mt-16 border-t border-neutral-200 py-8">
          <div className="flex flex-col justify-between gap-4 text-sm text-neutral-500 sm:flex-row">
            <p>
              © {new Date().getFullYear()} Pedagogy
            </p>

            <div className="flex gap-5">
              <Link
                href="/events"
                className="transition hover:text-black"
              >
                Events
              </Link>

              <Link
                href="/student/certificates"
                className="transition hover:text-black"
              >
                Certificates
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="transition hover:text-black"
              >
                Logout
              </button>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* ========================================================
   STAT CARD
======================================================== */

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-neutral-200 p-5 transition hover:border-neutral-400 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
          {icon}
        </div>

        <ArrowRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-1 group-hover:text-black" />
      </div>

      <p className="mt-5 text-3xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-sm text-neutral-500">
        {label}
      </p>
    </Link>
  );
}

/* ========================================================
   QUICK ACTION
======================================================== */

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-neutral-200 p-6 transition hover:border-neutral-400 hover:shadow-sm"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100">
        {icon}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <h3 className="font-semibold">
          {title}
        </h3>

        <ArrowRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-1 group-hover:text-black" />
      </div>

      <p className="mt-2 text-sm leading-6 text-neutral-500">
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
      className={`rounded-2xl p-4 transition hover:bg-neutral-50 ${
        !notification.is_read
          ? "bg-neutral-50"
          : ""
      }`}
    >
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100">
          {notification.type ===
          "result" ? (
            <Trophy className="h-3.5 w-3.5" />
          ) : notification.type ===
            "certificate" ? (
            <FileBadge className="h-3.5 w-3.5" />
          ) : notification.type ===
            "registration" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm ${
                !notification.is_read
                  ? "font-semibold"
                  : "font-medium"
              }`}
            >
              {notification.title}
            </p>

            {!notification.is_read && (
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-black" />
            )}
          </div>

          <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">
            {notification.message}
          </p>

          <p className="mt-2 text-[10px] text-neutral-400">
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
   QR ICON
======================================================== */

function QrCodeIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect
        width="5"
        height="5"
        x="3"
        y="3"
        rx="1"
      />
      <rect
        width="5"
        height="5"
        x="16"
        y="3"
        rx="1"
      />
      <rect
        width="5"
        height="5"
        x="3"
        y="16"
        rx="1"
      />
      <path d="M16 16h2v2h-2z" />
      <path d="M20 16h1v4h-3" />
      <path d="M16 20h2" />
      <path d="M20 21h1" />
    </svg>
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