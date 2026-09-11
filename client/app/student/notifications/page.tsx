"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  Megaphone,
  Trophy,
} from "lucide-react";

import {
  loginPathFor,
} from "@/lib/auth";

import StudentNavigation from "@/components/layout/StudentNavigation";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/reveal";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

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

/*
 * Buckets notifications by calendar day using only the created_at
 * field that already comes back from the API — no fetch shape
 * change, purely a client-side presentation grouping.
 */
function dateGroupLabel(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const startOf = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

  const dayDiff = Math.round(
    (startOf(now) - startOf(date)) / 86400000
  );

  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return "This week";

  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function groupNotifications(notifications: Notification[]) {
  const groups: { label: string; items: Notification[] }[] = [];

  for (const notification of notifications) {
    const label = dateGroupLabel(notification.created_at);
    const existing = groups.find((group) => group.label === label);

    if (existing) {
      existing.items.push(notification);
    } else {
      groups.push({ label, items: [notification] });
    }
  }

  return groups;
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

  const groupedNotifications = useMemo(
    () => groupNotifications(visibleNotifications),
    [visibleNotifications]
  );

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

      toast.error("Couldn't mark that as read", "Please try again.");
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

      toast.success("All caught up", "Every notification is marked as read.");
    } catch (error) {
      console.error(
        "Mark all notifications error:",
        error
      );

      toast.error("Couldn't mark all as read", "Please try again.");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <StudentNavigation />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10">
        <FadeIn>
          <PageHeader
            eyebrow="Student Portal"
            title="Notifications"
            description="Stay updated with your registrations, events, results and certificates."
            actions={
              unreadCount > 0 ? (
                <Button
                  onClick={markAllAsRead}
                  loading={markingAll}
                  loadingText="Marking…"
                >
                  <CheckCheck className="h-4 w-4" aria-hidden="true" />
                  Mark all as read
                </Button>
              ) : undefined
            }
          />
        </FadeIn>

        {/* Summary */}
        {!loading && !error && (
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Total Notifications
              </p>

              <p className="tabular mt-2 text-3xl font-bold tracking-tight">
                {notifications.length}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Unread
              </p>

              <p className="tabular mt-2 text-3xl font-bold tracking-tight text-primary">
                {unreadCount}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        {!loading && !error && notifications.length > 0 && (
          <div className="mt-6 flex items-center gap-2 border-b border-border pb-4">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "inline-flex items-center rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                filter === "unread"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              Unread
              {unreadCount > 0 && (
                <span
                  className={cn(
                    "ml-2 rounded-full px-1.5 py-0.5 text-xs",
                    filter === "unread"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-8">
            <SkeletonRows rows={5} />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <Alert tone="destructive" title="Something went wrong" className="mt-8">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={loadNotifications}
            >
              Try again
            </Button>
          </Alert>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          visibleNotifications.length === 0 && (
            <EmptyState
              className="mt-8"
              icon={filter === "unread" ? CheckCircle2 : Bell}
              title={
                filter === "unread"
                  ? "You're all caught up"
                  : "No notifications yet"
              }
              description={
                filter === "unread"
                  ? "You don't have any unread notifications right now."
                  : "Notifications about your events, registrations and results will appear here."
              }
            />
          )}

        {/* Notifications, grouped by date */}
        {!loading &&
          !error &&
          groupedNotifications.length > 0 && (
            <div className="mt-8 space-y-8">
              {groupedNotifications.map((group) => (
                <section key={group.label}>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {group.label}
                  </h2>

                  <Stagger className="space-y-3">
                    {group.items.map((notification) => {
                      const read = isNotificationRead(notification);
                      const Icon = getNotificationIcon(notification.type);

                      return (
                        <StaggerItem key={notification.id}>
                          <NotificationCard
                            notification={notification}
                            read={read}
                            Icon={Icon}
                            onRead={markAsRead}
                          />
                        </StaggerItem>
                      );
                    })}
                  </Stagger>
                </section>
              ))}
            </div>
          )}
      </div>
    </main>
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
      className={cn(
        "relative flex gap-4 rounded-2xl border border-border bg-card p-5 pl-6 transition-colors",
        !read && "border-primary/20"
      )}
    >
      {/* Unread indicator — a brand-tinted rail, not a background fill */}
      {!read && (
        <span
          className="absolute inset-y-3 left-0 w-1 rounded-full bg-gradient-brand"
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          read
            ? "bg-muted text-muted-foreground"
            : "bg-brand-subtle text-primary"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={cn(
                  "text-sm",
                  !read
                    ? "font-semibold text-foreground"
                    : "font-medium text-foreground"
                )}
              >
                {notification.title}
              </h3>

              {!read && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
              )}
            </div>

            <span className="mt-1 inline-block text-xs text-muted-foreground">
              {getNotificationLabel(notification.type)}
            </span>
          </div>

          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {notification.message}
        </p>

        {!read && (
          <button
            type="button"
            onClick={() => onRead(notification.id)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary transition hover:underline"
          >
            Mark as read
          </button>
        )}
      </div>
    </div>
  );
}
