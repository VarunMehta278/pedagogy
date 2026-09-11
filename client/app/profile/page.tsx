"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";

import { departmentOptions } from "@/lib/departments";

import { Label, Input, Select } from "@/components/ui/input";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

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

      toast.success("Profile updated", "Your changes have been saved.");
    } catch (error) {
      console.error("Profile update error:", error);

      toast.error(
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
      <main className="min-h-screen bg-background">
        <ProfileTopBar />

        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="mt-3 h-8 w-52" />
          <Skeleton className="mt-3 h-4 w-64" />

          <div className="mt-8 rounded-2xl border border-border bg-card p-6 md:p-8">
            <div className="flex items-center gap-5">
              <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3.5 w-44" />
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <SkeletonText lines={4} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  if (error && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-bold tracking-tight">
            Unable to load profile
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            {error}
          </p>

          <Button variant="brand" className="mt-6" asChild>
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <ProfileTopBar />

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            Student Profile
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Your Profile
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Manage your personal information.
          </p>
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          {/* Avatar */}
          <div className="mb-8 flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-brand text-2xl font-bold text-white shadow-brand">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-8 w-8" aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">
                {name}
              </h2>

              <p className="mt-1 truncate text-sm text-muted-foreground">
                {user?.email}
              </p>

              <span className="mt-2 inline-block rounded-full bg-brand-subtle px-3 py-1 text-xs font-medium capitalize text-accent-foreground">
                {user?.role}
              </span>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="grid gap-6 sm:grid-cols-2"
          >
            {/* Name */}
            <div className="sm:col-span-2">
              <Label htmlFor="name" required>
                Full Name
              </Label>

              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
              />
            </div>

            {/* Email */}
            <div className="sm:col-span-2">
              <Label htmlFor="email">Email</Label>

              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
              />

              <p className="mt-1.5 text-xs text-muted-foreground">
                Email cannot be changed from your profile.
              </p>
            </div>

            {/* Department */}
            <div>
              <Label htmlFor="department">Department</Label>

              <Select
                id="department"
                value={department}
                onChange={(e) =>
                  setDepartment(e.target.value)
                }
              >
                <option value="">Select department</option>

                {departmentOptions(user?.department).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>

            {/* Year */}
            <div>
              <Label htmlFor="year">Year</Label>

              <Select
                id="year"
                value={year}
                onChange={(e) =>
                  setYear(e.target.value)
                }
              >
                <option value="">Select year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </Select>
            </div>

            {/* Profile image */}
            <div className="sm:col-span-2">
              <Label htmlFor="profileImage">Profile Image URL</Label>

              <Input
                id="profileImage"
                type="url"
                value={profileImage}
                onChange={(e) =>
                  setProfileImage(e.target.value)
                }
                placeholder="https://example.com/photo.jpg"
              />

              <p className="mt-1.5 text-xs text-muted-foreground">
                Image upload will be connected later using Supabase Storage.
              </p>
            </div>

            {/* Save */}
            <div className="sm:col-span-2">
              <Button
                type="submit"
                variant="brand"
                block
                loading={saving}
                loadingText="Saving…"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

/* ========================================================
   TOP BAR
======================================================== */

function ProfileTopBar() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand text-white shadow-brand">
            <ShieldCheck size={17} aria-hidden="true" />
          </div>

          <span className="text-lg font-bold tracking-tight text-foreground">
            Pedagogy
          </span>
        </Link>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </Link>
      </div>
    </header>
  );
}
