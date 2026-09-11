"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Eye,
  EyeOff,
  GraduationCap,
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
import { Button } from "@/components/ui/button";
import {
  Input,
  Label,
  Select,
} from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion/reveal";

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

  /*
   * Presentation only — the tone the strength meter and label
   * take on. Every required rule still has to pass regardless of
   * how strong the password scores.
   */
  const strengthTone =
    strength.score <= 2
      ? "destructive"
      : strength.score <= 4
      ? "warning"
      : strength.score === 5
      ? "info"
      : "success";

  const strengthBarClass = {
    destructive: "bg-destructive",
    warning: "bg-warning",
    info: "bg-info",
    success: "bg-success",
  }[strengthTone];

  const strengthLabelClass = {
    destructive: "text-destructive",
    warning: "text-warning",
    info: "text-info",
    success: "text-success",
  }[strengthTone];

  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* Form side */}
        <div className="flex items-center justify-center px-6 py-12 sm:px-10">
          <FadeIn className="w-full max-w-lg">

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
                Create your account
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                Join Pedagogy and discover technical events.
              </p>
            </div>

            {error && (
              <Alert tone="destructive" className="mt-6">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <Label htmlFor="name">Full Name</Label>

                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  autoComplete="name"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>

                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="department">Department</Label>

                  <Select
                    id="department"
                    value={department}
                    onChange={(e) =>
                      setDepartment(e.target.value)
                    }
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
                  </Select>
                </div>

                <div>
                  <Label htmlFor="year">Year</Label>

                  <Select
                    id="year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    <option value="">Select year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </Select>
                </div>
              </div>

              {/* PASSWORD */}

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

                {/* STRENGTH */}

                {password && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Password strength
                      </span>

                      <span
                        className={cn(
                          "text-xs font-semibold transition-colors duration-200",
                          strengthLabelClass
                        )}
                      >
                        {strength.label}
                      </span>
                    </div>

                    <div className="mt-1.5 flex h-1.5 gap-1">
                      {Array.from({ length: strength.max }).map(
                        (_, index) => (
                          <div
                            key={index}
                            className={cn(
                              "h-full flex-1 rounded-full bg-muted transition-colors duration-300",
                              index < strength.score &&
                                strengthBarClass
                            )}
                          />
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* REQUIREMENTS */}

                <ul
                  id="password-requirements"
                  className="mt-3.5 space-y-2"
                >
                  {ruleState.map((rule) => {
                    const showAsFailed =
                      passwordTouched && !rule.met;

                    return (
                      <li
                        key={rule.id}
                        className={cn(
                          "flex items-center gap-2.5 text-xs transition-colors duration-200",
                          rule.met
                            ? "text-foreground"
                            : showAsFailed
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                            rule.met
                              ? "border-success/30 bg-success/15 text-success scale-100"
                              : showAsFailed
                              ? "border-destructive/30 bg-destructive/10 text-destructive"
                              : "border-border bg-muted text-muted-foreground"
                          )}
                        >
                          {rule.met ? (
                            <Check className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <X className="h-3 w-3" aria-hidden="true" />
                          )}
                        </span>

                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* CONFIRM PASSWORD */}

              <div>
                <Label htmlFor="confirmPassword">
                  Confirm Password
                </Label>

                <div className="relative">
                  <Input
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
                    aria-invalid={
                      confirmPassword.length > 0 &&
                      !passwordsMatch
                    }
                    className="pr-12"
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
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {confirmPassword && (
                  <p
                    className={cn(
                      "mt-2 flex items-center gap-1.5 text-xs font-medium transition-colors duration-200",
                      passwordsMatch
                        ? "text-success"
                        : "text-destructive"
                    )}
                  >
                    {passwordsMatch ? (
                      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}

                    {passwordsMatch
                      ? "Passwords match"
                      : "Passwords do not match"}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                block
                size="lg"
                variant="brand"
                disabled={!canSubmit}
                loading={loading}
                loadingText="Creating account…"
              >
                Create Account
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary hover:underline"
              >
                Login
              </Link>
            </p>

          </FadeIn>
        </div>

        {/* Branded side */}
        <div className="relative hidden overflow-hidden bg-gradient-brand lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full border border-white/10" />

          <div className="relative z-10 flex items-center gap-2 text-sm font-medium text-white/80">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Pedagogy
          </div>

          <div className="relative z-10 max-w-sm">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Join a campus that runs on real events.
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Create your account to register for hackathons, workshops
              and competitions, and collect verified certificates for
              everything you complete.
            </p>
          </div>

          <p className="relative z-10 text-xs text-white/60">
            Free for every student and faculty member on campus.
          </p>
        </div>

      </div>
    </main>
  );
}
