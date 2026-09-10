"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Save,
  User,
} from "lucide-react";

import { departmentOptions } from "@/lib/departments";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  year: number | null;
  profile_image: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [profileImage, setProfileImage] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --------------------------------------------------
  // Load profile
  // --------------------------------------------------

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/users/me`,
          {
            credentials: "include",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load profile"
          );
        }

        setUser(data.user);

        setName(data.user.name || "");
        setDepartment(data.user.department || "");
        setYear(
          data.user.year
            ? String(data.user.year)
            : ""
        );
        setProfileImage(
          data.user.profile_image || ""
        );
      } catch (error) {
        console.error("Profile loading error:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load profile"
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  // --------------------------------------------------
  // Save profile
  // --------------------------------------------------

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/users/me`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name,
            department: department || null,
            year: year ? Number(year) : null,
            profile_image: profileImage || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update profile"
        );
      }

      setUser(data.user);

      setName(data.user.name || "");
      setDepartment(data.user.department || "");
      setYear(
        data.user.year
          ? String(data.user.year)
          : ""
      );
      setProfileImage(
        data.user.profile_image || ""
      );

      setSuccess("Profile updated successfully.");
    } catch (error) {
      console.error("Profile update error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />

          <p className="mt-4 text-sm text-muted-foreground">
            Loading profile...
          </p>

        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  if (error && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6">

        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center">

          <h1 className="text-xl font-bold">
            Unable to load profile
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            {error}
          </p>

          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Go to Login
          </Link>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30">

      {/* Navbar */}
      <header className="border-b bg-background">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          <Link
            href="/"
            className="text-xl font-bold"
          >
            Pedagogy
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

        </div>

      </header>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-10">

        <div className="mb-8">

          <p className="text-sm font-medium text-primary">
            Student Profile
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Your Profile
          </h1>

          <p className="mt-2 text-muted-foreground">
            Manage your personal information.
          </p>

        </div>

        {/* Profile Card */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">

          {/* Avatar */}
          <div className="mb-8 flex items-center gap-5">

            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-bold text-primary">

              {profileImage ? (
                <img
                  src={profileImage}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-8 w-8" />
              )}

            </div>

            <div>

              <h2 className="text-lg font-semibold">
                {name}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {user?.email}
              </p>

              <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {user?.role}
              </span>

            </div>

          </div>

          {/* Success */}
          {success && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-4">

              <CheckCircle2 className="h-5 w-5 text-green-600" />

              <p className="text-sm text-green-700">
                {success}
              </p>

            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">

              <p className="text-sm text-destructive">
                {error}
              </p>

            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* Name */}
            <div>

              <label
                htmlFor="name"
                className="text-sm font-medium"
              >
                Full Name
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
                className="mt-2 w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

            </div>

            {/* Email */}
            <div>

              <label
                htmlFor="email"
                className="text-sm font-medium"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="mt-2 w-full cursor-not-allowed rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground"
              />

              <p className="mt-2 text-xs text-muted-foreground">
                Email cannot be changed from your profile.
              </p>

            </div>

            {/* Department */}
            <div>

              <label
                htmlFor="department"
                className="text-sm font-medium"
              >
                Department
              </label>

              <select
                id="department"
                value={department}
                onChange={(e) =>
                  setDepartment(e.target.value)
                }
                className="mt-2 w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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

            {/* Year */}
            <div>

              <label
                htmlFor="year"
                className="text-sm font-medium"
              >
                Year
              </label>

              <select
                id="year"
                value={year}
                onChange={(e) =>
                  setYear(e.target.value)
                }
                className="mt-2 w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >

                <option value="">
                  Select year
                </option>

                <option value="1">
                  1st Year
                </option>

                <option value="2">
                  2nd Year
                </option>

                <option value="3">
                  3rd Year
                </option>

                <option value="4">
                  4th Year
                </option>

              </select>

            </div>

            {/* Profile image */}
            <div>

              <label
                htmlFor="profileImage"
                className="text-sm font-medium"
              >
                Profile Image URL
              </label>

              <input
                id="profileImage"
                type="url"
                value={profileImage}
                onChange={(e) =>
                  setProfileImage(e.target.value)
                }
                placeholder="https://example.com/photo.jpg"
                className="mt-2 w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              <p className="mt-2 text-xs text-muted-foreground">
                Image upload will be connected later
                using Supabase Storage.
              </p>

            </div>

            {/* Save */}
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >

              <Save className="h-4 w-4" />

              {saving
                ? "Saving..."
                : "Save Changes"}

            </button>

          </form>

        </div>

      </div>

    </main>
  );
}