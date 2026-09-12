"use client";

import AdminNavigation from "@/components/layout/AdminNavigation";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

import {
  loginPathFor,
  roleLabel,
  type UserRole,
} from "@/lib/auth";
import { toast } from "@/lib/toast";

import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Input, Select, Label, FieldHint } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

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

const roleFilters: [string, string][] = [
  ["all", "All"],
  ["student", "Students"],
  ["faculty", "Faculty"],
  ["admin", "Admins"],
  ["judge", "Judges"],
  ["volunteer", "Volunteers"],
];

/*
 * Every assignable role. Judges and volunteers only ever come to
 * exist via this page's role-change control — there is no signup
 * flow for them — so the dialog below offers all five.
 */
const ALL_ROLES: UserRole[] = [
  "student",
  "faculty",
  "admin",
  "judge",
  "volunteer",
];

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

/*
 * Every role gets one, consistent badge treatment across the
 * desktop table and the mobile cards.
 */
function RoleBadge({ role }: { role: string }) {
  const variants: Record<
    string,
    "solid" | "success" | "info" | "warning" | "outline" | "muted"
  > = {
    admin: "solid",
    faculty: "success",
    student: "info",
    judge: "warning",
    volunteer: "outline",
  };

  return (
    <Badge variant={variants[role] || "muted"}>
      {roleLabel(role)}
    </Badge>
  );
}

function computeStats(list: User[]): UserStats {
  return {
    total: list.length,
    students: list.filter((user) => user.role === "student").length,
    faculty: list.filter((user) => user.role === "faculty").length,
    admins: list.filter((user) => user.role === "admin").length,
  };
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

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] =
    useState("all");

  const [page, setPage] = useState(1);

  /*
   * Role-change dialog. This is the only place judges and
   * volunteers come to exist, so it lives on every row rather
   * than behind a separate flow.
   */
  const [roleDialogUser, setRoleDialogUser] = useState<User | null>(null);
  const [roleDialogValue, setRoleDialogValue] = useState<UserRole>("student");
  const [roleUpdating, setRoleUpdating] = useState(false);

  const openRoleDialog = (user: User) => {
    setRoleDialogUser(user);
    setRoleDialogValue((user.role as UserRole) || "student");
  };

  const closeRoleDialog = () => {
    if (roleUpdating) return;
    setRoleDialogUser(null);
  };

  const submitRoleChange = async () => {
    if (!roleDialogUser) return;

    if (roleDialogValue === roleDialogUser.role) {
      toast.info("That is already this user's role.");
      return;
    }

    try {
      setRoleUpdating(true);

      const response = await fetch(
        `${API_URL}/users/${encodeURIComponent(roleDialogUser.id)}/role`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: roleDialogValue }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(
          data?.message || "Failed to update this user's role"
        );
        return;
      }

      const updatedUser = data.user;

      const nextUsers = users.map((user) =>
        user.id === roleDialogUser.id
          ? { ...user, ...(updatedUser || {}), role: updatedUser?.role ?? roleDialogValue }
          : user
      );

      setUsers(nextUsers);
      setStats(computeStats(nextUsers));

      toast.success(
        `${roleDialogUser.name}'s role is now ${roleLabel(roleDialogValue)}.`
      );

      setRoleDialogUser(null);
    } catch (error) {
      console.error("Role update error:", error);

      toast.error("Failed to update this user's role");
    } finally {
      setRoleUpdating(false);
    }
  };

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

  return (
    <main className="min-h-screen bg-background">
      <AdminNavigation />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
        {/* HEADING */}

        <FadeIn>
          <PageHeader
            eyebrow="Administration"
            title="User Management"
            description="View and manage everyone using the Pedagogy platform."
            actions={
              <Button
                variant="outline"
                onClick={loadUsers}
                loading={loading}
                loadingText="Refreshing…"
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                Refresh
              </Button>
            }
          />
        </FadeIn>

        {/* ERROR */}

        {error && (
          <Alert tone="destructive" title="Unable to load users" className="mt-6">
            {error}

            <div className="mt-3">
              <Button variant="destructive" size="sm" onClick={loadUsers}>
                Try again
              </Button>
            </div>
          </Alert>
        )}

        {/* STATS */}

        {!error && (
          <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <StatCard
                icon={Users}
                label="Total Users"
                value={stats.total}
                tone="brand"
              />
            </StaggerItem>

            <StaggerItem>
              <StatCard
                icon={GraduationCap}
                label="Students"
                value={stats.students}
                tone="info"
              />
            </StaggerItem>

            <StaggerItem>
              <StatCard
                icon={Building2}
                label="Faculty"
                value={stats.faculty}
                tone="success"
              />
            </StaggerItem>

            <StaggerItem>
              <StatCard
                icon={ShieldCheck}
                label="Administrators"
                value={stats.admins}
                tone="violet"
              />
            </StaggerItem>
          </Stagger>
        )}

        {/* TABLE */}

        {!error && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
            {/* Controls */}

            <div className="border-b border-border p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <Input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search by name, email or department..."
                    className="pl-10"
                    aria-label="Search users"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {roleFilters.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRoleFilter(value)}
                      className={cn(
                        "rounded-xl px-3.5 py-2 text-sm font-medium transition-colors duration-200",
                        roleFilter === value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="tabular mt-4 text-xs text-muted-foreground">
                Showing{" "}
                {filteredUsers.length === 0
                  ? 0
                  : (safePage - 1) * PAGE_SIZE + 1}
                {" – "}
                {Math.min(
                  safePage * PAGE_SIZE,
                  filteredUsers.length
                )}{" "}
                of {filteredUsers.length} users
              </div>
            </div>

            {/* Loading */}

            {loading ? (
              <div className="p-5 sm:p-6">
                <SkeletonRows rows={6} />
              </div>
            ) : paginatedUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No users found"
                description="Try changing your search or role filter."
                className="border-none"
              />
            ) : (
              <>
                {/* Desktop table */}

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-left">
                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          User
                        </th>

                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Role
                        </th>

                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Department
                        </th>

                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Year
                        </th>

                        <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Joined
                        </th>

                        <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                      {paginatedUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="transition-colors hover:bg-accent/40"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.profile_image ? (
                                <img
                                  src={user.profile_image}
                                  alt={user.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-white">
                                  {getInitials(user.name)}
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {user.name}
                                </p>

                                <p className="truncate text-xs text-muted-foreground">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <RoleBadge role={user.role} />
                          </td>

                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {user.department || "—"}
                          </td>

                          <td className="tabular px-6 py-4 text-sm text-muted-foreground">
                            {user.year ? `Year ${user.year}` : "—"}
                          </td>

                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            <span className="tabular inline-flex items-center gap-2">
                              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                              {formatDate(user.created_at)}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRoleDialog(user)}
                            >
                              <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                              Change role
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}

                <div className="divide-y divide-border md:hidden">
                  {paginatedUsers.map((user) => (
                    <div key={user.id} className="p-5">
                      <div className="flex items-start gap-3">
                        {user.profile_image ? (
                          <img
                            src={user.profile_image}
                            alt={user.name}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-white">
                            {getInitials(user.name)}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-foreground">
                              {user.name}
                            </p>

                            <RoleBadge role={user.role} />
                          </div>

                          <p className="mt-1 break-all text-xs text-muted-foreground">
                            {user.email}
                          </p>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-muted-foreground">Department</p>

                              <p className="mt-1 text-foreground">
                                {user.department || "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-muted-foreground">Year</p>

                              <p className="tabular mt-1 text-foreground">
                                {user.year ? `Year ${user.year}` : "—"}
                              </p>
                            </div>
                          </div>

                          <div className="tabular mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                            Joined {formatDate(user.created_at)}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 w-full"
                            onClick={() => openRoleDialog(user)}
                          >
                            <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                            Change role
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-5 py-4 sm:px-6">
                    <p className="tabular text-xs text-muted-foreground">
                      Page {safePage} of {totalPages}
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() =>
                          setPage((current) => Math.max(1, current - 1))
                        }
                        disabled={safePage === 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </Button>

                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() =>
                          setPage((current) =>
                            Math.min(totalPages, current + 1)
                          )
                        }
                        disabled={safePage === totalPages}
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>

      {roleDialogUser && (
        <RoleChangeDialog
          user={roleDialogUser}
          value={roleDialogValue}
          onValueChange={setRoleDialogValue}
          loading={roleUpdating}
          onCancel={closeRoleDialog}
          onConfirm={submitRoleChange}
        />
      )}
    </main>
  );
}

/* -------------------------------- */
/* ROLE CHANGE DIALOG               */
/* -------------------------------- */

function RoleChangeDialog({
  user,
  value,
  onValueChange,
  loading,
  onCancel,
  onConfirm,
}: {
  user: User;
  value: UserRole;
  onValueChange: (role: UserRole) => void;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const changed = value !== user.role;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-subtle text-primary">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </div>

        <h2 className="mt-4 text-lg font-semibold tracking-tight">
          Change role
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          {user.name} is currently{" "}
          <span className="font-medium text-foreground">
            {roleLabel(user.role)}
          </span>
          .
        </p>

        <div className="mt-5">
          <Label htmlFor="role-change-select">New role</Label>

          <Select
            id="role-change-select"
            value={value}
            disabled={loading}
            onChange={(event) =>
              onValueChange(event.target.value as UserRole)
            }
          >
            {ALL_ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </Select>

          <FieldHint>
            Judges and volunteers only gain access to their tools
            once assigned this role — this is the only way to
            create one.
          </FieldHint>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            variant="brand"
            block
            loading={loading}
            loadingText="Saving…"
            disabled={!changed}
            onClick={onConfirm}
          >
            Confirm role change
          </Button>

          <Button
            variant="outline"
            block
            disabled={loading}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
