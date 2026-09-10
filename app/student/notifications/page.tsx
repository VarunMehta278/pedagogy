"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Loader2,
  LogOut,
  Megaphone,
  Trophy,
  UserRound,
  X,
} from "lucide-react";

import {
  loginPathFor,
} from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

type NotificationType =
  | "general"
  | "registration"
  | "event_reminder"
  | "announcement"
  | "attendance"
  | "result"
  | "certificate";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read?: boolean;
  read?: boolean;
  created_at: string;
  event_id?: string | null;
};

function isNotificationRead(notification: Notification) {
  return notification.is_read ?? notification.read ?? false;
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60)
    return `${minutes}m ago`;
  if (hours < 24)
    return `${hours}h ago`;
  if (days < 7)
    return `${days}d ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "registration":
      return CheckCircle2;

    case "announcement":
      return Megaphone;

    case "result":
      return Trophy;

    case "certificate":
      return CheckCircle2;

    case "event_reminder":
      return CalendarDays;

    default:
      return Bell;
  }
}

function getNotificationLabel(type: NotificationType) {
  switch (type) {
    case "registration":
      return "Registration";

    case "announcement":
      return "Announcement";

    case "result":
      return "Result";

    case "certificate":
      return "Certificate";

    case "event_reminder":
      return "Event Reminder";

    case "attendance":
      return "Attendance";

    default:
      return "Notification";
  }
}

export default function StudentNotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<
    "all" | "unread"
  >("all");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/notifications/me`,
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
          "Failed to load notifications"
        );
      }

      const data = await response.json();

      setNotifications(
        data.notifications ||
          data.data ||
          []
      );
    } catch (error) {
      console.error(
        "Load notifications error:",
        error
      );

      setError(
        "We couldn't load your notifications. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !isNotificationRead(notification)
      ).length,
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter(
        (notification) =>
          !isNotificationRead(notification)
      );
    }

    return notifications;
  }, [notifications, filter]);

  const markAsRead = async (
    notificationId: string
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/notifications/${encodeURIComponent(
          notificationId
        )}/read`,
        {
          method: "PUT",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to mark notification as read"
        );
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
                read: true,
              }
            : notification
        )
      );
    } catch (error) {
      console.error(
        "Mark notification read error:",
        error
      );
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      setMarkingAll(true);

      const response = await fetch(
        `${API_URL}/notifications/read-all`,
        {
          method: "PUT",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to mark all notifications as read"
        );
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
          read: true,
        }))
      );
    } catch (error) {
      console.error(
        "Mark all notifications error:",
        error
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const handleLogout = async () => {
    try {
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
              className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-black"
            >
              <LogOut className="h-4 w-4" />

              <span className="hidden sm:inline">
                Logout
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
        {/* Heading */}
        <div className="mb-8">
          <Link
            href="/student/dashboard"
            className="mb-5 inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-neutral-400">
                Student Portal
              </p>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Notifications
              </h1>

              <p className="mt-2 text-neutral-500">
                Stay updated with your registrations,
                events, results and certificates.
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={markingAll}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}

                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        {!loading && !error && (
          <div className="mb-7 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-neutral-200 p-5">
              <p className="text-sm text-neutral-500">
                Total Notifications
              </p>

              <p className="mt-2 text-3xl font-bold">
                {notifications.length}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 p-5">
              <p className="text-sm text-neutral-500">
                Unread
              </p>

              <p className="mt-2 text-3xl font-bold">
                {unreadCount}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        {!loading && !error && notifications.length > 0 && (
          <div className="mb-5 flex items-center gap-2 border-b border-neutral-200 pb-4">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                filter === "all"
                  ? "bg-black text-white"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-black"
              }`}
            >
              All
            </button>

            <button
              onClick={() => setFilter("unread")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                filter === "unread"
                  ? "bg-black text-white"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-black"
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span
                  className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
                    filter === "unread"
                      ? "bg-white text-black"
                      : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex min-h-[350px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading notifications...
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white ring-1 ring-neutral-200">
              <Bell className="h-5 w-5 text-neutral-500" />
            </div>

            <h2 className="mt-4 text-lg font-semibold">
              Something went wrong
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              {error}
            </p>

            <button
              onClick={loadNotifications}
              className="mt-5 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          visibleNotifications.length === 0 && (
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
                {filter === "unread" ? (
                  <CheckCircle2 className="h-6 w-6 text-neutral-500" />
                ) : (
                  <Bell className="h-6 w-6 text-neutral-500" />
                )}
              </div>

              <h2 className="mt-5 text-xl font-semibold">
                {filter === "unread"
                  ? "You're all caught up"
                  : "No notifications yet"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
                {filter === "unread"
                  ? "You don't have any unread notifications right now."
                  : "Notifications about your events, registrations and results will appear here."}
              </p>
            </div>
          )}

        {/* Notifications */}
        {!loading &&
          !error &&
          visibleNotifications.length > 0 && (
            <div className="space-y-3">
              {visibleNotifications.map(
                (notification) => {
                  const read =
                    isNotificationRead(
                      notification
                    );

                  const Icon =
                    getNotificationIcon(
                      notification.type
                    );

                  return (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      read={read}
                      Icon={Icon}
                      onRead={markAsRead}
                    />
                  );
                }
              )}
            </div>
          )}
      </main>

      {/* Footer */}
      <footer className="mt-10 border-t border-neutral-200">
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

function NotificationCard({
  notification,
  read,
  Icon,
  onRead,
}: {
  notification: Notification;
  read: boolean;
  Icon: React.ComponentType<{
    className?: string;
  }>;
  onRead: (id: string) => void;
}) {
  return (
    <div
      className={`group relative rounded-2xl border p-5 transition ${
        read
          ? "border-neutral-200 bg-white hover:border-neutral-300"
          : "border-neutral-300 bg-neutral-50"
      }`}
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            read
              ? "bg-neutral-100 text-neutral-600"
              : "bg-black text-white"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`text-sm ${
                    read
                      ? "font-medium text-neutral-900"
                      : "font-semibold text-black"
                  }`}
                >
                  {notification.title}
                </h3>

                {!read && (
                  <span className="h-2 w-2 rounded-full bg-black" />
                )}
              </div>

              <span className="mt-1 inline-block text-xs text-neutral-400">
                {getNotificationLabel(
                  notification.type
                )}
              </span>
            </div>

            <span className="shrink-0 text-xs text-neutral-400">
              {formatRelativeTime(
                notification.created_at
              )}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-neutral-600">
            {notification.message}
          </p>

          {!read && (
            <button
              onClick={() =>
                onRead(notification.id)
              }
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 transition hover:text-black"
            >
              Mark as read
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}