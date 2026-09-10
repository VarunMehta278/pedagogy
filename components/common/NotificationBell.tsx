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
    useRef<HTMLDivElement>(null);

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
        return (
          <ClipboardCheck
            size={16}
          />
        );

      case "event_reminder":
        return (
          <CalendarDays
            size={16}
          />
        );

      case "announcement":
        return (
          <Megaphone size={16} />
        );

      case "attendance":
        return (
          <CheckCheck size={16} />
        );

      case "result":
        return (
          <Trophy size={16} />
        );

      case "certificate":
        return (
          <Award size={16} />
        );

      default:
        return <Bell size={16} />;
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
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 transition hover:border-black hover:text-black"
        aria-label="Notifications"
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[19px] items-center justify-center rounded-full bg-black px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">

          {/* Header */}

          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">

            <div>
              <h3 className="text-sm font-semibold">
                Notifications
              </h3>

              {unreadCount > 0 && (
                <p className="mt-0.5 text-xs text-neutral-400">
                  {unreadCount} unread
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="rounded-lg px-2.5 py-2 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-black"
                >
                  <span className="flex items-center gap-1.5">
                    <CheckCheck
                      size={14}
                    />
                    Mark all read
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black"
              >
                <X size={16} />
              </button>

            </div>
          </div>

          {/* Notifications */}

          <div className="max-h-[430px] overflow-y-auto">

            {loading ? (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />

                <p className="mt-3 text-xs text-neutral-400">
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length ===
              0 ? (
              <div className="px-6 py-12 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
                  <Bell size={21} />
                </div>

                <h4 className="mt-4 text-sm font-semibold">
                  You're all caught up
                </h4>

                <p className="mt-1 text-xs leading-5 text-neutral-400">
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
                    className={`flex w-full gap-3 border-b border-neutral-100 px-5 py-4 text-left transition hover:bg-neutral-50 ${
                      !notification.is_read
                        ? "bg-neutral-50"
                        : "bg-white"
                    }`}
                  >

                    {/* Icon */}

                    <div className="relative shrink-0">

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
                        {getIcon(
                          notification.type
                        )}
                      </div>

                      {!notification.is_read && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-black ring-2 ring-white" />
                      )}

                    </div>

                    {/* Content */}

                    <div className="min-w-0 flex-1">

                      <div className="flex items-start justify-between gap-2">

                        <p className="text-sm font-semibold text-neutral-900">
                          {notification.title}
                        </p>

                        <span className="shrink-0 text-[10px] text-neutral-400">
                          {getTimeAgo(
                            notification.created_at
                          )}
                        </span>

                      </div>

                      <p className="mt-1 text-xs leading-5 text-neutral-500">
                        {notification.message}
                      </p>

                      {!notification.is_read && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-neutral-500">
                          <Check
                            size={11}
                          />
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
