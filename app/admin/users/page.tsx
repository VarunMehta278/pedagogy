"use client";

import AdminNavigation from "@/components/layout/AdminNavigation";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogOut,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  GraduationCap,
  Building2,
  CalendarDays,
} from "lucide-react";

import {
  loginPathFor,
} from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: "student" | "faculty" | "admin" | string;
  department?: string | null;
  year?: number | null;
  profile_image?: string | null;
  created_at?: string | null;
};

type UserStats = {
  total: number;
  students: number;
  faculty: number;
  admins: number;
};

const PAGE_SIZE = 10;

function formatDate(date?: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

function getRoleClasses(role: string) {
  switch (role) {
    case "admin":
      return "bg-black text-white border-black";

    case "faculty":
      return "bg-neutral-200 text-neutral-800 border-neutral-300";

    case "student":
      return "bg-neutral-100 text-neutral-700 border-neutral-200";

    default:
      return "bg-neutral-100 text-neutral-600 border-neutral-200";
  }
}

function getRoleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function AdminUsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    students: 0,
    faculty: 0,
    admins: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] =
    useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] =
    useState("all");

  const [page, setPage] = useState(1);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      /*
       * We intentionally use the admin dashboard
       * endpoint for the statistics. The actual user
       * listing will be loaded from /users/admin.
       */
      const response = await fetch(
        `${API_URL}/users/admin`,
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

      if (response.status === 403) {
        setError(
          "You do not have administrator access."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          "Failed to load users"
        );
      }

      const data = await response.json();

      const loadedUsers =
        data.users ||
        data.data ||
        [];

      setUsers(loadedUsers);

      setStats({
        total:
          data.stats?.total ??
          loadedUsers.length,
        students:
          data.stats?.students ??
          loadedUsers.filter(
            (user: User) =>
              user.role === "student"
          ).length,
        faculty:
          data.stats?.faculty ??
          loadedUsers.filter(
            (user: User) =>
              user.role === "faculty"
          ).length,
        admins:
          data.stats?.admins ??
          loadedUsers.filter(
            (user: User) =>
              user.role === "admin"
          ).length,
      });
    } catch (error) {
      console.error(
        "Load users error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name
          .toLowerCase()
          .includes(query) ||
        user.email
          .toLowerCase()
          .includes(query) ||
        (user.department || "")
          .toLowerCase()
          .includes(query);

      const matchesRole =
        roleFilter === "all" ||
        user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredUsers.length / PAGE_SIZE
    )
  );

  const safePage = Math.min(
    page,
    totalPages
  );

  const paginatedUsers = filteredUsers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      await fetch(
        `${API_URL}/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              href="/admin/dashboard"
              className="text-xl font-bold tracking-tight"
            >
              Pedagogy
            </Link>

            <span className="hidden rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600 md:inline-flex">
              Administrator
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="hidden text-sm text-neutral-500 transition hover:text-black sm:block"
            >
              Dashboard
            </Link>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
              <UserRound className="h-4 w-4" />
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-black disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}

              <span className="hidden sm:inline">
                Logout
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 py-10 lg:px-8">
        <AdminNavigation />
        {/* Heading */}
        <div className="mb-8">
          <Link
            href="/admin/dashboard"
            className="mb-5 inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                Administration
              </p>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                User Management
              </h1>

              <p className="mt-2 max-w-2xl text-neutral-500">
                View and manage everyone using the
                Pedagogy platform.
              </p>
            </div>

            <button
              onClick={loadUsers}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-neutral-50 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-neutral-500" />

              <div>
                <h2 className="font-semibold">
                  Unable to load users
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  {error}
                </p>

                <button
                  onClick={loadUsers}
                  className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {!error && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <UserStat
              title="Total Users"
              value={stats.total}
              icon={Users}
            />

            <UserStat
              title="Students"
              value={stats.students}
              icon={GraduationCap}
            />

            <UserStat
              title="Faculty"
              value={stats.faculty}
              icon={Building2}
            />

            <UserStat
              title="Administrators"
              value={stats.admins}
              icon={ShieldCheck}
            />
          </section>
        )}

        {/* Table */}
        {!error && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-neutral-200 bg-white">
            {/* Controls */}
            <div className="border-b border-neutral-200 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search by name, email or department..."
                    className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    ["all", "All"],
                    ["student", "Students"],
                    ["faculty", "Faculty"],
                    ["admin", "Admins"],
                  ].map(
                    ([value, label]) => (
                      <button
                        key={value}
                        onClick={() =>
                          setRoleFilter(value)
                        }
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                          roleFilter === value
                            ? "bg-black text-white"
                            : "text-neutral-500 hover:bg-neutral-100 hover:text-black"
                        }`}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="mt-4 text-xs text-neutral-400">
                Showing{" "}
                {filteredUsers.length === 0
                  ? 0
                  : (safePage - 1) *
                      PAGE_SIZE +
                    1}{" "}
               –{" "}
                {Math.min(
                  safePage * PAGE_SIZE,
                  filteredUsers.length
                )}{" "}
                of {filteredUsers.length} users
              </div>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-neutral-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading users...
                </div>
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
                  <Users className="h-5 w-5 text-neutral-500" />
                </div>

                <h2 className="mt-4 font-semibold">
                  No users found
                </h2>

                <p className="mt-1 text-sm text-neutral-400">
                  Try changing your search or role
                  filter.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-neutral-400">
                          User
                        </th>

                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-neutral-400">
                          Role
                        </th>

                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-neutral-400">
                          Department
                        </th>

                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-neutral-400">
                          Year
                        </th>

                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-neutral-400">
                          Joined
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-neutral-100">
                      {paginatedUsers.map(
                        (user) => (
                          <tr
                            key={user.id}
                            className="transition hover:bg-neutral-50"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {user.profile_image ? (
                                  <img
                                    src={
                                      user.profile_image
                                    }
                                    alt={user.name}
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                                    {getInitials(
                                      user.name
                                    )}
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {user.name}
                                  </p>

                                  <p className="truncate text-xs text-neutral-400">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getRoleClasses(
                                  user.role
                                )}`}
                              >
                                {getRoleLabel(
                                  user.role
                                )}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-sm text-neutral-600">
                              {user.department ||
                                "—"}
                            </td>

                            <td className="px-6 py-4 text-sm text-neutral-600">
                              {user.year
                                ? `Year ${user.year}`
                                : "—"}
                            </td>

                            <td className="px-6 py-4 text-sm text-neutral-500">
                              <span className="inline-flex items-center gap-2">
                                <CalendarDays className="h-3.5 w-3.5 text-neutral-400" />
                                {formatDate(
                                  user.created_at
                                )}
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="divide-y divide-neutral-100 md:hidden">
                  {paginatedUsers.map(
                    (user) => (
                      <div
                        key={user.id}
                        className="p-5"
                      >
                        <div className="flex items-start gap-3">
                          {user.profile_image ? (
                            <img
                              src={
                                user.profile_image
                              }
                              alt={user.name}
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                              {getInitials(
                                user.name
                              )}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium">
                                {user.name}
                              </p>

                              <span
                                className={`rounded-full border px-2 py-1 text-[10px] font-medium ${getRoleClasses(
                                  user.role
                                )}`}
                              >
                                {getRoleLabel(
                                  user.role
                                )}
                              </span>
                            </div>

                            <p className="mt-1 break-all text-xs text-neutral-400">
                              {user.email}
                            </p>

                            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-neutral-400">
                                  Department
                                </p>

                                <p className="mt-1 text-neutral-700">
                                  {user.department ||
                                    "—"}
                                </p>
                              </div>

                              <div>
                                <p className="text-neutral-400">
                                  Year
                                </p>

                                <p className="mt-1 text-neutral-700">
                                  {user.year
                                    ? `Year ${user.year}`
                                    : "—"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                              <CalendarDays className="h-3.5 w-3.5" />
                              Joined{" "}
                              {formatDate(
                                user.created_at
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-4 sm:px-6">
                    <p className="text-xs text-neutral-400">
                      Page {safePage} of{" "}
                      {totalPages}
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setPage(
                            (current) =>
                              Math.max(
                                1,
                                current - 1
                              )
                          )
                        }
                        disabled={
                          safePage === 1
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() =>
                          setPage(
                            (current) =>
                              Math.min(
                                totalPages,
                                current + 1
                              )
                          )
                        }
                        disabled={
                          safePage ===
                          totalPages
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      <footer className="mt-10 border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-6 py-8 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>
            © {new Date().getFullYear()} Pedagogy
          </p>

          <p>
            Centralized Technical Event Management System
          </p>
        </div>
      </footer>
    </div>
  );
}

function UserStat({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight">
            {value.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
          <Icon className="h-5 w-5 text-neutral-600" />
        </div>
      </div>
    </div>
  );
}