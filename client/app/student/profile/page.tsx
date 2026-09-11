"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  GraduationCap,
  Mail,
  Pencil,
  Save,
  UserRound,
  X,
} from "lucide-react";

import { departmentOptions } from "@/lib/departments";

import {
  loginPathFor,
} from "@/lib/auth";

import StudentNavigation from "@/components/layout/StudentNavigation";
import { PageHeader } from "@/components/ui/page-header";
import { Label, Input, Select } from "@/components/ui/input";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/reveal";
import { toast } from "@/lib/toast";

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

  const [editing, setEditing] = useState(false);

  const [error, setError] = useState("");

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

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Name is required.");
      return;
    }

    const selectedYear = Number(year);

    if (
      !year ||
      !Number.isInteger(selectedYear) ||
      selectedYear < 1 ||
      selectedYear > 4
    ) {
      toast.error("Please select a valid academic year.");
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

      toast.success(
        "Profile updated",
        "Your profile has been updated successfully."
      );

      setEditing(false);
    } catch (error) {
      console.error(
        "Update profile error:",
        error
      );

      toast.error(
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
    <main className="min-h-screen bg-background">
      <StudentNavigation />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10">
        <FadeIn>
          <PageHeader
            eyebrow="Student Portal"
            title="My Profile"
            description="Manage your personal and academic information."
          />
        </FadeIn>

        {error && !loading && !user && (
          <Alert tone="destructive" title="Couldn't load your profile" className="mt-8">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={loadProfile}
            >
              Try again
            </Button>
          </Alert>
        )}

        {loading ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="h-fit rounded-3xl border border-border bg-card p-6">
              <div className="flex flex-col items-center text-center">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="mt-5 h-5 w-32" />
                <Skeleton className="mt-2 h-3.5 w-40" />
              </div>
              <div className="mt-7 space-y-5 border-t border-border pt-6">
                <SkeletonText lines={3} />
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <Skeleton className="h-5 w-48" />
              <div className="mt-7 space-y-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-11 w-full" />
                ))}
              </div>
            </div>
          </div>
        ) : user ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Profile Summary */}
            <aside className="h-fit rounded-3xl border border-border bg-card p-6">
              <div className="flex flex-col items-center text-center">
                {user.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt={user.name}
                    className="h-24 w-24 rounded-full object-cover shadow-brand"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-brand text-2xl font-bold text-white shadow-brand">
                    {initials}
                  </div>
                )}

                <h2 className="mt-5 text-xl font-semibold tracking-tight">
                  {user.name}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {user.email}
                </p>

                <span className="mt-4 rounded-full bg-brand-subtle px-3 py-1 text-xs font-medium capitalize text-accent-foreground">
                  {user.role}
                </span>
              </div>

              <div className="mt-7 space-y-5 border-t border-border pt-6">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />

                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>

                    <p className="mt-1 break-all text-sm font-medium text-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />

                  <div>
                    <p className="text-xs text-muted-foreground">Academic Year</p>

                    <p className="mt-1 text-sm font-medium text-foreground">
                      {user.year ? `Year ${user.year}` : "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />

                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>

                    <p className="mt-1 text-sm font-medium text-foreground">
                      {user.department || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Profile Form */}
            <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Personal Information
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Keep your student profile information up to date.
                  </p>
                </div>

                {!editing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit Profile
                  </Button>
                )}
              </div>

              <form
                onSubmit={handleSave}
                className="mt-7 grid gap-6 sm:grid-cols-2"
              >
                {/* Name */}
                <div className="sm:col-span-2">
                  <Label htmlFor="name" required>
                    Full Name
                  </Label>

                  <Input
                    id="name"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    disabled={!editing || saving}
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <Label htmlFor="email">Email Address</Label>

                  <Input
                    id="email"
                    value={user.email}
                    disabled
                  />

                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Your registered email address cannot be changed here.
                  </p>
                </div>

                {/* Department */}
                <div>
                  <Label htmlFor="department">Department</Label>

                  <Select
                    id="department"
                    value={department}
                    onChange={(event) =>
                      setDepartment(event.target.value)
                    }
                    disabled={!editing || saving}
                  >
                    <option value="">Select department</option>

                    {departmentOptions(user?.department).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Academic Year */}
                <div>
                  <Label htmlFor="year" required>
                    Academic Year
                  </Label>

                  <Select
                    id="year"
                    value={year}
                    onChange={(event) =>
                      setYear(event.target.value)
                    }
                    disabled={!editing || saving}
                  >
                    <option value="">Select academic year</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </Select>
                </div>

                {/* Actions */}
                {editing && (
                  <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:col-span-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      variant="brand"
                      loading={saving}
                      loadingText="Saving…"
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </section>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-border bg-card p-10 text-center">
            <UserRound className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />

            <h2 className="mt-4 text-lg font-semibold">
              Profile unavailable
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Please try refreshing the page.
            </p>

            <Button
              variant="outline"
              className="mt-5"
              onClick={loadProfile}
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
