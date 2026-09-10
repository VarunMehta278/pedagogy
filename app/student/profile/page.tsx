"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LogOut,
  Mail,
  Pencil,
  UserRound,
  GraduationCap,
  Building2,
  Save,
  X,
} from "lucide-react";

import { departmentOptions } from "@/lib/departments";

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
  role: string;
  department?: string | null;
  year?: number | null;
  profile_image?: string | null;
};

export default function StudentProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [editing, setEditing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/users/me`,
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
        throw new Error("Failed to load profile");
      }

      const data = await response.json();

      const profile =
        data.user ||
        data.data ||
        data.profile;

      if (!profile) {
        throw new Error("Profile information unavailable");
      }

      setUser(profile);
      setName(profile.name || "");
      setDepartment(profile.department || "");
      setYear(
        profile.year
          ? String(profile.year)
          : ""
      );
    } catch (error) {
      console.error(
        "Load profile error:",
        error
      );

      setError(
        "We couldn't load your profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    const selectedYear = Number(year);

    if (
      !year ||
      !Number.isInteger(selectedYear) ||
      selectedYear < 1 ||
      selectedYear > 4
    ) {
      setError(
        "Please select a valid academic year."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/users/me`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
            department:
              department.trim() || null,
            year: selectedYear,
          }),
        }
      );

      const data = await response.json();

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
          data.message ||
            "Failed to update profile"
        );
      }

      const updatedUser =
        data.user ||
        data.data ||
        data.profile;

      if (updatedUser) {
        setUser(updatedUser);
        setName(updatedUser.name || "");
        setDepartment(
          updatedUser.department || ""
        );
        setYear(
          updatedUser.year
            ? String(updatedUser.year)
            : ""
        );
      } else {
        setUser((current) =>
          current
            ? {
                ...current,
                name: trimmedName,
                department:
                  department.trim() || null,
                year: selectedYear,
              }
            : current
        );
      }

      setSuccess(
        "Your profile has been updated successfully."
      );

      setEditing(false);
    } catch (error) {
      console.error(
        "Update profile error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to update your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!user) return;

    setName(user.name || "");
    setDepartment(user.department || "");
    setYear(
      user.year
        ? String(user.year)
        : ""
    );

    setEditing(false);
    setError("");
    setSuccess("");
  };

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

  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) =>
          part.charAt(0).toUpperCase()
        )
        .join("")
    : "U";

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
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
              {initials}
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

      {/* Main */}
      <main className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
        <Link
          href="/student/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-neutral-400">
            Student Portal
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            My Profile
          </h1>

          <p className="mt-2 max-w-2xl text-neutral-500">
            Manage your personal and academic information.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <X className="mt-0.5 h-5 w-5 shrink-0 text-neutral-600" />

            <p className="text-sm text-neutral-700">
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-neutral-700" />

            <p className="text-sm text-neutral-700">
              {success}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading your profile...
            </div>
          </div>
        ) : user ? (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Profile Summary */}
            <aside className="h-fit rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
              <div className="flex flex-col items-center text-center">
                {user.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt={user.name}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-black text-2xl font-bold text-white">
                    {initials}
                  </div>
                )}

                <h2 className="mt-5 text-xl font-semibold">
                  {user.name}
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  {user.email}
                </p>

                <span className="mt-4 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium capitalize text-neutral-600">
                  {user.role}
                </span>
              </div>

              <div className="mt-7 border-t border-neutral-200 pt-6">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-neutral-400" />

                  <div>
                    <p className="text-xs text-neutral-400">
                      Email
                    </p>

                    <p className="mt-1 break-all text-sm font-medium text-neutral-800">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-3">
                  <GraduationCap className="mt-0.5 h-4 w-4 text-neutral-400" />

                  <div>
                    <p className="text-xs text-neutral-400">
                      Academic Year
                    </p>

                    <p className="mt-1 text-sm font-medium text-neutral-800">
                      {user.year
                        ? `Year ${user.year}`
                        : "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-3">
                  <Building2 className="mt-0.5 h-4 w-4 text-neutral-400" />

                  <div>
                    <p className="text-xs text-neutral-400">
                      Department
                    </p>

                    <p className="mt-1 text-sm font-medium text-neutral-800">
                      {user.department ||
                        "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Profile Form */}
            <section className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-semibold">
                    Personal Information
                  </h2>

                  <p className="mt-1 text-sm text-neutral-500">
                    Keep your student profile information
                    up to date.
                  </p>
                </div>

                {!editing && (
                  <button
                    onClick={() => {
                      setEditing(true);
                      setSuccess("");
                      setError("");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium transition hover:bg-neutral-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Profile
                  </button>
                )}
              </div>

              <form
                onSubmit={handleSave}
                className="mt-7 space-y-6"
              >
                {/* Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-neutral-800"
                  >
                    Full Name
                  </label>

                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                    <input
                      id="name"
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      disabled={!editing || saving}
                      className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-neutral-800"
                  >
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                    <input
                      id="email"
                      value={user.email}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-10 pr-4 text-sm text-neutral-500"
                    />
                  </div>

                  <p className="mt-2 text-xs text-neutral-400">
                    Your registered email address cannot be
                    changed here.
                  </p>
                </div>

                {/* Department */}
                <div>
                  <label
                    htmlFor="department"
                    className="mb-2 block text-sm font-medium text-neutral-800"
                  >
                    Department
                  </label>

                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                    <select
                      id="department"
                      value={department}
                      onChange={(event) =>
                        setDepartment(
                          event.target.value
                        )
                      }
                      disabled={!editing || saving}
                      className="w-full appearance-none rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
                    >
                      <option value="">
                        Select department
                      </option>

                      {departmentOptions(
                        user?.department
                      ).map((item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Academic Year */}
                <div>
                  <label
                    htmlFor="year"
                    className="mb-2 block text-sm font-medium text-neutral-800"
                  >
                    Academic Year
                  </label>

                  <div className="relative">
                    <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                    <select
                      id="year"
                      value={year}
                      onChange={(event) =>
                        setYear(event.target.value)
                      }
                      disabled={!editing || saving}
                      className="w-full appearance-none rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
                    >
                      <option value="">
                        Select academic year
                      </option>
                      <option value="1">
                        Year 1
                      </option>
                      <option value="2">
                        Year 2
                      </option>
                      <option value="3">
                        Year 3
                      </option>
                      <option value="4">
                        Year 4
                      </option>
                    </select>
                  </div>
                </div>

                {/* Actions */}
                {editing && (
                  <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-5 py-3 text-sm font-medium transition hover:bg-neutral-50 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}

                      {saving
                        ? "Saving..."
                        : "Save Changes"}
                    </button>
                  </div>
                )}
              </form>
            </section>
          </div>
        ) : (
          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-10 text-center">
            <UserRound className="mx-auto h-8 w-8 text-neutral-400" />

            <h2 className="mt-4 text-lg font-semibold">
              Profile unavailable
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Please try refreshing the page.
            </p>

            <button
              onClick={loadProfile}
              className="mt-5 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Try Again
            </button>
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