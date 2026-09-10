"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  dashboardPathForRole,
  fetchCurrentUser,
} from "@/lib/auth";

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
    <main className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />

        <h1 className="mt-4 text-lg font-semibold text-neutral-900">
          Loading your dashboard
        </h1>

        <p className="mt-1 text-sm text-neutral-500">
          Taking you to your workspace...
        </p>
      </div>
    </main>
  );
}
