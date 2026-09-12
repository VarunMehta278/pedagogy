"use client";

import {
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

const navigation = [
  {
    label: "Dashboard",
    href: "/judge/dashboard",
    icon: LayoutDashboard,
  },
];

export default function JudgeNavigation() {
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

  /*
   * Judges only ever have two screens — the dashboard and a
   * single event's scoring page — so the dashboard link stays
   * highlighted while they are scoring an event too.
   */
  const isActive = (href: string) => {
    if (href === "/judge/dashboard") {
      return (
        pathname === "/judge/dashboard" ||
        pathname.startsWith("/judge/events")
      );
    }

    return pathname === href;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* DESKTOP / MAIN HEADER */}

        <div className="flex h-16 items-center justify-between gap-4">
          {/* BRAND */}

          <Link
            href="/judge/dashboard"
            className="flex shrink-0 items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand">
              <ClipboardCheck size={18} aria-hidden="true" />
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Pedagogy
              </p>

              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Judge
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
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors duration-200",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* THEME + LOGOUT */}

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-xs transition-colors duration-200 hover:border-primary/40 hover:bg-accent/60"
            >
              <LogOut size={16} aria-hidden="true" />

              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* MOBILE NAV */}

        <nav className="flex gap-1.5 overflow-x-auto pb-3 md:hidden" aria-label="Judge navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-colors duration-200",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon size={14} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
