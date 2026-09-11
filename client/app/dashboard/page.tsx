"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  dashboardPathForRole,
  fetchCurrentUser,
} from "@/lib/auth";
import { Spinner } from "@/components/ui/spinner";

/*
 * Role-neutral entry point.
 *
 * Anything that knows a user is signed in but not which
 * role they hold can send them here, and they are
 * forwarded to the dashboard that belongs to them.
 */
export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    fetchCurrentUser().then((user) => {
      if (!active) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      const destination =
        dashboardPathForRole(user.role);

      /*
       * An unrecognised role resolves back to this page,
       * so treat it as a failed session instead of
       * redirecting in a loop.
       */
      if (destination === "/dashboard") {
        router.replace("/login");
        return;
      }

      router.replace(destination);
    });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="bg-aurora pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-brand-lg">
          <Spinner className="h-6 w-6 text-white" />
        </div>

        <h1 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
          Loading your dashboard
        </h1>

        <p className="mt-1.5 text-sm text-muted-foreground">
          Taking you to your workspace…
        </p>
      </div>
    </main>
  );
}
