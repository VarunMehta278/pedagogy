"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  KeyRound,
  Sparkles,
} from "lucide-react";

import {
  canForwardSignedInVisitor,
  dashboardPathForRole,
  getSession,
  primeSession,
  readQueryParam,
  safeRedirect,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FadeIn } from "@/components/motion/reveal";

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
    getSession().then((session) => {
      if (!active) return;

      /*
       * Only a confirmed session forwards. "unreachable"
       * means the API did not answer, and forwarding on
       * that is how a guarded page and this one end up
       * throwing the visitor back and forth.
       *
       * canForwardSignedInVisitor() caps the hops, so even
       * a genuinely confirmed session cannot bounce
       * forever if something further along disagrees.
       */
      if (
        session.state === "authenticated" &&
        canForwardSignedInVisitor()
      ) {
        router.replace(
          safeRedirect(
            readQueryParam("redirect"),
            dashboardPathForRole(session.user.role)
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
      /*
       * Seed the shared session from the login response so
       * the dashboard does not have to ask who this is all
       * over again — one less round trip, and no window in
       * which the two pages could answer differently.
       */
      if (data.user) {
        primeSession(data.user);
      }

      const destination =
        redirectTo ||
        dashboardPathForRole(data.user?.role);

      /*
       * No router.refresh() here. It remounts the route
       * tree, which re-runs the destination page's own
       * session check immediately — the extra load the
       * visitor saw as the page reloading itself.
       */
      router.replace(destination);
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
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-brand shadow-brand">
          <Spinner className="h-5 w-5 text-white" />
        </div>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* Form side */}
        <div className="flex items-center justify-center px-6 py-12 sm:px-10">
          <FadeIn className="w-full max-w-md">

            {/* Logo */}
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2.5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold text-white shadow-brand">
                  P
                </div>
                <span className="text-lg font-bold tracking-tight text-foreground">
                  Pedagogy
                </span>
              </Link>

              <h1 className="mt-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Welcome back
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                Login to continue to Pedagogy.
              </p>
            </div>

            {/* Account created */}
            {justRegistered && (
              <Alert
                tone="success"
                className="mt-6"
              >
                Your account has been created. Sign in
                to get started.
              </Alert>
            )}

            {/* Error */}
            {error && (
              <Alert
                tone="destructive"
                className="mt-6"
              >
                {error}
              </Alert>
            )}

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >

              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>

                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password">Password</Label>

                <div className="relative">
                  <Input
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
                    className="pr-12"
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
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {capsLockOn && (
                  <FieldError className="text-warning">
                    Caps Lock is on.
                  </FieldError>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                block
                size="lg"
                variant="brand"
                loading={loading}
                loadingText="Logging in…"
              >
                Login
              </Button>

            </form>

            {/* Register */}
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-primary hover:underline"
              >
                Create account
              </Link>
            </p>

          </FadeIn>
        </div>

        {/* Branded side */}
        <div className="relative hidden overflow-hidden bg-gradient-brand lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full border border-white/10" />

          <div className="relative z-10 flex items-center gap-2 text-sm font-medium text-white/80">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Pedagogy
          </div>

          <div className="relative z-10 max-w-sm">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <KeyRound className="h-6 w-6 text-white" aria-hidden="true" />
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-white">
              Where campus events come alive.
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Register in minutes, discover hackathons, workshops and
              competitions, and keep every certificate you earn in
              one place.
            </p>
          </div>

          <p className="relative z-10 text-xs text-white/60">
            Trusted across departments for events, registrations and
            verified certificates.
          </p>
        </div>

      </div>
    </main>
  );
}
