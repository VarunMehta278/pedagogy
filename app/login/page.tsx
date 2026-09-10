"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  dashboardPathForRole,
  fetchCurrentUser,
  readQueryParam,
  safeRedirect,
} from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [capsLockOn, setCapsLockOn] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /*
   * Where to land after a successful login. Set from
   * ?redirect= when another page sent the visitor here,
   * otherwise decided by role.
   */
  const [redirectTo, setRedirectTo] =
    useState("");

  const [justRegistered, setJustRegistered] =
    useState(false);

  const [checkingSession, setCheckingSession] =
    useState(true);

  useEffect(() => {
    let active = true;

    /*
     * Query params are read here rather than with
     * useSearchParams so the page does not need a
     * Suspense boundary at build time.
     */
    setRedirectTo(
      safeRedirect(readQueryParam("redirect"))
    );

    setJustRegistered(
      readQueryParam("registered") === "1"
    );

    const prefillEmail =
      readQueryParam("email");

    if (prefillEmail) {
      setEmail(prefillEmail);
    }

    /*
     * An already-signed-in visitor is forwarded instead
     * of being shown the login form again.
     */
    fetchCurrentUser().then((user) => {
      if (!active) return;

      if (user) {
        router.replace(
          safeRedirect(
            readQueryParam("redirect"),
            dashboardPathForRole(user.role)
          )
        );

        return;
      }

      setCheckingSession(false);
    });

    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Invalid email or password"
        );
      }

      /*
       * The login response already carries the user, so
       * there is no need for a second /users/me request
       * before deciding where to send them.
       */
      const destination =
        redirectTo ||
        dashboardPathForRole(data.user?.role);

      router.replace(destination);
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to login"
      );

      setLoading(false);
    }
  };

  /*
   * Avoid flashing the form while an existing session
   * is being resolved.
   */
  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-12">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />

          <p className="mt-4 text-sm text-muted-foreground">
            Loading...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-12">

      <div className="w-full max-w-md">

        <div className="rounded-2xl border bg-card p-8 shadow-sm">

          {/* Logo */}
          <div className="text-center">

            <Link
              href="/"
              className="text-2xl font-bold"
            >
              Pedagogy
            </Link>

            <h1 className="mt-6 text-2xl font-bold">
              Welcome back
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Login to continue to Pedagogy.
            </p>

          </div>

          {/* Account created */}
          {justRegistered && (
            <div className="mt-6 flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

              <p className="text-sm text-muted-foreground">
                Your account has been created. Sign in
                to get started.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >

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
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="mt-2 w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

            </div>

            {/* Password */}
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
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  onKeyUp={(e) =>
                    setCapsLockOn(
                      e.getModifierState?.(
                        "CapsLock"
                      ) ?? false
                    )
                  }
                  onBlur={() =>
                    setCapsLockOn(false)
                  }
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
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

              {capsLockOn && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Caps Lock is on.
                </p>
              )}

            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

          </form>

          {/* Register */}
          <p className="mt-6 text-center text-sm text-muted-foreground">

            Don&apos;t have an account?{" "}

            <Link
              href="/register"
              className="font-semibold text-primary hover:underline"
            >
              Create account
            </Link>

          </p>

        </div>

      </div>

    </main>
  );
}
