"use client";

import {
  CalendarDays,
  CalendarPlus,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

const navigation = [
  {
    label: "Dashboard",
    href: "/faculty/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Events",
    href: "/faculty/events",
    icon: CalendarDays,
  },
  {
    label: "Create Event",
    href: "/faculty/events/create",
    icon: CalendarPlus,
  },
];

export default function FacultyNavigation() {
  const pathname = usePathname();
  const router = useRouter();

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

  const isActive = (href: string) => {
    if (href === "/faculty/dashboard") {
      return pathname === href;
    }

    if (href === "/faculty/events") {
      return (
        pathname === "/faculty/events" ||
        (pathname.startsWith("/faculty/events/") &&
          pathname !== "/faculty/events/create")
      );
    }

    if (href === "/faculty/events/create") {
      return pathname === href;
    }

    return pathname === href;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* DESKTOP / MAIN HEADER */}

        <div className="flex h-16 items-center justify-between gap-6">
          {/* BRAND */}

          <Link
            href="/faculty/dashboard"
            className="flex shrink-0 items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
              <ShieldCheck size={18} />
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-semibold tracking-tight text-black">
                Pedagogy
              </p>

              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-400">
                Faculty
              </p>
            </div>
          </Link>

          {/* DESKTOP NAV */}

          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-black text-white"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-neutral-200 px-3.5 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-100 hover:text-black"
          >
            <LogOut size={16} />

            <span className="hidden sm:inline">
              Logout
            </span>
          </button>
        </div>

        {/* MOBILE NAV */}

        <div className="flex gap-1 overflow-x-auto pb-3 md:hidden">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                  active
                    ? "bg-black text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-black"
                }`}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}