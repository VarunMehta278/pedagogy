"use client";

import {
  Award,
  Bell,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Ticket,
  UserRound,
} from "lucide-react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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

  const logout = async () => {
    try {
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
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between gap-5">
          <Link
            href="/student/dashboard"
            className="flex shrink-0 items-center gap-2.5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
              <ShieldCheck size={17} />
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-semibold tracking-tight">
                Pedagogy
              </p>

              <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                Student
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {navigation.map((item) => {
              const Icon = item.icon;

              const isActive =
                pathname === item.href ||
                pathname.startsWith(
                  `${item.href}/`
                );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-black text-white"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={logout}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            <LogOut size={16} />

            <span className="hidden sm:inline">
              Logout
            </span>
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-3 xl:hidden">
          {navigation.map((item) => {
            const Icon = item.icon;

            const isActive =
              pathname === item.href ||
              pathname.startsWith(
                `${item.href}/`
              );

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                  isActive
                    ? "bg-black text-white"
                    : "bg-neutral-100 text-neutral-600"
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