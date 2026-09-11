"use client";

import * as React from "react";
import {
  Award,
  Bell,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Ticket,
  UserRound,
  X,
} from "lucide-react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import NotificationBell from "@/components/common/NotificationBell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

const navigation = [
  {
    label: "Dashboard",
    href: "/student/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Events",
    href: "/events",
    icon: CalendarDays,
  },
  {
    label: "Registrations",
    href: "/student/registrations",
    icon: Ticket,
  },
  {
    label: "Certificates",
    href: "/student/certificates",
    icon: Award,
  },
  {
    label: "Notifications",
    href: "/student/notifications",
    icon: Bell,
  },
  {
    label: "Profile",
    href: "/student/profile",
    icon: UserRound,
  },
];

export default function StudentNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const [loggingOut, setLoggingOut] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Close the mobile drawer whenever the route changes.
  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock page scroll while the drawer is open.
  React.useEffect(() => {
    if (!drawerOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const logout = async () => {
    try {
      setLoggingOut(true);

      await fetch(
        `${API_URL}/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );
    } finally {
      router.replace("/login");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/student/dashboard"
            className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand text-white shadow-brand">
              <ShieldCheck size={17} aria-hidden="true" />
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-none tracking-tight text-foreground">
                Pedagogy
              </p>

              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Student
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-brand-subtle text-primary shadow-xs"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon size={15} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle />

            <NotificationBell />

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              loading={loggingOut}
              className="hidden sm:inline-flex"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Logout</span>
            </Button>

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-accent lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!drawerOpen}
      >
        <div
          onClick={() => setDrawerOpen(false)}
          className={cn(
            "absolute inset-0 bg-foreground/30 backdrop-blur-sm transition-opacity duration-300",
            drawerOpen ? "opacity-100" : "opacity-0"
          )}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Student navigation"
          className={cn(
            "absolute inset-y-0 right-0 flex w-[82%] max-w-xs flex-col border-l border-border bg-card shadow-xl",
            "transition-transform duration-300 ease-out",
            drawerOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand text-white shadow-brand">
                <ShieldCheck size={17} aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-foreground">Pedagogy</p>
            </div>

            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <nav
            className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
            aria-label="Primary"
          >
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-subtle text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon size={17} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="shrink-0 border-t border-border p-3">
            <Button
              variant="outline"
              block
              onClick={logout}
              loading={loggingOut}
              loadingText="Signing out…"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
