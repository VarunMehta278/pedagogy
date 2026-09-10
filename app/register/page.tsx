"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Eye,
  EyeOff,
  X,
} from "lucide-react";

import { DEPARTMENTS } from "@/lib/departments";
import {
  dashboardPathForRole,
  fetchCurrentUser,
} from "@/lib/auth";
import {
  getPasswordRuleState,
  getPasswordStrength,
  isPasswordValid,
} from "@/lib/password";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [passwordTouched, setPasswordTouched] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /*
   * Someone who is already signed in has no use for
   * this page, so send them to their dashboard.
   */
  useEffect(() => {
    let active = true;

    fetchCurrentUser().then((user) => {
      if (active && user) {
        router.replace(
          dashboardPathForRole(user.role)
        );
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  const ruleState =
    getPasswordRuleState(password);

  const strength =
    getPasswordStrength(password);

  const passwordOk = isPasswordValid(password);

  const passwordsMatch =
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(email.trim()) &&
    passwordOk &&
    passwordsMatch &&
    !loading;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    if (!isPasswordValid(password)) {
      setPasswordTouched(true);

      setError(
        "Your password does not meet all of the requirements yet."
      );

      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name,
            email,
            password,
            department: department || null,
            year: year ? Number(year) : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed"
        );
      }

      /*
       * Hand off to login with a confirmation flag and
       * the email prefilled, so the new account holder
       * does not have to retype it.
       */
      router.replace(
        `/login?registered=1&email=${encodeURIComponent(
          email.trim()
        )}`
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create account"
      );
    } finally {
      setLoading(false);
    }
  };

  const strengthColor =
    strength.score <= 2
      ? "bg-neutral-400"
      : strength.score <= 4
      ? "bg-neutral-600"
      : "bg-black";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <div className="text-center">
            <Link href="/" className="text-2xl font-bold">
              Pedagogy
            </Link>

            <h1 className="mt-6 text-2xl font-bold">
              Create your account
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Join Pedagogy and discover technical events.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                autoComplete="name"
                className="mt-2 w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="mt-2 w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
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

                  {DEPARTMENTS.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </div>

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
                  onChange={(e) => setYear(e.target.value)}
                  className="mt-2 w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </div>

            {/* PASSWORD */}

            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium"
              >
                Password
              </label>

              <div className="relative mt-2">
                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordTouched(true);
                  }}
                  onBlur={() =>
                    setPasswordTouched(true)
                  }
                  placeholder="Create a strong password"
                  required
                  autoComplete="new-password"
                  aria-describedby="password-requirements"
                  className="w-full rounded-lg border bg-background px-4 py-3 pr-12 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* STRENGTH */}

              {password && (
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Password strength
                    </span>

                    <span className="text-xs font-medium">
                      {strength.label}
                    </span>
                  </div>

                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${strengthColor}`}
                      style={{
                        width: `${strength.percent}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* REQUIREMENTS */}

              <ul
                id="password-requirements"
                className="mt-3 space-y-1.5"
              >
                {ruleState.map((rule) => {
                  const showAsFailed =
                    passwordTouched && !rule.met;

                  return (
                    <li
                      key={rule.id}
                      className={`flex items-center gap-2 text-xs ${
                        rule.met
                          ? "text-foreground"
                          : showAsFailed
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {rule.met ? (
                        <Check className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 shrink-0" />
                      )}

                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* CONFIRM PASSWORD */}

            <div>
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium"
              >
                Confirm Password
              </label>

              <div className="relative mt-2">
                <input
                  id="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Re-enter your password"
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border bg-background px-4 py-3 pr-12 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) => !current
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {confirmPassword && (
                <p
                  className={`mt-2 flex items-center gap-2 text-xs ${
                    passwordsMatch
                      ? "text-muted-foreground"
                      : "text-destructive"
                  }`}
                >
                  {passwordsMatch ? (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 shrink-0" />
                  )}

                  {passwordsMatch
                    ? "Passwords match"
                    : "Passwords do not match"}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creating account..."
                : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
