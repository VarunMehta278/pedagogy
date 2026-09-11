"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trophy,
  Award,
  CalendarDays,
  Megaphone,
  ClipboardCheck,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

type Notification = {
  id: string;
  title: string;
  message: string;
  type:
    | "general"
    | "registration"
    | "event_reminder"
    | "announcement"
    | "attendance"
    | "result"
    | "certificate";
  event_id?: string | null;
  is_read: boolean;
  created_at: string;
};

type NotificationResponse = {
  success: boolean;
  notifications: Notification[];
  unreadCount: number;
};

export default function NotificationBell() {
  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const containerRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const fetchNotifications = async (
    background = false
  ) => {
    try {
      if (!background) {
        setLoading(true);
      }

      const response = await fetch(
        `${API_URL}/notifications/me`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        return;
      }

      const data: NotificationResponse =
        await response.json();

      if (data.success) {
        setNotifications(
          data.notifications || []
        );

        setUnreadCount(
          data.unreadCount || 0
        );
      }
    } catch (error) {
      console.error(
        "Failed to fetch notifications:",
        error
      );
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  };

  const markAsRead = async (
    notificationId: string
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/notifications/${notificationId}/read`,
        {
          method: "PUT",
          credentials: "include",
        }
      );

      if (!response.ok) {
        return;
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id ===
          notificationId
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );

      setUnreadCount((current) =>
        Math.max(0, current - 1)
      );
    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        `${API_URL}/notifications/read-all`,
        {
          method: "PUT",
          credentials: "include",
        }
      );

      if (!response.ok) {
        return;
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Failed to mark notifications as read:",
        error
      );
    }
  };

  const getIcon = (
    type: Notification["type"]
  ) => {
    switch (type) {
      case "registration":
        return <ClipboardCheck size={16} aria-hidden="true" />;

      case "event_reminder":
        return <CalendarDays size={16} aria-hidden="true" />;

      case "announcement":
        return <Megaphone size={16} aria-hidden="true" />;

      case "attendance":
        return <CheckCheck size={16} aria-hidden="true" />;

      case "result":
        return <Trophy size={16} aria-hidden="true" />;

      case "certificate":
        return <Award size={16} aria-hidden="true" />;

      default:
        return <Bell size={16} aria-hidden="true" />;
    }
  };

  const getTimeAgo = (
    date: string
  ) => {
    const seconds = Math.floor(
      (Date.now() -
        new Date(date).getTime()) /
        1000
    );

    if (seconds < 60) {
      return "Just now";
    }

    const minutes = Math.floor(
      seconds / 60
    );

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

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      {/* Bell */}

      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors",
          "hover:border-primary/40 hover:text-foreground",
          open && "border-primary/40 text-foreground"
        )}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
      >
        <Bell size={18} aria-hidden="true" />

        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background"
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">

          {/* Header */}

          <div className="flex items-center justify-between border-b border-border px-5 py-4">

            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Notifications
              </h3>

              {unreadCount > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {unreadCount} unread
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <CheckCheck size={14} aria-hidden="true" />
                    Mark all read
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                aria-label="Close notifications"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X size={16} aria-hidden="true" />
              </button>

            </div>
          </div>

          {/* Notifications */}

          <div className="max-h-[430px] overflow-y-auto">

            {loading ? (
              <div className="space-y-1 p-3" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex gap-3 px-2 py-3">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-muted" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-full animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length ===
              0 ? (
              <div className="px-6 py-12 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-subtle text-primary">
                  <Bell size={21} aria-hidden="true" />
                </div>

                <h4 className="mt-4 text-sm font-semibold text-foreground">
                  You're all caught up
                </h4>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  New event updates and
                  important notifications will
                  appear here.
                </p>

              </div>
            ) : (
              notifications.map(
                (notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => {
                      if (
                        !notification.is_read
                      ) {
                        markAsRead(
                          notification.id
                        );
                      }
                    }}
                    className={cn(
                      "flex w-full gap-3 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-accent/60",
                      !notification.is_read && "bg-brand-subtle/40"
                    )}
                  >

                    {/* Icon */}

                    <div className="relative shrink-0">

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        {getIcon(
                          notification.type
                        )}
                      </div>

                      {!notification.is_read && (
                        <span
                          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card"
                          aria-hidden="true"
                        />
                      )}

                    </div>

                    {/* Content */}

                    <div className="min-w-0 flex-1">

                      <div className="flex items-start justify-between gap-2">

                        <p className="text-sm font-semibold text-foreground">
                          {notification.title}
                        </p>

                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {getTimeAgo(
                            notification.created_at
                          )}
                        </span>

                      </div>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {notification.message}
                      </p>

                      {!notification.is_read && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-primary">
                          <Check size={11} aria-hidden="true" />
                          Click to mark as read
                        </div>
                      )}

                    </div>

                  </button>
                )
              )
            )}

          </div>

        </div>
      )}
    </div>
  );
}
